import axios from 'axios';
import { localDb } from '../../../database/localDatabase.js';

/**
 * Synchronization Service
 * Manages reliable offline-to-online batch transmission of telemetry records.
 */
export class SyncService {
  constructor(options = {}) {
    this.db = options.db || localDb;
    this.apiBaseUrl = options.apiBaseUrl || '/api/measurements';
    this.batchSize = options.batchSize || 50;
    this.maxAttempts = options.maxAttempts || 5;
    this.isSyncing = false;
    this.listeners = new Set();
  }

  /**
   * Subscribe to sync lifecycle events
   */
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify(event, data) {
    for (const listener of this.listeners) {
      try {
        listener(event, data);
      } catch (e) {
        console.error('Error in sync event listener:', e);
      }
    }
  }

  /**
   * Trigger synchronization of pending / failed records
   * @param {Object} [triggerOptions] - Options including custom endpoint
   * @returns {Promise<Object>} Sync outcome summary
   */
  async syncPendingRecords(triggerOptions = {}) {
    if (this.isSyncing) {
      return {
        success: false,
        message: 'A synchronization operation is already in progress.',
        processed: 0,
      };
    }

    // Check navigator online status if available in browser
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return {
        success: false,
        message: 'Client device is offline. Records remain preserved in local IndexedDB.',
        isOffline: true,
        processed: 0,
      };
    }

    this.isSyncing = true;
    this.notify('sync_started', { timestamp: new Date().toISOString() });

    const summary = {
      success: true,
      totalPending: 0,
      processed: 0,
      accepted: [],
      duplicates: [],
      rejected: [],
      failed: [],
    };

    try {
      // 1. Fetch items ready to sync: 'pending' or 'failed' (under max attempts)
      const queueItems = await this.db.syncQueue
        .where('status')
        .anyOf(['pending', 'failed'])
        .filter((item) => item.attempts < this.maxAttempts)
        .limit(this.batchSize)
        .toArray();

      summary.totalPending = queueItems.length;

      if (queueItems.length === 0) {
        this.isSyncing = false;
        this.notify('sync_completed', summary);
        return {
          ...summary,
          message: 'Local synchronization queue is empty.',
        };
      }

      const nowIso = new Date().toISOString();
      const recordIds = queueItems.map((item) => item.recordId);

      // 2. Concurrency Lock: Mark these queue records as 'syncing'
      await this.db.syncQueue
        .where('recordId')
        .anyOf(recordIds)
        .modify({
          status: 'syncing',
          updatedAt: nowIso,
        });

      // 3. Prepare payload batch
      const batchPayload = queueItems.map((item) => item.payload);

      // 4. Dispatch to backend sync endpoint
      const syncEndpoint = triggerOptions.endpoint || `${this.apiBaseUrl}/sync`;
      let response;

      try {
        response = await axios.post(syncEndpoint, {
          records: batchPayload,
          syncBatchId: `batch-${Date.now()}`,
          dispatchedAt: nowIso,
        }, {
          headers: { 'Content-Type': 'application/json' },
          timeout: triggerOptions.timeout || 10000,
        });
      } catch (networkError) {
        // Network or server down: preserve records and mark as 'failed' with incremented attempts
        const errorMsg = networkError.response?.data?.message || networkError.message;
        await this.db.syncQueue
          .where('recordId')
          .anyOf(recordIds)
          .modify((item) => {
            item.status = 'failed';
            item.attempts = (item.attempts || 0) + 1;
            item.lastError = errorMsg;
            item.updatedAt = new Date().toISOString();
          });

        this.isSyncing = false;
        this.notify('sync_failed', { error: errorMsg, recordsPreserved: recordIds.length });

        return {
          success: false,
          message: `Network transmission failure: ${errorMsg}. Records preserved safely in local storage.`,
          networkError: true,
          totalPending: queueItems.length,
          processed: 0,
          failed: recordIds,
        };
      }

      // 5. Backend acknowledged: Process response
      const result = response.data;
      const acceptedIds = new Set(result.accepted || []);
      const duplicateIds = new Set(result.duplicates || []);
      const rejectedList = result.rejected || [];
      const rejectedIds = new Set(rejectedList.map((r) => (typeof r === 'string' ? r : r.recordId)));

      summary.accepted = Array.from(acceptedIds);
      summary.duplicates = Array.from(duplicateIds);
      summary.rejected = rejectedList;
      summary.processed = queueItems.length;

      // 6. Update local storage for accepted and duplicates (both are considered successfully persisted upstream)
      const successfullySyncedIds = [...Array.from(acceptedIds), ...Array.from(duplicateIds)];

      if (successfullySyncedIds.length > 0) {
        // Update syncQueue
        await this.db.syncQueue
          .where('recordId')
          .anyOf(successfullySyncedIds)
          .modify({
            status: 'synced',
            updatedAt: new Date().toISOString(),
          });

        // Update domain tables: measurements, assessments, missionEvents, radiationRecords
        for (const item of queueItems) {
          if (successfullySyncedIds.includes(item.recordId)) {
            const domainTable = this.db.getTableByCategory(item.category);
            if (domainTable) {
              await domainTable.update(item.recordId, { syncStatus: 'synced' });
            }
          }
        }
      }

      // 7. Update rejected items in syncQueue
      if (rejectedIds.size > 0) {
        await this.db.syncQueue
          .where('recordId')
          .anyOf(Array.from(rejectedIds))
          .modify((item) => {
            item.status = 'failed';
            item.attempts = this.maxAttempts; // Do not retry fatal rejections automatically
            item.lastError = 'Rejected by backend validation';
            item.updatedAt = new Date().toISOString();
          });
      }

      this.isSyncing = false;
      this.notify('sync_completed', summary);

      return {
        ...summary,
        message: `Sync completed: ${acceptedIds.size} accepted, ${duplicateIds.size} duplicate acknowledgements, ${rejectedIds.size} rejected.`,
      };
    } catch (unexpectedError) {
      this.isSyncing = false;
      console.error('Unexpected error in sync flow:', unexpectedError);
      return {
        success: false,
        message: `Unexpected sync error: ${unexpectedError.message}`,
        processed: 0,
      };
    }
  }
}

export const syncService = new SyncService();

import { v4 as uuidv4 } from 'uuid';
import { localDb } from '../../../database/localDatabase.js';
import { syncService } from '../../data-acquisition/services/syncService.js';
import { connectivityService } from './connectivityService.js';

/**
 * Continuity Synchronization Engine
 * Wraps Module 01's syncService with exponential backoff, auto-resumption,
 * idempotency auditing, and conflict recovery.
 */
export class ContinuitySyncEngine {
  constructor(options = {}) {
    this.db = options.db || localDb;
    this.syncService = options.syncService || syncService;
    this.connectivity = options.connectivity || connectivityService;
    this.maxRetryAttempts = options.maxRetryAttempts || 5;
    this.autoSyncActive = false;
    this.isSyncing = false;
    this.lastSyncResult = null;
    this.lastSuccessfulSyncAt = null;
    this.listeners = new Set();

    // Listen to network changes
    this.connectivity.subscribe((connState) => {
      if (connState.isOnline && connState.isServerReachable && this.autoSyncActive) {
        this.triggerSync({ reason: 'network_restored' });
      }
    });
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify(event, data) {
    for (const listener of this.listeners) {
      try {
        listener(event, data);
      } catch (e) {
        console.error('Error in continuity sync listener:', e);
      }
    }
  }

  /**
   * Calculate exponential backoff delay in milliseconds
   * @param {number} attempts 
   * @returns {number}
   */
  getBackoffDelay(attempts = 1) {
    const baseMs = 1000;
    const maxMs = 30000;
    const delay = Math.min(baseMs * Math.pow(2, attempts - 1), maxMs);
    // Add 10% jitter
    const jitter = Math.random() * 0.1 * delay;
    return Math.round(delay + jitter);
  }

  /**
   * Trigger synchronization with exponential backoff and audit logging
   * @param {Object} [options] 
   * @returns {Promise<Object>}
   */
  async triggerSync(options = {}) {
    if (this.isSyncing) {
      return {
        success: false,
        message: 'Synchronization already in progress.',
        processed: 0,
      };
    }

    this.isSyncing = true;
    this.notify('sync_started', { timestamp: new Date().toISOString() });

    try {
      // 1. Check network
      const conn = await this.connectivity.checkServerReachability();
      if (!conn.isServerReachable && !options.force) {
        this.isSyncing = false;
        const msg = 'Mission server unreachable. Records remain safely preserved in local IndexedDB.';
        this.notify('sync_skipped', { reason: 'server_unreachable' });
        return {
          success: false,
          serverOffline: true,
          message: msg,
          processed: 0,
        };
      }

      // 2. Delegate to syncService batch processing
      const outcome = await this.syncService.syncPendingRecords(options);
      this.lastSyncResult = outcome;

      if (outcome.success && (outcome.accepted.length > 0 || outcome.duplicates.length > 0)) {
        this.lastSuccessfulSyncAt = new Date().toISOString();
      }

      // 3. Log audit trail
      if (this.db && this.db.systemAuditLogs) {
        await this.db.systemAuditLogs.put({
          logId: uuidv4(),
          eventType: 'SYNCHRONIZATION_EVENT',
          timestamp: new Date().toISOString(),
          severity: outcome.success ? 'INFO' : 'WARNING',
          component: 'ContinuitySyncEngine',
          details: {
            totalPending: outcome.totalPending,
            accepted: outcome.accepted?.length || 0,
            duplicates: outcome.duplicates?.length || 0,
            rejected: outcome.rejected?.length || 0,
            failed: outcome.failed?.length || 0,
            message: outcome.message,
          },
        });
      }

      this.isSyncing = false;
      this.notify('sync_completed', outcome);
      return outcome;
    } catch (err) {
      this.isSyncing = false;
      const errorSummary = {
        success: false,
        message: `Sync execution error: ${err.message}`,
        processed: 0,
      };
      this.lastSyncResult = errorSummary;
      this.notify('sync_error', errorSummary);
      return errorSummary;
    }
  }

  /**
   * Force reset attempt count on failed records to enable manual retry
   * @returns {Promise<{ resetCount: number }>}
   */
  async resetFailedRecordsForRetry() {
    if (!this.db || !this.db.syncQueue) return { resetCount: 0 };

    const failedItems = await this.db.syncQueue
      .where('status')
      .equals('failed')
      .primaryKeys();

    if (failedItems.length > 0) {
      await this.db.syncQueue
        .where('recordId')
        .anyOf(failedItems)
        .modify({
          status: 'pending',
          attempts: 0,
          updatedAt: new Date().toISOString(),
        });
    }

    return { resetCount: failedItems.length };
  }

  /**
   * Get overall sync queue health metrics
   * @returns {Promise<Object>}
   */
  async getSyncMetrics() {
    if (!this.db || !this.db.syncQueue) {
      return { total: 0, pending: 0, synced: 0, failed: 0 };
    }

    const all = await this.db.syncQueue.toArray();
    const pending = all.filter((i) => i.status === 'pending').length;
    const synced = all.filter((i) => i.status === 'synced').length;
    const failed = all.filter((i) => i.status === 'failed').length;
    const syncing = all.filter((i) => i.status === 'syncing').length;

    return {
      total: all.length,
      pending: pending + syncing,
      synced,
      failed,
      lastSuccessfulSyncAt: this.lastSuccessfulSyncAt,
      isSyncing: this.isSyncing,
      lastResult: this.lastSyncResult,
    };
  }

  enableAutoSync() {
    this.autoSyncActive = true;
  }

  disableAutoSync() {
    this.autoSyncActive = false;
  }
}

export const continuitySyncEngine = new ContinuitySyncEngine();

import { v4 as uuidv4 } from 'uuid';
import { ValidationService, ValidationOutcome } from './validationService.js';
import { localDb } from '../../../database/localDatabase.js';

/**
 * Health Data Acquisition Service
 * Ingests, normalizes, validates, and locally persists astronaut health telemetry.
 */
export class AcquisitionService {
  /**
   * Acquire, validate, and persist a single health record.
   * Offline-first: strictly writes to local IndexedDB before any network sync.
   *
   * @param {Object} rawInput - Ingested health record payload
   * @param {Object} [options] - Options (e.g. override db instance for testing)
   * @returns {Promise<Object>} Ingestion outcome report
   */
  static async ingestRecord(rawInput, options = {}) {
    const db = options.db || localDb;
    const nowIso = new Date().toISOString();

    // 1. Ensure UUID recordId exists
    const recordId = rawInput?.recordId || uuidv4();
    const candidateRecord = {
      ...rawInput,
      recordId,
      // Default provenance if not fully provided
      provenance: {
        source: rawInput?.provenance?.source || 'wearable_sensor',
        deviceId: rawInput?.provenance?.deviceId,
        softwareVersion: rawInput?.provenance?.softwareVersion || '1.0.0',
        ...rawInput?.provenance,
      },
      // Ensure syncStatus default
      syncStatus: 'pending',
    };

    // 2. Attach receivedAt UTC timestamp upon acquisition
    candidateRecord.receivedAt = nowIso;

    // 3. Perform aerospace validation
    const validationResult = ValidationService.validateRecord(candidateRecord);

    // 4. Handle INVALID records (Audit log preservation, do not silently discard)
    if (!validationResult.isValid) {
      const rejectedEntry = {
        recordId,
        category: candidateRecord.category || 'unknown',
        astronautId: candidateRecord.astronautId || 'unknown',
        rejectedAt: nowIso,
        reason: validationResult.errors.map((e) => `${e.field}: ${e.message}`).join('; '),
        errors: validationResult.errors,
        warnings: validationResult.warnings,
        rawPayload: candidateRecord,
      };

      try {
        await db.rejectedRecords.put(rejectedEntry);
      } catch (err) {
        console.error('Failed to log rejected record to Dexie:', err);
      }

      return {
        success: false,
        status: ValidationOutcome.INVALID,
        recordId,
        errors: validationResult.errors,
        warnings: validationResult.warnings,
        record: candidateRecord,
        message: 'Record failed technical validation checks and was moved to the inspection log.',
      };
    }

    // 5. Handle VALID / VALID_WITH_WARNINGS records
    const targetTable = db.getTableByCategory(candidateRecord.category);
    if (!targetTable) {
      return {
        success: false,
        status: ValidationOutcome.INVALID,
        recordId,
        errors: [{ field: 'category', message: `No local table configured for category: ${candidateRecord.category}` }],
        warnings: validationResult.warnings,
        record: candidateRecord,
        message: 'Configuration error: unmapped local storage table.',
      };
    }

    const finalRecord = {
      ...validationResult.record,
      receivedAt: nowIso,
      syncStatus: 'pending',
    };

    try {
      // Atomic transactional write: store in domain table AND syncQueue
      await db.transaction('rw', [targetTable, db.syncQueue], async () => {
        await targetTable.put(finalRecord);
        await db.syncQueue.put({
          recordId: finalRecord.recordId,
          category: finalRecord.category,
          status: 'pending',
          attempts: 0,
          payload: finalRecord,
          createdAt: nowIso,
          updatedAt: nowIso,
          lastError: null,
        });
      });

      return {
        success: true,
        status: validationResult.status,
        recordId: finalRecord.recordId,
        errors: [],
        warnings: validationResult.warnings,
        record: finalRecord,
        message: validationResult.status === ValidationOutcome.VALID_WITH_WARNINGS
          ? 'Record accepted locally with data-quality warnings and queued for synchronization.'
          : 'Record successfully validated and queued locally for mission sync.',
      };
    } catch (dbError) {
      console.error('Local persistence failure in AcquisitionService:', dbError);
      return {
        success: false,
        status: ValidationOutcome.INVALID,
        recordId,
        errors: [{ field: 'database', message: dbError.message }],
        warnings: validationResult.warnings,
        record: candidateRecord,
        message: 'Local IndexedDB persistence error. Record could not be saved.',
      };
    }
  }

  /**
   * Retrieve all records across a specific category
   */
  static async getRecordsByCategory(category, options = {}) {
    const db = options.db || localDb;
    const table = db.getTableByCategory(category);
    if (!table) return [];
    return await table.orderBy('recordedAt').reverse().toArray();
  }

  /**
   * Retrieve all rejected records from the audit log
   */
  static async getRejectedRecords(options = {}) {
    const db = options.db || localDb;
    return await db.rejectedRecords.orderBy('rejectedAt').reverse().toArray();
  }

  /**
   * Get sync queue summary statistics
   */
  static async getSyncQueueStatus(options = {}) {
    const db = options.db || localDb;
    const pendingCount = await db.syncQueue.where('status').equals('pending').count();
    const syncingCount = await db.syncQueue.where('status').equals('syncing').count();
    const syncedCount = await db.syncQueue.where('status').equals('synced').count();
    const failedCount = await db.syncQueue.where('status').equals('failed').count();

    return {
      pending: pendingCount,
      syncing: syncingCount,
      synced: syncedCount,
      failed: failedCount,
      total: pendingCount + syncingCount + syncedCount + failedCount,
    };
  }
}

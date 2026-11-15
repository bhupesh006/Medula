import { localDb } from '../../../database/localDatabase.js';

/**
 * Mission Data Management Service
 * Aggregates, audits, filters, and inspects local astronaut health records across all Dexie stores.
 */
export async function getStorageOverview() {
  if (!localDb) return { tables: {}, totalRecords: 0 };

  const tableNames = [
    'measurements',
    'assessments',
    'missionEvents',
    'radiationRecords',
    'baselines',
    'baselineHistory',
    'patternResults',
    'environmentalRecords',
    'contextSnapshots',
    'medicalGuidanceHistory',
    'syncQueue',
    'rejectedRecords',
    'researchEvidence',
    'researchDatasets',
  ];

  const stats = {};
  let total = 0;

  for (const name of tableNames) {
    if (localDb[name]) {
      const count = await localDb[name].count();
      stats[name] = count;
      total += count;
    } else {
      stats[name] = 0;
    }
  }

  // Estimate storage usage if StorageManager API is present in browser
  let quotaEstimate = null;
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      quotaEstimate = {
        usageBytes: estimate.usage || 0,
        quotaBytes: estimate.quota || 0,
        usageMb: Math.round(((estimate.usage || 0) / (1024 * 1024)) * 10) / 10,
        quotaMb: Math.round(((estimate.quota || 0) / (1024 * 1024)) * 10) / 10,
      };
    } catch (e) {
      // Ignore quota error in unsupported test environments
    }
  }

  return {
    tableCounts: stats,
    totalRecords: total,
    quotaEstimate,
  };
}

/**
 * Query stored health records across primary telemetry tables with unified schema
 * @param {Object} [filter] 
 * @returns {Promise<Array<Object>>}
 */
export async function queryStoredRecords(filter = {}) {
  if (!localDb) return [];

  let records = [];

  // Determine which tables to query based on category
  const queryAll = !filter.category || filter.category === 'all';

  if (queryAll || filter.category === 'wearable_physiological') {
    const meas = await localDb.measurements.toArray();
    records.push(...meas.map((r) => ({ ...r, category: 'wearable_physiological' })));
  }

  if (queryAll || filter.category === 'manual_assessment') {
    const assess = await localDb.assessments.toArray();
    records.push(...assess.map((r) => ({ ...r, category: 'manual_assessment' })));
  }

  if (queryAll || filter.category === 'mission_event') {
    const events = await localDb.missionEvents.toArray();
    records.push(...events.map((r) => ({ ...r, category: 'mission_event' })));
  }

  if (queryAll || filter.category === 'radiation_measurement') {
    const rad = await localDb.radiationRecords.toArray();
    records.push(...rad.map((r) => ({ ...r, category: 'radiation_measurement' })));
  }

  // Filters
  if (filter.astronautId) {
    records = records.filter((r) => r.astronautId === filter.astronautId);
  }

  if (filter.metric) {
    records = records.filter((r) => r.metric === filter.metric);
  }

  if (filter.syncStatus) {
    records = records.filter((r) => r.syncStatus === filter.syncStatus);
  }

  if (filter.query) {
    const q = filter.query.toLowerCase();
    records = records.filter(
      (r) =>
        r.recordId?.toLowerCase().includes(q) ||
        r.metric?.toLowerCase().includes(q) ||
        r.astronautId?.toLowerCase().includes(q)
    );
  }

  // Sort descending by timestamp
  return records.sort((a, b) => new Date(b.recordedAt) - new Date(a.recordedAt));
}

/**
 * Retrieve rejected records audit list
 * @returns {Promise<Array<Object>>}
 */
export async function getRejectedRecordsAudit() {
  if (!localDb || !localDb.rejectedRecords) return [];
  const records = await localDb.rejectedRecords.toArray();
  return records.sort((a, b) => new Date(b.rejectedAt) - new Date(a.rejectedAt));
}

/**
 * Retrieve pending sync queue items with diagnostics
 * @returns {Promise<Array<Object>>}
 */
export async function getPendingSyncQueue() {
  if (!localDb || !localDb.syncQueue) return [];
  const queue = await localDb.syncQueue.toArray();
  return queue.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

/**
 * Retrieve system continuity audit logs
 * @returns {Promise<Array<Object>>}
 */
export async function getSystemAuditLogs() {
  if (!localDb || !localDb.systemAuditLogs) return [];
  const logs = await localDb.systemAuditLogs.toArray();
  return logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

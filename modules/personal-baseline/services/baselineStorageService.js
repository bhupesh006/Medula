import { v4 as uuidv4 } from 'uuid';
import { localDb } from '../../../database/localDatabase.js';

/**
 * MEDULA — Module 02: Personal Baseline Engine (PBE)
 * Baseline Storage Service
 *
 * Provides transactional offline-first persistence for astronaut health baselines
 * and maintains complete, immutable version history in IndexedDB.
 */
export class BaselineStorageService {
  /**
   * Persist a calculated personal baseline with atomic version history.
   *
   * @param {Object} baselineData - Calculated baseline object
   * @param {Object} [options] - Options (e.g., custom db instance for testing)
   * @returns {Promise<Object>} The persisted baseline record
   */
  static async saveBaseline(baselineData, options = {}) {
    const db = options.db || localDb;

    if (!baselineData || typeof baselineData !== 'object') {
      throw new Error('Baseline data must be a valid non-null object');
    }
    if (!baselineData.astronautId) {
      throw new Error('astronautId is required to save a personal baseline');
    }
    if (!baselineData.metric) {
      throw new Error('metric is required to save a personal baseline');
    }

    const astronautId = baselineData.astronautId;
    const metric = baselineData.metric;
    const missionId = baselineData.missionId || options.missionId || 'ARES-V';
    const nowIso = new Date().toISOString();

    let savedRecord = null;

    // Use an atomic Dexie transaction across baselines and baselineHistory
    await db.transaction('rw', [db.baselines, db.baselineHistory], async () => {
      // 1. Check for existing active baseline for this astronaut, metric, and mission
      const existing = await db.baselines
        .where('[astronautId+metric+missionId]')
        .equals([astronautId, metric, missionId])
        .first();

      const nextVersion = existing ? (existing.version || 1) + 1 : 1;
      const baselineId = existing ? existing.baselineId : (baselineData.baselineId || uuidv4());
      const createdAt = existing ? existing.createdAt : (baselineData.createdAt || nowIso);

      savedRecord = {
        baselineId,
        astronautId,
        missionId,
        metric,
        unit: baselineData.unit || 'units',
        calculationMethod: baselineData.calculationMethod || 'robust_sample_statistics',
        sampleCount: baselineData.sampleCount ?? 0,
        mean: baselineData.mean ?? null,
        median: baselineData.median ?? null,
        standardDeviation: baselineData.standardDeviation ?? null,
        medianAbsoluteDeviation: baselineData.medianAbsoluteDeviation ?? null,
        minimum: baselineData.minimum ?? null,
        maximum: baselineData.maximum ?? null,
        percentile25: baselineData.percentile25 ?? null,
        percentile75: baselineData.percentile75 ?? null,
        confidence: baselineData.confidence,
        calculationPeriodStart: baselineData.calculationPeriodStart ?? null,
        calculationPeriodEnd: baselineData.calculationPeriodEnd ?? null,
        warnings: baselineData.warnings || [],
        version: nextVersion,
        createdAt,
        updatedAt: nowIso,
      };

      // 2. Put active baseline into baselines store
      await db.baselines.put(savedRecord);

      // 3. Put historical snapshot into baselineHistory store (never overwrite historical versions)
      const historyEntry = {
        historyId: uuidv4(),
        ...savedRecord,
      };
      await db.baselineHistory.put(historyEntry);
    });

    return savedRecord;
  }

  /**
   * Retrieve the current active baseline for a given astronaut, metric, and mission.
   *
   * @param {string} astronautId
   * @param {string} metric
   * @param {string} [missionId] - Optional mission identifier
   * @param {Object} [options]
   * @returns {Promise<Object|null>}
   */
  static async getBaseline(astronautId, metric, missionId = null, options = {}) {
    const db = options.db || localDb;

    if (!astronautId || !metric) {
      throw new Error('astronautId and metric are required to retrieve a baseline');
    }

    if (missionId) {
      const record = await db.baselines
        .where('[astronautId+metric+missionId]')
        .equals([astronautId, metric, missionId])
        .first();
      return record || null;
    }

    // Default: find by [astronautId+metric]
    const record = await db.baselines
      .where('[astronautId+metric]')
      .equals([astronautId, metric])
      .first();

    return record || null;
  }

  /**
   * Retrieve the full version history of a baseline in chronological or version order.
   *
   * @param {string} astronautId
   * @param {string} metric
   * @param {string} [missionId]
   * @param {Object} [options]
   * @returns {Promise<Array<Object>>}
   */
  static async getBaselineHistory(astronautId, metric, missionId = null, options = {}) {
    const db = options.db || localDb;

    if (!astronautId || !metric) {
      throw new Error('astronautId and metric are required to retrieve baseline history');
    }

    let query;
    if (missionId) {
      query = db.baselineHistory
        .where('[astronautId+metric+missionId]')
        .equals([astronautId, metric, missionId]);
    } else {
      query = db.baselineHistory
        .where('[astronautId+metric]')
        .equals([astronautId, metric]);
    }

    const historyItems = await query.toArray();

    // Sort by version ascending
    historyItems.sort((a, b) => (a.version || 1) - (b.version || 1));

    return historyItems;
  }

  /**
   * Retrieve all current active baselines for an astronaut.
   *
   * @param {string} astronautId
   * @param {Object} [options]
   * @returns {Promise<Array<Object>>}
   */
  static async getAllBaselines(astronautId, options = {}) {
    const db = options.db || localDb;

    if (!astronautId) {
      throw new Error('astronautId is required to retrieve all baselines');
    }

    return await db.baselines
      .where('astronautId')
      .equals(astronautId)
      .toArray();
  }

  /**
   * Safely delete a baseline and its history (useful for administration/test resets).
   *
   * @param {string} baselineId
   * @param {Object} [options]
   * @returns {Promise<{ success: boolean, deletedId: string }>}
   */
  static async deleteBaseline(baselineId, options = {}) {
    const db = options.db || localDb;

    if (!baselineId) {
      throw new Error('baselineId is required to delete a baseline');
    }

    await db.transaction('rw', [db.baselines, db.baselineHistory], async () => {
      await db.baselines.delete(baselineId);
      await db.baselineHistory.where('baselineId').equals(baselineId).delete();
    });

    return { success: true, deletedId: baselineId };
  }
}

export const saveBaseline = BaselineStorageService.saveBaseline;
export const getBaseline = BaselineStorageService.getBaseline;
export const getBaselineHistory = BaselineStorageService.getBaselineHistory;
export const getAllBaselines = BaselineStorageService.getAllBaselines;
export const deleteBaseline = BaselineStorageService.deleteBaseline;


import { v4 as uuidv4 } from 'uuid';
import { localDb } from '../../../database/localDatabase.js';

/**
 * MEDULA — Module 03: Multi-Indicator Health Pattern Detection Engine (MHPDE)
 * Pattern Storage Service
 *
 * Persists pattern detection evaluations, operational software states, and
 * contributing indicator audits into IndexedDB offline-first.
 */
export class PatternStorageService {
  /**
   * Persist a pattern detection outcome to local storage.
   *
   * @param {Object} patternData - Result from pattern detection engine
   * @param {Object} [options] - Custom db options
   * @returns {Promise<Object>} Persisted record
   */
  static async savePatternResult(patternData, options = {}) {
    const db = options.db || localDb;

    if (!patternData || typeof patternData !== 'object') {
      throw new Error('Pattern data must be a valid non-null object');
    }
    if (!patternData.astronautId) {
      throw new Error('astronautId is required to save pattern result');
    }
    if (!patternData.domain) {
      throw new Error('domain is required to save pattern result');
    }

    const patternId = patternData.patternId || uuidv4();
    const detectionTimestamp = patternData.detectionTimestamp || new Date().toISOString();

    const record = {
      patternId,
      astronautId: patternData.astronautId,
      missionId: patternData.missionId || 'ARES-V',
      domain: patternData.domain,
      operationalState: patternData.operationalState || 'NORMAL',
      confidence: patternData.confidence || 'LOW_CONFIDENCE',
      contributingIndicators: patternData.contributingIndicators || [],
      patternDescription: patternData.patternDescription || 'Routine domain health evaluation',
      explanation: patternData.explanation || '',
      relevantMeasurementIds: patternData.relevantMeasurementIds || [],
      contextualObservations: patternData.contextualObservations || [],
      reviewStatus: patternData.reviewStatus || 'unreviewed',
      detectionTimestamp,
      createdAt: patternData.createdAt || detectionTimestamp,
    };

    await db.patternResults.put(record);
    return record;
  }

  /**
   * Retrieve the latest pattern evaluation for a specific astronaut and domain.
   */
  static async getLatestPatternByDomain(astronautId, domain, options = {}) {
    const db = options.db || localDb;
    if (!astronautId || !domain) {
      throw new Error('astronautId and domain are required');
    }

    const records = await db.patternResults
      .where('[astronautId+domain]')
      .equals([astronautId, domain])
      .toArray();

    if (records.length === 0) return null;

    // Sort by detectionTimestamp descending
    records.sort((a, b) => Date.parse(b.detectionTimestamp) - Date.parse(a.detectionTimestamp));
    return records[0];
  }

  /**
   * Retrieve historical pattern results for an astronaut and domain.
   */
  static async getPatternHistory(astronautId, domain, options = {}) {
    const db = options.db || localDb;
    if (!astronautId || !domain) {
      throw new Error('astronautId and domain are required');
    }

    const records = await db.patternResults
      .where('[astronautId+domain]')
      .equals([astronautId, domain])
      .toArray();

    records.sort((a, b) => Date.parse(b.detectionTimestamp) - Date.parse(a.detectionTimestamp));

    const limit = options.limit || 50;
    return records.slice(0, limit);
  }

  /**
   * Retrieve all recent patterns across all domains for an astronaut.
   */
  static async getAllPatterns(astronautId, options = {}) {
    const db = options.db || localDb;
    if (!astronautId) {
      throw new Error('astronautId is required');
    }

    const records = await db.patternResults
      .where('astronautId')
      .equals(astronautId)
      .toArray();

    records.sort((a, b) => Date.parse(b.detectionTimestamp) - Date.parse(a.detectionTimestamp));
    return records;
  }
}

export const savePatternResult = PatternStorageService.savePatternResult;
export const getPatternsByAstronaut = PatternStorageService.getAllPatterns;
export const getPatternHistory = PatternStorageService.getPatternHistory;
export const getAllPatterns = PatternStorageService.getAllPatterns;


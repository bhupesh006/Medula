import { describe, it, expect, beforeEach, vi } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import { localDb } from '../database/localDatabase.js';
import { calculateBaseline } from '../modules/personal-baseline/services/baselineCalculationService.js';
import { saveBaseline, getBaseline } from '../modules/personal-baseline/services/baselineStorageService.js';
import { detectPatternsAcrossDomains } from '../modules/health-pattern-detection/services/patternDetectionService.js';
import { savePatternResult, getPatternsByAstronaut } from '../modules/health-pattern-detection/services/patternStorageService.js';
import { getContextForHealthPattern } from '../modules/mission-context/services/missionContextService.js';
import { generateMedicalGuidance, getGuidanceHistory, updateGuidanceStatus } from '../modules/medical-decision-support/services/decisionSupportService.js';
import { continuitySyncEngine } from '../modules/mission-continuity/services/continuitySyncEngine.js';
import { getStorageOverview, queryStoredRecords, getRejectedRecordsAudit } from '../modules/mission-continuity/services/dataManagementService.js';
import { loadFlightDemoScenario, resetDemoScenario } from '../modules/mission-continuity/services/demoScenarioService.js';

describe('Module 06 — Mission Continuity and System Integration Engine (MCSI)', () => {
  const astronautId = 'ASTRO-TEST-INTEG';
  const missionId = 'ARES-V-MARS-TRANSIT';

  beforeEach(async () => {
    // Clear relevant stores
    await localDb.measurements.clear();
    await localDb.assessments.clear();
    await localDb.missionEvents.clear();
    await localDb.radiationRecords.clear();
    await localDb.environmentalRecords.clear();
    await localDb.baselines.clear();
    await localDb.patternResults.clear();
    await localDb.medicalGuidanceHistory.clear();
    await localDb.syncQueue.clear();
    await localDb.rejectedRecords.clear();
    await localDb.systemAuditLogs.clear();
  });

  describe('Part 1: Offline Data Continuity & Local Availability', () => {
    it('should persist and query diverse health records entirely offline in IndexedDB', async () => {
      const now = new Date().toISOString();

      // 1. Ingest physiological record
      await localDb.measurements.put({
        recordId: 'MEAS-001',
        astronautId,
        missionId,
        recordedAt: now,
        metric: 'heart_rate',
        value: 72,
        unit: 'bpm',
        isSynthetic: true,
        syncStatus: 'pending',
      });

      // 2. Ingest assessment
      await localDb.assessments.put({
        recordId: 'ASSESS-001',
        astronautId,
        missionId,
        recordedAt: now,
        sleepHours: 7.2,
        fatigueScore: 3,
        moodScore: 8,
        stressScore: 2,
        isSynthetic: true,
        syncStatus: 'pending',
      });

      // 3. Ingest mission event
      await localDb.missionEvents.put({
        recordId: 'EVENT-001',
        astronautId,
        missionId,
        recordedAt: now,
        eventType: 'exercise_session',
        description: 'T2 Treadmill Aerobic Protocol',
        durationMinutes: 45,
        workloadIntensity: 'moderate',
        isSynthetic: true,
        syncStatus: 'pending',
      });

      // Verify queries
      const stored = await queryStoredRecords({ astronautId });
      expect(stored).toHaveLength(3);

      const overview = await getStorageOverview();
      expect(overview.totalRecords).toBeGreaterThanOrEqual(3);
      expect(overview.tableCounts.measurements).toBe(1);
      expect(overview.tableCounts.assessments).toBe(1);
      expect(overview.tableCounts.missionEvents).toBe(1);
    });

    it('should never delete unsynchronized records upon query or restart simulation', async () => {
      await localDb.syncQueue.put({
        recordId: 'QUEUE-PRESERVED-01',
        category: 'wearable_physiological',
        payload: { value: 75, metric: 'heart_rate' },
        status: 'pending',
        attempts: 2,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const metrics = await continuitySyncEngine.getSyncMetrics();
      expect(metrics.pending).toBe(1);

      // Verify record is preserved
      const queueItem = await localDb.syncQueue.get('QUEUE-PRESERVED-01');
      expect(queueItem).toBeDefined();
      expect(queueItem.status).toBe('pending');
    });
  });

  describe('Part 2: Synchronization & Conflict Recovery Engine', () => {
    it('should calculate exponential backoff with ceiling', () => {
      const delay1 = continuitySyncEngine.getBackoffDelay(1);
      const delay2 = continuitySyncEngine.getBackoffDelay(2);
      const delay5 = continuitySyncEngine.getBackoffDelay(5);
      const delay10 = continuitySyncEngine.getBackoffDelay(10);

      expect(delay1).toBeGreaterThanOrEqual(1000);
      expect(delay2).toBeGreaterThanOrEqual(2000);
      expect(delay5).toBeGreaterThanOrEqual(16000);
      expect(delay10).toBeLessThanOrEqual(33000); // capped near 30000 + 10% jitter
    });

    it('should reset failed records back to pending status for retry', async () => {
      await localDb.syncQueue.bulkPut([
        {
          recordId: 'FAIL-01',
          category: 'wearable_physiological',
          status: 'failed',
          attempts: 5,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          recordId: 'FAIL-02',
          category: 'manual_assessment',
          status: 'failed',
          attempts: 4,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]);

      const resetRes = await continuitySyncEngine.resetFailedRecordsForRetry();
      expect(resetRes.resetCount).toBe(2);

      const items = await localDb.syncQueue.toArray();
      expect(items.every((i) => i.status === 'pending' && i.attempts === 0)).toBe(true);
    });
  });

  describe('Part 3: End-to-End Workflow Integration', () => {
    it('should execute full chain: Data Acquisition -> Personal Baseline -> Pattern Detection -> Context -> Decision Support', async () => {
      const now = Date.now();
      const hourMs = 60 * 60 * 1000;

      // Step A: Ingest historical measurements for baseline establishment
      const records = [];
      for (let i = 10; i >= 1; i--) {
        records.push({
          recordId: `E2E-HR-${i}`,
          astronautId,
          missionId,
          recordedAt: new Date(now - i * 24 * hourMs).toISOString(),
          metric: 'heart_rate',
          value: 65 + (i % 3),
          unit: 'bpm',
          isSynthetic: true,
          syncStatus: 'pending',
        });
      }
      await localDb.measurements.bulkPut(records);

      // Step B: Calculate and save personal baseline
      const baseline = calculateBaseline(records, astronautId, 'heart_rate', {
        missionId,
        unit: 'bpm',
      });
      expect(['HIGH_CONFIDENCE', 'MODERATE_CONFIDENCE']).toContain(baseline.confidence);
      await saveBaseline(baseline);

      const retrievedBaseline = await getBaseline(astronautId, 'heart_rate', missionId);
      expect(retrievedBaseline).not.toBeNull();
      expect(retrievedBaseline.median).toBeGreaterThan(60);

      // Step C: Introduce an elevated measurement and concurrent context
      const alertTime = new Date(now - 1 * hourMs).toISOString();
      await localDb.measurements.put({
        recordId: 'E2E-HR-SPIKE',
        astronautId,
        missionId,
        recordedAt: alertTime,
        metric: 'heart_rate',
        value: 110, // significant deviation
        unit: 'bpm',
        isSynthetic: true,
        syncStatus: 'pending',
      });

      await localDb.missionEvents.put({
        recordId: 'E2E-EVENT-EVA',
        astronautId,
        missionId,
        recordedAt: alertTime,
        eventType: 'extravehicular_activity',
        description: 'Critical EVA segment',
        durationMinutes: 300,
        workloadIntensity: 'heavy',
        isSynthetic: true,
        syncStatus: 'pending',
      });

      // Step D: Pattern detection
      const patterns = await detectPatternsAcrossDomains(astronautId, missionId);
      expect(patterns.length).toBeGreaterThan(0);
      const cardioPattern = patterns.find((p) => p.domain === 'cardiovascular');
      expect(cardioPattern).toBeDefined();
      await savePatternResult(cardioPattern);

      // Step E: Correlate pattern with mission context
      const contextData = await getContextForHealthPattern(cardioPattern, astronautId, missionId);
      expect(contextData).toBeDefined();
      expect(contextData.explanation).toContain('context');

      // Step F: Generate medical decision support guidance
      const guidance = await generateMedicalGuidance(astronautId, missionId);
      expect(guidance.length).toBeGreaterThan(0);

      const topGuidance = guidance[0];
      expect(topGuidance.clinicalRecommendations).toBeDefined();
      expect(topGuidance.clinicalRecommendations.length).toBeGreaterThanOrEqual(1);
      expect(topGuidance.supportingEvidenceId).toBeDefined();

      // Step G: Update guidance status
      const updated = await updateGuidanceStatus(topGuidance.guidanceId, 'IMPLEMENTED', 'Countermeasures deployed');
      expect(updated.status).toBe('IMPLEMENTED');

      // Step H: Verify audit history
      const history = await getGuidanceHistory(astronautId);
      expect(history.length).toBeGreaterThanOrEqual(1);
      expect(history[0].status).toBe('IMPLEMENTED');
    });
  });

  describe('Part 4: Synthetic Flight Demonstration Scenario Generator', () => {
    it('should generate complete 14-day flight scenario for two astronauts with proper provenance', async () => {
      const demoResult = await loadFlightDemoScenario({ missionId });
      expect(demoResult.success).toBe(true);
      expect(demoResult.isSynthetic).toBe(true);
      expect(demoResult.counts.measurements).toBeGreaterThanOrEqual(50);
      expect(demoResult.counts.baselines).toBeGreaterThanOrEqual(2);
      expect(demoResult.counts.patterns).toBeGreaterThanOrEqual(2);
      expect(demoResult.counts.guidance).toBeGreaterThanOrEqual(2);

      // Verify that all generated measurements are explicitly labeled as synthetic
      const stored = await localDb.measurements.toArray();
      expect(stored.every((r) => r.isSynthetic === true)).toBe(true);
      expect(stored.every((r) => r.sourceProvenance === 'SYNTHETIC_SIMULATED_RECORD')).toBe(true);
    });

    it('should cleanly reset synthetic flight demonstration data while preserving real records', async () => {
      // 1. Load demo scenario
      await loadFlightDemoScenario({ missionId });
      const countBefore = await localDb.measurements.count();
      expect(countBefore).toBeGreaterThan(0);

      // 2. Add real / non-synthetic record
      await localDb.measurements.put({
        recordId: 'REAL-USER-REC-001',
        astronautId: 'ASTRO-REAL',
        missionId,
        recordedAt: new Date().toISOString(),
        metric: 'heart_rate',
        value: 70,
        unit: 'bpm',
        isSynthetic: false,
        sourceProvenance: 'USER_MANUAL_ENTRY',
        syncStatus: 'pending',
      });

      // 3. Reset demo scenario
      const resetResult = await resetDemoScenario();
      expect(resetResult.totalDeleted).toBeGreaterThan(0);

      // 4. Verify only real user record remains
      const remainingMeasurements = await localDb.measurements.toArray();
      expect(remainingMeasurements).toHaveLength(1);
      expect(remainingMeasurements[0].recordId).toBe('REAL-USER-REC-001');
    });
  });
});

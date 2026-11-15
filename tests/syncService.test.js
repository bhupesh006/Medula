import { describe, it, expect, beforeEach, vi } from 'vitest';
import axios from 'axios';
import { SyncService } from '../modules/data-acquisition/services/syncService.js';
import { AcquisitionService } from '../modules/data-acquisition/services/acquisitionService.js';
import { MedulaLocalDB } from '../database/localDatabase.js';

describe('SyncService (MDAE Stage 2)', () => {
  let testDb;
  let syncService;

  beforeEach(async () => {
    testDb = new MedulaLocalDB();
    await testDb.measurements.clear();
    await testDb.assessments.clear();
    await testDb.missionEvents.clear();
    await testDb.radiationRecords.clear();
    await testDb.syncQueue.clear();
    await testDb.rejectedRecords.clear();

    syncService = new SyncService({ db: testDb, apiBaseUrl: '/api/measurements' });
    vi.restoreAllMocks();
  });

  // Requirement 12: Successful synchronisation
  it('12. Successful synchronisation: sends batch to backend and marks records synced', async () => {
    // 1. Ingest a record locally
    const ingestResult = await AcquisitionService.ingestRecord({
      recordId: '11111111-1111-4111-8111-111111111111',
      astronautId: 'ASTRO-01',
      missionId: 'ARES-V',
      recordedAt: new Date(Date.now() - 30000).toISOString(),
      category: 'wearable_physiological',
      provenance: {
        source: 'wearable_sensor',
        deviceId: 'BIO-VEST-01',
      },
      data: {
        metric: 'heart_rate',
        value: 75,
        unit: 'bpm',
      },
    }, { db: testDb });

    expect(ingestResult.success).toBe(true);

    // Mock axios.post to succeed
    const postSpy = vi.spyOn(axios, 'post').mockResolvedValueOnce({
      data: {
        success: true,
        accepted: [ingestResult.recordId],
        duplicates: [],
        rejected: [],
        message: 'Batch processed',
      },
    });

    const syncOutcome = await syncService.syncPendingRecords();

    expect(syncOutcome.success).toBe(true);
    expect(syncOutcome.accepted).toContain(ingestResult.recordId);
    expect(postSpy).toHaveBeenCalledTimes(1);

    // Verify Dexie syncQueue status updated to 'synced'
    const queueItem = await testDb.syncQueue.get(ingestResult.recordId);
    expect(queueItem.status).toBe('synced');

    // Verify Dexie measurements table syncStatus updated to 'synced'
    const storedMeasurement = await testDb.measurements.get(ingestResult.recordId);
    expect(storedMeasurement.syncStatus).toBe('synced');
  });

  // Requirement 13: Failed synchronisation and retry
  it('13. Failed synchronisation and retry preserves records locally and marks as failed with attempts incremented', async () => {
    const recordId = '44444444-4444-4444-8444-444444444444';
    await AcquisitionService.ingestRecord({
      recordId,
      astronautId: 'ASTRO-04',
      missionId: 'ARES-V',
      recordedAt: new Date(Date.now() - 20000).toISOString(),
      category: 'radiation_measurement',
      provenance: {
        source: 'radiation_dosimeter',
      },
      data: {
        cumulative_dose: 5.2,
        cumulative_dose_unit: 'mSv',
        dose_rate: 8.1,
        dose_rate_unit: 'µSv/h',
      },
    }, { db: testDb });

    // Mock axios.post to simulate deep space communication blackout (Network Error)
    vi.spyOn(axios, 'post').mockRejectedValueOnce(new Error('Deep space comms link lost (Network Error)'));

    const syncOutcome = await syncService.syncPendingRecords();

    expect(syncOutcome.success).toBe(false);
    expect(syncOutcome.networkError).toBe(true);
    expect(syncOutcome.failed).toContain(recordId);

    // Verify record is preserved in local DB and NOT lost
    const storedRecord = await testDb.radiationRecords.get(recordId);
    expect(storedRecord).toBeDefined();
    expect(storedRecord.syncStatus).toBe('pending'); // Domain record preserved

    // Verify sync queue marked item as 'failed' with attempts = 1 and error message
    const queueItem = await testDb.syncQueue.get(recordId);
    expect(queueItem.status).toBe('failed');
    expect(queueItem.attempts).toBe(1);
    expect(queueItem.lastError).toContain('Deep space comms link lost');

    // Now simulate reconnection and retry
    vi.spyOn(axios, 'post').mockResolvedValueOnce({
      data: {
        success: true,
        accepted: [recordId],
        duplicates: [],
        rejected: [],
        message: 'Batch processed on retry',
      },
    });

    const retryOutcome = await syncService.syncPendingRecords();
    expect(retryOutcome.success).toBe(true);
    expect(retryOutcome.accepted).toContain(recordId);

    // Verify record is now synced
    const syncedQueueItem = await testDb.syncQueue.get(recordId);
    expect(syncedQueueItem.status).toBe('synced');
  });

  // Duplicate acknowledgment handling
  it('Acknowledges backend duplicates without error and updates local status to synced', async () => {
    const recordId = '55555555-5555-4555-8555-555555555555';
    await AcquisitionService.ingestRecord({
      recordId,
      astronautId: 'ASTRO-05',
      missionId: 'ARES-V',
      recordedAt: new Date(Date.now() - 10000).toISOString(),
      category: 'manual_assessment',
      provenance: {
        source: 'manual_entry',
      },
      data: {
        stress_score: 30,
        fatigue_score: 20,
        mood_score: 9,
        symptoms: [],
      },
    }, { db: testDb });

    // Mock backend returning duplicate
    vi.spyOn(axios, 'post').mockResolvedValueOnce({
      data: {
        success: true,
        accepted: [],
        duplicates: [recordId],
        rejected: [],
        message: 'Duplicate record recognized',
      },
    });

    const syncOutcome = await syncService.syncPendingRecords();
    expect(syncOutcome.success).toBe(true);
    expect(syncOutcome.duplicates).toContain(recordId);

    const queueItem = await testDb.syncQueue.get(recordId);
    expect(queueItem.status).toBe('synced');

    const storedAssessment = await testDb.assessments.get(recordId);
    expect(storedAssessment.syncStatus).toBe('synced');
  });
});


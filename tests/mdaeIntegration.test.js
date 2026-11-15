import { describe, it, expect, beforeEach, vi } from 'vitest';
import axios from 'axios';
import {
  AcquisitionService,
  ValidationService,
  ValidationOutcome,
  SyncService,
} from '../modules/data-acquisition/index.js';
import { MedulaLocalDB } from '../database/localDatabase.js';

describe('MEDULA MDAE Module 01 End-to-End Mission Telemetry Flow', () => {
  let db;
  let syncService;

  beforeEach(async () => {
    db = new MedulaLocalDB();
    await db.measurements.clear();
    await db.assessments.clear();
    await db.missionEvents.clear();
    await db.radiationRecords.clear();
    await db.syncQueue.clear();
    await db.rejectedRecords.clear();

    syncService = new SyncService({ db, apiBaseUrl: '/api/measurements' });
    vi.restoreAllMocks();
  });

  it('Executes the full offline-first lifecycle across all 4 telemetry categories', async () => {
    // 1. Ingest Wearable Record
    const wearableRes = await AcquisitionService.ingestRecord({
      astronautId: 'ASTRO-01',
      missionId: 'ARES-V',
      recordedAt: new Date(Date.now() - 50000).toISOString(),
      category: 'wearable_physiological',
      provenance: { source: 'wearable_sensor', deviceId: 'HEXOSKIN-01' },
      data: { metric: 'heart_rate', value: 72, unit: 'bpm' },
    }, { db });
    expect(wearableRes.success).toBe(true);

    // 2. Ingest Manual Assessment
    const assessmentRes = await AcquisitionService.ingestRecord({
      astronautId: 'ASTRO-01',
      missionId: 'ARES-V',
      recordedAt: new Date(Date.now() - 40000).toISOString(),
      category: 'manual_assessment',
      provenance: { source: 'manual_entry', deviceId: 'CREW-TABLET-01' },
      data: { stress_score: 35, fatigue_score: 40, mood_score: 8, symptoms: ['mild fatigue'] },
    }, { db });
    expect(assessmentRes.success).toBe(true);

    // 3. Ingest Mission Event
    const eventRes = await AcquisitionService.ingestRecord({
      astronautId: 'ASTRO-01',
      missionId: 'ARES-V',
      recordedAt: new Date(Date.now() - 30000).toISOString(),
      category: 'mission_event',
      provenance: { source: 'mission_log' },
      data: { eventType: 'exercise_session', durationMinutes: 60, intensity: 'high', description: 'ARED strength routine' },
    }, { db });
    expect(eventRes.success).toBe(true);

    // 4. Ingest Radiation Measurement
    const radRes = await AcquisitionService.ingestRecord({
      astronautId: 'ASTRO-01',
      missionId: 'ARES-V',
      recordedAt: new Date(Date.now() - 20000).toISOString(),
      category: 'radiation_measurement',
      provenance: { source: 'radiation_dosimeter', deviceId: 'RAD-01' },
      data: { cumulative_dose: 14.5, cumulative_dose_unit: 'mSv', dose_rate: 11.2, dose_rate_unit: 'µSv/h' },
    }, { db });
    expect(radRes.success).toBe(true);

    // 5. Ingest Invalid Record (verify rejection without data loss)
    const invalidRes = await AcquisitionService.ingestRecord({
      astronautId: '',
      missionId: 'ARES-V',
      recordedAt: 'invalid-date',
      category: 'wearable_physiological',
      data: { metric: 'heart_rate', value: 999, unit: 'wrong' },
    }, { db });
    expect(invalidRes.success).toBe(false);

    // Verify local storage counts
    const statusBeforeSync = await AcquisitionService.getSyncQueueStatus({ db });
    expect(statusBeforeSync.pending).toBe(4);
    expect(statusBeforeSync.synced).toBe(0);

    const rejectedRecords = await AcquisitionService.getRejectedRecords({ db });
    expect(rejectedRecords).toHaveLength(1);

    // 6. Simulate Server Batch Synchronization
    const batchIds = [wearableRes.recordId, assessmentRes.recordId, eventRes.recordId, radRes.recordId];
    vi.spyOn(axios, 'post').mockResolvedValueOnce({
      data: {
        success: true,
        accepted: batchIds,
        duplicates: [],
        rejected: [],
        message: 'Batch accepted',
      },
    });

    const syncOutcome = await syncService.syncPendingRecords();
    expect(syncOutcome.success).toBe(true);
    expect(syncOutcome.accepted).toHaveLength(4);

    // Verify queue after sync
    const statusAfterSync = await AcquisitionService.getSyncQueueStatus({ db });
    expect(statusAfterSync.pending).toBe(0);
    expect(statusAfterSync.synced).toBe(4);

    // Verify domain table records updated to synced
    const storedWearable = await db.measurements.get(wearableRes.recordId);
    expect(storedWearable.syncStatus).toBe('synced');
  });
});


import { describe, it, expect, beforeEach } from 'vitest';
import { AcquisitionService } from '../modules/data-acquisition/services/acquisitionService.js';
import { MedulaLocalDB } from '../database/localDatabase.js';
import { ValidationOutcome } from '../modules/data-acquisition/services/validationService.js';

describe('AcquisitionService & Local Storage (MDAE Stage 2)', () => {
  let testDb;

  beforeEach(async () => {
    // Instantiate fresh isolated Dexie database for each test
    testDb = new MedulaLocalDB();
    await testDb.measurements.clear();
    await testDb.assessments.clear();
    await testDb.missionEvents.clear();
    await testDb.radiationRecords.clear();
    await testDb.syncQueue.clear();
    await testDb.rejectedRecords.clear();
  });

  // Requirement 11: Offline local record creation
  it('11. Offline local record creation stores record locally in Dexie and queues for sync', async () => {
    const rawRecord = {
      recordId: '22222222-2222-4222-8222-222222222222',
      astronautId: 'ASTRO-02',
      missionId: 'ARES-V',
      recordedAt: new Date(Date.now() - 60000).toISOString(),
      category: 'wearable_physiological',
      provenance: {
        source: 'wearable_sensor',
        deviceId: 'HEXOSKIN-01',
      },
      data: {
        metric: 'heart_rate',
        value: 68,
        unit: 'bpm',
      },
    };

    const result = await AcquisitionService.ingestRecord(rawRecord, { db: testDb });

    expect(result.success).toBe(true);
    expect(result.status).toBe(ValidationOutcome.VALID);
    expect(result.record.receivedAt).toBeDefined();

    // Verify stored in Dexie measurements table
    const storedRecord = await testDb.measurements.get(rawRecord.recordId);
    expect(storedRecord).toBeDefined();
    expect(storedRecord.recordId).toBe(rawRecord.recordId);
    expect(storedRecord.astronautId).toBe('ASTRO-02');
    expect(storedRecord.syncStatus).toBe('pending');

    // Verify stored in Dexie syncQueue
    const queueItem = await testDb.syncQueue.get(rawRecord.recordId);
    expect(queueItem).toBeDefined();
    expect(queueItem.status).toBe('pending');
    expect(queueItem.attempts).toBe(0);
    expect(queueItem.payload.recordId).toBe(rawRecord.recordId);
  });

  it('Generates a valid UUID v4 if recordId is omitted', async () => {
    const rawRecord = {
      astronautId: 'ASTRO-03',
      missionId: 'ARES-V',
      recordedAt: new Date(Date.now() - 30000).toISOString(),
      category: 'manual_assessment',
      provenance: {
        source: 'manual_entry',
      },
      data: {
        stress_score: 25,
        fatigue_score: 15,
        mood_score: 8,
        symptoms: [],
      },
    };

    const result = await AcquisitionService.ingestRecord(rawRecord, { db: testDb });
    expect(result.success).toBe(true);
    expect(result.recordId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);

    const storedAssessment = await testDb.assessments.get(result.recordId);
    expect(storedAssessment).toBeDefined();
    expect(storedAssessment.astronautId).toBe('ASTRO-03');
  });

  it('Logs invalid records to rejectedRecords audit log without silent loss', async () => {
    const invalidRecord = {
      recordId: '33333333-3333-4333-8333-333333333333',
      astronautId: '', // Invalid empty astronautId
      missionId: 'ARES-V',
      recordedAt: 'invalid-time',
      category: 'wearable_physiological',
      data: {
        metric: 'heart_rate',
        value: 999, // Impossible HR
        unit: 'wrong-unit',
      },
    };

    const result = await AcquisitionService.ingestRecord(invalidRecord, { db: testDb });
    expect(result.success).toBe(false);
    expect(result.status).toBe(ValidationOutcome.INVALID);
    expect(result.errors.length).toBeGreaterThan(0);

    // Verify record was preserved in rejectedRecords
    const rejectedEntry = await testDb.rejectedRecords.get(invalidRecord.recordId);
    expect(rejectedEntry).toBeDefined();
    expect(rejectedEntry.recordId).toBe(invalidRecord.recordId);
    expect(rejectedEntry.errors.length).toBeGreaterThan(0);

    // Verify it was NOT put into measurements or syncQueue
    const measurementCheck = await testDb.measurements.get(invalidRecord.recordId);
    expect(measurementCheck).toBeUndefined();
    const queueCheck = await testDb.syncQueue.get(invalidRecord.recordId);
    expect(queueCheck).toBeUndefined();
  });

  it('Tracks sync queue status counts correctly', async () => {
    // Ingest 2 valid records
    await AcquisitionService.ingestRecord({
      astronautId: 'ASTRO-01',
      missionId: 'ARES-V',
      recordedAt: new Date(Date.now() - 60000).toISOString(),
      category: 'radiation_measurement',
      data: {
        cumulative_dose: 10.0,
        cumulative_dose_unit: 'mSv',
        dose_rate: 5.0,
        dose_rate_unit: 'µSv/h',
      },
    }, { db: testDb });

    await AcquisitionService.ingestRecord({
      astronautId: 'ASTRO-01',
      missionId: 'ARES-V',
      recordedAt: new Date(Date.now() - 50000).toISOString(),
      category: 'mission_event',
      data: {
        eventType: 'exercise_session',
        durationMinutes: 30,
        description: 'Cycling on CEVIS ergometer',
      },
    }, { db: testDb });

    const status = await AcquisitionService.getSyncQueueStatus({ db: testDb });
    expect(status.pending).toBe(2);
    expect(status.synced).toBe(0);
    expect(status.total).toBe(2);
  });
});

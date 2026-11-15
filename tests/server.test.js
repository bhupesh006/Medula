import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  HealthRecordModel,
  WearableRecordModel,
  AssessmentRecordModel,
  MissionEventRecordModel,
  RadiationRecordModel,
} from '../models/Measurement.js';
import { MeasurementService } from '../services/measurementService.js';
import {
  syncMeasurements,
  getMeasurements,
  getMeasurementById,
} from '../controllers/measurementController.js';

describe('Server API & Measurement Ingestion (MDAE Stage 3)', () => {
  let inMemoryDb = [];

  // Helper for mock Express req/res
  const createMockReqRes = (overrides = {}) => {
    const req = {
      body: overrides.body || {},
      query: overrides.query || {},
      params: overrides.params || {},
    };
    const res = {
      statusCode: 200,
      data: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.data = payload;
        return this;
      },
    };
    const next = vi.fn();
    return { req, res, next };
  };

  beforeEach(() => {
    inMemoryDb = [];
    vi.restoreAllMocks();

    // Mock HealthRecordModel.find
    vi.spyOn(HealthRecordModel, 'find').mockImplementation((filter) => {
      let results = [...inMemoryDb];

      if (filter?.recordId?.$in) {
        const idSet = new Set(filter.recordId.$in);
        results = results.filter((r) => idSet.has(r.recordId));
      }
      if (filter?.astronautId) {
        results = results.filter((r) => r.astronautId === filter.astronautId);
      }
      if (filter?.category) {
        results = results.filter((r) => r.category === filter.category);
      }

      return {
        lean: () => Promise.resolve(results),
        sort: () => ({
          skip: () => ({
            limit: () => ({
              lean: () => Promise.resolve(results),
            }),
          }),
        }),
      };
    });

    // Mock HealthRecordModel.countDocuments
    vi.spyOn(HealthRecordModel, 'countDocuments').mockImplementation(() => {
      return Promise.resolve(inMemoryDb.length);
    });

    // Mock HealthRecordModel.findOne
    vi.spyOn(HealthRecordModel, 'findOne').mockImplementation((filter) => {
      const match = inMemoryDb.find((r) => r.recordId === filter?.recordId);
      return {
        lean: () => Promise.resolve(match || null),
      };
    });

    // Mock create on all discriminator models
    const mockCreate = (doc) => {
      if (inMemoryDb.some((r) => r.recordId === doc.recordId)) {
        const error = new Error('E11000 duplicate key error');
        error.code = 11000;
        return Promise.reject(error);
      }
      inMemoryDb.push(doc);
      return Promise.resolve(doc);
    };

    vi.spyOn(WearableRecordModel, 'create').mockImplementation(mockCreate);
    vi.spyOn(AssessmentRecordModel, 'create').mockImplementation(mockCreate);
    vi.spyOn(MissionEventRecordModel, 'create').mockImplementation(mockCreate);
    vi.spyOn(RadiationRecordModel, 'create').mockImplementation(mockCreate);
  });

  // Requirement 10: Duplicate record submission
  it('10. Duplicate record submission is detected and acknowledged without duplicate database entries', async () => {
    const recordId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const recordPayload = {
      recordId,
      astronautId: 'ASTRO-01',
      missionId: 'ARES-V',
      recordedAt: new Date(Date.now() - 30000).toISOString(),
      category: 'wearable_physiological',
      provenance: {
        source: 'wearable_sensor',
        deviceId: 'PULSE-01',
      },
      data: {
        metric: 'heart_rate',
        value: 74,
        unit: 'bpm',
      },
    };

    // First submission: should be accepted
    const firstCall = createMockReqRes({ body: { records: [recordPayload] } });
    await syncMeasurements(firstCall.req, firstCall.res, firstCall.next);

    expect(firstCall.res.statusCode).toBe(200);
    expect(firstCall.res.data.success).toBe(true);
    expect(firstCall.res.data.accepted).toContain(recordId);
    expect(firstCall.res.data.duplicates).toHaveLength(0);
    expect(inMemoryDb.filter((r) => r.recordId === recordId)).toHaveLength(1);

    // Second submission of the exact same record: should be recognized as duplicate
    const secondCall = createMockReqRes({ body: { records: [recordPayload] } });
    await syncMeasurements(secondCall.req, secondCall.res, secondCall.next);

    expect(secondCall.res.statusCode).toBe(200);
    expect(secondCall.res.data.success).toBe(true);
    expect(secondCall.res.data.accepted).toHaveLength(0);
    expect(secondCall.res.data.duplicates).toContain(recordId);
    // Verified: No duplicate entry created in database
    expect(inMemoryDb.filter((r) => r.recordId === recordId)).toHaveLength(1);
  });

  it('Sync endpoint rejects invalid records with explainable feedback', async () => {
    const invalidRecord = {
      recordId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      astronautId: 'ASTRO-02',
      missionId: 'ARES-V',
      recordedAt: new Date(Date.now() - 30000).toISOString(),
      category: 'wearable_physiological',
      provenance: { source: 'wearable_sensor' },
      data: {
        metric: 'spo2',
        value: 150, // Invalid SpO2 (> 100%)
        unit: '%',
      },
    };

    const { req, res, next } = createMockReqRes({ body: { records: [invalidRecord] } });
    await syncMeasurements(req, res, next);

    expect(res.statusCode).toBe(200);
    expect(res.data.rejected).toHaveLength(1);
    expect(res.data.rejected[0].recordId).toBe(invalidRecord.recordId);
    expect(res.data.rejected[0].reason).toContain('SpO2 value 150 must be between 0% and 100%');
  });

  it('getMeasurements and getMeasurementById retrieve stored records', async () => {
    const recordId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
    const testRecord = {
      recordId,
      astronautId: 'ASTRO-03',
      missionId: 'ARES-V',
      recordedAt: new Date(Date.now() - 30000).toISOString(),
      category: 'radiation_measurement',
      provenance: { source: 'radiation_dosimeter' },
      data: {
        cumulative_dose: 12.3,
        cumulative_dose_unit: 'mSv',
        dose_rate: 6.4,
        dose_rate_unit: 'µSv/h',
      },
    };

    // Ingest record
    await MeasurementService.ingestBatch([testRecord]);

    // Query list via controller
    const listCall = createMockReqRes({ query: { astronautId: 'ASTRO-03' } });
    await getMeasurements(listCall.req, listCall.res, listCall.next);

    expect(listCall.res.statusCode).toBe(200);
    expect(listCall.res.data.items).toHaveLength(1);
    expect(listCall.res.data.items[0].recordId).toBe(recordId);

    // Query single record
    const singleCall = createMockReqRes({ params: { recordId } });
    await getMeasurementById(singleCall.req, singleCall.res, singleCall.next);

    expect(singleCall.res.statusCode).toBe(200);
    expect(singleCall.res.data.data.recordId).toBe(recordId);

    // Query non-existent record
    const notFoundCall = createMockReqRes({ params: { recordId: 'unknown-id' } });
    await getMeasurementById(notFoundCall.req, notFoundCall.res, notFoundCall.next);

    expect(notFoundCall.res.statusCode).toBe(404);
  });
});

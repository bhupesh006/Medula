import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MedulaLocalDB } from '../database/localDatabase.js';
import {
  AcquisitionService,
} from '../modules/data-acquisition/index.js';
import {
  calculateBaseline,
  BaselineStorageService,
  BaselineComparisonService,
  BaselineTrendService,
  ComparisonDirection,
  TrendDirection,
  BaselineConfidence,
} from '../modules/personal-baseline/index.js';

describe('MEDULA Personal Baseline Engine (PBE) End-to-End Integration', () => {
  let db;

  beforeEach(async () => {
    db = new MedulaLocalDB();
    await db.measurements.clear();
    await db.assessments.clear();
    await db.missionEvents.clear();
    await db.baselines.clear();
    await db.baselineHistory.clear();
  });

  it('17. Full workflow: Ingests via Module 01, establishes PBE baseline, evaluates trend and compares new reading', async () => {
    const astronautId = 'ASTRO-01';
    const missionId = 'ARES-V';
    const metric = 'heart_rate';

    // 1. Ingest historical measurements through Module 01 AcquisitionService
    const hrValues = [68, 70, 71, 72, 70, 74, 73, 75];
    const now = Date.now();

    for (let i = 0; i < hrValues.length; i++) {
      const recTime = new Date(now - (hrValues.length - i) * 3600000).toISOString();
      await AcquisitionService.ingestRecord({
        astronautId,
        missionId,
        recordedAt: recTime,
        category: 'wearable_physiological',
        provenance: { source: 'wearable_sensor', deviceId: 'HEXOSKIN-01' },
        data: {
          metric,
          value: hrValues[i],
          unit: 'bpm',
        },
      }, { db });
    }

    // Verify stored in Module 01 measurements table
    const storedCount = await db.measurements.where('astronautId').equals(astronautId).count();
    expect(storedCount).toBe(8);

    // 2. Query stored records and calculate baseline in Module 02
    const historicalRecords = await db.measurements.where('astronautId').equals(astronautId).toArray();
    const baselineResult = calculateBaseline(historicalRecords, astronautId, metric, { missionId });

    expect(baselineResult.sampleCount).toBe(8);
    expect(baselineResult.median).toBe(71.5);
    expect(baselineResult.mean).toBe(71.63);
    expect(baselineResult.confidence).toBe(BaselineConfidence.LOW_CONFIDENCE); // 5-9 samples

    // 3. Persist baseline into Module 02 Dexie stores
    const savedBaseline = await BaselineStorageService.saveBaseline(baselineResult, { db });
    expect(savedBaseline.version).toBe(1);

    // 4. Retrieve saved baseline
    const activeBaseline = await BaselineStorageService.getBaseline(astronautId, metric, missionId, { db });
    expect(activeBaseline).toBeDefined();
    expect(activeBaseline.median).toBe(71.5);

    // 5. Evaluate Trend
    const trend = BaselineTrendService.analyseTrend(historicalRecords, activeBaseline, { astronautId, metric });
    expect(trend).toBeDefined();
    expect(trend.sampleCount).toBe(8);
    expect([TrendDirection.INCREASING, TrendDirection.STABLE]).toContain(trend.direction);

    // 6. Ingest a new observation and compare against personal baseline
    const newObservation = {
      astronautId,
      metric,
      value: 85, // Elevated reading (> Q3)
      unit: 'bpm',
      recordedAt: new Date().toISOString(),
    };

    const comparison = BaselineComparisonService.compareWithBaseline(newObservation, activeBaseline);
    expect(comparison.direction).toBe(ComparisonDirection.ABOVE_BASELINE_PATTERN);
    expect(comparison.absoluteDifferenceFromMedian).toBe(13.5);
    expect(comparison.percentageDifferenceFromMedian).toBe(18.88);
    expect(comparison.explanation).toContain('above the astronaut\'s historical central range');

    // 7. Verify version history increments when recalculated
    const updatedBaseline = await BaselineStorageService.saveBaseline({
      ...baselineResult,
      sampleCount: 9,
      median: 72.0,
    }, { db });

    expect(updatedBaseline.version).toBe(2);

    const history = await BaselineStorageService.getBaselineHistory(astronautId, metric, missionId, { db });
    expect(history).toHaveLength(2);
    expect(history[0].version).toBe(1);
    expect(history[1].version).toBe(2);
  });
});


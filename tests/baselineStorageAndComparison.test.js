import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MedulaLocalDB } from '../database/localDatabase.js';
import {
  calculateBaseline,
  BaselineConfidence,
} from '../modules/personal-baseline/services/baselineCalculationService.js';
import { BaselineStorageService } from '../modules/personal-baseline/services/baselineStorageService.js';
import {
  BaselineComparisonService,
  ComparisonDirection,
  MedianDirection,
} from '../modules/personal-baseline/services/baselineComparisonService.js';

describe('Baseline Storage & Comparison Engine (MDAE Module 02 - Stage 3)', () => {
  let testDb;

  beforeEach(async () => {
    testDb = new MedulaLocalDB();
    await testDb.measurements.clear();
    await testDb.assessments.clear();
    await testDb.missionEvents.clear();
    await testDb.baselines.clear();
    await testDb.baselineHistory.clear();
  });

  const sampleBaselineData = {
    astronautId: 'ASTRO-01',
    missionId: 'ARES-V',
    metric: 'heart_rate',
    unit: 'bpm',
    calculationMethod: 'robust_sample_statistics',
    sampleCount: 15,
    mean: 72.4,
    median: 72.0,
    standardDeviation: 4.8,
    medianAbsoluteDeviation: 3.0,
    minimum: 62.0,
    maximum: 84.0,
    percentile25: 68.0, // Q1
    percentile75: 76.0, // Q3
    confidence: BaselineConfidence.MODERATE_CONFIDENCE,
    calculationPeriodStart: '2026-11-01T00:00:00.000Z',
    calculationPeriodEnd: '2026-11-15T00:00:00.000Z',
    warnings: [],
  };

  /* ==========================================================================
     STORAGE TESTS (Requirements 1 - 10)
     ========================================================================== */

  // 1. Save a new baseline
  it('1. Saves a new baseline locally in IndexedDB', async () => {
    const saved = await BaselineStorageService.saveBaseline(sampleBaselineData, { db: testDb });

    expect(saved).toBeDefined();
    expect(saved.baselineId).toBeDefined();
    expect(saved.version).toBe(1);
    expect(saved.astronautId).toBe('ASTRO-01');
    expect(saved.metric).toBe('heart_rate');

    const inDb = await testDb.baselines.get(saved.baselineId);
    expect(inDb).toBeDefined();
    expect(inDb.median).toBe(72.0);
  });

  // 2. Retrieve a saved baseline
  it('2. Retrieves an active saved baseline for a given astronaut and metric', async () => {
    const saved = await BaselineStorageService.saveBaseline(sampleBaselineData, { db: testDb });
    const retrieved = await BaselineStorageService.getBaseline('ASTRO-01', 'heart_rate', 'ARES-V', { db: testDb });

    expect(retrieved).toBeDefined();
    expect(retrieved.baselineId).toBe(saved.baselineId);
    expect(retrieved.median).toBe(72.0);
  });

  // 3. Save a new version without overwriting history
  it('3. Increments version and preserves historical baseline versions', async () => {
    // Initial calculation (Version 1)
    const v1 = await BaselineStorageService.saveBaseline(sampleBaselineData, { db: testDb });
    expect(v1.version).toBe(1);

    // Recalculation with new observations (Version 2)
    const updatedData = {
      ...sampleBaselineData,
      sampleCount: 20,
      median: 73.0,
      mean: 73.2,
    };
    const v2 = await BaselineStorageService.saveBaseline(updatedData, { db: testDb });
    expect(v2.version).toBe(2);
    expect(v2.baselineId).toBe(v1.baselineId);

    // Active baseline has version 2
    const current = await BaselineStorageService.getBaseline('ASTRO-01', 'heart_rate', 'ARES-V', { db: testDb });
    expect(current.version).toBe(2);
    expect(current.median).toBe(73.0);

    // History table contains both Version 1 and Version 2
    const history = await BaselineStorageService.getBaselineHistory('ASTRO-01', 'heart_rate', 'ARES-V', { db: testDb });
    expect(history).toHaveLength(2);
    expect(history[0].version).toBe(1);
    expect(history[0].median).toBe(72.0);
    expect(history[1].version).toBe(2);
    expect(history[1].median).toBe(73.0);
  });

  // 4. Retrieve baseline history in version order
  it('4. Retrieves baseline history in ascending version order', async () => {
    await BaselineStorageService.saveBaseline({ ...sampleBaselineData, median: 70 }, { db: testDb });
    await BaselineStorageService.saveBaseline({ ...sampleBaselineData, median: 72 }, { db: testDb });
    await BaselineStorageService.saveBaseline({ ...sampleBaselineData, median: 74 }, { db: testDb });

    const history = await BaselineStorageService.getBaselineHistory('ASTRO-01', 'heart_rate', 'ARES-V', { db: testDb });
    expect(history).toHaveLength(3);
    expect(history.map((h) => h.version)).toEqual([1, 2, 3]);
    expect(history.map((h) => h.median)).toEqual([70, 72, 74]);
  });

  // 5. Keep different astronauts' baselines separate
  it('5. Keeps different astronauts baselines strictly isolated', async () => {
    await BaselineStorageService.saveBaseline({ ...sampleBaselineData, astronautId: 'ASTRO-01', median: 65 }, { db: testDb });
    await BaselineStorageService.saveBaseline({ ...sampleBaselineData, astronautId: 'ASTRO-02', median: 85 }, { db: testDb });

    const astro1 = await BaselineStorageService.getBaseline('ASTRO-01', 'heart_rate', 'ARES-V', { db: testDb });
    const astro2 = await BaselineStorageService.getBaseline('ASTRO-02', 'heart_rate', 'ARES-V', { db: testDb });

    expect(astro1.median).toBe(65);
    expect(astro2.median).toBe(85);
  });

  // 6. Keep different metrics separate
  it('6. Keeps different metrics isolated for the same astronaut', async () => {
    await BaselineStorageService.saveBaseline({ ...sampleBaselineData, metric: 'heart_rate', unit: 'bpm', median: 72 }, { db: testDb });
    await BaselineStorageService.saveBaseline({ ...sampleBaselineData, metric: 'hrv', unit: 'ms', median: 55 }, { db: testDb });

    const hr = await BaselineStorageService.getBaseline('ASTRO-01', 'heart_rate', 'ARES-V', { db: testDb });
    const hrv = await BaselineStorageService.getBaseline('ASTRO-01', 'hrv', 'ARES-V', { db: testDb });

    expect(hr.median).toBe(72);
    expect(hrv.median).toBe(55);

    const all = await BaselineStorageService.getAllBaselines('ASTRO-01', { db: testDb });
    expect(all).toHaveLength(2);
  });

  // 7. Keep different missions separate
  it('7. Keeps different missions isolated without cross-mission contamination', async () => {
    await BaselineStorageService.saveBaseline({ ...sampleBaselineData, missionId: 'ARES-IV', median: 68 }, { db: testDb });
    await BaselineStorageService.saveBaseline({ ...sampleBaselineData, missionId: 'ARES-V', median: 74 }, { db: testDb });

    const m4 = await BaselineStorageService.getBaseline('ASTRO-01', 'heart_rate', 'ARES-IV', { db: testDb });
    const m5 = await BaselineStorageService.getBaseline('ASTRO-01', 'heart_rate', 'ARES-V', { db: testDb });

    expect(m4.median).toBe(68);
    expect(m5.median).toBe(74);
  });

  // 8. Handle missing baseline
  it('8. Returns null when a requested baseline does not exist', async () => {
    const result = await BaselineStorageService.getBaseline('ASTRO-99', 'spo2', 'ARES-V', { db: testDb });
    expect(result).toBeNull();
  });

  // 9. Handle failed transactions atomically
  it('9. Atomic transaction rollback prevents inconsistent state if an error occurs', async () => {
    // Spy on history table put to throw an error
    const originalPut = testDb.baselineHistory.put;
    vi.spyOn(testDb.baselineHistory, 'put').mockRejectedValueOnce(new Error('Simulated disk I/O failure'));

    await expect(
      BaselineStorageService.saveBaseline(sampleBaselineData, { db: testDb })
    ).rejects.toThrow('Simulated disk I/O failure');

    // Confirm that baselines store was rolled back and is empty
    const baselinesCount = await testDb.baselines.count();
    expect(baselinesCount).toBe(0);

    const historyCount = await testDb.baselineHistory.count();
    expect(historyCount).toBe(0);

    testDb.baselineHistory.put = originalPut;
  });

  // 10. Verify persistence after database reopening
  it('10. Verifies persistence across database close and reopening', async () => {
    await BaselineStorageService.saveBaseline(sampleBaselineData, { db: testDb });

    // Close database connection
    testDb.close();

    // Reopen new instance connecting to the same IndexedDB
    const reopenedDb = new MedulaLocalDB();
    const retrieved = await BaselineStorageService.getBaseline('ASTRO-01', 'heart_rate', 'ARES-V', { db: reopenedDb });

    expect(retrieved).toBeDefined();
    expect(retrieved.median).toBe(72.0);
    expect(retrieved.astronautId).toBe('ASTRO-01');
  });

  /* ==========================================================================
     COMPARISON TESTS (Requirements 11 - 22)
     ========================================================================== */

  // 11. Correct above-baseline comparison (> Q3)
  it('11. Detects ABOVE_BASELINE_PATTERN when value is greater than 75th percentile (Q3)', () => {
    // Q3 is 76.0. Test with 82 bpm
    const measurement = {
      astronautId: 'ASTRO-01',
      metric: 'heart_rate',
      value: 82,
      unit: 'bpm',
    };

    const result = BaselineComparisonService.compareWithBaseline(measurement, sampleBaselineData);

    expect(result.direction).toBe(ComparisonDirection.ABOVE_BASELINE_PATTERN);
    expect(result.medianDirection).toBe(MedianDirection.ABOVE_MEDIAN);
    expect(result.explanation).toContain('above the astronaut\'s historical central range');
  });

  // 12. Correct below-baseline comparison (< Q1)
  it('12. Detects BELOW_BASELINE_PATTERN when value is less than 25th percentile (Q1)', () => {
    // Q1 is 68.0. Test with 62 bpm
    const measurement = {
      astronautId: 'ASTRO-01',
      metric: 'heart_rate',
      value: 62,
      unit: 'bpm',
    };

    const result = BaselineComparisonService.compareWithBaseline(measurement, sampleBaselineData);

    expect(result.direction).toBe(ComparisonDirection.BELOW_BASELINE_PATTERN);
    expect(result.medianDirection).toBe(MedianDirection.BELOW_MEDIAN);
    expect(result.explanation).toContain('below the astronaut\'s historical central range');
  });

  // 13. Correct within-baseline comparison (Q1 <= value <= Q3)
  it('13. Detects WITHIN_BASELINE_PATTERN when value is within Q1 and Q3', () => {
    // Q1 is 68.0, Q3 is 76.0. Test with 72 bpm
    const measurement = {
      astronautId: 'ASTRO-01',
      metric: 'heart_rate',
      value: 72,
      unit: 'bpm',
    };

    const result = BaselineComparisonService.compareWithBaseline(measurement, sampleBaselineData);

    expect(result.direction).toBe(ComparisonDirection.WITHIN_BASELINE_PATTERN);
    expect(result.medianDirection).toBe(MedianDirection.EQUAL_TO_MEDIAN);
    expect(result.explanation).toContain('within the astronaut\'s historical central range');
  });

  // 14. Correct median difference
  it('14. Calculates absoluteDifferenceFromMedian accurately', () => {
    // Median is 72.0. Test with 80 bpm -> diff = +8.0
    const res1 = BaselineComparisonService.compareWithBaseline({
      astronautId: 'ASTRO-01',
      metric: 'heart_rate',
      value: 80,
      unit: 'bpm',
    }, sampleBaselineData);
    expect(res1.absoluteDifferenceFromMedian).toBe(8.0);

    // Test with 65 bpm -> diff = -7.0
    const res2 = BaselineComparisonService.compareWithBaseline({
      astronautId: 'ASTRO-01',
      metric: 'heart_rate',
      value: 65,
      unit: 'bpm',
    }, sampleBaselineData);
    expect(res2.absoluteDifferenceFromMedian).toBe(-7.0);
  });

  // 15. Correct percentage difference
  it('15. Calculates percentageDifferenceFromMedian accurately', () => {
    // Median is 72.0. Test with 90 bpm -> diff = +18 -> pct = (18 / 72) * 100 = 25.0%
    const res = BaselineComparisonService.compareWithBaseline({
      astronautId: 'ASTRO-01',
      metric: 'heart_rate',
      value: 90,
      unit: 'bpm',
    }, sampleBaselineData);
    expect(res.percentageDifferenceFromMedian).toBe(25.0);
  });

  // 16. Handle zero median safely
  it('16. Handles zero median safely without division by zero or NaN', () => {
    const zeroMedianBaseline = {
      ...sampleBaselineData,
      metric: 'stress_score',
      unit: 'score',
      median: 0,
      percentile25: 0,
      percentile75: 5,
    };

    const res = BaselineComparisonService.compareWithBaseline({
      astronautId: 'ASTRO-01',
      metric: 'stress_score',
      value: 10,
      unit: 'score',
    }, zeroMedianBaseline);

    expect(res.percentageDifferenceFromMedian).toBeNull();
    expect(res.warnings[0]).toContain('Baseline median is zero');
  });

  // 17. Handle zero standard deviation safely
  it('17. Handles zero standard deviation safely without division by zero or NaN', () => {
    const zeroStdBaseline = {
      ...sampleBaselineData,
      standardDeviation: 0,
    };

    const res = BaselineComparisonService.compareWithBaseline({
      astronautId: 'ASTRO-01',
      metric: 'heart_rate',
      value: 75,
      unit: 'bpm',
    }, zeroStdBaseline);

    expect(res.standardDeviationDistance).toBeNull();
    expect(res.warnings.some((w) => w.includes('standard deviation is zero'))).toBe(true);
  });

  // 18. Reject mismatched astronaut IDs
  it('18. Rejects comparison if measurement astronautId does not match baseline', () => {
    expect(() => {
      BaselineComparisonService.compareWithBaseline({
        astronautId: 'ASTRO-02', // Mismatch!
        metric: 'heart_rate',
        value: 72,
        unit: 'bpm',
      }, sampleBaselineData);
    }).toThrow('Astronaut ID mismatch');
  });

  // 19. Reject mismatched metrics
  it('19. Rejects comparison if measurement metric does not match baseline', () => {
    expect(() => {
      BaselineComparisonService.compareWithBaseline({
        astronautId: 'ASTRO-01',
        metric: 'hrv', // Mismatch!
        value: 50,
        unit: 'ms',
      }, sampleBaselineData);
    }).toThrow('Metric mismatch');
  });

  // 20. Reject mismatched units
  it('20. Rejects comparison if measurement unit is incompatible with baseline', () => {
    expect(() => {
      BaselineComparisonService.compareWithBaseline({
        astronautId: 'ASTRO-01',
        metric: 'heart_rate',
        value: 72,
        unit: 'km/h', // Incompatible unit!
      }, sampleBaselineData);
    }).toThrow('Unit mismatch');
  });

  // 21. Handle insufficient baseline confidence
  it('21. Returns explicit INSUFFICIENT_DATA result when baseline lacks sufficient data', () => {
    const insufficientBaseline = {
      ...sampleBaselineData,
      sampleCount: 2,
      confidence: BaselineConfidence.INSUFFICIENT_DATA,
      median: null,
      mean: null,
    };

    const res = BaselineComparisonService.compareWithBaseline({
      astronautId: 'ASTRO-01',
      metric: 'heart_rate',
      value: 72,
      unit: 'bpm',
    }, insufficientBaseline);

    expect(res.baselineConfidence).toBe(BaselineConfidence.INSUFFICIENT_DATA);
    expect(res.direction).toBe(ComparisonDirection.INSUFFICIENT_DATA);
    expect(res.explanation).toContain('insufficient historical data');
    expect(res.absoluteDifferenceFromMedian).toBeNull();
  });

  // 22. Ensure outputs contain no NaN or Infinity
  it('22. Guarantees output contains zero NaN or Infinity values when serialized to JSON', () => {
    const res = BaselineComparisonService.compareWithBaseline({
      astronautId: 'ASTRO-01',
      metric: 'heart_rate',
      value: 74,
      unit: 'bpm',
    }, sampleBaselineData);

    const json = JSON.stringify(res);
    expect(json).not.toContain('NaN');
    expect(json).not.toContain('Infinity');
  });

  /* ==========================================================================
     INTEGRATION TESTS (Requirements 23 - 24)
     ========================================================================== */

  // 23. Calculate, save, retrieve and compare a baseline end-to-end
  it('23. Calculates, persists, retrieves and compares a baseline end-to-end', async () => {
    // Historical observations
    const records = [68, 70, 72, 74, 76, 78, 80].map((val, idx) => ({
      recordId: `hr-rec-${idx}`,
      astronautId: 'ASTRO-01',
      missionId: 'ARES-V',
      recordedAt: new Date(Date.parse('2026-11-01T00:00:00.000Z') + idx * 86400000).toISOString(),
      category: 'wearable_physiological',
      data: { metric: 'heart_rate', value: val, unit: 'bpm' },
    }));

    // 1. Calculate baseline
    const calculated = calculateBaseline(records, 'ASTRO-01', 'heart_rate');
    expect(calculated.sampleCount).toBe(7);
    expect(calculated.median).toBe(74.0);

    // 2. Save baseline
    const saved = await BaselineStorageService.saveBaseline(calculated, { db: testDb });
    expect(saved.version).toBe(1);

    // 3. Retrieve baseline
    const retrieved = await BaselineStorageService.getBaseline('ASTRO-01', 'heart_rate', 'ARES-V', { db: testDb });
    expect(retrieved.median).toBe(74.0);

    // 4. Compare new measurement
    const newMeasurement = {
      astronautId: 'ASTRO-01',
      metric: 'heart_rate',
      value: 86,
      unit: 'bpm',
    };
    const comparison = BaselineComparisonService.compareWithBaseline(newMeasurement, retrieved);

    expect(comparison.direction).toBe(ComparisonDirection.ABOVE_BASELINE_PATTERN);
    expect(comparison.absoluteDifferenceFromMedian).toBe(12.0);
    expect(comparison.percentageDifferenceFromMedian).toBe(16.22);
  });

  // 24. Verify offline comparison without backend access
  it('24. Performs comparison entirely offline with zero network or backend dependency', async () => {
    vi.stubGlobal('navigator', { onLine: false });

    try {
      const saved = await BaselineStorageService.saveBaseline(sampleBaselineData, { db: testDb });
      const retrieved = await BaselineStorageService.getBaseline('ASTRO-01', 'heart_rate', 'ARES-V', { db: testDb });

      const offlineComparison = BaselineComparisonService.compareWithBaseline({
        astronautId: 'ASTRO-01',
        metric: 'heart_rate',
        value: 70,
        unit: 'bpm',
      }, retrieved);

      expect(offlineComparison).toBeDefined();
      expect(offlineComparison.direction).toBe(ComparisonDirection.WITHIN_BASELINE_PATTERN);
      expect(offlineComparison.absoluteDifferenceFromMedian).toBe(-2.0);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

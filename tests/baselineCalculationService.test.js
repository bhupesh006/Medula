import { describe, it, expect } from 'vitest';
import {
  calculateMean,
  calculateMedian,
  calculateStandardDeviation,
  calculateMAD,
  calculatePercentile,
  calculateBaseline,
  BaselineConfidence,
} from '../modules/personal-baseline/services/baselineCalculationService.js';

describe('Statistical Baseline Calculation Engine (MDAE Module 02 - Stage 2)', () => {
  // Deterministic dataset: [60, 64, 68, 72, 76, 80, 84] (N = 7)
  // Sum = 504, Mean = 72.0
  // Median = 72.0
  // Deviations: [-12, -8, -4, 0, 4, 8, 12] -> absolute: [0, 4, 4, 8, 8, 12, 12] -> MAD = 8.0
  // Sample variance = (144 + 64 + 16 + 0 + 16 + 64 + 144) / 6 = 448 / 6 = 74.6667 -> std = 8.64
  // 25th percentile: k = 6 * 0.25 = 1.5 -> (64 + 68) / 2 = 66.0
  // 75th percentile: k = 6 * 0.75 = 4.5 -> (76 + 80) / 2 = 78.0
  const sampleValues = [60, 64, 68, 72, 76, 80, 84];

  // 1. Mean
  it('1. Calculates arithmetic mean accurately', () => {
    expect(calculateMean(sampleValues)).toBe(72.0);
    expect(calculateMean([10, 20])).toBe(15.0);
  });

  // 2. Median
  it('2. Calculates median accurately for odd and even length arrays', () => {
    expect(calculateMedian(sampleValues)).toBe(72.0);
    expect(calculateMedian([10, 20, 30, 40])).toBe(25.0);
  });

  // 3. Sample Standard Deviation
  it('3. Calculates sample standard deviation (N - 1 degrees of freedom)', () => {
    expect(calculateStandardDeviation(sampleValues)).toBe(8.64);
    // Single observation returns 0
    expect(calculateStandardDeviation([42])).toBe(0);
  });

  // 4. MAD (Median Absolute Deviation)
  it('4. Calculates median absolute deviation (MAD) accurately', () => {
    expect(calculateMAD(sampleValues)).toBe(8.0);
    expect(calculateMAD([1, 2, 3, 4, 5, 6, 7, 8, 9])).toBe(2.0);
  });

  // 5. 25th and 75th percentiles
  it('5. Calculates 25th and 75th percentiles using linear rank interpolation', () => {
    expect(calculatePercentile(sampleValues, 25)).toBe(66.0);
    expect(calculatePercentile(sampleValues, 75)).toBe(78.0);
  });

  // 6. Empty input handling
  it('6. Handles empty input safely without throwing', () => {
    expect(calculateMean([])).toBeNull();
    expect(calculateMedian([])).toBeNull();
    expect(calculateStandardDeviation([])).toBeNull();
    expect(calculateMAD([])).toBeNull();
    expect(calculatePercentile([], 50)).toBeNull();

    const baseline = calculateBaseline([], 'ASTRO-01', 'heart_rate');
    expect(baseline.sampleCount).toBe(0);
    expect(baseline.confidence).toBe(BaselineConfidence.INSUFFICIENT_DATA);
    expect(baseline.mean).toBeNull();
    expect(baseline.median).toBeNull();
  });

  // 7. Insufficient observations (< 5 observations)
  it('7. Identifies insufficient observations and returns explicit INSUFFICIENT_DATA', () => {
    const fewRecords = [
      {
        recordId: 'rec-01',
        astronautId: 'ASTRO-01',
        recordedAt: '2026-11-01T08:00:00.000Z',
        category: 'wearable_physiological',
        data: { metric: 'heart_rate', value: 70, unit: 'bpm' },
      },
      {
        recordId: 'rec-02',
        astronautId: 'ASTRO-01',
        recordedAt: '2026-11-02T08:00:00.000Z',
        category: 'wearable_physiological',
        data: { metric: 'heart_rate', value: 72, unit: 'bpm' },
      },
      {
        recordId: 'rec-03',
        astronautId: 'ASTRO-01',
        recordedAt: '2026-11-03T08:00:00.000Z',
        category: 'wearable_physiological',
        data: { metric: 'heart_rate', value: 74, unit: 'bpm' },
      },
    ];

    const baseline = calculateBaseline(fewRecords, 'ASTRO-01', 'heart_rate');
    expect(baseline.sampleCount).toBe(3);
    expect(baseline.confidence).toBe(BaselineConfidence.INSUFFICIENT_DATA);
    expect(baseline.mean).toBeNull();
    expect(baseline.median).toBeNull();
    expect(baseline.warnings[0]).toContain('Insufficient sample size');
  });

  // Helper generator for deterministic test records
  const generateRecords = (astronautId, metric, values, unit = 'bpm', category = 'wearable_physiological') => {
    return values.map((val, idx) => ({
      recordId: `${astronautId}-${metric}-${idx}`,
      astronautId,
      recordedAt: new Date(Date.parse('2026-11-01T08:00:00.000Z') + idx * 86400000).toISOString(),
      category,
      data: category === 'wearable_physiological'
        ? { metric, value: val, unit }
        : category === 'manual_assessment'
        ? { [metric]: val }
        : { eventType: 'sleep_session', durationMinutes: val },
    }));
  };

  // 8. Invalid records exclusion
  it('8. Excludes invalid and malformed records from baseline calculation', () => {
    const validRecords = generateRecords('ASTRO-01', 'heart_rate', [68, 70, 72, 74, 76]);
    const invalidRecords = [
      { recordId: 'bad-1', astronautId: 'ASTRO-01', recordedAt: 'invalid-time', category: 'wearable_physiological', data: { metric: 'heart_rate', value: 70, unit: 'bpm' } },
      { recordId: 'bad-2', astronautId: 'ASTRO-01', recordedAt: '2026-11-01T08:00:00.000Z', category: 'wearable_physiological', data: { metric: 'heart_rate', value: 'NaN', unit: 'bpm' } },
      null,
    ];

    const baseline = calculateBaseline([...validRecords, ...invalidRecords], 'ASTRO-01', 'heart_rate');
    expect(baseline.sampleCount).toBe(5);
    expect(baseline.median).toBe(72.0);
  });

  // 9. Duplicate record IDs handling
  it('9. Deduplicates records with identical recordId so no observation is double counted', () => {
    const baseRecords = generateRecords('ASTRO-01', 'heart_rate', [65, 70, 75, 80, 85]);
    // Create duplicates of all records
    const duplicateRecords = [...baseRecords, ...baseRecords];

    const baseline = calculateBaseline(duplicateRecords, 'ASTRO-01', 'heart_rate');
    expect(baseline.sampleCount).toBe(5); // Deduplicated from 10 to 5
    expect(baseline.mean).toBe(75.0);
  });

  // 10. Different astronauts having different baselines
  it('10. Calculates distinct personal baselines for different astronauts without mixing data', () => {
    const astro1Records = generateRecords('ASTRO-01', 'heart_rate', [58, 60, 62, 64, 66]); // Mean = 62
    const astro2Records = generateRecords('ASTRO-02', 'heart_rate', [80, 82, 84, 86, 88]); // Mean = 84
    const combined = [...astro1Records, ...astro2Records];

    const baselineAstro1 = calculateBaseline(combined, 'ASTRO-01', 'heart_rate');
    const baselineAstro2 = calculateBaseline(combined, 'ASTRO-02', 'heart_rate');

    expect(baselineAstro1.sampleCount).toBe(5);
    expect(baselineAstro1.median).toBe(62.0);

    expect(baselineAstro2.sampleCount).toBe(5);
    expect(baselineAstro2.median).toBe(84.0);

    expect(baselineAstro1.median).not.toBe(baselineAstro2.median);
  });

  // 11. Different metrics not being mixed
  it('11. Keeps different metrics isolated without cross-metric mixing', () => {
    const hrRecords = generateRecords('ASTRO-01', 'heart_rate', [70, 72, 74, 76, 78]);
    const hrvRecords = generateRecords('ASTRO-01', 'hrv', [40, 45, 50, 55, 60], 'ms');
    const combined = [...hrRecords, ...hrvRecords];

    const hrBaseline = calculateBaseline(combined, 'ASTRO-01', 'heart_rate');
    const hrvBaseline = calculateBaseline(combined, 'ASTRO-01', 'hrv');

    expect(hrBaseline.sampleCount).toBe(5);
    expect(hrBaseline.median).toBe(74.0);
    expect(hrBaseline.unit).toBe('bpm');

    expect(hrvBaseline.sampleCount).toBe(5);
    expect(hrvBaseline.median).toBe(50.0);
    expect(hrvBaseline.unit).toBe('ms');
  });

  // 12. Incorrect units rejected from baseline
  it('12. Rejects records with incorrect or mismatched units', () => {
    const validRecords = generateRecords('ASTRO-01', 'heart_rate', [70, 72, 74, 76, 78]);
    const badUnitRecord = {
      recordId: 'bad-unit-rec',
      astronautId: 'ASTRO-01',
      recordedAt: '2026-11-06T08:00:00.000Z',
      category: 'wearable_physiological',
      data: { metric: 'heart_rate', value: 75, unit: 'km/h' }, // Wrong unit
    };

    const baseline = calculateBaseline([...validRecords, badUnitRecord], 'ASTRO-01', 'heart_rate');
    expect(baseline.sampleCount).toBe(5); // Bad unit record discarded from sample
  });

  // 13. Sleep duration conversion (durationMinutes / 60)
  it('13. Derives sleep_duration in hours correctly from sleep_session mission events', () => {
    // 420 min (7.0h), 450 min (7.5h), 480 min (8.0h), 510 min (8.5h), 540 min (9.0h)
    const sleepRecords = [420, 450, 480, 510, 540].map((mins, idx) => ({
      recordId: `sleep-${idx}`,
      astronautId: 'ASTRO-01',
      recordedAt: `2026-11-0${idx + 1}T06:00:00.000Z`,
      category: 'mission_event',
      data: {
        eventType: 'sleep_session',
        durationMinutes: mins,
      },
    }));

    const baseline = calculateBaseline(sleepRecords, 'ASTRO-01', 'sleep_duration');
    expect(baseline.sampleCount).toBe(5);
    expect(baseline.unit).toBe('hours');
    expect(baseline.median).toBe(8.0);
    expect(baseline.minimum).toBe(7.0);
    expect(baseline.maximum).toBe(9.0);
  });

  // 14. Outlier handling (Robust statistics: Median and MAD resistance)
  it('14. Demonstrates robust statistics: extreme outlier heavily distorts mean but leaves median and MAD stable', () => {
    // Standard resting HR values: [68, 70, 70, 72, 74, 76]
    // Add extreme outlier (195 bpm during high-stress EVA)
    const standardValues = [68, 70, 70, 72, 74, 76];
    const withOutlier = [...standardValues, 195];

    const meanWithout = calculateMean(standardValues); // 71.67
    const medianWithout = calculateMedian(standardValues); // 71.0
    const madWithout = calculateMAD(standardValues); // 2.0

    const meanWith = calculateMean(withOutlier); // 89.29 (massively shifted by +17.62 bpm)
    const medianWith = calculateMedian(withOutlier); // 72.0 (only shifted by 1.0 bpm!)
    const madWith = calculateMAD(withOutlier); // 2.0 (completely unchanged!)

    expect(Math.abs(meanWith - meanWithout)).toBeGreaterThan(15.0);
    expect(Math.abs(medianWith - medianWithout)).toBeLessThanOrEqual(2.0);
    expect(madWith).toBe(madWithout);
  });

  // 15. No NaN or Infinity in serialized results
  it('15. Ensures baseline outputs are strictly finite with zero NaN or Infinity values', () => {
    const records = generateRecords('ASTRO-01', 'heart_rate', [70, 72, 74, 76, 78]);
    const baseline = calculateBaseline(records, 'ASTRO-01', 'heart_rate');

    const jsonString = JSON.stringify(baseline);
    expect(jsonString).not.toContain('NaN');
    expect(jsonString).not.toContain('Infinity');

    const parsed = JSON.parse(jsonString);
    expect(Number.isFinite(parsed.mean)).toBe(true);
    expect(Number.isFinite(parsed.median)).toBe(true);
    expect(Number.isFinite(parsed.standardDeviation)).toBe(true);
    expect(Number.isFinite(parsed.medianAbsoluteDeviation)).toBe(true);
    expect(Number.isFinite(parsed.minimum)).toBe(true);
    expect(Number.isFinite(parsed.maximum)).toBe(true);
    expect(Number.isFinite(parsed.percentile25)).toBe(true);
    expect(Number.isFinite(parsed.percentile75)).toBe(true);
  });

  // Verification of manual assessment scores baseline
  it('Calculates baseline for manual assessment metric (stress_score)', () => {
    const stressRecords = generateRecords('ASTRO-01', 'stress_score', [20, 25, 30, 35, 40], '', 'manual_assessment');
    const baseline = calculateBaseline(stressRecords, 'ASTRO-01', 'stress_score');

    expect(baseline.sampleCount).toBe(5);
    expect(baseline.unit).toBe('score');
    expect(baseline.median).toBe(30.0);
    expect(baseline.mean).toBe(30.0);
    expect(baseline.minimum).toBe(20.0);
    expect(baseline.maximum).toBe(40.0);
  });
});


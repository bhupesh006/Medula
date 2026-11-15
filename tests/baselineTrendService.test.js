import { describe, it, expect } from 'vitest';
import {
  BaselineTrendService,
  TrendDirection,
} from '../modules/personal-baseline/services/baselineTrendService.js';
import { BaselineConfidence } from '../modules/personal-baseline/services/baselineCalculationService.js';

describe('Health Trend Analysis Engine (MDAE Module 02 - Part C)', () => {
  const mockBaseline = {
    astronautId: 'ASTRO-01',
    metric: 'heart_rate',
    unit: 'bpm',
    median: 72.0,
    mean: 72.4,
    percentile25: 68.0, // Q1
    percentile75: 76.0, // Q3
    confidence: BaselineConfidence.HIGH_CONFIDENCE,
  };

  const createTimeSeries = (values, astronautId = 'ASTRO-01', metric = 'heart_rate') => {
    return values.map((val, idx) => ({
      recordId: `trend-${idx}`,
      astronautId,
      recordedAt: new Date(Date.parse('2026-11-01T08:00:00.000Z') + idx * 3600 * 1000).toISOString(),
      category: 'wearable_physiological',
      data: { metric, value: val, unit: 'bpm' },
    }));
  };

  // 10. Increasing trend detection
  it('10. Detects an INCREASING trend when values exhibit upward trajectory', () => {
    // Upward trend: 70 -> 73 -> 76 -> 79 -> 82 bpm
    const records = createTimeSeries([70, 73, 76, 79, 82]);
    const trend = BaselineTrendService.analyseTrend(records, mockBaseline);

    expect(trend.direction).toBe(TrendDirection.INCREASING);
    expect(trend.totalChange).toBeGreaterThan(0);
    expect(trend.slope).toBeGreaterThan(0);
    expect(trend.explanation).toContain('upward trajectory');
  });

  // 11. Decreasing trend detection
  it('11. Detects a DECREASING trend when values exhibit downward trajectory', () => {
    // Downward trend: 80 -> 77 -> 74 -> 71 -> 68 bpm
    const records = createTimeSeries([80, 77, 74, 71, 68]);
    const trend = BaselineTrendService.analyseTrend(records, mockBaseline);

    expect(trend.direction).toBe(TrendDirection.DECREASING);
    expect(trend.totalChange).toBeLessThan(0);
    expect(trend.slope).toBeLessThan(0);
    expect(trend.explanation).toContain('downward trajectory');
  });

  // 12. Stable trend detection
  it('12. Detects a STABLE pattern when values fluctuate within a tight range', () => {
    // Stable around 72: 72 -> 71 -> 73 -> 72 -> 72 bpm
    const records = createTimeSeries([72, 71, 73, 72, 72]);
    const trend = BaselineTrendService.analyseTrend(records, mockBaseline);

    expect(trend.direction).toBe(TrendDirection.STABLE);
    expect(Math.abs(trend.totalChange)).toBeLessThan(2.0);
    expect(trend.explanation).toContain('stable physiological pattern');
  });

  // 13. Repeated deviations detection
  it('13. Identifies REPEATED_DEVIATIONS when multiple consecutive measurements deviate outside Q1-Q3', () => {
    // Baseline Q1 is 68, Q3 is 76.
    // 3 consecutive elevated values: 82, 84, 85 bpm
    const records = createTimeSeries([74, 75, 82, 84, 85]);
    const trend = BaselineTrendService.analyseTrend(records, mockBaseline);

    expect(trend.repeatedDeviations.detected).toBe(true);
    expect(trend.repeatedDeviations.count).toBeGreaterThanOrEqual(3);
    expect(trend.repeatedDeviations.type).toBe('ABOVE_BASELINE');
  });

  // Outlier resistance: One single unusual reading does NOT trigger persistent trend
  it('Does NOT classify a single isolated outlier as an increasing or decreasing trend', () => {
    // Stable baseline: 72, 72, 73, 195 (isolated spike), 72, 72
    const records = createTimeSeries([72, 72, 73, 195, 72, 72]);
    const trend = BaselineTrendService.analyseTrend(records, mockBaseline);

    // Initial and final values are 72, overall net change is 0.0 bpm
    expect(trend.totalChange).toBe(0.0);
    expect(trend.direction).toBe(TrendDirection.STABLE);
  });

  // Insufficient observations (< 3)
  it('Returns INSUFFICIENT_DATA when sample size is below minimum requirement', () => {
    const records = createTimeSeries([72, 75]); // Only 2 points
    const trend = BaselineTrendService.analyseTrend(records, mockBaseline, { minObservations: 3 });

    expect(trend.direction).toBe(TrendDirection.INSUFFICIENT_DATA);
    expect(trend.sampleCount).toBe(2);
    expect(trend.explanation).toContain('Insufficient historical observations');
  });
});


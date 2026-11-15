import {
  BaselineConfidence,
  ACCEPTED_UNIT_VARIANTS,
  extractMetricData,
} from './baselineCalculationService.js';

export const ComparisonDirection = {
  BELOW_BASELINE_PATTERN: 'BELOW_BASELINE_PATTERN',
  ABOVE_BASELINE_PATTERN: 'ABOVE_BASELINE_PATTERN',
  WITHIN_BASELINE_PATTERN: 'WITHIN_BASELINE_PATTERN',
  INSUFFICIENT_DATA: 'INSUFFICIENT_DATA',
};

export const MedianDirection = {
  BELOW_MEDIAN: 'BELOW_MEDIAN',
  ABOVE_MEDIAN: 'ABOVE_MEDIAN',
  EQUAL_TO_MEDIAN: 'EQUAL_TO_MEDIAN',
  INSUFFICIENT_DATA: 'INSUFFICIENT_DATA',
};

/**
 * Baseline Comparison Service
 * Compares an astronaut's new validated measurement against their individual baseline.
 * Evaluates deviations as statistical observations rather than medical diagnoses.
 */
export class BaselineComparisonService {
  /**
   * Compare a single measurement against an established personal baseline.
   *
   * @param {Object} rawMeasurement - Validated health measurement (raw record or normalized)
   * @param {Object} baseline - Established astronaut baseline
   * @param {Object} [options]
   * @returns {Object} Structured comparison outcome
   */
  static compareWithBaseline(rawMeasurement, baseline, options = {}) {
    if (!rawMeasurement || typeof rawMeasurement !== 'object') {
      throw new Error('Measurement must be a valid non-null object');
    }
    if (!baseline || typeof baseline !== 'object') {
      throw new Error('Baseline must be a valid non-null object');
    }

    // 1. Normalize measurement input (supports raw Module 01 records and flat measurement objects)
    let measurement = null;
    if (rawMeasurement.category && rawMeasurement.data) {
      const metricName = rawMeasurement.data.metric ||
        (rawMeasurement.data.stress_score !== undefined ? 'stress_score' : null) ||
        (rawMeasurement.data.fatigue_score !== undefined ? 'fatigue_score' : null) ||
        (rawMeasurement.data.mood_score !== undefined ? 'mood_score' : null) ||
        (rawMeasurement.data.eventType === 'sleep_session' ? 'sleep_duration' : null) ||
        baseline.metric;

      const extracted = extractMetricData(rawMeasurement, metricName);
      if (extracted) {
        measurement = {
          astronautId: rawMeasurement.astronautId,
          metric: metricName,
          value: extracted.value,
          unit: extracted.unit,
          recordedAt: rawMeasurement.recordedAt,
        };
      }
    }

    if (!measurement) {
      measurement = {
        astronautId: rawMeasurement.astronautId,
        metric: rawMeasurement.metric || baseline.metric,
        value: Number(rawMeasurement.value),
        unit: rawMeasurement.unit || baseline.unit,
        recordedAt: rawMeasurement.recordedAt || new Date().toISOString(),
      };
    }

    // 2. Strict Astronaut ID validation
    if (measurement.astronautId !== baseline.astronautId) {
      throw new Error(
        `Astronaut ID mismatch: measurement belongs to '${measurement.astronautId}', but baseline is for '${baseline.astronautId}'`
      );
    }

    // 3. Strict Metric validation
    if (measurement.metric !== baseline.metric) {
      throw new Error(
        `Metric mismatch: measurement is '${measurement.metric}', but baseline is for '${baseline.metric}'`
      );
    }

    // 4. Unit consistency check
    const validVariants = ACCEPTED_UNIT_VARIANTS[baseline.metric] || [baseline.unit];
    if (measurement.unit !== baseline.unit && !validVariants.includes(measurement.unit)) {
      throw new Error(
        `Unit mismatch: measurement unit '${measurement.unit}' does not match baseline unit '${baseline.unit}'`
      );
    }

    // 5. Finite numeric value check
    if (!Number.isFinite(measurement.value)) {
      throw new Error('Measurement value must be a valid finite number');
    }

    const comparedAt = options.comparedAt || new Date().toISOString();
    const warnings = [];

    // 6. Handle Insufficient Data / Unestablished Baseline
    if (
      baseline.confidence === BaselineConfidence.INSUFFICIENT_DATA ||
      baseline.median === null ||
      baseline.sampleCount < 5
    ) {
      return {
        astronautId: measurement.astronautId,
        metric: measurement.metric,
        currentValue: Number(measurement.value.toFixed(2)),
        unit: baseline.unit,
        baselineMedian: null,
        baselineMean: null,
        baselineStandardDeviation: null,
        baselineMAD: null,
        percentile25: null,
        percentile75: null,
        absoluteDifferenceFromMedian: null,
        percentageDifferenceFromMedian: null,
        standardDeviationDistance: null,
        direction: ComparisonDirection.INSUFFICIENT_DATA,
        medianDirection: MedianDirection.INSUFFICIENT_DATA,
        baselineConfidence: BaselineConfidence.INSUFFICIENT_DATA,
        explanation: 'There is insufficient historical data to make a reliable personal comparison.',
        warnings: [
          'Baseline confidence is INSUFFICIENT_DATA. Comparison cannot be reliably evaluated without adequate historical samples.',
        ],
        comparedAt,
      };
    }

    const currentValue = Number(measurement.value.toFixed(2));
    const baselineMedian = baseline.median;
    const baselineMean = baseline.mean;
    const baselineStandardDeviation = baseline.standardDeviation;
    const baselineMAD = baseline.medianAbsoluteDeviation;
    const percentile25 = baseline.percentile25;
    const percentile75 = baseline.percentile75;

    // 7. Calculate Absolute Difference from Median
    const absoluteDiff = Number((currentValue - baselineMedian).toFixed(2));

    // 8. Calculate Percentage Difference from Median (only if denominator is nonzero)
    let percentageDiff = null;
    if (baselineMedian !== 0 && Number.isFinite(baselineMedian)) {
      const pct = ((currentValue - baselineMedian) / Math.abs(baselineMedian)) * 100;
      percentageDiff = Number.isFinite(pct) ? Number(pct.toFixed(2)) : null;
    } else {
      warnings.push('Baseline median is zero; percentage difference is mathematically undefined and omitted.');
    }

    // 9. Calculate Standard Deviation Distance (z-distance)
    let stdDistance = null;
    if (baselineStandardDeviation && baselineStandardDeviation > 0) {
      const z = (currentValue - baselineMedian) / baselineStandardDeviation;
      stdDistance = Number.isFinite(z) ? Number(z.toFixed(2)) : null;
    } else {
      warnings.push('Baseline standard deviation is zero; standard deviation distance is omitted.');
    }

    // 10. Determine Direction relative to Interquartile Range (IQR: Q1 to Q3)
    let direction;
    let explanation;

    if (percentile25 !== null && currentValue < percentile25) {
      direction = ComparisonDirection.BELOW_BASELINE_PATTERN;
      explanation = "The current measurement is below the astronaut's historical central range.";
    } else if (percentile75 !== null && currentValue > percentile75) {
      direction = ComparisonDirection.ABOVE_BASELINE_PATTERN;
      explanation = "The current measurement is above the astronaut's historical central range.";
    } else {
      direction = ComparisonDirection.WITHIN_BASELINE_PATTERN;
      explanation = "The current measurement is within the astronaut's historical central range.";
    }

    // 11. Determine Direction relative to Median
    let medianDirection;
    if (currentValue > baselineMedian) {
      medianDirection = MedianDirection.ABOVE_MEDIAN;
    } else if (currentValue < baselineMedian) {
      medianDirection = MedianDirection.BELOW_MEDIAN;
    } else {
      medianDirection = MedianDirection.EQUAL_TO_MEDIAN;
    }

    // Add baseline staleness / quality warnings from baseline if any
    if (Array.isArray(baseline.warnings)) {
      for (const w of baseline.warnings) {
        if (!warnings.includes(w)) warnings.push(w);
      }
    }

    return {
      astronautId: measurement.astronautId,
      metric: measurement.metric,
      currentValue,
      unit: baseline.unit,
      baselineMedian,
      baselineMean,
      baselineStandardDeviation,
      baselineMAD,
      percentile25,
      percentile75,
      absoluteDifferenceFromMedian: absoluteDiff,
      percentageDifferenceFromMedian: percentageDiff,
      standardDeviationDistance: stdDistance,
      direction,
      medianDirection,
      baselineConfidence: baseline.confidence,
      explanation,
      warnings,
      comparedAt,
    };
  }
}

export const compareWithBaseline = BaselineComparisonService.compareWithBaseline;


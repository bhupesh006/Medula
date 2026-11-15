/**
 * MEDULA — Module 02: Personal Baseline Engine (PBE)
 * Statistical Baseline Calculation Service
 *
 * Implements robust, deterministic personal baseline statistics for astronaut health metrics.
 * Uses robust statistics (median and MAD) to prevent outlier distortion while preserving
 * all technically valid historical observations.
 */

export const BaselineConfidence = {
  INSUFFICIENT_DATA: 'INSUFFICIENT_DATA',
  LOW_CONFIDENCE: 'LOW_CONFIDENCE',
  MODERATE_CONFIDENCE: 'MODERATE_CONFIDENCE',
  HIGH_CONFIDENCE: 'HIGH_CONFIDENCE',
};

export const DEFAULT_CONFIDENCE_THRESHOLDS = {
  minSamples: 5,        // Below this: INSUFFICIENT_DATA
  lowThreshold: 10,     // 5-9: LOW_CONFIDENCE
  moderateThreshold: 30, // 10-29: MODERATE_CONFIDENCE
  // 30+: HIGH_CONFIDENCE
};

export const METRIC_UNITS = {
  heart_rate: 'bpm',
  hrv: 'ms',
  spo2: '%',
  systolic_bp: 'mmHg',
  diastolic_bp: 'mmHg',
  body_temperature: '°C',
  sleep_duration: 'hours',
  stress_score: 'score',
  fatigue_score: 'score',
  mood_score: 'score',
};

export const ACCEPTED_UNIT_VARIANTS = {
  heart_rate: ['bpm', 'BPM'],
  hrv: ['ms', 'MS'],
  spo2: ['%', 'percent'],
  systolic_bp: ['mmHg'],
  diastolic_bp: ['mmHg'],
  body_temperature: ['°C', 'degC', 'C'],
  sleep_duration: ['hours', 'h', 'hrs'],
  stress_score: ['score', 'points', ''],
  fatigue_score: ['score', 'points', ''],
  mood_score: ['score', 'points', ''],
};

/**
 * 1. Calculate Arithmetic Mean
 * @param {number[]} values
 * @returns {number|null}
 */
export function calculateMean(values) {
  if (!Array.isArray(values) || values.length === 0) return null;
  const sum = values.reduce((acc, v) => acc + v, 0);
  const mean = sum / values.length;
  return Number.isFinite(mean) ? Number(mean.toFixed(2)) : null;
}

/**
 * 2. Calculate Median
 * Sorts values ascending and finds the central value or average of two central values.
 * @param {number[]} values
 * @returns {number|null}
 */
export function calculateMedian(values) {
  if (!Array.isArray(values) || values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  let median;
  if (sorted.length % 2 === 0) {
    median = (sorted[mid - 1] + sorted[mid]) / 2;
  } else {
    median = sorted[mid];
  }
  return Number.isFinite(median) ? Number(median.toFixed(2)) : null;
}

/**
 * 3. Calculate Sample Standard Deviation (s)
 * Uses N - 1 degrees of freedom for an unbiased sample variance estimator.
 * For N <= 1, returns 0.
 * @param {number[]} values
 * @returns {number|null}
 */
export function calculateStandardDeviation(values) {
  if (!Array.isArray(values) || values.length === 0) return null;
  if (values.length === 1) return 0;

  const sum = values.reduce((acc, v) => acc + v, 0);
  const mean = sum / values.length;
  const varianceSum = values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0);
  const variance = varianceSum / (values.length - 1);
  const std = Math.sqrt(variance);
  return Number.isFinite(std) ? Number(std.toFixed(2)) : null;
}

/**
 * 4. Calculate Median Absolute Deviation (MAD)
 * Robust measure of statistical dispersion: median(|x_i - median(x)|).
 * Highly resistant to extreme outlier distortion.
 * @param {number[]} values
 * @returns {number|null}
 */
export function calculateMAD(values) {
  if (!Array.isArray(values) || values.length === 0) return null;
  const med = calculateMedian(values);
  if (med === null) return null;

  const deviations = values.map((v) => Math.abs(v - med));
  return calculateMedian(deviations);
}

/**
 * 5. Calculate Percentile
 * Uses standard NIST linear interpolation method between adjacent ranks:
 * index = (N - 1) * (percentile / 100).
 *
 * @param {number[]} values
 * @param {number} percentile (0 to 100)
 * @returns {number|null}
 */
export function calculatePercentile(values, percentile) {
  if (!Array.isArray(values) || values.length === 0) return null;
  if (percentile < 0 || percentile > 100) {
    throw new Error(`Percentile must be between 0 and 100, received ${percentile}`);
  }

  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 1) return sorted[0];

  const q = percentile / 100;
  const k = (sorted.length - 1) * q;
  const lowerIndex = Math.floor(k);
  const upperIndex = Math.ceil(k);

  if (lowerIndex === upperIndex) {
    return Number(sorted[lowerIndex].toFixed(2));
  }

  const fraction = k - lowerIndex;
  const interpolated = sorted[lowerIndex] + fraction * (sorted[upperIndex] - sorted[lowerIndex]);
  return Number.isFinite(interpolated) ? Number(interpolated.toFixed(2)) : null;
}

/**
 * Extract and validate metric value and unit from a raw Module 01 record.
 * Handles Wearable, Manual Assessment, and Sleep Session categories.
 *
 * @param {Object} record - Raw record from Module 01
 * @param {string} metric - Target metric name
 * @returns {{ value: number, unit: string, recordedAt: string, recordId: string } | null}
 */
export function extractMetricData(record, metric) {
  if (!record || typeof record !== 'object') return null;
  if (!record.recordId || !record.recordedAt) return null;

  // Validate recordedAt is a parseable timestamp
  if (isNaN(Date.parse(record.recordedAt))) return null;

  const dataObj = record.data || record;
  const category = record.category || (dataObj.metric ? 'wearable_physiological' : undefined);

  // 1. Wearable Physiological Metrics
  const wearableMetrics = ['heart_rate', 'hrv', 'spo2', 'systolic_bp', 'diastolic_bp', 'body_temperature'];
  if (wearableMetrics.includes(metric)) {
    if (category && category !== 'wearable_physiological') return null;
    if (dataObj.metric !== metric) return null;

    const val = Number(dataObj.value);
    if (!Number.isFinite(val)) return null;

    // Unit verification
    const validUnits = ACCEPTED_UNIT_VARIANTS[metric] || [];
    if (dataObj.unit && !validUnits.includes(dataObj.unit)) return null;

    return {
      value: val,
      unit: METRIC_UNITS[metric],
      recordedAt: record.recordedAt,
      recordId: record.recordId,
    };
  }

  // 2. Manual Assessment Scores
  const assessmentMetrics = ['stress_score', 'fatigue_score', 'mood_score'];
  if (assessmentMetrics.includes(metric)) {
    if (category && category !== 'manual_assessment') return null;
    if (dataObj[metric] === undefined || dataObj[metric] === null) return null;

    const val = Number(dataObj[metric]);
    if (!Number.isFinite(val)) return null;

    return {
      value: val,
      unit: METRIC_UNITS[metric],
      recordedAt: record.recordedAt,
      recordId: record.recordId,
    };
  }

  // 3. Sleep Duration Recovery Metric
  if (metric === 'sleep_duration') {
    // Derived from mission_event sleep_session (durationMinutes / 60)
    if (category === 'mission_event' && (dataObj.eventType === 'sleep_session' || record.eventType === 'sleep_session')) {
      const durationMin = Number(dataObj.durationMinutes || record.durationMinutes);
      if (!Number.isFinite(durationMin) || durationMin < 0) return null;

      return {
        value: Number((durationMin / 60).toFixed(2)),
        unit: 'hours',
        recordedAt: record.recordedAt,
        recordId: record.recordId,
      };
    }

    // Direct sleepHours from assessment
    if (dataObj.sleepHours !== undefined && dataObj.sleepHours !== null) {
      const val = Number(dataObj.sleepHours);
      if (!Number.isFinite(val)) return null;
      return {
        value: val,
        unit: 'hours',
        recordedAt: record.recordedAt,
        recordId: record.recordId,
      };
    }

    // Or direct sleep_duration measurement if stored
    if (dataObj.metric === 'sleep_duration') {
      const val = Number(dataObj.value);
      if (!Number.isFinite(val)) return null;
      return {
        value: val,
        unit: 'hours',
        recordedAt: record.recordedAt,
        recordId: record.recordId,
      };
    }
  }

  // Exclude radiation measurements or ordinary non-sleep mission activities from baselines
  return null;
}

/**
 * 6. Calculate Personal Astronaut Baseline
 *
 * Filters records for the specific astronaut and metric, eliminates duplicate records,
 * performs sample standard deviation and robust statistics (median and MAD),
 * and evaluates confidence categories with audit warnings.
 *
 * @param {Array<Object>} records - Raw historical records
 * @param {string} astronautId - Target astronaut identifier
 * @param {string} metric - Target health metric
 * @param {Object} [options] - Configuration options
 * @returns {Object} Personal baseline outcome object
 */
export function calculateBaseline(records, astronautId, metric, options = {}) {
  const thresholds = {
    ...DEFAULT_CONFIDENCE_THRESHOLDS,
    ...options.confidenceThresholds,
  };

  const defaultUnit = METRIC_UNITS[metric] || 'units';
  const warnings = [];

  // Input validation
  if (!astronautId || typeof astronautId !== 'string') {
    throw new Error('astronautId is required and must be a non-empty string');
  }
  if (!metric || typeof metric !== 'string') {
    throw new Error('metric is required and must be a non-empty string');
  }

  // Filter, validate, and deduplicate records
  const seenRecordIds = new Set();
  const eligibleDataPoints = [];

  if (Array.isArray(records)) {
    for (const record of records) {
      if (!record || record.astronautId !== astronautId) continue;

      // Duplicate record ID protection
      if (seenRecordIds.has(record.recordId)) {
        continue;
      }
      seenRecordIds.add(record.recordId);

      const extracted = extractMetricData(record, metric);
      if (extracted !== null) {
        eligibleDataPoints.push(extracted);
      }
    }
  }

  // Sort chronologically by recordedAt
  eligibleDataPoints.sort((a, b) => Date.parse(a.recordedAt) - Date.parse(b.recordedAt));

  const sampleCount = eligibleDataPoints.length;
  const values = eligibleDataPoints.map((dp) => dp.value);

  // Determine calculation period
  const calculationPeriodStart = sampleCount > 0 ? eligibleDataPoints[0].recordedAt : null;
  const calculationPeriodEnd = sampleCount > 0 ? eligibleDataPoints[sampleCount - 1].recordedAt : null;

  // Evaluate baseline confidence category
  let confidence = BaselineConfidence.INSUFFICIENT_DATA;
  if (sampleCount < thresholds.minSamples) {
    confidence = BaselineConfidence.INSUFFICIENT_DATA;
    warnings.push(
      `Insufficient sample size (${sampleCount}/${thresholds.minSamples} observations). Baseline cannot be statistically established.`
    );
  } else if (sampleCount < thresholds.lowThreshold) {
    confidence = BaselineConfidence.LOW_CONFIDENCE;
    warnings.push(
      `Low sample count (${sampleCount} observations). Baseline has low statistical stability.`
    );
  } else if (sampleCount < thresholds.moderateThreshold) {
    confidence = BaselineConfidence.MODERATE_CONFIDENCE;
  } else {
    confidence = BaselineConfidence.HIGH_CONFIDENCE;
  }

  // Staleness / Time Window Quality Warnings
  if (sampleCount >= thresholds.minSamples && calculationPeriodStart && calculationPeriodEnd) {
    const timeSpanMs = Date.parse(calculationPeriodEnd) - Date.parse(calculationPeriodStart);
    const oneHourMs = 60 * 60 * 1000;
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    // High concentration warning: samples gathered over less than an hour
    if (timeSpanMs < oneHourMs && sampleCount >= 5) {
      warnings.push(
        'Observations are concentrated within a narrow time window (< 1 hour). Diurnal variation may not be captured.'
      );
    }

    // Stale data warning
    const nowMs = Date.now();
    const endMs = Date.parse(calculationPeriodEnd);
    if (nowMs - endMs > sevenDaysMs) {
      warnings.push(
        'Latest historical observation is older than 7 days. Baseline may not reflect current physiological adaptation.'
      );
    }
  }

  // In case of insufficient data, return clean structure without NaN or Infinity
  if (sampleCount < thresholds.minSamples) {
    return {
      astronautId,
      metric,
      unit: defaultUnit,
      sampleCount,
      mean: null,
      median: null,
      standardDeviation: null,
      medianAbsoluteDeviation: null,
      minimum: null,
      maximum: null,
      percentile25: null,
      percentile75: null,
      confidence,
      calculationPeriodStart,
      calculationPeriodEnd,
      warnings,
      calculationMethod: 'robust_sample_statistics',
    };
  }

  // Compute statistics
  const sortedValues = [...values].sort((a, b) => a - b);
  const mean = calculateMean(values);
  const median = calculateMedian(values);
  const standardDeviation = calculateStandardDeviation(values);
  const medianAbsoluteDeviation = calculateMAD(values);
  const minimum = Number(sortedValues[0].toFixed(2));
  const maximum = Number(sortedValues[sortedValues.length - 1].toFixed(2));
  const percentile25 = calculatePercentile(values, 25);
  const percentile75 = calculatePercentile(values, 75);

  return {
    astronautId,
    missionId: options.missionId || 'ARES-V',
    metric,
    unit: defaultUnit,
    sampleCount,
    mean,
    median,
    standardDeviation,
    medianAbsoluteDeviation,
    minimum,
    maximum,
    percentile25,
    percentile75,
    confidence,
    calculationPeriodStart,
    calculationPeriodEnd,
    warnings,
    calculationMethod: 'robust_sample_statistics',
  };
}


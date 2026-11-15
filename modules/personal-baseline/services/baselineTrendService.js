import { extractMetricData } from './baselineCalculationService.js';

export const TrendDirection = {
  INCREASING: 'INCREASING',
  DECREASING: 'DECREASING',
  STABLE: 'STABLE',
  REPEATED_DEVIATIONS: 'REPEATED_DEVIATIONS',
  INSUFFICIENT_DATA: 'INSUFFICIENT_DATA',
};

/**
 * MEDULA — Module 02: Personal Baseline Engine (PBE)
 * Health Trend Analysis Service
 *
 * Evaluates chronological series of validated health measurements to identify
 * upward, downward, stable, or persistently deviating trajectories.
 * Avoids misclassifying isolated outliers as persistent trends.
 */
export class BaselineTrendService {
  /**
   * Analyse trend direction and deviation patterns over a chronological series.
   *
   * @param {Array<Object>} records - Raw or normalized records
   * @param {Object} baseline - Established personal baseline
   * @param {Object} [options] - Options (e.g., astronautId, metric, minObservations)
   * @returns {Object} Structured trend analysis outcome
   */
  static analyseTrend(records, baseline, options = {}) {
    const astronautId = options.astronautId || baseline?.astronautId;
    const metric = options.metric || baseline?.metric;
    const minObservations = options.minObservations || 3;

    if (!astronautId || !metric) {
      throw new Error('astronautId and metric are required to perform trend analysis');
    }

    // 1. Extract and validate data points
    const eligiblePoints = [];
    const seenIds = new Set();

    if (Array.isArray(records)) {
      for (const record of records) {
        if (!record || record.astronautId !== astronautId) continue;
        if (record.recordId && seenIds.has(record.recordId)) continue;
        if (record.recordId) seenIds.add(record.recordId);

        let point = null;
        if (record.category && record.data) {
          const extracted = extractMetricData(record, metric);
          if (extracted) {
            point = {
              value: extracted.value,
              unit: extracted.unit,
              recordedAt: extracted.recordedAt,
              recordId: extracted.recordId,
            };
          }
        } else if (Number.isFinite(Number(record.value))) {
          point = {
            value: Number(record.value),
            unit: record.unit || baseline?.unit || 'units',
            recordedAt: record.recordedAt || new Date().toISOString(),
            recordId: record.recordId || `point-${eligiblePoints.length}`,
          };
        }

        if (point && !isNaN(Date.parse(point.recordedAt))) {
          eligiblePoints.push(point);
        }
      }
    }

    // 2. Sort strictly chronologically
    eligiblePoints.sort((a, b) => Date.parse(a.recordedAt) - Date.parse(b.recordedAt));

    const sampleCount = eligiblePoints.length;

    // 3. Handle Insufficient Data (< minObservations)
    if (sampleCount < minObservations) {
      return {
        astronautId,
        metric,
        direction: TrendDirection.INSUFFICIENT_DATA,
        sampleCount,
        windowStart: sampleCount > 0 ? eligiblePoints[0].recordedAt : null,
        windowEnd: sampleCount > 0 ? eligiblePoints[sampleCount - 1].recordedAt : null,
        slope: null,
        totalChange: null,
        percentageChange: null,
        repeatedDeviations: {
          detected: false,
          count: 0,
          type: 'NONE',
          details: [],
        },
        explanation: `Insufficient historical observations (${sampleCount}/${minObservations}) to establish a trajectory.`,
        dataPoints: eligiblePoints,
      };
    }

    const windowStart = eligiblePoints[0].recordedAt;
    const windowEnd = eligiblePoints[sampleCount - 1].recordedAt;
    const values = eligiblePoints.map((p) => p.value);

    // 4. Check for Repeated Deviations relative to Baseline (if baseline provided)
    const deviationAnalysis = this.identifyRepeatedDeviations(eligiblePoints, baseline);

    // 5. Detect Trend Direction using Simple Linear Regression over normalized time
    const trendOutcome = this.detectTrendDirection(eligiblePoints, baseline);

    // 6. Formulate Objective Explanations
    let finalDirection = trendOutcome.direction;
    let explanation = '';

    // If there are strong repeated deviations outside baseline pattern, flag accordingly
    if (deviationAnalysis.detected && deviationAnalysis.count >= 3 && finalDirection === TrendDirection.STABLE) {
      finalDirection = TrendDirection.REPEATED_DEVIATIONS;
      explanation = `Persistent deviations observed: ${deviationAnalysis.count} recent observations lie outside historical central patterns.`;
    } else if (finalDirection === TrendDirection.INCREASING) {
      explanation = `Measurements exhibit an upward trajectory over the observed period (${trendOutcome.totalChange >= 0 ? '+' : ''}${trendOutcome.totalChange.toFixed(2)} ${baseline?.unit || ''}, ${trendOutcome.percentageChange >= 0 ? '+' : ''}${trendOutcome.percentageChange.toFixed(1)}%).`;
    } else if (finalDirection === TrendDirection.DECREASING) {
      explanation = `Measurements exhibit a downward trajectory over the observed period (${trendOutcome.totalChange.toFixed(2)} ${baseline?.unit || ''}, ${trendOutcome.percentageChange.toFixed(1)}%).`;
    } else {
      explanation = 'Measurements demonstrate a relatively stable physiological pattern within the observed window.';
    }

    return {
      astronautId,
      metric,
      direction: finalDirection,
      sampleCount,
      windowStart,
      windowEnd,
      slope: trendOutcome.slope,
      totalChange: trendOutcome.totalChange,
      percentageChange: trendOutcome.percentageChange,
      repeatedDeviations: deviationAnalysis,
      explanation,
      dataPoints: eligiblePoints,
    };
  }

  /**
   * Linear Regression slope and percentage change detection.
   */
  static detectTrendDirection(points, baseline) {
    const n = points.length;
    if (n < 2) {
      return {
        direction: TrendDirection.INSUFFICIENT_DATA,
        slope: 0,
        totalChange: 0,
        percentageChange: 0,
      };
    }

    // Time in hours from first point
    const t0 = Date.parse(points[0].recordedAt);
    const times = points.map((p) => (Date.parse(p.recordedAt) - t0) / (3600 * 1000));
    const values = points.map((p) => p.value);

    const meanT = times.reduce((acc, t) => acc + t, 0) / n;
    const meanY = values.reduce((acc, y) => acc + y, 0) / n;

    let numerator = 0;
    let denominator = 0;
    for (let i = 0; i < n; i++) {
      numerator += (times[i] - meanT) * (values[i] - meanY);
      denominator += Math.pow(times[i] - meanT, 2);
    }

    // If all timestamps are identical, denominator is 0; use index-based slope
    let slope = 0;
    if (denominator > 0) {
      slope = numerator / denominator;
    } else {
      let idxNum = 0;
      let idxDen = 0;
      const meanIdx = (n - 1) / 2;
      for (let i = 0; i < n; i++) {
        idxNum += (i - meanIdx) * (values[i] - meanY);
        idxDen += Math.pow(i - meanIdx, 2);
      }
      slope = idxDen > 0 ? idxNum / idxDen : 0;
    }

    const firstVal = values[0];
    const lastVal = values[n - 1];
    const totalChange = Number((lastVal - firstVal).toFixed(2));

    const refDenominator = baseline?.median || (Math.abs(firstVal) > 0 ? Math.abs(firstVal) : 1);
    const percentageChange = Number(((totalChange / Math.abs(refDenominator)) * 100).toFixed(2));

    // Thresholds: minimum 3% relative change or significant positive/negative slope
    const thresholdPct = 3.0; // 3% meaningful change

    let direction = TrendDirection.STABLE;
    if (percentageChange >= thresholdPct && slope > 0) {
      direction = TrendDirection.INCREASING;
    } else if (percentageChange <= -thresholdPct && slope < 0) {
      direction = TrendDirection.DECREASING;
    } else {
      direction = TrendDirection.STABLE;
    }

    return {
      direction,
      slope: Number(slope.toFixed(4)),
      totalChange,
      percentageChange,
    };
  }

  /**
   * Identify repeated deviations outside baseline interquartile range (Q1 to Q3).
   */
  static identifyRepeatedDeviations(points, baseline) {
    if (!baseline || baseline.percentile25 === null || baseline.percentile75 === null) {
      return {
        detected: false,
        count: 0,
        type: 'NONE',
        details: [],
      };
    }

    const q1 = baseline.percentile25;
    const q3 = baseline.percentile75;

    let highCount = 0;
    let lowCount = 0;
    const deviatingPoints = [];

    // Inspect the recent observation window (up to last 5 points)
    const recentPoints = points.slice(-5);
    for (const pt of recentPoints) {
      if (pt.value > q3) {
        highCount++;
        deviatingPoints.push({ recordId: pt.recordId, value: pt.value, type: 'ABOVE_Q3' });
      } else if (pt.value < q1) {
        lowCount++;
        deviatingPoints.push({ recordId: pt.recordId, value: pt.value, type: 'BELOW_Q1' });
      }
    }

    const totalDeviations = highCount + lowCount;
    const detected = totalDeviations >= 3;

    let type = 'NONE';
    if (highCount >= 3 && lowCount === 0) type = 'ABOVE_BASELINE';
    else if (lowCount >= 3 && highCount === 0) type = 'BELOW_BASELINE';
    else if (detected) type = 'MIXED';

    return {
      detected,
      count: totalDeviations,
      type,
      details: deviatingPoints,
    };
  }
}

export const analyseTrend = BaselineTrendService.analyseTrend.bind(BaselineTrendService);


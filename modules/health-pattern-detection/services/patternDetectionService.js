import { v4 as uuidv4 } from 'uuid';
import { BaselineComparisonService, ComparisonDirection } from '../../personal-baseline/services/baselineComparisonService.js';
import { BaselineConfidence } from '../../personal-baseline/services/baselineCalculationService.js';
import { localDb } from '../../../database/localDatabase.js';

export const OperationalState = {
  NORMAL: 'NORMAL',
  OBSERVE: 'OBSERVE',
  ASSESS: 'ASSESS',
  ESCALATE: 'ESCALATE',
};

export const PatternConfidence = {
  INSUFFICIENT_DATA: 'INSUFFICIENT_DATA',
  LOW_CONFIDENCE: 'LOW_CONFIDENCE',
  MODERATE_CONFIDENCE: 'MODERATE_CONFIDENCE',
  HIGH_CONFIDENCE: 'HIGH_CONFIDENCE',
};

export const HealthDomains = {
  CARDIOVASCULAR: 'cardiovascular',
  SLEEP_RECOVERY: 'sleep_recovery',
  PSYCHOLOGICAL: 'psychological',
  PHYSICAL_PERFORMANCE: 'physical_performance',
  RADIATION_EXPOSURE: 'radiation_exposure',
};

export const DOMAIN_METRICS = {
  [HealthDomains.CARDIOVASCULAR]: ['heart_rate', 'hrv', 'systolic_bp', 'diastolic_bp', 'spo2'],
  [HealthDomains.SLEEP_RECOVERY]: ['sleep_duration', 'fatigue_score', 'hrv'],
  [HealthDomains.PSYCHOLOGICAL]: ['stress_score', 'mood_score', 'sleep_duration', 'fatigue_score'],
  [HealthDomains.PHYSICAL_PERFORMANCE]: ['exercise_duration', 'heart_rate', 'fatigue_score'],
  [HealthDomains.RADIATION_EXPOSURE]: ['cumulative_dose', 'dose_rate'],
};

/**
 * MEDULA — Module 03: Multi-Indicator Health Pattern Detection Engine (MHPDE)
 *
 * Evaluates combinations of health indicators against personal baselines and mission context.
 * Identifies emerging multi-indicator trajectories without generating medical diagnoses.
 */
export class PatternDetectionService {
  /**
   * Analyse a specific health domain for an astronaut.
   *
   * @param {string} astronautId
   * @param {string} domain - HealthDomains enum value
   * @param {Array<Object>} measurements - Recent validated measurements
   * @param {Map<string, Object>|Object} baselines - Map or object of active personal baselines
   * @param {Array<Object>} [missionEvents] - Contextual mission events (exercise, sleep, EVA)
   * @param {Object} [options]
   * @returns {Object} Comprehensive domain pattern outcome
   */
  static analyseHealthDomain(astronautId, domain, measurements = [], baselines = {}, missionEvents = [], options = {}) {
    if (!astronautId) {
      throw new Error('astronautId is required for pattern analysis');
    }
    if (!domain || !Object.values(HealthDomains).includes(domain)) {
      throw new Error(`Invalid or unsupported health domain: '${domain}'`);
    }

    const domainMetrics = DOMAIN_METRICS[domain] || [];
    const windowHours = options.windowHours || 48;
    const now = options.referenceTime ? new Date(options.referenceTime).getTime() : Date.now();
    const windowStartMs = now - windowHours * 3600 * 1000;

    // Helper to get baseline object for a metric
    const getBaselineForMetric = (metric) => {
      if (baselines instanceof Map) return baselines.get(metric) || null;
      return baselines[metric] || null;
    };

    // 1. Separate Radiation Domain Handling (Strict Isolation from normal physiological correlation)
    if (domain === HealthDomains.RADIATION_EXPOSURE) {
      return this._analyseRadiationDomain(astronautId, measurements, options);
    }

    // 2. Filter and extract latest domain measurements for this astronaut
    const indicatorEvaluations = [];
    const missingMetrics = [];
    const staleMetrics = [];
    const relevantMeasurementIds = [];

    for (const metric of domainMetrics) {
      // Find measurements for this metric within window
      const metricRecords = measurements.filter((m) => {
        if (!m || m.astronautId !== astronautId) return false;
        if (m.data?.metric === metric) return true;
        if (metric === 'sleep_duration' && m.data?.eventType === 'sleep_session') return true;
        if (metric === 'exercise_duration' && m.data?.eventType === 'exercise_session') return true;
        if (['stress_score', 'fatigue_score', 'mood_score'].includes(metric) && m.data?.[metric] !== undefined) return true;
        return false;
      });

      if (metricRecords.length === 0) {
        missingMetrics.push(metric);
        continue;
      }

      // Sort by recordedAt descending (latest first)
      metricRecords.sort((a, b) => Date.parse(b.recordedAt) - Date.parse(a.recordedAt));
      const latestRecord = metricRecords[0];
      const recordTime = Date.parse(latestRecord.recordedAt);
      relevantMeasurementIds.push(latestRecord.recordId);

      // Check staleness (> 36 hours)
      const isStale = now - recordTime > 36 * 3600 * 1000;
      if (isStale) staleMetrics.push(metric);

      // Extract numeric value & unit
      let val = null;
      let unit = 'units';
      if (metric === 'sleep_duration') {
        val = Number((latestRecord.data.durationMinutes / 60).toFixed(2));
        unit = 'hours';
      } else if (metric === 'exercise_duration') {
        val = Number(latestRecord.data.durationMinutes);
        unit = 'min';
      } else if (['stress_score', 'fatigue_score', 'mood_score'].includes(metric)) {
        val = Number(latestRecord.data[metric]);
        unit = 'score';
      } else {
        val = Number(latestRecord.data.value);
        unit = latestRecord.data.unit || 'units';
      }

      const baseline = getBaselineForMetric(metric);

      let comparison = null;
      let isDeviating = false;
      let deviationDirection = 'WITHIN_BASELINE_PATTERN';

      if (baseline && baseline.confidence !== BaselineConfidence.INSUFFICIENT_DATA && baseline.median !== null) {
        try {
          comparison = BaselineComparisonService.compareWithBaseline(
            { astronautId, metric, value: val, unit, recordedAt: latestRecord.recordedAt },
            baseline
          );
          deviationDirection = comparison.direction;
          isDeviating =
            comparison.direction === ComparisonDirection.ABOVE_BASELINE_PATTERN ||
            comparison.direction === ComparisonDirection.BELOW_BASELINE_PATTERN;
        } catch (e) {
          console.warn(`Baseline comparison failed for ${metric}:`, e.message);
        }
      }

      indicatorEvaluations.push({
        metric,
        value: val,
        unit,
        recordedAt: latestRecord.recordedAt,
        recordId: latestRecord.recordId,
        baselineMedian: baseline?.median ?? null,
        baselineIQR: baseline?.percentile25 !== null && baseline?.percentile75 !== null
          ? [baseline.percentile25, baseline.percentile75]
          : null,
        baselineConfidence: baseline?.confidence || BaselineConfidence.INSUFFICIENT_DATA,
        comparison,
        direction: deviationDirection,
        isDeviating,
        isStale,
      });
    }

    // 3. Evaluate Contributing Deviating Indicators
    const deviatingIndicators = indicatorEvaluations.filter((i) => i.isDeviating);
    const deviatingCount = deviatingIndicators.length;

    // 4. Calculate Pattern Confidence
    const confidence = this.calculatePatternConfidence(
      indicatorEvaluations,
      missingMetrics,
      staleMetrics,
      domainMetrics.length
    );

    // 5. Determine Operational Software State
    // Escalation rule check (urgent protocol triggers take precedence over general pattern score)
    let operationalState = OperationalState.NORMAL;
    let patternDescription = 'All observed domain indicators align with personal historical patterns.';

    // Check urgent triggers (e.g. SpO2 < 85% or configured urgent emergency threshold)
    const hasUrgentVitalTrigger = indicatorEvaluations.some(
      (ind) => ind.metric === 'spo2' && ind.value < 85
    );

    const isUrgentTriggered = hasUrgentVitalTrigger || options.escalateProtocol === true || (deviatingCount >= 4 && confidence === PatternConfidence.HIGH_CONFIDENCE);

    if (isUrgentTriggered) {
      operationalState = OperationalState.ESCALATE;
      patternDescription = 'Approved operational protocol triggered: critical vital threshold or urgent escalation criteria met.';
    } else if (deviatingCount >= 2 && confidence !== PatternConfidence.INSUFFICIENT_DATA) {
      operationalState = OperationalState.ASSESS;
      patternDescription = `Multi-indicator shift detected: ${deviatingCount} related indicators concurrently outside historical pattern.`;
    } else if (deviatingCount === 1) {
      operationalState = OperationalState.OBSERVE;
      patternDescription = `Single indicator deviation observed (${deviatingIndicators[0].metric}); continuing passive telemetry monitoring.`;
    } else {
      operationalState = OperationalState.NORMAL;
      patternDescription = 'No meaningful anomalous health pattern detected in available telemetry.';
    }

    // 6. Gather Mission Contextual Observations (Non-Causal)
    const contextualObservations = this._extractMissionContext(astronautId, missionEvents, windowStartMs, now);

    // 7. Generate Explainable Summary
    const explanation = this.generatePatternExplanation({
      domain,
      operationalState,
      patternDescription,
      indicatorEvaluations,
      deviatingIndicators,
      missingMetrics,
      staleMetrics,
      contextualObservations,
      confidence,
    });

    return {
      patternId: uuidv4(),
      astronautId,
      missionId: options.missionId || 'ARES-V',
      domain,
      operationalState,
      confidence,
      patternDescription,
      contributingIndicators: deviatingIndicators,
      allIndicators: indicatorEvaluations,
      missingMetrics,
      staleMetrics,
      relevantMeasurementIds,
      contextualObservations,
      explanation,
      detectionTimestamp: new Date(now).toISOString(),
    };
  }

  /**
   * Dedicated Isolated Radiation Domain Analysis.
   */
  static _analyseRadiationDomain(astronautId, measurements = [], options = {}) {
    const radRecords = measurements.filter(
      (m) => m && m.astronautId === astronautId && m.category === 'radiation_measurement'
    );

    const now = options.referenceTime ? new Date(options.referenceTime).getTime() : Date.now();
    const relevantMeasurementIds = radRecords.map((r) => r.recordId);

    if (radRecords.length === 0) {
      return {
        patternId: uuidv4(),
        astronautId,
        missionId: options.missionId || 'ARES-V',
        domain: HealthDomains.RADIATION_EXPOSURE,
        operationalState: OperationalState.NORMAL,
        confidence: PatternConfidence.INSUFFICIENT_DATA,
        patternDescription: 'No radiation dosimeter telemetry logged in the current operational window.',
        contributingIndicators: [],
        allIndicators: [],
        missingMetrics: ['cumulative_dose', 'dose_rate'],
        staleMetrics: [],
        relevantMeasurementIds: [],
        contextualObservations: ['Dosimeter passive monitoring active.'],
        explanation: 'No radiation dosimeter records available to evaluate radiological exposure.',
        detectionTimestamp: new Date(now).toISOString(),
      };
    }

    radRecords.sort((a, b) => Date.parse(b.recordedAt) - Date.parse(a.recordedAt));
    const latest = radRecords[0];
    const doseRate = Number(latest.data?.dose_rate || 0);
    const cumulativeDose = Number(latest.data?.cumulative_dose || 0);

    let operationalState = OperationalState.NORMAL;
    let desc = 'Radiation dosimeter readings within routine deep-space background levels.';

    // Radiation operational states based on rate benchmarks (µSv/h)
    if (doseRate >= 500) {
      operationalState = OperationalState.ESCALATE;
      desc = `Elevated radiation storm event detected (${doseRate} µSv/h). Autonomous protocol triggers shelter assessment.`;
    } else if (doseRate >= 100) {
      operationalState = OperationalState.ASSESS;
      desc = `Moderate solar particle activity noted (${doseRate} µSv/h). Radiological assessment recommended.`;
    } else if (doseRate >= 30) {
      operationalState = OperationalState.OBSERVE;
      desc = `Slightly elevated dosimeter rate (${doseRate} µSv/h); observe sensor trajectory.`;
    }

    const explanation = `Radiological evaluation: current dose rate is ${doseRate} µSv/h, with cumulative mission dose of ${cumulativeDose} mSv. State classified as ${operationalState}. Radiation telemetry is strictly evaluated independently of physiological averages.`;

    return {
      patternId: uuidv4(),
      astronautId,
      missionId: options.missionId || 'ARES-V',
      domain: HealthDomains.RADIATION_EXPOSURE,
      operationalState,
      confidence: PatternConfidence.HIGH_CONFIDENCE,
      patternDescription: desc,
      contributingIndicators: [
        { metric: 'dose_rate', value: doseRate, unit: 'µSv/h' },
        { metric: 'cumulative_dose', value: cumulativeDose, unit: 'mSv' },
      ],
      allIndicators: [
        { metric: 'dose_rate', value: doseRate, unit: 'µSv/h', recordedAt: latest.recordedAt },
        { metric: 'cumulative_dose', value: cumulativeDose, unit: 'mSv', recordedAt: latest.recordedAt },
      ],
      missingMetrics: [],
      staleMetrics: [],
      relevantMeasurementIds,
      contextualObservations: [
        `Dosimeter location: ${latest.data?.sensorLocation || 'Habitat Module'}`,
      ],
      explanation,
      detectionTimestamp: new Date(now).toISOString(),
    };
  }

  /**
   * Calculate Pattern Confidence based on evidence quality.
   */
  static calculatePatternConfidence(indicatorEvaluations, missingMetrics, staleMetrics, totalDomainMetrics) {
    const presentCount = indicatorEvaluations.length;

    if (presentCount === 0 || presentCount < 2) {
      return PatternConfidence.INSUFFICIENT_DATA;
    }

    // Check if any baseline has INSUFFICIENT_DATA
    const hasInsufficientBaselines = indicatorEvaluations.some(
      (ind) => ind.baselineConfidence === BaselineConfidence.INSUFFICIENT_DATA
    );
    if (hasInsufficientBaselines) {
      return PatternConfidence.LOW_CONFIDENCE;
    }

    // High staleness penalty
    if (staleMetrics.length >= presentCount / 2) {
      return PatternConfidence.LOW_CONFIDENCE;
    }

    // High completeness
    const completeness = presentCount / totalDomainMetrics;
    const hasHighBaselines = indicatorEvaluations.every(
      (ind) => ind.baselineConfidence === BaselineConfidence.HIGH_CONFIDENCE || ind.baselineConfidence === BaselineConfidence.MODERATE_CONFIDENCE
    );

    if (completeness >= 0.75 && hasHighBaselines && staleMetrics.length === 0) {
      return PatternConfidence.HIGH_CONFIDENCE;
    }

    return PatternConfidence.MODERATE_CONFIDENCE;
  }

  /**
   * Extract contextual mission events (non-causal observations).
   */
  static _extractMissionContext(astronautId, missionEvents = [], startMs, endMs) {
    const notes = [];
    if (!Array.isArray(missionEvents)) return notes;

    for (const evt of missionEvents) {
      if (!evt || evt.astronautId !== astronautId) continue;
      const t = Date.parse(evt.recordedAt);
      if (t >= startMs && t <= endMs) {
        if (evt.data?.eventType === 'exercise_session') {
          notes.push(
            `Context: Exercise session logged (${evt.data.durationMinutes} min, intensity: ${evt.data.intensity || 'moderate'}).`
          );
        } else if (evt.data?.eventType === 'workload_event') {
          notes.push(
            `Context: Workload/EVA event logged (${evt.data.description || 'EVA Protocol'}).`
          );
        } else if (evt.data?.eventType === 'sleep_session') {
          notes.push(
            `Context: Sleep session logged (${evt.data.durationMinutes} min duration).`
          );
        }
      }
    }

    return notes;
  }

  /**
   * Generate simple, objective, plain-language explanation without medical diagnoses.
   */
  static generatePatternExplanation({
    domain,
    operationalState,
    patternDescription,
    indicatorEvaluations,
    deviatingIndicators,
    missingMetrics,
    staleMetrics,
    contextualObservations,
    confidence,
  }) {
    const parts = [];

    parts.push(`Domain [${domain.replace('_', ' ').toUpperCase()}] evaluated in state [${operationalState}].`);
    if (patternDescription) {
      parts.push(patternDescription);
    }

    if (deviatingIndicators.length === 0) {
      parts.push('All measured indicators are within the astronaut\'s established historical central range.');
    } else {
      const devSummary = deviatingIndicators
        .map((ind) => `${ind.metric} is ${ind.direction === ComparisonDirection.ABOVE_BASELINE_PATTERN ? 'above' : 'below'} personal baseline (${ind.value} ${ind.unit} vs median ${ind.baselineMedian} ${ind.unit})`)
        .join('; ');
      parts.push(`Observed deviations: ${devSummary}.`);
    }

    if (missingMetrics.length > 0) {
      parts.push(`Missing indicators: ${missingMetrics.join(', ')}.`);
    }

    if (staleMetrics.length > 0) {
      parts.push(`Telemetry older than 36 hours: ${staleMetrics.join(', ')}.`);
    }

    if (contextualObservations.length > 0) {
      parts.push(`Mission Context: ${contextualObservations.join(' ')}`);
    }

    parts.push(
      'Notice: Statistical pattern observation only. Does not represent a clinical diagnosis or medical certainty.'
    );

    return parts.join(' ');
  }
}

export const analyseHealthDomain = PatternDetectionService.analyseHealthDomain.bind(PatternDetectionService);

/**
 * Convenience helper to evaluate and return patterns across all health domains for an astronaut
 * @param {string} astronautId 
 * @param {string} [missionId] 
 * @returns {Promise<Array<Object>>}
 */
export async function detectPatternsAcrossDomains(astronautId, missionId = 'ARES-V') {
  if (!localDb) return [];

  const [mRecords, aRecords, eRecords, rRecords, allBaselines] = await Promise.all([
    localDb.measurements.where('astronautId').equals(astronautId).toArray(),
    localDb.assessments.where('astronautId').equals(astronautId).toArray(),
    localDb.missionEvents.where('astronautId').equals(astronautId).toArray(),
    localDb.radiationRecords.where('astronautId').equals(astronautId).toArray(),
    localDb.baselines.where('astronautId').equals(astronautId).toArray(),
  ]);

  const combinedTelemetry = [...mRecords, ...aRecords, ...eRecords, ...rRecords];
  const baselinesMap = {};
  for (const b of allBaselines) {
    baselinesMap[b.metric] = b;
  }

  const results = [];
  for (const dom of Object.values(HealthDomains)) {
    const outcome = PatternDetectionService.analyseHealthDomain(
      astronautId,
      dom,
      combinedTelemetry,
      baselinesMap,
      eRecords
    );
    if (outcome) {
      results.push({
        ...outcome,
        missionId,
      });
    }
  }
  return results;
}

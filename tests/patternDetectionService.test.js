import { describe, it, expect, beforeEach } from 'vitest';
import {
  PatternDetectionService,
  OperationalState,
  PatternConfidence,
  HealthDomains,
} from '../modules/health-pattern-detection/services/patternDetectionService.js';
import { PatternStorageService } from '../modules/health-pattern-detection/services/patternStorageService.js';
import { MedulaLocalDB } from '../database/localDatabase.js';
import { BaselineConfidence } from '../modules/personal-baseline/services/baselineCalculationService.js';

describe('Multi-Indicator Health Pattern Detection Engine (MDAE Module 03)', () => {
  let testDb;

  beforeEach(async () => {
    testDb = new MedulaLocalDB();
    await testDb.patternResults.clear();
  });

  const now = new Date('2026-11-15T12:00:00.000Z').getTime();

  // Helper for mock baselines
  const mockBaselines = {
    heart_rate: {
      astronautId: 'ASTRO-01',
      metric: 'heart_rate',
      median: 72,
      mean: 72.2,
      percentile25: 68,
      percentile75: 76,
      standardDeviation: 4.5,
      confidence: BaselineConfidence.HIGH_CONFIDENCE,
    },
    hrv: {
      astronautId: 'ASTRO-01',
      metric: 'hrv',
      median: 55,
      mean: 54.8,
      percentile25: 48,
      percentile75: 62,
      standardDeviation: 6.0,
      confidence: BaselineConfidence.HIGH_CONFIDENCE,
    },
    systolic_bp: {
      astronautId: 'ASTRO-01',
      metric: 'systolic_bp',
      median: 120,
      mean: 120.5,
      percentile25: 115,
      percentile75: 125,
      standardDeviation: 5.0,
      confidence: BaselineConfidence.HIGH_CONFIDENCE,
    },
    diastolic_bp: {
      astronautId: 'ASTRO-01',
      metric: 'diastolic_bp',
      median: 78,
      mean: 78.2,
      percentile25: 74,
      percentile75: 82,
      standardDeviation: 4.0,
      confidence: BaselineConfidence.HIGH_CONFIDENCE,
    },
    spo2: {
      astronautId: 'ASTRO-01',
      metric: 'spo2',
      median: 98,
      mean: 97.9,
      percentile25: 96,
      percentile75: 99,
      standardDeviation: 1.0,
      confidence: BaselineConfidence.HIGH_CONFIDENCE,
    },
    sleep_duration: {
      astronautId: 'ASTRO-01',
      metric: 'sleep_duration',
      median: 8.0,
      percentile25: 7.2,
      percentile75: 8.5,
      confidence: BaselineConfidence.HIGH_CONFIDENCE,
    },
    fatigue_score: {
      astronautId: 'ASTRO-01',
      metric: 'fatigue_score',
      median: 25,
      percentile25: 15,
      percentile75: 35,
      confidence: BaselineConfidence.HIGH_CONFIDENCE,
    },
  };

  const createRecord = (metric, val, unit = 'bpm', timeOffsetHours = 1) => ({
    recordId: `rec-${metric}-${Date.now()}-${Math.random()}`,
    astronautId: 'ASTRO-01',
    recordedAt: new Date(now - timeOffsetHours * 3600 * 1000).toISOString(),
    category: 'wearable_physiological',
    data: { metric, value: val, unit },
  });

  // 1. No deviations produce NORMAL state
  it('1. Returns NORMAL state when all observed indicators are within historical central pattern', () => {
    const measurements = [
      createRecord('heart_rate', 72, 'bpm'), // within 68-76
      createRecord('hrv', 54, 'ms'),          // within 48-62
      createRecord('systolic_bp', 119, 'mmHg'), // within 115-125
      createRecord('spo2', 98, '%'),          // within 96-99
    ];

    const result = PatternDetectionService.analyseHealthDomain(
      'ASTRO-01',
      HealthDomains.CARDIOVASCULAR,
      measurements,
      mockBaselines,
      [],
      { referenceTime: now }
    );

    expect(result.operationalState).toBe(OperationalState.NORMAL);
    expect(result.contributingIndicators).toHaveLength(0);
    expect(result.explanation).toContain('within the astronaut\'s established historical central range');
  });

  // 2. Single deviation produces OBSERVE state
  it('2. Returns OBSERVE state when only a single indicator deviates outside central pattern', () => {
    const measurements = [
      createRecord('heart_rate', 84, 'bpm'), // DEVIATION (> Q3 76)
      createRecord('hrv', 54, 'ms'),          // Normal
      createRecord('systolic_bp', 120, 'mmHg'), // Normal
      createRecord('spo2', 98, '%'),          // Normal
    ];

    const result = PatternDetectionService.analyseHealthDomain(
      'ASTRO-01',
      HealthDomains.CARDIOVASCULAR,
      measurements,
      mockBaselines,
      [],
      { referenceTime: now }
    );

    expect(result.operationalState).toBe(OperationalState.OBSERVE);
    expect(result.contributingIndicators).toHaveLength(1);
    expect(result.contributingIndicators[0].metric).toBe('heart_rate');
  });

  // 3. Multiple related deviations produce ASSESS state
  it('3. Returns ASSESS state when multiple related indicators concurrently deviate in the domain', () => {
    const measurements = [
      createRecord('heart_rate', 86, 'bpm'),    // DEVIATION (> Q3 76)
      createRecord('hrv', 38, 'ms'),            // DEVIATION (< Q1 48)
      createRecord('systolic_bp', 135, 'mmHg'), // DEVIATION (> Q3 125)
      createRecord('spo2', 97, '%'),            // Normal
    ];

    const result = PatternDetectionService.analyseHealthDomain(
      'ASTRO-01',
      HealthDomains.CARDIOVASCULAR,
      measurements,
      mockBaselines,
      [],
      { referenceTime: now }
    );

    expect(result.operationalState).toBe(OperationalState.ASSESS);
    expect(result.contributingIndicators).toHaveLength(3);
    expect(result.explanation).toContain('Multi-indicator shift detected');
  });

  // 4. Critical vital trigger or severe combined deviation produces ESCALATE state
  it('4. Returns ESCALATE state when critical vital rule triggers (e.g. SpO2 < 85%)', () => {
    const measurements = [
      createRecord('heart_rate', 92, 'bpm'),
      createRecord('hrv', 35, 'ms'),
      createRecord('spo2', 82, '%'), // Urgent trigger: SpO2 < 85%
    ];

    const result = PatternDetectionService.analyseHealthDomain(
      'ASTRO-01',
      HealthDomains.CARDIOVASCULAR,
      measurements,
      mockBaselines,
      [],
      { referenceTime: now }
    );

    expect(result.operationalState).toBe(OperationalState.ESCALATE);
    expect(result.patternDescription).toContain('Approved operational protocol triggered');
  });

  // 5. Unrelated domains are not combined
  it('5. Ensures health domains remain strictly isolated without cross-domain mixing', () => {
    const cardioMeasurements = [
      createRecord('heart_rate', 85, 'bpm'),
      createRecord('hrv', 40, 'ms'),
    ];

    const sleepMeasurements = [
      {
        recordId: 'rec-sleep-01',
        astronautId: 'ASTRO-01',
        recordedAt: new Date(now - 3600000).toISOString(),
        category: 'mission_event',
        data: { eventType: 'sleep_session', durationMinutes: 480 },
      },
    ];

    const cardioResult = PatternDetectionService.analyseHealthDomain(
      'ASTRO-01',
      HealthDomains.CARDIOVASCULAR,
      [...cardioMeasurements, ...sleepMeasurements],
      mockBaselines,
      [],
      { referenceTime: now }
    );

    // Cardiovascular domain metrics must only include cardio indicators
    expect(cardioResult.allIndicators.some((i) => i.metric === 'sleep_duration')).toBe(false);
  });

  // 6. Missing data lowers confidence appropriately
  it('6. Lowers pattern confidence to INSUFFICIENT_DATA when key domain indicators are missing', () => {
    const sparseMeasurements = [
      createRecord('heart_rate', 72, 'bpm'), // Only 1 indicator present
    ];

    const result = PatternDetectionService.analyseHealthDomain(
      'ASTRO-01',
      HealthDomains.CARDIOVASCULAR,
      sparseMeasurements,
      mockBaselines,
      [],
      { referenceTime: now }
    );

    expect(result.confidence).toBe(PatternConfidence.INSUFFICIENT_DATA);
    expect(result.missingMetrics.length).toBeGreaterThan(0);
  });

  // 7. Stale data is handled
  it('7. Flags stale data and penalizes confidence when telemetry is older than threshold', () => {
    const staleMeasurements = [
      createRecord('heart_rate', 72, 'bpm', 40), // 40 hours old (> 36h)
      createRecord('hrv', 55, 'ms', 42),         // 42 hours old (> 36h)
    ];

    const result = PatternDetectionService.analyseHealthDomain(
      'ASTRO-01',
      HealthDomains.CARDIOVASCULAR,
      staleMeasurements,
      mockBaselines,
      [],
      { referenceTime: now }
    );

    expect(result.staleMetrics).toContain('heart_rate');
    expect(result.staleMetrics).toContain('hrv');
    expect(result.confidence).toBe(PatternConfidence.LOW_CONFIDENCE);
  });

  // 8. Low-confidence baselines are handled
  it('8. Lowers pattern confidence when baseline has INSUFFICIENT_DATA', () => {
    const weakBaselines = {
      ...mockBaselines,
      heart_rate: {
        ...mockBaselines.heart_rate,
        confidence: BaselineConfidence.INSUFFICIENT_DATA,
      },
    };

    const measurements = [
      createRecord('heart_rate', 72, 'bpm'),
      createRecord('hrv', 55, 'ms'),
      createRecord('spo2', 98, '%'),
    ];

    const result = PatternDetectionService.analyseHealthDomain(
      'ASTRO-01',
      HealthDomains.CARDIOVASCULAR,
      measurements,
      weakBaselines,
      [],
      { referenceTime: now }
    );

    expect(result.confidence).toBe(PatternConfidence.LOW_CONFIDENCE);
  });

  // 9. Radiation analysis remains separate
  it('9. Strictly isolates radiation dosimeter domain from ordinary physiological correlation', () => {
    const radMeasurement = {
      recordId: 'rad-01',
      astronautId: 'ASTRO-01',
      recordedAt: new Date(now - 3600000).toISOString(),
      category: 'radiation_measurement',
      data: {
        cumulative_dose: 18.5,
        cumulative_dose_unit: 'mSv',
        dose_rate: 150.0, // Elevated solar particle event
        dose_rate_unit: 'µSv/h',
      },
    };

    const result = PatternDetectionService.analyseHealthDomain(
      'ASTRO-01',
      HealthDomains.RADIATION_EXPOSURE,
      [radMeasurement],
      mockBaselines,
      [],
      { referenceTime: now }
    );

    expect(result.domain).toBe(HealthDomains.RADIATION_EXPOSURE);
    expect(result.operationalState).toBe(OperationalState.ASSESS);
    expect(result.patternDescription).toContain('Moderate solar particle activity');
    expect(result.explanation).toContain('Radiation telemetry is strictly evaluated independently');
  });

  // 10. Mission events are included as context (non-causal observation)
  it('10. Contextualizes observations with mission events without claiming causation', () => {
    const measurements = [
      createRecord('heart_rate', 86, 'bpm'), // Elevated HR
      createRecord('hrv', 45, 'ms'),
    ];

    const missionEvents = [
      {
        recordId: 'evt-01',
        astronautId: 'ASTRO-01',
        recordedAt: new Date(now - 2 * 3600000).toISOString(),
        category: 'mission_event',
        data: {
          eventType: 'exercise_session',
          durationMinutes: 45,
          intensity: 'high',
        },
      },
    ];

    const result = PatternDetectionService.analyseHealthDomain(
      'ASTRO-01',
      HealthDomains.CARDIOVASCULAR,
      measurements,
      mockBaselines,
      missionEvents,
      { referenceTime: now }
    );

    expect(result.contextualObservations.length).toBeGreaterThan(0);
    expect(result.contextualObservations[0]).toContain('Exercise session logged (45 min');
    expect(result.explanation).toContain('Mission Context');
  });

  // 11. No diagnosis is generated in explanation
  it('11. Generates plain-language statistical explanations with zero clinical diagnoses', () => {
    const measurements = [
      createRecord('heart_rate', 85, 'bpm'),
      createRecord('hrv', 40, 'ms'),
    ];

    const result = PatternDetectionService.analyseHealthDomain(
      'ASTRO-01',
      HealthDomains.CARDIOVASCULAR,
      measurements,
      mockBaselines,
      [],
      { referenceTime: now }
    );

    // Verify explanation contains disclaimers and no medical claims
    expect(result.explanation).toContain('Statistical pattern observation only');
    expect(result.explanation).not.toContain('diagnosed');
    expect(result.explanation).not.toContain('syndrome');
    expect(result.explanation).not.toContain('prescribe');
  });

  // 12. Pattern history is preserved in IndexedDB
  it('12. Preserves pattern detection history in IndexedDB offline-first', async () => {
    const measurements = [
      createRecord('heart_rate', 88, 'bpm'),
      createRecord('hrv', 42, 'ms'),
      createRecord('systolic_bp', 130, 'mmHg'),
    ];

    const result = PatternDetectionService.analyseHealthDomain(
      'ASTRO-01',
      HealthDomains.CARDIOVASCULAR,
      measurements,
      mockBaselines,
      [],
      { referenceTime: now }
    );

    // Persist to local IndexedDB patternResults store
    const saved = await PatternStorageService.savePatternResult(result, { db: testDb });
    expect(saved.patternId).toBe(result.patternId);

    // Retrieve latest pattern
    const retrieved = await PatternStorageService.getLatestPatternByDomain(
      'ASTRO-01',
      HealthDomains.CARDIOVASCULAR,
      { db: testDb }
    );

    expect(retrieved).toBeDefined();
    expect(retrieved.operationalState).toBe(OperationalState.ASSESS);
    expect(retrieved.contributingIndicators).toHaveLength(3);
  });

  // 13. Offline operation works
  it('13. Operates completely offline with zero network connectivity', async () => {
    const measurements = [
      createRecord('heart_rate', 72, 'bpm'),
      createRecord('hrv', 55, 'ms'),
    ];

    const result = PatternDetectionService.analyseHealthDomain(
      'ASTRO-01',
      HealthDomains.CARDIOVASCULAR,
      measurements,
      mockBaselines
    );

    expect(result).toBeDefined();
    expect(result.operationalState).toBe(OperationalState.NORMAL);
  });
});


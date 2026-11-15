import { describe, it, expect } from 'vitest';
import { ValidationService, ValidationOutcome } from '../modules/data-acquisition/services/validationService.js';

describe('ValidationService (MDAE Stage 1)', () => {
  const baseValidRecord = {
    recordId: '123e4567-e89b-12d3-a456-426614174000',
    astronautId: 'ASTRO-01',
    missionId: 'ARES-V',
    recordedAt: '2026-11-15T07:25:00.000Z',
    provenance: {
      source: 'wearable_sensor',
      deviceId: 'BIO-MON-04',
      softwareVersion: '1.0.0',
    },
  };

  // Requirement 1: Valid wearable heart-rate record
  it('1. Valid wearable heart-rate record', () => {
    const record = {
      ...baseValidRecord,
      category: 'wearable_physiological',
      data: {
        metric: 'heart_rate',
        value: 72,
        unit: 'bpm',
      },
    };

    const result = ValidationService.validateRecord(record);
    expect(result.isValid).toBe(true);
    expect(result.status).toBe(ValidationOutcome.VALID);
    expect(result.errors).toHaveLength(0);
  });

  // Requirement 2: Valid HRV record
  it('2. Valid HRV record', () => {
    const record = {
      ...baseValidRecord,
      category: 'wearable_physiological',
      data: {
        metric: 'hrv',
        value: 55,
        unit: 'ms',
      },
    };

    const result = ValidationService.validateRecord(record);
    expect(result.isValid).toBe(true);
    expect(result.status).toBe(ValidationOutcome.VALID);
    expect(result.errors).toHaveLength(0);
  });

  // Requirement 3: Valid manual stress assessment
  it('3. Valid manual stress assessment', () => {
    const record = {
      ...baseValidRecord,
      provenance: {
        source: 'manual_entry',
        deviceId: 'CREW-TABLET-02',
      },
      category: 'manual_assessment',
      data: {
        stress_score: 42,
        fatigue_score: 30,
        mood_score: 7,
        symptoms: ['mild vestibular discomfort'],
        notes: 'Post-docking assessment',
      },
    };

    const result = ValidationService.validateRecord(record);
    expect(result.isValid).toBe(true);
    expect(result.status).toBe(ValidationOutcome.VALID);
    expect(result.errors).toHaveLength(0);
  });

  // Requirement 4: Valid mission exercise event
  it('4. Valid mission exercise event', () => {
    const record = {
      ...baseValidRecord,
      provenance: {
        source: 'mission_log',
        deviceId: 'COLBERT-TREADMILL',
      },
      category: 'mission_event',
      data: {
        eventType: 'exercise_session',
        durationMinutes: 45,
        intensity: 'high',
        description: 'T2 Treadmill countermeasure protocol A',
      },
    };

    const result = ValidationService.validateRecord(record);
    expect(result.isValid).toBe(true);
    expect(result.status).toBe(ValidationOutcome.VALID);
    expect(result.errors).toHaveLength(0);
  });

  // Requirement 5: Valid radiation measurement
  it('5. Valid radiation measurement', () => {
    const record = {
      ...baseValidRecord,
      provenance: {
        source: 'radiation_dosimeter',
        deviceId: 'DOSI-CPD-09',
      },
      category: 'radiation_measurement',
      data: {
        cumulative_dose: 18.4,
        cumulative_dose_unit: 'mSv',
        dose_rate: 12.5,
        dose_rate_unit: 'µSv/h',
        sensorLocation: 'Habitation Module Crew Quarters',
      },
    };

    const result = ValidationService.validateRecord(record);
    expect(result.isValid).toBe(true);
    expect(result.status).toBe(ValidationOutcome.VALID);
    expect(result.errors).toHaveLength(0);
  });

  // Requirement 6: Missing astronaut ID
  it('6. Missing astronaut ID', () => {
    const record = {
      ...baseValidRecord,
      astronautId: '',
      category: 'wearable_physiological',
      data: {
        metric: 'heart_rate',
        value: 70,
        unit: 'bpm',
      },
    };

    const result = ValidationService.validateRecord(record);
    expect(result.isValid).toBe(false);
    expect(result.status).toBe(ValidationOutcome.INVALID);
    expect(result.errors.some((e) => e.field === 'astronautId')).toBe(true);
  });

  // Requirement 7: Invalid timestamp
  it('7. Invalid timestamp', () => {
    const record = {
      ...baseValidRecord,
      recordedAt: '2026-11-15 07:25:00', // Missing 'T' and 'Z'
      category: 'wearable_physiological',
      data: {
        metric: 'heart_rate',
        value: 70,
        unit: 'bpm',
      },
    };

    const result = ValidationService.validateRecord(record);
    expect(result.isValid).toBe(false);
    expect(result.status).toBe(ValidationOutcome.INVALID);
    expect(result.errors.some((e) => e.field === 'recordedAt')).toBe(true);
  });

  // Requirement 8: Incorrect measurement unit
  it('8. Incorrect measurement unit', () => {
    const record = {
      ...baseValidRecord,
      category: 'wearable_physiological',
      data: {
        metric: 'heart_rate',
        value: 72,
        unit: 'km/h', // invalid unit for heart rate
      },
    };

    const result = ValidationService.validateRecord(record);
    expect(result.isValid).toBe(false);
    expect(result.status).toBe(ValidationOutcome.INVALID);
    expect(result.errors.some((e) => e.field.includes('unit'))).toBe(true);
  });

  // Requirement 9: Missing required value
  it('9. Missing required value', () => {
    const record = {
      ...baseValidRecord,
      category: 'wearable_physiological',
      data: {
        metric: 'heart_rate',
        unit: 'bpm',
        // value missing
      },
    };

    const result = ValidationService.validateRecord(record);
    expect(result.isValid).toBe(false);
    expect(result.status).toBe(ValidationOutcome.INVALID);
    expect(result.errors.some((e) => e.field.includes('value'))).toBe(true);
  });

  // Requirement 14: Unusual but technically valid measurement preservation
  it('14. Unusual but technically valid measurement preservation', () => {
    // High heart rate during high-stress EVA (195 bpm)
    const record = {
      ...baseValidRecord,
      category: 'wearable_physiological',
      data: {
        metric: 'heart_rate',
        value: 195, // High but within technical sensor plausibility (0-300)
        unit: 'bpm',
      },
    };

    const result = ValidationService.validateRecord(record);
    expect(result.isValid).toBe(true);
    expect(result.status).toBe(ValidationOutcome.VALID_WITH_WARNINGS);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0].message).toContain('elevated heart rate (195 bpm)');
  });
});


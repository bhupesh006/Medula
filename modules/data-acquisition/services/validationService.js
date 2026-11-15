import {
  healthRecordSchema,
  wearableRecordSchema,
  assessmentRecordSchema,
  missionEventRecordSchema,
  radiationRecordSchema,
  iso8601UtcRegex,
} from '../schemas/measurementSchema.js';

/**
 * Validation Outcome constants
 */
export const ValidationOutcome = {
  VALID: 'VALID',
  VALID_WITH_WARNINGS: 'VALID_WITH_WARNINGS',
  INVALID: 'INVALID',
};

/**
 * Aerospace-grade Data Validation Service
 * Evaluates structural schema compliance, unit consistency, timestamp sanity,
 * missing fields, and evaluates data-quality warnings without rejecting technically
 * valid outlier measurements.
 */
export class ValidationService {
  /**
   * Main validation entry point for any health record
   * @param {Object} rawRecord - Input record object
   * @returns {Object} Structured validation outcome
   */
  static validateRecord(rawRecord) {
    const errors = [];
    const warnings = [];

    if (!rawRecord || typeof rawRecord !== 'object') {
      return {
        isValid: false,
        status: ValidationOutcome.INVALID,
        recordId: null,
        errors: [{ field: 'root', message: 'Record must be a non-null object' }],
        warnings: [],
        record: rawRecord,
      };
    }

    const recordId = rawRecord.recordId || null;

    // 1. Missing Required Top-Level Fields Detection
    const requiredTopLevel = ['recordId', 'astronautId', 'missionId', 'category', 'recordedAt', 'provenance', 'data'];
    for (const field of requiredTopLevel) {
      if (rawRecord[field] === undefined || rawRecord[field] === null || rawRecord[field] === '') {
        errors.push({
          field,
          message: `Required field '${field}' is missing or empty`,
          received: rawRecord[field],
        });
      }
    }

    // 2. Category Check
    const validCategories = [
      'wearable_physiological',
      'manual_assessment',
      'mission_event',
      'radiation_measurement',
    ];
    if (rawRecord.category && !validCategories.includes(rawRecord.category)) {
      errors.push({
        field: 'category',
        message: `Unknown category '${rawRecord.category}'. Allowed categories: ${validCategories.join(', ')}`,
        received: rawRecord.category,
      });
    }

    // 3. Timestamp Validation
    if (rawRecord.recordedAt) {
      if (typeof rawRecord.recordedAt !== 'string' || !iso8601UtcRegex.test(rawRecord.recordedAt)) {
        errors.push({
          field: 'recordedAt',
          message: 'Timestamp must be a valid ISO 8601 UTC string ending with Z (e.g. 2026-11-15T07:25:00.000Z)',
          received: rawRecord.recordedAt,
        });
      } else {
        const parsedTime = Date.parse(rawRecord.recordedAt);
        if (isNaN(parsedTime)) {
          errors.push({
            field: 'recordedAt',
            message: 'Timestamp is an invalid calendar date',
            received: rawRecord.recordedAt,
          });
        } else {
          const now = Date.now();
          const diffMs = parsedTime - now;

          // Far future (> 24 hours): severe clock anomaly
          if (diffMs > 24 * 60 * 60 * 1000) {
            errors.push({
              field: 'recordedAt',
              message: 'Timestamp is more than 24 hours in the future; rejected as clock anomaly',
              received: rawRecord.recordedAt,
            });
          }
          // Slight future (between 30 seconds and 24 hours): clock drift warning
          else if (diffMs > 30 * 1000) {
            warnings.push({
              field: 'recordedAt',
              message: 'Recorded timestamp is slightly ahead of local system clock (possible clock drift)',
              value: rawRecord.recordedAt,
            });
          }

          // Very old record (> 2 years): data-quality note
          if (now - parsedTime > 2 * 365 * 24 * 60 * 60 * 1000) {
            warnings.push({
              field: 'recordedAt',
              message: 'Record timestamp is significantly dated (> 2 years old)',
              value: rawRecord.recordedAt,
            });
          }
        }
      }
    }

    // If structural top-level errors already exist, skip schema parsing to return direct clean errors
    if (errors.length > 0) {
      return {
        isValid: false,
        status: ValidationOutcome.INVALID,
        recordId,
        errors,
        warnings,
        record: rawRecord,
      };
    }

    // 4. Schema-specific validation via Zod
    const zodResult = healthRecordSchema.safeParse(rawRecord);
    if (!zodResult.success) {
      for (const issue of zodResult.error.issues) {
        errors.push({
          field: issue.path.join('.'),
          message: issue.message,
          code: issue.code,
        });
      }

      return {
        isValid: false,
        status: ValidationOutcome.INVALID,
        recordId,
        errors,
        warnings,
        record: rawRecord,
      };
    }

    const validatedData = zodResult.data;

    // 5. Provenance Metadata Checks (Warnings)
    if (!validatedData.provenance?.deviceId) {
      warnings.push({
        field: 'provenance.deviceId',
        message: 'Optional telemetry identifier \'deviceId\' is missing from provenance',
      });
    }

    // 6. Metric-Specific Data Quality Warnings (Preserve technically valid outliers!)
    switch (validatedData.category) {
      case 'wearable_physiological': {
        const { metric, value } = validatedData.data;
        if (metric === 'heart_rate') {
          if (value < 40) {
            warnings.push({
              field: 'data.value',
              message: `Unusual physiological observation: bradycardia-level heart rate (${value} bpm). Technically valid sensor reading preserved.`,
              value,
            });
          } else if (value > 180) {
            warnings.push({
              field: 'data.value',
              message: `Unusual physiological observation: elevated heart rate (${value} bpm). Technically valid sensor reading preserved.`,
              value,
            });
          }
        } else if (metric === 'hrv') {
          if (value < 15) {
            warnings.push({
              field: 'data.value',
              message: `Unusual physiological observation: very low HRV (${value} ms). Reading preserved.`,
              value,
            });
          }
        } else if (metric === 'spo2') {
          if (value < 90) {
            warnings.push({
              field: 'data.value',
              message: `Unusual physiological observation: low oxygen saturation (${value}%). Reading preserved.`,
              value,
            });
          }
        } else if (metric === 'systolic_bp') {
          if (value > 160 || value < 85) {
            warnings.push({
              field: 'data.value',
              message: `Atypical systolic blood pressure reading (${value} mmHg). Reading preserved.`,
              value,
            });
          }
        } else if (metric === 'diastolic_bp') {
          if (value > 100 || value < 55) {
            warnings.push({
              field: 'data.value',
              message: `Atypical diastolic blood pressure reading (${value} mmHg). Reading preserved.`,
              value,
            });
          }
        } else if (metric === 'body_temperature') {
          if (value > 38.0 || value < 36.0) {
            warnings.push({
              field: 'data.value',
              message: `Atypical body temperature reading (${value} °C). Reading preserved.`,
              value,
            });
          }
        }
        break;
      }

      case 'manual_assessment': {
        const { stress_score, fatigue_score, mood_score } = validatedData.data;
        if (stress_score >= 80) {
          warnings.push({
            field: 'data.stress_score',
            message: `High subjective stress level reported (${stress_score}/100)`,
            value: stress_score,
          });
        }
        if (fatigue_score >= 80) {
          warnings.push({
            field: 'data.fatigue_score',
            message: `High subjective fatigue level reported (${fatigue_score}/100)`,
            value: fatigue_score,
          });
        }
        if (mood_score <= 2) {
          warnings.push({
            field: 'data.mood_score',
            message: `Low astronaut mood score reported (${mood_score}/10)`,
            value: mood_score,
          });
        }
        break;
      }

      case 'mission_event': {
        const { durationMinutes, eventType } = validatedData.data;
        if (eventType === 'exercise_session' && durationMinutes > 240) {
          warnings.push({
            field: 'data.durationMinutes',
            message: `Unusually long exercise session duration (${durationMinutes} minutes)`,
            value: durationMinutes,
          });
        }
        break;
      }

      case 'radiation_measurement': {
        const { dose_rate } = validatedData.data;
        if (dose_rate > 500) {
          warnings.push({
            field: 'data.dose_rate',
            message: `Elevated radiation dose rate recorded (${dose_rate} µSv/h). Reading preserved.`,
            value: dose_rate,
          });
        }
        break;
      }
    }

    const status = warnings.length > 0 ? ValidationOutcome.VALID_WITH_WARNINGS : ValidationOutcome.VALID;

    return {
      isValid: true,
      status,
      recordId: validatedData.recordId,
      errors: [],
      warnings,
      record: validatedData,
    };
  }
}


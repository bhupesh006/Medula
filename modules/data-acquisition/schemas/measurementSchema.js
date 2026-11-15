import { z } from 'zod';

/**
 * ISO 8601 UTC Timestamp regex validator
 * Accepts standard ISO 8601 UTC timestamps (e.g., 2026-11-15T07:25:00.000Z or ending with Z)
 */
export const iso8601UtcRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?Z$/;

export const timestampSchema = z.string()
  .refine((val) => iso8601UtcRegex.test(val), {
    message: 'Timestamp must be a valid ISO 8601 UTC string ending in Z (e.g. YYYY-MM-DDTHH:mm:ss.sssZ)',
  })
  .refine((val) => !isNaN(Date.parse(val)), {
    message: 'Timestamp must be a valid parseable calendar date',
  });

/**
 * Provenance schema for auditability and origin tracking
 */
export const provenanceSchema = z.object({
  source: z.enum([
    'wearable_sensor',
    'manual_entry',
    'mission_log',
    'radiation_dosimeter',
    'external_telemetry',
  ]),
  deviceId: z.string().trim().optional(),
  softwareVersion: z.string().trim().default('1.0.0'),
  sensorModel: z.string().trim().optional(),
  calibratedAt: z.string().optional(),
});

/**
 * Base record schema containing common identification and mission tracking fields
 */
export const baseRecordSchema = z.object({
  recordId: z.string().uuid({ message: 'recordId must be a valid UUID v4' }),
  astronautId: z.string().min(1, { message: 'astronautId is required and cannot be empty' }),
  missionId: z.string().min(1, { message: 'missionId is required and cannot be empty' }),
  recordedAt: timestampSchema,
  receivedAt: timestampSchema.optional(),
  provenance: provenanceSchema,
  syncStatus: z.enum(['pending', 'syncing', 'synced', 'failed']).default('pending'),
});

/**
 * 1. Wearable Physiological Measurement Schema
 * Supported metrics:
 * - heart_rate: bpm (technical sanity check: 0 to 300 bpm)
 * - hrv: ms (technical sanity check: 0 to 500 ms)
 * - spo2: % (technical sanity check: 0 to 100 %)
 * - systolic_bp: mmHg (technical sanity check: 30 to 300 mmHg)
 * - diastolic_bp: mmHg (technical sanity check: 20 to 200 mmHg)
 */
export const wearableDataSchema = z.object({
  metric: z.enum(['heart_rate', 'hrv', 'spo2', 'systolic_bp', 'diastolic_bp', 'body_temperature'], {
    errorMap: () => ({ message: 'Metric must be one of: heart_rate, hrv, spo2, systolic_bp, diastolic_bp, body_temperature' }),
  }),
  value: z.number({ invalid_type_error: 'Measurement value must be a number' }),
  unit: z.string().min(1, { message: 'Unit is required' }),
  rawSampleRateHz: z.number().positive().optional(),
  sensorContactQuality: z.enum(['good', 'fair', 'poor']).optional(),
}).superRefine((data, ctx) => {
  // Metric-specific unit consistency checks
  const unitMap = {
    heart_rate: ['bpm', 'BPM'],
    hrv: ['ms', 'MS'],
    spo2: ['%', 'percent'],
    systolic_bp: ['mmHg'],
    diastolic_bp: ['mmHg'],
    body_temperature: ['°C', 'degC', 'C'],
  };

  const validUnits = unitMap[data.metric];
  if (validUnits && !validUnits.includes(data.unit)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Invalid unit '${data.unit}' for metric '${data.metric}'. Expected '${validUnits[0]}'`,
      path: ['unit'],
    });
  }

  // Metric-specific technical plausibility (not medical diagnosis, but physical sensor bounds)
  switch (data.metric) {
    case 'heart_rate':
      if (data.value < 0 || data.value > 300) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Heart rate value ${data.value} fails technical plausibility bounds (0-300 bpm)`,
          path: ['value'],
        });
      }
      break;
    case 'hrv':
      if (data.value < 0 || data.value > 500) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `HRV value ${data.value} fails technical plausibility bounds (0-500 ms)`,
          path: ['value'],
        });
      }
      break;
    case 'spo2':
      if (data.value < 0 || data.value > 100) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `SpO2 value ${data.value} must be between 0% and 100%`,
          path: ['value'],
        });
      }
      break;
    case 'systolic_bp':
      if (data.value < 30 || data.value > 300) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Systolic BP value ${data.value} fails technical bounds (30-300 mmHg)`,
          path: ['value'],
        });
      }
      break;
    case 'diastolic_bp':
      if (data.value < 20 || data.value > 200) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Diastolic BP value ${data.value} fails technical bounds (20-200 mmHg)`,
          path: ['value'],
        });
      }
      break;
    case 'body_temperature':
      if (data.value < 30 || data.value > 45) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Body temperature value ${data.value} fails technical bounds (30-45 °C)`,
          path: ['value'],
        });
      }
      break;
  }
});

export const wearableRecordSchema = baseRecordSchema.extend({
  category: z.literal('wearable_physiological'),
  data: wearableDataSchema,
});

/**
 * 2. Manual Astronaut Health Assessment Schema
 * Supported metrics:
 * - stress_score: 0–100
 * - fatigue_score: 0–100
 * - mood_score: 1–10
 * - symptoms: string or array of symptom descriptions
 */
export const assessmentDataSchema = z.object({
  stress_score: z.number({ invalid_type_error: 'stress_score must be a number' })
    .min(0, { message: 'stress_score must be at least 0' })
    .max(100, { message: 'stress_score cannot exceed 100' }),
  fatigue_score: z.number({ invalid_type_error: 'fatigue_score must be a number' })
    .min(0, { message: 'fatigue_score must be at least 0' })
    .max(100, { message: 'fatigue_score cannot exceed 100' }),
  mood_score: z.number({ invalid_type_error: 'mood_score must be a number' })
    .min(1, { message: 'mood_score must be at least 1' })
    .max(10, { message: 'mood_score cannot exceed 10' }),
  symptoms: z.union([
    z.string(),
    z.array(z.string()),
  ]).default([]),
  notes: z.string().max(2000).optional(),
});

export const assessmentRecordSchema = baseRecordSchema.extend({
  category: z.literal('manual_assessment'),
  data: assessmentDataSchema,
});

/**
 * 3. Mission Events and Activity Record Schema
 * Supported events:
 * - exercise_session
 * - sleep_session
 * - workload_event
 * - other_mission_activity (or 'other mission activity')
 */
export const missionEventDataSchema = z.object({
  eventType: z.enum([
    'exercise_session',
    'sleep_session',
    'workload_event',
    'other_mission_activity',
    'other mission activity',
  ], {
    errorMap: () => ({
      message: 'eventType must be one of: exercise_session, sleep_session, workload_event, other_mission_activity',
    }),
  }),
  durationMinutes: z.number().nonnegative({ message: 'durationMinutes must be non-negative' }),
  intensity: z.enum(['low', 'moderate', 'high', 'extreme']).optional(),
  description: z.string().min(1, { message: 'Activity description is required' }),
  equipmentUsed: z.string().optional(),
  environmentalConditions: z.record(z.any()).optional(),
});

export const missionEventRecordSchema = baseRecordSchema.extend({
  category: z.literal('mission_event'),
  data: missionEventDataSchema,
});

/**
 * 4. Radiation Dosimeter Record Schema
 * Supported metrics:
 * - cumulative_dose: mSv
 * - dose_rate: µSv/h (or uSv/h)
 */
export const radiationDataSchema = z.object({
  cumulative_dose: z.number({ invalid_type_error: 'cumulative_dose must be a number' })
    .nonnegative({ message: 'cumulative_dose must be non-negative' }),
  cumulative_dose_unit: z.literal('mSv', {
    errorMap: () => ({ message: "cumulative_dose_unit must be 'mSv'" }),
  }),
  dose_rate: z.number({ invalid_type_error: 'dose_rate must be a number' })
    .nonnegative({ message: 'dose_rate must be non-negative' }),
  dose_rate_unit: z.enum(['µSv/h', 'uSv/h'], {
    errorMap: () => ({ message: "dose_rate_unit must be 'µSv/h' or 'uSv/h'" }),
  }),
  sensorLocation: z.string().optional(),
  dosimeterId: z.string().optional(),
});

export const radiationRecordSchema = baseRecordSchema.extend({
  category: z.literal('radiation_measurement'),
  data: radiationDataSchema,
});

/**
 * Discriminated Union of all four health data record categories
 */
export const healthRecordSchema = z.discriminatedUnion('category', [
  wearableRecordSchema,
  assessmentRecordSchema,
  missionEventRecordSchema,
  radiationRecordSchema,
]);


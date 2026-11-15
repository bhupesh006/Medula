import mongoose from 'mongoose';

/**
 * Base Health Record Schema
 * Enforces recordId as an immutable, globally unique idempotency key.
 */
const baseRecordOptions = {
  discriminatorKey: 'category',
  collection: 'health_records',
  timestamps: true,
};

const BaseRecordSchema = new mongoose.Schema(
  {
    recordId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    astronautId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    missionId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    recordedAt: {
      type: Date,
      required: true,
      index: true,
    },
    receivedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    provenance: {
      source: {
        type: String,
        required: true,
        enum: [
          'wearable_sensor',
          'manual_entry',
          'mission_log',
          'radiation_dosimeter',
          'external_telemetry',
        ],
      },
      deviceId: { type: String, trim: true },
      softwareVersion: { type: String, default: '1.0.0' },
      sensorModel: { type: String, trim: true },
      calibratedAt: { type: String },
    },
    syncStatus: {
      type: String,
      enum: ['pending', 'syncing', 'synced', 'failed'],
      default: 'synced',
    },
  },
  baseRecordOptions
);

// Compound indexes for high-frequency aerospace queries
BaseRecordSchema.index({ astronautId: 1, recordedAt: -1 });
BaseRecordSchema.index({ missionId: 1, recordedAt: -1 });

export const HealthRecordModel = mongoose.models.HealthRecord || mongoose.model('HealthRecord', BaseRecordSchema);

// 1. Wearable Physiological Discriminator
export const WearableRecordModel =
  HealthRecordModel.discriminators?.['wearable_physiological'] ||
  HealthRecordModel.discriminator(
    'wearable_physiological',
    new mongoose.Schema({
      data: {
        metric: {
          type: String,
          required: true,
          enum: ['heart_rate', 'hrv', 'spo2', 'systolic_bp', 'diastolic_bp', 'body_temperature'],
        },
        value: { type: Number, required: true },
        unit: { type: String, required: true },
        rawSampleRateHz: { type: Number },
        sensorContactQuality: { type: String, enum: ['good', 'fair', 'poor'] },
      },
    })
  );

// 2. Manual Astronaut Assessment Discriminator
export const AssessmentRecordModel =
  HealthRecordModel.discriminators?.['manual_assessment'] ||
  HealthRecordModel.discriminator(
    'manual_assessment',
    new mongoose.Schema({
      data: {
        stress_score: { type: Number, required: true, min: 0, max: 100 },
        fatigue_score: { type: Number, required: true, min: 0, max: 100 },
        mood_score: { type: Number, required: true, min: 1, max: 10 },
        symptoms: { type: mongoose.Schema.Types.Mixed, default: [] },
        notes: { type: String },
      },
    })
  );

// 3. Mission Event Discriminator
export const MissionEventRecordModel =
  HealthRecordModel.discriminators?.['mission_event'] ||
  HealthRecordModel.discriminator(
    'mission_event',
    new mongoose.Schema({
      data: {
        eventType: {
          type: String,
          required: true,
          enum: [
            'exercise_session',
            'sleep_session',
            'workload_event',
            'other_mission_activity',
            'other mission activity',
          ],
        },
        durationMinutes: { type: Number, required: true, min: 0 },
        intensity: { type: String, enum: ['low', 'moderate', 'high', 'extreme'] },
        description: { type: String, required: true },
        equipmentUsed: { type: String },
        environmentalConditions: { type: mongoose.Schema.Types.Mixed },
      },
    })
  );

// 4. Radiation Dosimeter Discriminator
export const RadiationRecordModel =
  HealthRecordModel.discriminators?.['radiation_measurement'] ||
  HealthRecordModel.discriminator(
    'radiation_measurement',
    new mongoose.Schema({
      data: {
        cumulative_dose: { type: Number, required: true, min: 0 },
        cumulative_dose_unit: { type: String, required: true, enum: ['mSv'] },
        dose_rate: { type: Number, required: true, min: 0 },
        dose_rate_unit: { type: String, required: true, enum: ['µSv/h', 'uSv/h'] },
        sensorLocation: { type: String },
        dosimeterId: { type: String },
      },
    })
  );


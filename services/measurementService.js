import {
  HealthRecordModel,
  WearableRecordModel,
  AssessmentRecordModel,
  MissionEventRecordModel,
  RadiationRecordModel,
} from '../models/Measurement.js';
import { ValidationService } from '../modules/data-acquisition/services/validationService.js';

/**
 * Backend Measurement Service
 * Provides idempotent database persistence and querying for mission telemetry.
 */
export class MeasurementService {
  /**
   * Idempotent batch ingestion of telemetry records.
   * Prevents duplicates, reports validation rejections, and persists accepted records.
   *
   * @param {Array<Object>} records - Telemetry records
   * @returns {Promise<Object>} Batch processing outcome
   */
  static async ingestBatch(records) {
    if (!Array.isArray(records)) {
      throw new Error('Payload must contain an array of records.');
    }

    const accepted = [];
    const duplicates = [];
    const rejected = [];

    if (records.length === 0) {
      return {
        success: true,
        accepted,
        duplicates,
        rejected,
        message: 'Empty batch provided; zero records processed.',
      };
    }

    // 1. First pass: Separate structurally invalid records using aerospace validation
    const validCandidates = [];
    for (const record of records) {
      const validation = ValidationService.validateRecord(record);
      if (!validation.isValid) {
        rejected.push({
          recordId: record?.recordId || null,
          reason: validation.errors.map((e) => `${e.field}: ${e.message}`).join('; '),
          errors: validation.errors,
          rawRecord: record,
        });
      } else {
        validCandidates.push(validation.record);
      }
    }

    if (validCandidates.length === 0) {
      return {
        success: true,
        accepted,
        duplicates,
        rejected,
        message: `Batch processed: 0 accepted, 0 duplicates, ${rejected.length} rejected.`,
      };
    }

    // 2. Identify already existing records (Idempotency Key Check)
    const candidateIds = validCandidates.map((r) => r.recordId);
    const existingRecords = await HealthRecordModel.find(
      { recordId: { $in: candidateIds } },
      { recordId: 1 }
    ).lean();

    const existingIdSet = new Set(existingRecords.map((r) => r.recordId));

    const recordsToInsert = [];
    for (const record of validCandidates) {
      if (existingIdSet.has(record.recordId)) {
        duplicates.push(record.recordId);
      } else {
        recordsToInsert.push(record);
      }
    }

    // 3. Persist new records using discriminator models
    for (const item of recordsToInsert) {
      try {
        let Model;
        switch (item.category) {
          case 'wearable_physiological':
            Model = WearableRecordModel;
            break;
          case 'manual_assessment':
            Model = AssessmentRecordModel;
            break;
          case 'mission_event':
            Model = MissionEventRecordModel;
            break;
          case 'radiation_measurement':
            Model = RadiationRecordModel;
            break;
          default:
            Model = HealthRecordModel;
        }

        await Model.create({
          ...item,
          recordedAt: new Date(item.recordedAt),
          receivedAt: item.receivedAt ? new Date(item.receivedAt) : new Date(),
          syncStatus: 'synced',
        });

        accepted.push(item.recordId);
      } catch (insertError) {
        // Handle race conditions where another worker inserted between query and create
        if (insertError.code === 11000) {
          duplicates.push(item.recordId);
        } else {
          rejected.push({
            recordId: item.recordId,
            reason: `Database error: ${insertError.message}`,
            errors: [{ field: 'database', message: insertError.message }],
            rawRecord: item,
          });
        }
      }
    }

    return {
      success: true,
      accepted,
      duplicates,
      rejected,
      message: `Batch processed: ${accepted.length} accepted, ${duplicates.length} duplicate(s), ${rejected.length} rejected.`,
    };
  }

  /**
   * Query records with filtering and pagination
   */
  static async getMeasurements(filters = {}) {
    const query = {};
    if (filters.astronautId) query.astronautId = filters.astronautId;
    if (filters.missionId) query.missionId = filters.missionId;
    if (filters.category) query.category = filters.category;
    if (filters.metric) query['data.metric'] = filters.metric;

    const limit = Math.min(parseInt(filters.limit, 10) || 50, 200);
    const skip = parseInt(filters.skip, 10) || 0;

    const [items, total] = await Promise.all([
      HealthRecordModel.find(query)
        .sort({ recordedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      HealthRecordModel.countDocuments(query),
    ]);

    return {
      items,
      total,
      limit,
      skip,
    };
  }

  /**
   * Retrieve a specific measurement by unique recordId
   */
  static async getMeasurementById(recordId) {
    return await HealthRecordModel.findOne({ recordId }).lean();
  }
}


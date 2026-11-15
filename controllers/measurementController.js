import { MeasurementService } from '../services/measurementService.js';

/**
 * Controller for Astronaut Health Telemetry Ingestion and Retrieval
 */
export const syncMeasurements = async (req, res, next) => {
  try {
    const { records } = req.body;

    if (!records || !Array.isArray(records)) {
      return res.status(400).json({
        success: false,
        accepted: [],
        duplicates: [],
        rejected: [],
        message: 'Invalid payload: "records" must be an array.',
      });
    }

    const result = await MeasurementService.ingestBatch(records);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getMeasurements = async (req, res, next) => {
  try {
    const { astronautId, missionId, category, metric, limit, skip } = req.query;
    const result = await MeasurementService.getMeasurements({
      astronautId,
      missionId,
      category,
      metric,
      limit,
      skip,
    });

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

export const getMeasurementById = async (req, res, next) => {
  try {
    const { recordId } = req.params;
    if (!recordId) {
      return res.status(400).json({
        success: false,
        message: 'recordId parameter is required',
      });
    }

    const record = await MeasurementService.getMeasurementById(recordId);
    if (!record) {
      return res.status(404).json({
        success: false,
        message: `Health record with ID '${recordId}' not found in mission database.`,
      });
    }

    return res.status(200).json({
      success: true,
      data: record,
    });
  } catch (error) {
    next(error);
  }
};


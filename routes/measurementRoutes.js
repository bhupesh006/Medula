import { Router } from 'express';
import {
  syncMeasurements,
  getMeasurements,
  getMeasurementById,
} from '../controllers/measurementController.js';

const router = Router();

// Batch synchronization endpoint (Offline-to-online ingestion)
router.post('/sync', syncMeasurements);

// Query health measurements
router.get('/', getMeasurements);

// Retrieve specific record by recordId
router.get('/:recordId', getMeasurementById);

export default router;


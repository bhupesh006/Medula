/**
 * MEDULA - Module 01: Health Data Acquisition and Validation Engine (MDAE)
 * Public Module API
 */

export { AcquisitionService } from './services/acquisitionService.js';
export { ValidationService, ValidationOutcome } from './services/validationService.js';
export { SyncService, syncService } from './services/syncService.js';

export {
  healthRecordSchema,
  wearableRecordSchema,
  assessmentRecordSchema,
  missionEventRecordSchema,
  radiationRecordSchema,
  wearableDataSchema,
  assessmentDataSchema,
  missionEventDataSchema,
  radiationDataSchema,
  provenanceSchema,
  baseRecordSchema,
} from './schemas/measurementSchema.js';

export { MeasurementForm } from './components/MeasurementForm.jsx';
export { ValidationResult } from './components/ValidationResult.jsx';
export { HealthAssessmentPage } from './HealthAssessmentPage.jsx';


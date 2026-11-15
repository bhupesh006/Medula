import { v4 as uuidv4 } from 'uuid';
import { localDb } from '../../../database/localDatabase.js';
import { calculateBaseline } from '../../personal-baseline/services/baselineCalculationService.js';
import { saveBaseline } from '../../personal-baseline/services/baselineStorageService.js';
import { detectPatternsAcrossDomains } from '../../health-pattern-detection/services/patternDetectionService.js';
import { savePatternResult } from '../../health-pattern-detection/services/patternStorageService.js';
import { generateMedicalGuidance } from '../../medical-decision-support/services/decisionSupportService.js';

/**
 * Synthetic Mission Flight Demonstration Generator
 * Ingests a complete, scientifically calibrated 14-day flight scenario for two astronauts.
 * Strictly labels every generated record as synthetic demonstration data.
 */
export async function loadFlightDemoScenario(options = {}) {
  const missionId = options.missionId || 'ARES-V-MARS-TRANSIT';
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  const astronauts = [
    { id: 'ASTRO-01', name: 'Commander Alex Rivera', role: 'Mission Commander' },
    { id: 'ASTRO-02', name: 'Dr. Sarah Chen', role: 'Science Officer & Flight Surgeon' },
  ];

  const generatedCounts = {
    measurements: 0,
    assessments: 0,
    missionEvents: 0,
    radiationRecords: 0,
    environmentalRecords: 0,
    baselines: 0,
    patterns: 0,
    guidance: 0,
  };

  const allMeasurements = [];
  const allAssessments = [];
  const allEvents = [];
  const allRadiation = [];
  const allEnv = [];
  const allSyncItems = [];

  // Generate 14 days of telemetry
  for (const astro of astronauts) {
    for (let day = 13; day >= 0; day--) {
      const dayTimestamp = new Date(now - day * dayMs).toISOString();

      // 1. Wearable Physiological: Heart Rate
      const hrRecordId = uuidv4();
      const hrVal = Math.round(64 + Math.sin(day) * 6 + (day === 3 ? 14 : 0));
      const hrRec = {
        recordId: hrRecordId,
        astronautId: astro.id,
        missionId,
        recordedAt: dayTimestamp,
        metric: 'heart_rate',
        value: hrVal,
        unit: 'bpm',
        sourceProvenance: 'SYNTHETIC_SIMULATED_RECORD',
        isSynthetic: true,
        syncStatus: 'pending',
      };
      allMeasurements.push(hrRec);
      allSyncItems.push({
        recordId: hrRecordId,
        category: 'wearable_physiological',
        payload: hrRec,
        status: 'pending',
        attempts: 0,
        createdAt: dayTimestamp,
        updatedAt: dayTimestamp,
      });

      // 2. Wearable Physiological: HRV (RMSSD)
      const hrvRecordId = uuidv4();
      const hrvVal = Math.round(55 + Math.cos(day) * 8 - (day === 3 ? 18 : 0));
      const hrvRec = {
        recordId: hrvRecordId,
        astronautId: astro.id,
        missionId,
        recordedAt: dayTimestamp,
        metric: 'hrv',
        value: hrvVal,
        unit: 'ms',
        sourceProvenance: 'SYNTHETIC_SIMULATED_RECORD',
        isSynthetic: true,
        syncStatus: 'pending',
      };
      allMeasurements.push(hrvRec);
      allSyncItems.push({
        recordId: hrvRecordId,
        category: 'wearable_physiological',
        payload: hrvRec,
        status: 'pending',
        attempts: 0,
        createdAt: dayTimestamp,
        updatedAt: dayTimestamp,
      });

      // 3. Wearable Physiological: Blood Pressure
      const bpRecordId = uuidv4();
      const bpRec = {
        recordId: bpRecordId,
        astronautId: astro.id,
        missionId,
        recordedAt: dayTimestamp,
        metric: 'blood_pressure',
        systolic: 120 + (day === 3 ? 12 : Math.round(Math.sin(day) * 4)),
        diastolic: 78 + Math.round(Math.cos(day) * 3),
        unit: 'mmHg',
        sourceProvenance: 'SYNTHETIC_SIMULATED_RECORD',
        isSynthetic: true,
        syncStatus: 'pending',
      };
      allMeasurements.push(bpRec);
      allSyncItems.push({
        recordId: bpRecordId,
        category: 'wearable_physiological',
        payload: bpRec,
        status: 'pending',
        attempts: 0,
        createdAt: dayTimestamp,
        updatedAt: dayTimestamp,
      });

      // 4. Wearable Physiological: SpO2 Pulse Oximetry
      const spo2RecordId = uuidv4();
      const spo2Val = Math.round(97 + Math.cos(day) * 1.2);
      const spo2Rec = {
        recordId: spo2RecordId,
        astronautId: astro.id,
        missionId,
        recordedAt: dayTimestamp,
        metric: 'spo2',
        value: spo2Val,
        unit: '%',
        sourceProvenance: 'SYNTHETIC_SIMULATED_RECORD',
        isSynthetic: true,
        syncStatus: 'pending',
      };
      allMeasurements.push(spo2Rec);
      allSyncItems.push({
        recordId: spo2RecordId,
        category: 'wearable_physiological',
        payload: spo2Rec,
        status: 'pending',
        attempts: 0,
        createdAt: dayTimestamp,
        updatedAt: dayTimestamp,
      });

      // 5. Wearable Physiological: Core Body Temperature
      const tempRecordId = uuidv4();
      const tempVal = Math.round((36.7 + Math.sin(day) * 0.3) * 10) / 10;
      const tempRec = {
        recordId: tempRecordId,
        astronautId: astro.id,
        missionId,
        recordedAt: dayTimestamp,
        metric: 'body_temperature',
        value: tempVal,
        unit: '°C',
        sourceProvenance: 'SYNTHETIC_SIMULATED_RECORD',
        isSynthetic: true,
        syncStatus: 'pending',
      };
      allMeasurements.push(tempRec);
      allSyncItems.push({
        recordId: tempRecordId,
        category: 'wearable_physiological',
        payload: tempRec,
        status: 'pending',
        attempts: 0,
        createdAt: dayTimestamp,
        updatedAt: dayTimestamp,
      });

      // 6. Manual Health Assessment: Sleep, Fatigue, Mood, Stress
      const assessRecordId = uuidv4();
      const assessRec = {
        recordId: assessRecordId,
        astronautId: astro.id,
        missionId,
        recordedAt: dayTimestamp,
        sleepHours: Math.round((6.4 + Math.sin(day) * 0.8) * 10) / 10,
        fatigueScore: Math.min(10, Math.max(1, Math.round(3.5 + (day === 3 ? 3 : Math.cos(day))))),
        moodScore: Math.min(10, Math.max(1, Math.round(7.5 + Math.sin(day)))),
        stressScore: Math.min(10, Math.max(1, Math.round(3.0 + (day === 3 ? 3 : 0)))),
        sourceProvenance: 'SYNTHETIC_SIMULATED_RECORD',
        isSynthetic: true,
        syncStatus: 'pending',
      };
      allAssessments.push(assessRec);
      allSyncItems.push({
        recordId: assessRecordId,
        category: 'manual_assessment',
        payload: assessRec,
        status: 'pending',
        attempts: 0,
        createdAt: dayTimestamp,
        updatedAt: dayTimestamp,
      });

      // 5. Mission Events: Countermeasure Exercise
      const eventRecordId = uuidv4();
      const eventRec = {
        recordId: eventRecordId,
        astronautId: astro.id,
        missionId,
        recordedAt: dayTimestamp,
        eventType: day === 7 ? 'extravehicular_activity' : 'exercise_session',
        description: day === 7 ? 'Scheduled EVA Maintenance Segment (6.5 hours)' : 'ARED Resistive Exercise & T2 Treadmill',
        durationMinutes: day === 7 ? 390 : 90,
        workloadIntensity: day === 7 ? 'heavy' : 'moderate',
        sourceProvenance: 'SYNTHETIC_SIMULATED_RECORD',
        isSynthetic: true,
        syncStatus: 'pending',
      };
      allEvents.push(eventRec);
      allSyncItems.push({
        recordId: eventRecordId,
        category: 'mission_event',
        payload: eventRec,
        status: 'pending',
        attempts: 0,
        createdAt: dayTimestamp,
        updatedAt: dayTimestamp,
      });

      // 6. Radiation Records
      const radRecordId = uuidv4();
      const isSaaPass = day === 8;
      const radRec = {
        recordId: radRecordId,
        astronautId: astro.id,
        missionId,
        recordedAt: dayTimestamp,
        doseRate: isSaaPass ? 82.5 : 12.8 + Math.sin(day) * 2,
        cumulativeDose: Math.round((14.5 + (13 - day) * 0.35) * 10) / 10,
        doseRateUnit: 'µSv/h',
        cumulativeDoseUnit: 'mSv',
        detectorId: 'DOSTEL-SIM-01',
        orbitalRegion: isSaaPass ? 'South Atlantic Anomaly (SAA) Belt Pass' : 'Galactic Cosmic Ray Background',
        sourceProvenance: 'SYNTHETIC_SIMULATED_RECORD',
        isSynthetic: true,
        syncStatus: 'pending',
      };
      allRadiation.push(radRec);
      allSyncItems.push({
        recordId: radRecordId,
        category: 'radiation_measurement',
        payload: radRec,
        status: 'pending',
        attempts: 0,
        createdAt: dayTimestamp,
        updatedAt: dayTimestamp,
      });
    }

    // Cabin Environmental Logs for Mission
    for (let day = 13; day >= 0; day--) {
      const dayTimestamp = new Date(now - day * dayMs).toISOString();
      allEnv.push({
        recordId: uuidv4(),
        missionId,
        recordedAt: dayTimestamp,
        cabinTemperature: 22.3 + Math.sin(day) * 0.8,
        cabinCo2: 0.42 + (day === 3 ? 0.12 : Math.cos(day) * 0.04),
        cabinHumidity: 45.2 + Math.sin(day) * 2,
        cabinPressure: 101.3,
        temperatureUnit: '°C',
        co2Unit: '%',
        humidityUnit: '%',
        pressureUnit: 'kPa',
        sourceProvenance: 'SYNTHETIC_SIMULATED_RECORD',
        isSynthetic: true,
      });
    }
  }

  // Persist raw records into local Dexie IndexedDB
  await localDb.measurements.bulkPut(allMeasurements);
  await localDb.assessments.bulkPut(allAssessments);
  await localDb.missionEvents.bulkPut(allEvents);
  await localDb.radiationRecords.bulkPut(allRadiation);
  await localDb.environmentalRecords.bulkPut(allEnv);
  await localDb.syncQueue.bulkPut(allSyncItems);

  generatedCounts.measurements = allMeasurements.length;
  generatedCounts.assessments = allAssessments.length;
  generatedCounts.missionEvents = allEvents.length;
  generatedCounts.radiationRecords = allRadiation.length;
  generatedCounts.environmentalRecords = allEnv.length;

  // Compute and save baselines for each astronaut
  for (const astro of astronauts) {
    const hrRecords = allMeasurements.filter((m) => m.astronautId === astro.id && m.metric === 'heart_rate');
    if (hrRecords.length > 0) {
      const hrBaseline = calculateBaseline(hrRecords, astro.id, 'heart_rate', {
        missionId,
        unit: 'bpm',
      });
      await saveBaseline(hrBaseline);
      generatedCounts.baselines++;
    }

    const hrvRecords = allMeasurements.filter((m) => m.astronautId === astro.id && m.metric === 'hrv');
    if (hrvRecords.length > 0) {
      const hrvBaseline = calculateBaseline(hrvRecords, astro.id, 'hrv', {
        missionId,
        unit: 'ms',
      });
      await saveBaseline(hrvBaseline);
      generatedCounts.baselines++;
    }

    const spo2Records = allMeasurements.filter((m) => m.astronautId === astro.id && m.metric === 'spo2');
    if (spo2Records.length > 0) {
      const spo2Baseline = calculateBaseline(spo2Records, astro.id, 'spo2', {
        missionId,
        unit: '%',
      });
      await saveBaseline(spo2Baseline);
      generatedCounts.baselines++;
    }

    const tempRecords = allMeasurements.filter((m) => m.astronautId === astro.id && m.metric === 'body_temperature');
    if (tempRecords.length > 0) {
      const tempBaseline = calculateBaseline(tempRecords, astro.id, 'body_temperature', {
        missionId,
        unit: '°C',
      });
      await saveBaseline(tempBaseline);
      generatedCounts.baselines++;
    }

    // Evaluate health patterns
    const patterns = await detectPatternsAcrossDomains(astro.id, missionId);
    for (const p of patterns) {
      await savePatternResult(p);
      generatedCounts.patterns++;
    }

    // Generate clinical medical guidance
    const guidance = await generateMedicalGuidance(astro.id, missionId);
    generatedCounts.guidance += guidance.length;
  }

  return {
    success: true,
    missionId,
    astronauts: astronauts.map((a) => a.id),
    counts: generatedCounts,
    isSynthetic: true,
    provenanceNotice: 'Strictly simulated synthetic aerospace telemetry generated for demonstration purposes.',
  };
}

/**
 * Safely purge synthetic demonstration records while preserving user records and real NASA research datasets.
 * @returns {Promise<{ deletedCounts: Object, totalDeleted: number }>}
 */
export async function resetDemoScenario() {
  if (!localDb) return { totalDeleted: 0, deletedCounts: {} };

  const tables = [
    'measurements',
    'assessments',
    'missionEvents',
    'radiationRecords',
    'environmentalRecords',
    'baselines',
    'baselineHistory',
    'patternResults',
    'medicalGuidanceHistory',
    'contextSnapshots',
    'syncQueue',
    'rejectedRecords',
  ];

  const deletedCounts = {};
  let totalDeleted = 0;

  for (const tableName of tables) {
    if (!localDb[tableName]) continue;

    const records = await localDb[tableName].toArray();
    const demoKeys = [];

    for (const rec of records) {
      const isDemo =
        rec.isSynthetic === true ||
        rec.sourceProvenance === 'SYNTHETIC_SIMULATED_RECORD' ||
        (rec.payload && (rec.payload.isSynthetic === true || rec.payload.sourceProvenance === 'SYNTHETIC_SIMULATED_RECORD')) ||
        (rec.provenance && typeof rec.provenance === 'string' && rec.provenance.includes('SYNTHETIC'));

      if (isDemo) {
        const key = rec.recordId || rec.baselineId || rec.historyId || rec.patternId || rec.guidanceId || rec.contextId;
        if (key) demoKeys.push(key);
      }
    }

    if (demoKeys.length > 0) {
      await localDb[tableName].bulkDelete(demoKeys);
      deletedCounts[tableName] = demoKeys.length;
      totalDeleted += demoKeys.length;
    } else {
      deletedCounts[tableName] = 0;
    }
  }

  return { deletedCounts, totalDeleted };
}

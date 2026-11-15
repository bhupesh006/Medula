import Dexie from 'dexie';

/**
 * Medula Local Database (Dexie IndexedDB)
 * Offline-first persistent storage for astronaut health telemetry.
 */
export class MedulaLocalDB extends Dexie {
  constructor() {
    super('MedulaLocalDatabase');

    // Schema version 1
    this.version(1).stores({
      // 1. Wearable Physiological Measurements
      measurements: '&recordId, astronautId, missionId, recordedAt, syncStatus, [astronautId+recordedAt]',

      // 2. Manual Astronaut Assessments
      assessments: '&recordId, astronautId, missionId, recordedAt, syncStatus, [astronautId+recordedAt]',

      // 3. Mission Events & Activity Logs
      missionEvents: '&recordId, astronautId, missionId, recordedAt, syncStatus, [astronautId+recordedAt]',

      // 4. Radiation Dosimeter Records
      radiationRecords: '&recordId, astronautId, missionId, recordedAt, syncStatus, [astronautId+recordedAt]',

      // 5. Synchronization Queue (for atomic offline batch ingestion)
      syncQueue: '&recordId, status, category, attempts, createdAt, updatedAt',

      // 6. Rejected Record Inspection Audit Log
      rejectedRecords: '&recordId, category, astronautId, rejectedAt, reason',
    });

    // Schema version 2 - Module 02: Personal Baseline Engine (PBE)
    this.version(2).stores({
      // Active Baselines for each Astronaut and Metric
      baselines: '&baselineId, astronautId, missionId, metric, confidence, updatedAt, [astronautId+metric], [astronautId+metric+missionId]',

      // Historical Baseline Versions for audit trail and baseline evolution tracking
      baselineHistory: '&historyId, baselineId, astronautId, missionId, metric, version, createdAt, [astronautId+metric], [astronautId+metric+missionId]',
    });

    // Schema version 3 - Module 03: Multi-Indicator Health Pattern Detection Engine (MHPDE)
    this.version(3).stores({
      patternResults: '&patternId, astronautId, missionId, domain, operationalState, confidence, detectionTimestamp, [astronautId+domain], [astronautId+operationalState]',
    });

    // Schema version 4 - Module 04: Mission Context Engine (MCE)
    this.version(4).stores({
      // Environmental Telemetry (Cabin temperature, humidity, CO2, O2, atmospheric pressure)
      environmentalRecords: '&recordId, missionId, recordedAt',

      // Derived Context Snapshots associated with health patterns
      contextSnapshots: '&contextId, astronautId, missionId, relatedPatternId, generatedAt, [astronautId+missionId]',
    });

    // Schema version 5 - NASA Research & Evidence Layer
    this.version(5).stores({
      // Research Evidence Registry Cache
      researchEvidence: '&evidenceId, relatedHazard, relatedHealthDomain, evidenceType, sourceOrganization',

      // Verified Imported Research Datasets (kept strictly separate from synthetic astronaut records)
      researchDatasets: '&recordId, datasetAccession, sourceSystem, recordedAt, metric, isSynthetic, [datasetAccession+metric]',
    });

    // Schema version 6 - Module 05 & 06: Decision Support & Mission Continuity
    this.version(6).stores({
      // Medical Decision Support Guidance History
      medicalGuidanceHistory: '&guidanceId, astronautId, missionId, domain, priority, status, generatedAt, [astronautId+domain], [astronautId+status]',

      // System Audit & Continuity Operation Logs
      systemAuditLogs: '&logId, eventType, timestamp, severity, component',
    });

    this.measurements = this.table('measurements');
    this.assessments = this.table('assessments');
    this.missionEvents = this.table('missionEvents');
    this.radiationRecords = this.table('radiationRecords');
    this.syncQueue = this.table('syncQueue');
    this.rejectedRecords = this.table('rejectedRecords');
    this.baselines = this.table('baselines');
    this.baselineHistory = this.table('baselineHistory');
    this.patternResults = this.table('patternResults');
    this.environmentalRecords = this.table('environmentalRecords');
    this.contextSnapshots = this.table('contextSnapshots');
    this.researchEvidence = this.table('researchEvidence');
    this.researchDatasets = this.table('researchDatasets');
    this.medicalGuidanceHistory = this.table('medicalGuidanceHistory');
    this.systemAuditLogs = this.table('systemAuditLogs');
  }

  /**
   * Helper to get target table by category name
   */
  getTableByCategory(category) {
    switch (category) {
      case 'wearable_physiological':
        return this.measurements;
      case 'manual_assessment':
        return this.assessments;
      case 'mission_event':
        return this.missionEvents;
      case 'radiation_measurement':
        return this.radiationRecords;
      default:
        return null;
    }
  }
}

export const localDb = new MedulaLocalDB();


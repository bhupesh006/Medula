import { v4 as uuidv4 } from 'uuid';
import { localDb } from '../../../database/localDatabase.js';
import { getPatternsByAstronaut } from '../../health-pattern-detection/services/patternStorageService.js';
import { getContextForHealthPattern } from '../../mission-context/services/missionContextService.js';
import { getEvidenceByDomain } from '../../research-evidence/services/evidenceRegistryService.js';

/**
 * Standard Spaceflight Clinical Protocol Definitions
 * Grounded in NASA HRP Clinical Evidence Reports and Spaceflight Standard Measures
 */
const CLINICAL_PROTOCOLS = {
  cardiovascular: {
    title: 'Cardiovascular Deconditioning & Fluid Redistribution Protocol',
    priority: 'ADVISORY',
    supportingEvidenceId: 'EVID-NASA-RSK-CARDIO',
    recommendedActions: [
      'Initiate prescribed lower-body fluid loading protocol (1.0L isotonic electrolyte solution prior to orthostatic challenge).',
      'Prescribe 30-min targeted aerobic ergometer session at 75-80% VO2 max to stimulate autonomic vascular tone.',
      'Check compression garment fit and verify resting blood pressure seated vs. supine.',
      'Continue nocturnal Holter ECG monitoring for autonomic HRV stabilization.'
    ],
    contraindications: 'Do not administer rapid bolus fluid loading without verifying renal and cabin ECLSS water balance.',
  },
  sleep_recovery: {
    title: 'Sleep Debt & Circadian Realignment Countermeasure',
    priority: 'CAUTION',
    supportingEvidenceId: 'EVID-NASA-RSK-SLEEP',
    recommendedActions: [
      'Enforce 8.5-hour scheduled sleep opportunity window in crew quarters.',
      'Shift crew habitat dynamic lighting to 480nm blue-depleted circadian rest spectrum 90 min prior to sleep.',
      'Enforce strict operational caffeine curfew 6 hours prior to scheduled sleep onset.',
      'Evaluate sleep cabin acoustic level; recommend active noise-cancelling earplugs if ambient noise exceeds 55 dBA.'
    ],
    contraindications: 'Avoid pharmacologic hypnotic administration during critical docking or EVA contingency shifts.',
  },
  psychological: {
    title: 'Behavioral Health & Mission Stress Mitigation Protocol',
    priority: 'ADVISORY',
    supportingEvidenceId: 'EVID-NASA-HAZ-ISO',
    recommendedActions: [
      'Reduce non-critical payload maintenance tasks by 20% over the next 48-hour block.',
      'Schedule 45-minute private family audio/video conference or personal leisure time window.',
      'Encourage crew social meal attendance and Earth-observation time in habitat cupola.',
      'Monitor self-reported mood and stress visual analog scales (VAS) daily.'
    ],
    contraindications: 'Do not impose invasive behavioral testing during high-workload anomalies.',
  },
  physical_performance: {
    title: 'Musculoskeletal Conditioning & Workload Adjustment Protocol',
    priority: 'ROUTINE',
    supportingEvidenceId: 'EVID-NASA-HAZ-GRAV',
    recommendedActions: [
      'Perform scheduled resistive exercise device (ARED) squats and deadlifts to maintain bone axial loading.',
      'Ensure daily protein intake exceeds 1.2 g/kg body mass to mitigate microgravity nitrogen loss.',
      'Schedule active recovery stretching and muscle self-massage to relieve postural spinal elongation discomfort.'
    ],
    contraindications: 'Avoid heavy spinal axial loading if acute back pain or paresthesias are reported.',
  },
  radiation: {
    title: 'ALARA Radiation Exposure & Module Relocation Directive',
    priority: 'CRITICAL_ACTION',
    supportingEvidenceId: 'EVID-NASA-OSDR-RADLAB',
    recommendedActions: [
      'Advise crew relocation to heavily shielded sleeping quarters (e.g. water-shielded crew cabins) during high-latitude orbital passes.',
      'Inspect personal active dosimeter orientation and cross-verify with DOSTEL-1 telemetry stream.',
      'Postpone elective extravehicular activity (EVA) until solar particle event flux returns to quiescent background levels.',
      'Log accumulated mission dose into medical record for lifelong surveillance tracking.'
    ],
    contraindications: 'Do not bypass habitat shielding bulkheads during solar particle events.',
  },
  environmental: {
    title: 'Cabin Hypercapnia & Atmosphere Revitalization Protocol',
    priority: 'CAUTION',
    supportingEvidenceId: 'EVID-NASA-RSK-CO2',
    recommendedActions: [
      'Inspect ECLSS Carbon Dioxide Removal Assembly (CDRA) scrubber canisters and verify air exchange velocity.',
      'Deploy supplemental localized cabin ventilation fans to eliminate stagnant exhaled CO2 pockets in crew sleep stations.',
      'Perform SpO2 check; ensure crew hydration to minimize hypercapnic headache risk.'
    ],
    contraindications: 'Do not ignore persistent astronaut headaches even if bulk module sensors report marginal CO2.',
  },
};

/**
 * Generate medical decision support guidance for an astronaut based on active health patterns and mission context
 * @param {string} astronautId 
 * @param {string} [missionId] 
 * @param {Object} [options] 
 * @returns {Promise<Array<Object>>}
 */
export async function generateMedicalGuidance(astronautId, missionId = 'ARES-V-MARS-TRANSIT', options = {}) {
  if (!astronautId) {
    throw new Error('astronautId is required to generate medical decision support guidance.');
  }

  // 1. Fetch active patterns for astronaut
  const patterns = await getPatternsByAstronaut(astronautId);
  const guidanceRecords = [];

  // If no patterns exist, generate a nominal baseline health maintenance advisory
  if (!patterns || patterns.length === 0) {
    const nominalGuidance = {
      guidanceId: uuidv4(),
      astronautId,
      missionId,
      domain: 'general',
      priority: 'ROUTINE',
      title: 'Nominal Mission Health Maintenance Protocol',
      operationalState: 'NOMINAL',
      operationalContext: 'All tracked indicators remain within calculated personal baselines. Operational tempo nominal.',
      clinicalRecommendations: [
        'Maintain scheduled 2.5-hour daily countermeasure exercise regime (ARED + cycle ergometer).',
        'Continue standard 24-hour sleep opportunity schedule.',
        'Perform scheduled weekly health assessment and body mass check.'
      ],
      supportingEvidenceId: 'EVID-NASA-STD-CARDIO',
      status: 'ACKNOWLEDGED',
      generatedAt: new Date().toISOString(),
      provenance: 'MEDULA Decision Support Engine (Autonomous Clinical Guidance)',
    };

    if (localDb && localDb.medicalGuidanceHistory) {
      await localDb.medicalGuidanceHistory.put(nominalGuidance);
    }
    return [nominalGuidance];
  }

  // 2. Iterate patterns and synthesize protocol recommendations
  for (const pattern of patterns) {
    const domain = pattern.domain || 'cardiovascular';
    const protocolTemplate = CLINICAL_PROTOCOLS[domain] || CLINICAL_PROTOCOLS.cardiovascular;

    // Adjust priority based on pattern operational state
    let calculatedPriority = protocolTemplate.priority;
    if (pattern.operationalState === 'ESCALATE') {
      calculatedPriority = 'CRITICAL_ACTION';
    } else if (pattern.operationalState === 'ASSESS') {
      calculatedPriority = 'CAUTION';
    } else if (pattern.operationalState === 'MONITOR') {
      calculatedPriority = 'ADVISORY';
    }

    // Get mission context surrounding this pattern
    let contextSummary = 'Standard operational mission context.';
    try {
      const contextData = await getContextForHealthPattern(pattern, astronautId, missionId);
      if (contextData && (contextData.explanation || contextData.nonCausalSummary)) {
        contextSummary = contextData.explanation || contextData.nonCausalSummary;
      }
    } catch (e) {
      // Degrade gracefully if context is unavailable
    }

    const guidance = {
      guidanceId: uuidv4(),
      astronautId,
      missionId,
      relatedPatternId: pattern.patternId || null,
      domain,
      priority: calculatedPriority,
      title: protocolTemplate.title,
      operationalState: pattern.operationalState,
      confidence: pattern.confidence || 0.85,
      operationalContext: contextSummary,
      clinicalRecommendations: protocolTemplate.recommendedActions,
      contraindications: protocolTemplate.contraindications,
      supportingEvidenceId: protocolTemplate.supportingEvidenceId,
      status: 'PENDING_REVIEW',
      generatedAt: new Date().toISOString(),
      provenance: 'MEDULA Medical Decision Support Engine (Protocol Rules)',
    };

    guidanceRecords.push(guidance);
  }

  // 3. Persist generated guidance into Dexie medicalGuidanceHistory
  if (localDb && localDb.medicalGuidanceHistory) {
    await localDb.medicalGuidanceHistory.bulkPut(guidanceRecords);
  }

  return guidanceRecords;
}

/**
 * Retrieve medical guidance history for an astronaut
 * @param {string} astronautId 
 * @param {Object} [options]
 * @returns {Promise<Array<Object>>}
 */
export async function getGuidanceHistory(astronautId, options = {}) {
  if (!localDb || !localDb.medicalGuidanceHistory) return [];

  let query = localDb.medicalGuidanceHistory.where('astronautId').equals(astronautId);
  let records = await query.toArray();

  if (options.status) {
    records = records.filter((r) => r.status === options.status);
  }

  if (options.priority) {
    records = records.filter((r) => r.priority === options.priority);
  }

  return records.sort((a, b) => new Date(b.generatedAt) - new Date(a.generatedAt));
}

/**
 * Acknowledge or update status of a medical guidance item
 * @param {string} guidanceId 
 * @param {string} newStatus 
 * @param {string} [notes] 
 * @returns {Promise<Object>}
 */
export async function updateGuidanceStatus(guidanceId, newStatus = 'ACKNOWLEDGED', notes = '') {
  if (!localDb || !localDb.medicalGuidanceHistory) {
    throw new Error('Database unavailable.');
  }

  const existing = await localDb.medicalGuidanceHistory.get(guidanceId);
  if (!existing) {
    throw new Error(`Guidance item ${guidanceId} not found.`);
  }

  const updated = {
    ...existing,
    status: newStatus,
    reviewedAt: new Date().toISOString(),
    reviewNotes: notes,
  };

  await localDb.medicalGuidanceHistory.put(updated);
  return updated;
}

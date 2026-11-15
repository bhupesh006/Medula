import { describe, it, expect, beforeEach } from 'vitest';
import { localDb } from '../database/localDatabase.js';
import {
  generateMedicalGuidance,
  getGuidanceHistory,
  updateGuidanceStatus,
} from '../modules/medical-decision-support/services/decisionSupportService.js';
import { savePatternResult } from '../modules/health-pattern-detection/services/patternStorageService.js';

describe('Module 05: Medical Decision Support Engine (MDSE)', () => {
  const astronautId = 'ASTRO-MDSE-TEST';
  const missionId = 'ARES-V-MARS-TRANSIT';

  beforeEach(async () => {
    await localDb.patternResults.clear();
    await localDb.medicalGuidanceHistory.clear();
    await localDb.environmentalRecords.clear();
    await localDb.missionEvents.clear();
  });

  it('should generate nominal routine health maintenance protocol when no deviating patterns exist', async () => {
    const guidanceList = await generateMedicalGuidance(astronautId, missionId);
    expect(guidanceList).toHaveLength(1);

    const guidance = guidanceList[0];
    expect(guidance.priority).toBe('ROUTINE');
    expect(guidance.title).toContain('Nominal Mission Health');
    expect(guidance.clinicalRecommendations.length).toBeGreaterThanOrEqual(2);
    expect(guidance.supportingEvidenceId).toBeDefined();

    // Verify stored in Dexie medicalGuidanceHistory
    const stored = await getGuidanceHistory(astronautId);
    expect(stored).toHaveLength(1);
    expect(stored[0].guidanceId).toBe(guidance.guidanceId);
  });

  it('should generate specialized clinical protocol guidance corresponding to active health patterns', async () => {
    // Inject active cardiovascular pattern in ASSESS state
    await savePatternResult({
      astronautId,
      missionId,
      domain: 'cardiovascular',
      operationalState: 'ASSESS',
      confidence: 'HIGH_CONFIDENCE',
      contributingIndicators: [
        { metric: 'heart_rate', direction: 'ABOVE_BASELINE_PATTERN' },
        { metric: 'hrv', direction: 'BELOW_BASELINE_PATTERN' },
      ],
      patternDescription: 'Significant elevation in resting heart rate accompanied by autonomic HRV suppression.',
    });

    // Inject active sleep pattern in ESCALATE state
    await savePatternResult({
      astronautId,
      missionId,
      domain: 'sleep_recovery',
      operationalState: 'ESCALATE',
      confidence: 'HIGH_CONFIDENCE',
      contributingIndicators: [
        { metric: 'sleep_duration', direction: 'BELOW_BASELINE_PATTERN' },
        { metric: 'fatigue_score', direction: 'ABOVE_BASELINE_PATTERN' },
      ],
      patternDescription: 'Severe sleep debt (<5.5h) over multiple consecutive cycles with elevated fatigue ratings.',
    });

    const guidanceList = await generateMedicalGuidance(astronautId, missionId);
    expect(guidanceList.length).toBe(2);

    const cardioGuidance = guidanceList.find((g) => g.domain === 'cardiovascular');
    expect(cardioGuidance).toBeDefined();
    expect(cardioGuidance.priority).toBe('CAUTION'); // ASSESS -> CAUTION
    expect(cardioGuidance.title).toContain('Cardiovascular');
    expect(cardioGuidance.clinicalRecommendations.some((r) => r.includes('fluid loading'))).toBe(true);
    expect(cardioGuidance.contraindications).toBeDefined();

    const sleepGuidance = guidanceList.find((g) => g.domain === 'sleep_recovery');
    expect(sleepGuidance).toBeDefined();
    expect(sleepGuidance.priority).toBe('CRITICAL_ACTION'); // ESCALATE -> CRITICAL_ACTION
    expect(sleepGuidance.clinicalRecommendations.some((r) => r.includes('caffeine curfew'))).toBe(true);
  });

  it('should acknowledge and implement medical guidance with reviewer audit trail', async () => {
    const initialList = await generateMedicalGuidance(astronautId, missionId);
    const targetGuidance = initialList[0];

    // Acknowledge
    const ackResult = await updateGuidanceStatus(
      targetGuidance.guidanceId,
      'ACKNOWLEDGED',
      'Reviewed by Flight Surgeon'
    );
    expect(ackResult.status).toBe('ACKNOWLEDGED');
    expect(ackResult.reviewNotes).toBe('Reviewed by Flight Surgeon');
    expect(ackResult.reviewedAt).toBeDefined();

    // Implement countermeasure
    const impResult = await updateGuidanceStatus(
      targetGuidance.guidanceId,
      'IMPLEMENTED',
      'Electrolyte hydration fluid loading initiated'
    );
    expect(impResult.status).toBe('IMPLEMENTED');

    const history = await getGuidanceHistory(astronautId, { status: 'IMPLEMENTED' });
    expect(history).toHaveLength(1);
    expect(history[0].reviewNotes).toContain('Electrolyte');
  });
});

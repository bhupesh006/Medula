import { describe, it, expect, beforeEach } from 'vitest';
import {
  MissionContextService,
  TimelineEventType,
} from '../modules/mission-context/services/missionContextService.js';
import { MedulaLocalDB } from '../database/localDatabase.js';

describe('Mission Context Engine (MCE Module 04)', () => {
  let testDb;
  const now = new Date('2026-11-15T12:00:00.000Z').getTime();

  beforeEach(async () => {
    testDb = new MedulaLocalDB();
    await testDb.measurements.clear();
    await testDb.assessments.clear();
    await testDb.missionEvents.clear();
    await testDb.radiationRecords.clear();
    if (testDb.environmentalRecords) await testDb.environmentalRecords.clear();
    if (testDb.contextSnapshots) await testDb.contextSnapshots.clear();
  });

  // 1. Chronological event ordering
  it('1. Orders combined mission timeline events strictly chronologically', async () => {
    // Insert events with different timestamps
    await testDb.measurements.put({
      recordId: 'm-1',
      astronautId: 'ASTRO-01',
      missionId: 'ARES-V',
      recordedAt: new Date(now - 3 * 3600000).toISOString(), // 3 hours ago
      category: 'wearable_physiological',
      data: { metric: 'heart_rate', value: 72, unit: 'bpm' },
    });

    await testDb.missionEvents.put({
      recordId: 'e-1',
      astronautId: 'ASTRO-01',
      missionId: 'ARES-V',
      recordedAt: new Date(now - 1 * 3600000).toISOString(), // 1 hour ago (newest)
      category: 'mission_event',
      data: { eventType: 'exercise_session', durationMinutes: 45 },
    });

    await testDb.radiationRecords.put({
      recordId: 'r-1',
      astronautId: 'ASTRO-01',
      missionId: 'ARES-V',
      recordedAt: new Date(now - 5 * 3600000).toISOString(), // 5 hours ago (oldest)
      category: 'radiation_measurement',
      data: { dose_rate: 12.0, cumulative_dose: 15.0 },
    });

    const timeline = await MissionContextService.getMissionTimeline('ASTRO-01', 'ARES-V', { db: testDb });

    expect(timeline).toHaveLength(3);
    // Descending order: e-1 (1h ago) -> m-1 (3h ago) -> r-1 (5h ago)
    expect(timeline[0].id).toBe('e-1');
    expect(timeline[1].id).toBe('m-1');
    expect(timeline[2].id).toBe('r-1');
  });

  // 2. Correct astronaut filtering
  it('2. Filters timeline events strictly by astronautId without cross-astronaut bleed', async () => {
    await testDb.missionEvents.put({
      recordId: 'e-astro-1',
      astronautId: 'ASTRO-01',
      missionId: 'ARES-V',
      recordedAt: new Date(now - 3600000).toISOString(),
      category: 'mission_event',
      data: { eventType: 'exercise_session', durationMinutes: 30 },
    });

    await testDb.missionEvents.put({
      recordId: 'e-astro-2',
      astronautId: 'ASTRO-02',
      missionId: 'ARES-V',
      recordedAt: new Date(now - 3600000).toISOString(),
      category: 'mission_event',
      data: { eventType: 'exercise_session', durationMinutes: 60 },
    });

    const timeline = await MissionContextService.getMissionTimeline('ASTRO-01', 'ARES-V', { db: testDb });
    expect(timeline).toHaveLength(1);
    expect(timeline[0].id).toBe('e-astro-1');
  });

  // 3. Correct mission filtering
  it('3. Filters mission events strictly by missionId without cross-mission contamination', async () => {
    await testDb.missionEvents.put({
      recordId: 'e-ares-v',
      astronautId: 'ASTRO-01',
      missionId: 'ARES-V',
      recordedAt: new Date(now - 3600000).toISOString(),
      category: 'mission_event',
      data: { eventType: 'exercise_session', durationMinutes: 30 },
    });

    await testDb.missionEvents.put({
      recordId: 'e-ares-iv',
      astronautId: 'ASTRO-01',
      missionId: 'ARES-IV',
      recordedAt: new Date(now - 3600000).toISOString(),
      category: 'mission_event',
      data: { eventType: 'exercise_session', durationMinutes: 30 },
    });

    const recent = await MissionContextService.getRecentMissionEvents('ASTRO-01', 'ARES-V', 24, {
      db: testDb,
      referenceTime: now,
    });

    expect(recent.totalEvents).toBe(1);
    expect(recent.allEvents[0].recordId).toBe('e-ares-v');
  });

  // 4. Exercise context retrieval
  it('4. Retrieves physical exercise context and computes summary metrics', async () => {
    await testDb.missionEvents.bulkPut([
      {
        recordId: 'ex-1',
        astronautId: 'ASTRO-01',
        missionId: 'ARES-V',
        recordedAt: new Date(now - 4 * 3600000).toISOString(),
        category: 'mission_event',
        data: {
          eventType: 'exercise_session',
          durationMinutes: 45,
          intensity: 'high',
          description: 'ARED Protocol B',
        },
      },
      {
        recordId: 'ex-2',
        astronautId: 'ASTRO-01',
        missionId: 'ARES-V',
        recordedAt: new Date(now - 8 * 3600000).toISOString(),
        category: 'mission_event',
        data: {
          eventType: 'exercise_session',
          durationMinutes: 30,
          intensity: 'moderate',
          description: 'CEVIS Cycling',
        },
      },
    ]);

    const activity = await MissionContextService.analyseActivityContext('ASTRO-01', 'ARES-V', {
      db: testDb,
      referenceTime: now,
    });

    expect(activity.sessionsCount).toBe(2);
    expect(activity.totalDurationMinutes).toBe(75);
    expect(activity.highIntensitySessions).toBe(1);
    expect(activity.lastExerciseSession.description).toBe('ARED Protocol B');
  });

  // 5. Sleep context retrieval
  it('5. Retrieves sleep cycle context from sleep_session events', async () => {
    await testDb.missionEvents.put({
      recordId: 'sleep-1',
      astronautId: 'ASTRO-01',
      missionId: 'ARES-V',
      recordedAt: new Date(now - 6 * 3600000).toISOString(),
      category: 'mission_event',
      data: {
        eventType: 'sleep_session',
        durationMinutes: 480, // 8 hours
        description: 'Scheduled Crew Sleep Period',
      },
    });

    const recent = await MissionContextService.getRecentMissionEvents('ASTRO-01', 'ARES-V', 24, {
      db: testDb,
      referenceTime: now,
    });

    expect(recent.sleepEvents).toHaveLength(1);
    expect(recent.sleepEvents[0].data.durationMinutes).toBe(480);
  });

  // 6. Workload context retrieval
  it('6. Retrieves workload / EVA activity events', async () => {
    await testDb.missionEvents.put({
      recordId: 'eva-1',
      astronautId: 'ASTRO-01',
      missionId: 'ARES-V',
      recordedAt: new Date(now - 5 * 3600000).toISOString(),
      category: 'mission_event',
      data: {
        eventType: 'workload_event',
        description: 'EVA Airlock Pre-breathe and Ingress',
      },
    });

    const recent = await MissionContextService.getRecentMissionEvents('ASTRO-01', 'ARES-V', 24, {
      db: testDb,
      referenceTime: now,
    });

    expect(recent.workloadEvents).toHaveLength(1);
    expect(recent.workloadEvents[0].data.description).toContain('EVA Airlock');
  });

  // 7. Environmental context retrieval (including missing data handling)
  it('7. Retrieves cabin environmental telemetry without fabricating data when sensors are unrecorded', async () => {
    // Case A: No records -> reports unavailable honestly
    const emptyEnv = await MissionContextService.getEnvironmentalContext('ARES-V', { db: testDb });
    expect(emptyEnv.available).toBe(false);
    expect(emptyEnv.summary).toContain('No cabin environmental sensor telemetry logged');

    // Case B: Sensor logged
    await testDb.environmentalRecords.put({
      recordId: 'env-1',
      missionId: 'ARES-V',
      recordedAt: new Date(now - 3600000).toISOString(),
      cabinTemp: 22.4,
      humidityPercent: 42,
      co2Percent: 0.35,
      o2Percent: 20.8,
    });

    const filledEnv = await MissionContextService.getEnvironmentalContext('ARES-V', { db: testDb });
    expect(filledEnv.available).toBe(true);
    expect(filledEnv.measurements.cabinTemp).toBe(22.4);
    expect(filledEnv.summary).toContain('22.4°C');
  });

  // 8. Associating context with health patterns & non-causal explanation
  it('8. Associates surrounding mission context with health patterns using neutral non-causal language', async () => {
    // Add exercise 3 hours prior to pattern
    await testDb.missionEvents.put({
      recordId: 'ex-prior',
      astronautId: 'ASTRO-01',
      missionId: 'ARES-V',
      recordedAt: new Date(now - 3 * 3600000).toISOString(),
      category: 'mission_event',
      data: {
        eventType: 'exercise_session',
        durationMinutes: 60,
        intensity: 'high',
      },
    });

    const patternTimestamp = new Date(now).toISOString();
    const contextSnapshot = await MissionContextService.getContextForHealthPattern(
      patternTimestamp,
      'ASTRO-01',
      'ARES-V',
      { db: testDb }
    );

    expect(contextSnapshot.exerciseContext).toBeDefined();
    expect(contextSnapshot.exerciseContext.durationMinutes).toBe(60);
    expect(contextSnapshot.explanation).toContain('Physical exercise logged');
    expect(contextSnapshot.explanation).toContain('do not establish physiological causation');

    // Persist snapshot to contextSnapshots store
    const saved = await MissionContextService.saveContextSnapshot(contextSnapshot, { db: testDb });
    expect(saved.contextId).toBe(contextSnapshot.contextId);
  });
});


import { v4 as uuidv4 } from 'uuid';
import { localDb } from '../../../database/localDatabase.js';

export const DEFAULT_MISSION_EPOCH = '2026-10-01T00:00:00.000Z'; // Ares-V Mission Epoch

export const TimelineEventType = {
  HEALTH_MEASUREMENT: 'HEALTH_MEASUREMENT',
  HEALTH_ASSESSMENT: 'HEALTH_ASSESSMENT',
  PATTERN_ALERT: 'PATTERN_ALERT',
  EXERCISE_SESSION: 'EXERCISE_SESSION',
  SLEEP_SESSION: 'SLEEP_SESSION',
  WORKLOAD_EVENT: 'WORKLOAD_EVENT',
  MISSION_ACTIVITY: 'MISSION_ACTIVITY',
  ENVIRONMENTAL_LOG: 'ENVIRONMENTAL_LOG',
  RADIATION_LOG: 'RADIATION_LOG',
};

/**
 * MEDULA — Module 04: Mission Context Engine (MCE)
 * Mission Context Service
 *
 * Correlates astronaut health observations with surrounding mission events,
 * sleep cycles, exercise protocols, and environmental telemetry without asserting causation.
 */
export class MissionContextService {
  /**
   * Calculate Mission Elapsed Time (MET) Day.
   */
  static calculateMissionDay(timestamp, missionEpoch = DEFAULT_MISSION_EPOCH) {
    const t = Date.parse(timestamp);
    const epoch = Date.parse(missionEpoch);
    if (isNaN(t) || isNaN(epoch)) return 1;
    const diffDays = Math.floor((t - epoch) / (24 * 3600 * 1000));
    return Math.max(1, diffDays + 1);
  }

  /**
   * Retrieve a unified, chronologically ordered mission timeline combining
   * all telemetry, events, pattern findings, and environmental logs.
   */
  static async getMissionTimeline(astronautId, missionId = 'ARES-V', options = {}) {
    const db = options.db || localDb;
    const limit = options.limit || 100;

    // Parallel fetch from all Dexie stores
    const [
      measurements,
      assessments,
      missionEvents,
      radiationRecords,
      environmentalRecords,
      patternResults,
    ] = await Promise.all([
      db.measurements.where('astronautId').equals(astronautId).toArray(),
      db.assessments.where('astronautId').equals(astronautId).toArray(),
      db.missionEvents.where('astronautId').equals(astronautId).toArray(),
      db.radiationRecords.where('astronautId').equals(astronautId).toArray(),
      db.environmentalRecords ? db.environmentalRecords.where('missionId').equals(missionId).toArray() : [],
      db.patternResults ? db.patternResults.where('astronautId').equals(astronautId).toArray() : [],
    ]);

    const unifiedTimeline = [];
    const seenEventIds = new Set();

    // 1. Wearable measurements
    for (const m of measurements) {
      if (seenEventIds.has(m.recordId)) continue;
      seenEventIds.add(m.recordId);
      unifiedTimeline.push({
        id: m.recordId,
        timestamp: m.recordedAt,
        missionDay: this.calculateMissionDay(m.recordedAt),
        type: TimelineEventType.HEALTH_MEASUREMENT,
        category: 'wearable',
        title: `${m.data?.metric?.toUpperCase() || 'BIO'}: ${m.data?.value} ${m.data?.unit || ''}`,
        description: `Physiological observation (${m.data?.sensorContactQuality || 'standard'} quality)`,
        astronautId: m.astronautId,
        missionId: m.missionId,
        details: m.data,
      });
    }

    // 2. Manual assessments
    for (const a of assessments) {
      if (seenEventIds.has(a.recordId)) continue;
      seenEventIds.add(a.recordId);
      unifiedTimeline.push({
        id: a.recordId,
        timestamp: a.recordedAt,
        missionDay: this.calculateMissionDay(a.recordedAt),
        type: TimelineEventType.HEALTH_ASSESSMENT,
        category: 'assessment',
        title: `Self-Assessment (Stress: ${a.data?.stress_score}, Fatigue: ${a.data?.fatigue_score})`,
        description: a.data?.notes || 'Subjective astronaut self-assessment questionnaire',
        astronautId: a.astronautId,
        missionId: a.missionId,
        details: a.data,
      });
    }

    // 3. Mission events (exercise, sleep, workload)
    for (const e of missionEvents) {
      if (seenEventIds.has(e.recordId)) continue;
      seenEventIds.add(e.recordId);

      let eventType = TimelineEventType.MISSION_ACTIVITY;
      let category = 'operational';
      let title = e.data?.eventType || 'Mission Event';

      if (e.data?.eventType === 'exercise_session') {
        eventType = TimelineEventType.EXERCISE_SESSION;
        category = 'exercise';
        title = `Exercise Protocol (${e.data?.durationMinutes} min, ${e.data?.intensity || 'moderate'})`;
      } else if (e.data?.eventType === 'sleep_session') {
        eventType = TimelineEventType.SLEEP_SESSION;
        category = 'sleep';
        title = `Sleep Period (${(e.data?.durationMinutes / 60).toFixed(1)} hrs)`;
      } else if (e.data?.eventType === 'workload_event') {
        eventType = TimelineEventType.WORKLOAD_EVENT;
        category = 'workload';
        title = `Workload / EVA: ${e.data?.description || 'EVA Protocol'}`;
      }

      unifiedTimeline.push({
        id: e.recordId,
        timestamp: e.recordedAt,
        missionDay: this.calculateMissionDay(e.recordedAt),
        type: eventType,
        category,
        title,
        description: e.data?.description || 'Operational mission schedule activity',
        astronautId: e.astronautId,
        missionId: e.missionId,
        details: e.data,
      });
    }

    // 4. Radiation records
    for (const r of radiationRecords) {
      if (seenEventIds.has(r.recordId)) continue;
      seenEventIds.add(r.recordId);
      unifiedTimeline.push({
        id: r.recordId,
        timestamp: r.recordedAt,
        missionDay: this.calculateMissionDay(r.recordedAt),
        type: TimelineEventType.RADIATION_LOG,
        category: 'radiation',
        title: `Dosimeter Rate: ${r.data?.dose_rate} µSv/h`,
        description: `Cumulative: ${r.data?.cumulative_dose} mSv (${r.data?.sensorLocation || 'Habitat'})`,
        astronautId: r.astronautId,
        missionId: r.missionId,
        details: r.data,
      });
    }

    // 5. Environmental logs
    for (const env of environmentalRecords) {
      if (seenEventIds.has(env.recordId)) continue;
      seenEventIds.add(env.recordId);
      unifiedTimeline.push({
        id: env.recordId,
        timestamp: env.recordedAt,
        missionDay: this.calculateMissionDay(env.recordedAt),
        type: TimelineEventType.ENVIRONMENTAL_LOG,
        category: 'environmental',
        title: `Cabin Environment (${env.cabinTemp || 21}°C, CO2: ${env.co2Percent || 0.3}%)`,
        description: `O2: ${env.o2Percent || 20.9}%, Humidity: ${env.humidityPercent || 45}%`,
        astronautId,
        missionId: env.missionId,
        details: env,
      });
    }

    // 6. Pattern results
    for (const p of patternResults) {
      if (seenEventIds.has(p.patternId)) continue;
      seenEventIds.add(p.patternId);
      unifiedTimeline.push({
        id: p.patternId,
        timestamp: p.detectionTimestamp,
        missionDay: this.calculateMissionDay(p.detectionTimestamp),
        type: TimelineEventType.PATTERN_ALERT,
        category: 'pattern',
        title: `Pattern [${p.domain?.toUpperCase()}]: ${p.operationalState}`,
        description: p.patternDescription,
        astronautId: p.astronautId,
        missionId: p.missionId,
        details: p,
      });
    }

    // Sort strictly chronologically (descending: newest first)
    unifiedTimeline.sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));

    return unifiedTimeline.slice(0, limit);
  }

  /**
   * Retrieve recent mission events categorized within a time window.
   */
  static async getRecentMissionEvents(astronautId, missionId = 'ARES-V', windowHours = 24, options = {}) {
    const db = options.db || localDb;
    const now = options.referenceTime ? new Date(options.referenceTime).getTime() : Date.now();
    const windowStartMs = now - windowHours * 3600 * 1000;

    const events = await db.missionEvents
      .where('astronautId')
      .equals(astronautId)
      .toArray();

    const filtered = events.filter((e) => {
      if (missionId && e.missionId !== missionId) return false;
      const t = Date.parse(e.recordedAt);
      return t >= windowStartMs && t <= now;
    });

    filtered.sort((a, b) => Date.parse(b.recordedAt) - Date.parse(a.recordedAt));

    const exerciseEvents = filtered.filter((e) => e.data?.eventType === 'exercise_session');
    const sleepEvents = filtered.filter((e) => e.data?.eventType === 'sleep_session');
    const workloadEvents = filtered.filter((e) => e.data?.eventType === 'workload_event');
    const otherEvents = filtered.filter(
      (e) => !['exercise_session', 'sleep_session', 'workload_event'].includes(e.data?.eventType)
    );

    return {
      windowHours,
      totalEvents: filtered.length,
      exerciseEvents,
      sleepEvents,
      workloadEvents,
      otherEvents,
      allEvents: filtered,
    };
  }

  /**
   * Analyze physical activity and exercise workload context.
   */
  static async analyseActivityContext(astronautId, missionId = 'ARES-V', options = {}) {
    const recent = await this.getRecentMissionEvents(astronautId, missionId, options.windowHours || 24, options);
    const exercise = recent.exerciseEvents;

    let totalDurationMinutes = 0;
    let highIntensitySessions = 0;

    for (const ex of exercise) {
      const dur = Number(ex.data?.durationMinutes || 0);
      totalDurationMinutes += dur;
      if (ex.data?.intensity === 'high' || ex.data?.intensity === 'extreme') {
        highIntensitySessions++;
      }
    }

    const lastExercise = exercise.length > 0 ? exercise[0] : null;

    return {
      sessionsCount: exercise.length,
      totalDurationMinutes,
      highIntensitySessions,
      lastExerciseSession: lastExercise
        ? {
            recordedAt: lastExercise.recordedAt,
            durationMinutes: lastExercise.data?.durationMinutes,
            intensity: lastExercise.data?.intensity,
            description: lastExercise.data?.description,
            equipmentUsed: lastExercise.data?.equipmentUsed,
          }
        : null,
      summary: exercise.length > 0
        ? `${exercise.length} exercise session(s) completed (${totalDurationMinutes} min total)`
        : 'No physical exercise logged in the operational window',
    };
  }

  /**
   * Retrieve cabin environmental conditions.
   * Does NOT fabricate data if sensors are unrecorded.
   */
  static async getEnvironmentalContext(missionId = 'ARES-V', options = {}) {
    const db = options.db || localDb;
    if (!db.environmentalRecords) {
      return {
        available: false,
        summary: 'Cabin environmental telemetry offline; sensors unrecorded.',
        measurements: null,
      };
    }

    const records = await db.environmentalRecords
      .where('missionId')
      .equals(missionId)
      .toArray();

    if (records.length === 0) {
      return {
        available: false,
        summary: 'No cabin environmental sensor telemetry logged in the current operational window.',
        measurements: null,
      };
    }

    records.sort((a, b) => Date.parse(b.recordedAt) - Date.parse(a.recordedAt));
    const latest = records[0];

    return {
      available: true,
      summary: `Cabin Temp: ${latest.cabinTemp || 21}°C, CO2: ${latest.co2Percent || 0.3}%, O2: ${latest.o2Percent || 20.9}%`,
      latestRecordedAt: latest.recordedAt,
      measurements: latest,
    };
  }

  /**
   * Retrieve radiation dosimeter context.
   */
  static async getRadiationContext(astronautId, missionId = 'ARES-V', options = {}) {
    const db = options.db || localDb;
    const records = await db.radiationRecords
      .where('astronautId')
      .equals(astronautId)
      .toArray();

    if (records.length === 0) {
      return {
        available: false,
        summary: 'No radiation dosimeter records logged for this astronaut.',
        measurements: null,
      };
    }

    records.sort((a, b) => Date.parse(b.recordedAt) - Date.parse(a.recordedAt));
    const latest = records[0];

    return {
      available: true,
      doseRate: latest.data?.dose_rate || 0,
      cumulativeDose: latest.data?.cumulative_dose || 0,
      sensorLocation: latest.data?.sensorLocation || 'Habitat Module',
      recordedAt: latest.recordedAt,
      summary: `Dose Rate: ${latest.data?.dose_rate || 0} µSv/h (Cumulative: ${latest.data?.cumulative_dose || 0} mSv)`,
    };
  }

  /**
   * Associate a health pattern detection finding with surrounding mission context.
   */
  static async getContextForHealthPattern(patternOrTimestamp, astronautId, missionId = 'ARES-V', options = {}) {
    const db = options.db || localDb;

    const patternTimestamp = typeof patternOrTimestamp === 'string'
      ? patternOrTimestamp
      : patternOrTimestamp?.detectionTimestamp || new Date().toISOString();

    const patternId = typeof patternOrTimestamp === 'object' ? patternOrTimestamp?.patternId : null;
    const pTimeMs = Date.parse(patternTimestamp);

    const lookbackHours = options.lookbackHours || 12;
    const startMs = pTimeMs - lookbackHours * 3600 * 1000;

    // Fetch surrounding mission events
    const allEvents = await db.missionEvents
      .where('astronautId')
      .equals(astronautId)
      .toArray();

    const relevantPrecedingEvents = [];
    const relevantConcurrentEvents = [];
    const relevantEventIds = [];

    let sleepContext = null;
    let exerciseContext = null;
    let workloadContext = null;

    for (const evt of allEvents) {
      if (missionId && evt.missionId !== missionId) continue;
      const t = Date.parse(evt.recordedAt);
      const diffHours = (pTimeMs - t) / 3600000;

      if (t >= startMs && t <= pTimeMs + 3600000) {
        relevantEventIds.push(evt.recordId);

        if (diffHours >= 0.5) {
          relevantPrecedingEvents.push(evt);
        } else {
          relevantConcurrentEvents.push(evt);
        }

        if (evt.data?.eventType === 'sleep_session' && !sleepContext) {
          sleepContext = {
            durationHours: Number((evt.data.durationMinutes / 60).toFixed(1)),
            recordedAt: evt.recordedAt,
            hoursPrior: Number(diffHours.toFixed(1)),
          };
        }

        if (evt.data?.eventType === 'exercise_session' && !exerciseContext) {
          exerciseContext = {
            durationMinutes: evt.data.durationMinutes,
            intensity: evt.data.intensity,
            recordedAt: evt.recordedAt,
            hoursPrior: Number(diffHours.toFixed(1)),
          };
        }

        if (evt.data?.eventType === 'workload_event' && !workloadContext) {
          workloadContext = {
            description: evt.data.description,
            recordedAt: evt.recordedAt,
            hoursPrior: Number(diffHours.toFixed(1)),
          };
        }
      }
    }

    // Fetch environmental and radiation context
    const [envContext, radContext] = await Promise.all([
      this.getEnvironmentalContext(missionId, options),
      this.getRadiationContext(astronautId, missionId, options),
    ]);

    // Missing context indicators
    const missingContextIndicators = [];
    if (!sleepContext) missingContextIndicators.push('Recent sleep session telemetry');
    if (!exerciseContext) missingContextIndicators.push('Recent physical exercise telemetry');
    if (!envContext.available) missingContextIndicators.push('Cabin environmental conditions');

    // Generate neutral explanation
    const explanationParts = [];
    explanationParts.push(`Mission Context Evaluation (Mission Day ${this.calculateMissionDay(patternTimestamp)}):`);

    if (exerciseContext) {
      explanationParts.push(
        `Physical exercise logged ${exerciseContext.hoursPrior} hrs prior (${exerciseContext.durationMinutes} min, ${exerciseContext.intensity || 'moderate'} intensity).`
      );
    }
    if (sleepContext) {
      explanationParts.push(
        `Previous sleep cycle logged ${sleepContext.hoursPrior} hrs prior (${sleepContext.durationHours} hrs duration).`
      );
    }
    if (workloadContext) {
      explanationParts.push(
        `Workload event logged ${workloadContext.hoursPrior} hrs prior (${workloadContext.description}).`
      );
    }
    if (envContext.available) {
      explanationParts.push(`Cabin Environment: ${envContext.summary}.`);
    }

    explanationParts.push(
      'Notice: These operational observations provide situational context surrounding the health pattern but do not establish physiological causation.'
    );

    const snapshot = {
      contextId: uuidv4(),
      astronautId,
      missionId,
      relatedPatternId: patternId,
      patternDetectionTimestamp: patternTimestamp,
      missionDay: this.calculateMissionDay(patternTimestamp),
      relevantPrecedingEvents,
      relevantConcurrentEvents,
      relevantEventIds,
      sleepContext,
      exerciseContext,
      workloadContext,
      environmentalContext: envContext,
      radiationContext: radContext,
      missingContextIndicators,
      explanation: explanationParts.join(' '),
      generatedAt: new Date().toISOString(),
    };

    return snapshot;
  }

  /**
   * Save derived context snapshot in IndexedDB.
   */
  static async saveContextSnapshot(snapshot, options = {}) {
    const db = options.db || localDb;
    if (!db.contextSnapshots) return snapshot;

    await db.contextSnapshots.put(snapshot);
    return snapshot;
  }
}

export const calculateMissionDay = MissionContextService.calculateMissionDay.bind(MissionContextService);
export const getMissionTimeline = MissionContextService.getMissionTimeline.bind(MissionContextService);
export const getRecentMissionEvents = MissionContextService.getRecentMissionEvents.bind(MissionContextService);
export const analyseActivityContext = MissionContextService.analyseActivityContext.bind(MissionContextService);
export const getEnvironmentalContext = MissionContextService.getEnvironmentalContext.bind(MissionContextService);
export const getRadiationContext = MissionContextService.getRadiationContext.bind(MissionContextService);
export const getContextForHealthPattern = MissionContextService.getContextForHealthPattern.bind(MissionContextService);
export const saveContextSnapshot = MissionContextService.saveContextSnapshot.bind(MissionContextService);


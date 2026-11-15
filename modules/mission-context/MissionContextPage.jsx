import React, { useState, useEffect } from 'react';
import {
  Compass,
  RefreshCw,
  Sparkles,
  Layers,
  Calendar,
  Clock,
  Activity,
  Wind,
  Moon,
} from 'lucide-react';
import { localDb } from '../../database/localDatabase.js';
import { MissionContextService } from './services/missionContextService.js';
import { PatternStorageService } from '../health-pattern-detection/services/patternStorageService.js';
import { MissionTimeline } from './components/MissionTimeline.jsx';
import { ActivityContextCard } from './components/ActivityContextCard.jsx';
import { EnvironmentalContextCard } from './components/EnvironmentalContextCard.jsx';
import { RadiationContextCard } from './components/RadiationContextCard.jsx';
import { ContextualExplanation } from './components/ContextualExplanation.jsx';

export function MissionContextPage() {
  const [astronautId, setAstronautId] = useState('ASTRO-01');
  const [missionId, setMissionId] = useState('ARES-V');
  const [loading, setLoading] = useState(false);

  // Loaded context state
  const [timelineEvents, setTimelineEvents] = useState([]);
  const [activityContext, setActivityContext] = useState(null);
  const [environmentalContext, setEnvironmentalContext] = useState(null);
  const [radiationContext, setRadiationContext] = useState(null);
  const [contextSnapshot, setContextSnapshot] = useState(null);
  const [recentEventsData, setRecentEventsData] = useState({ workloadEvents: [], sleepEvents: [] });
  const [currentMissionDay, setCurrentMissionDay] = useState(46);
  const [actionFeedback, setActionFeedback] = useState(null);

  const astronauts = ['ASTRO-01', 'ASTRO-02', 'ASTRO-03'];

  const loadMissionContext = async () => {
    setLoading(true);
    setActionFeedback(null);
    try {
      const nowIso = new Date().toISOString();
      const currentDay = MissionContextService.calculateMissionDay(nowIso);
      setCurrentMissionDay(currentDay);

      // 1. Fetch Timeline
      const timeline = await MissionContextService.getMissionTimeline(astronautId, missionId, { limit: 60 });
      setTimelineEvents(timeline);

      // 2. Fetch Activity Context & Recent Events
      const [activity, env, rad, recentEvents] = await Promise.all([
        MissionContextService.analyseActivityContext(astronautId, missionId, { windowHours: 24 }),
        MissionContextService.getEnvironmentalContext(missionId),
        MissionContextService.getRadiationContext(astronautId, missionId),
        MissionContextService.getRecentMissionEvents(astronautId, missionId, 24),
      ]);

      setActivityContext(activity);
      setEnvironmentalContext(env);
      setRadiationContext(rad);
      setRecentEventsData(recentEvents);

      // 3. Fetch latest Pattern for this astronaut to formulate contextual synthesis
      const latestPatterns = await PatternStorageService.getAllPatterns(astronautId);
      const targetPattern = latestPatterns.length > 0 ? latestPatterns[0] : null;

      const snapshot = await MissionContextService.getContextForHealthPattern(
        targetPattern || nowIso,
        astronautId,
        missionId
      );
      setContextSnapshot(snapshot);
    } catch (err) {
      console.error('Failed to load mission context:', err);
      setActionFeedback({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMissionContext();
  }, [astronautId, missionId]);

  // Demo Scenario: Inject Full Operational Context (Clearly Labeled Synthetic)
  const handleLoadDemoContext = async () => {
    setLoading(true);
    setActionFeedback(null);
    try {
      const now = Date.now();

      // 1. Log Sleep Session (6.5 hrs, woke 4 hours ago)
      await localDb.missionEvents.put({
        recordId: `syn-sleep-${now}`,
        astronautId,
        missionId,
        recordedAt: new Date(now - 4 * 3600000).toISOString(),
        category: 'mission_event',
        provenance: { source: 'mission_log', deviceId: 'CREW-TIMELINE' },
        data: {
          eventType: 'sleep_session',
          durationMinutes: 390,
          description: 'Scheduled Sleep Cycle A',
        },
      });

      // 2. Log High-Intensity Exercise (completed 2 hours ago)
      await localDb.missionEvents.put({
        recordId: `syn-exercise-${now}`,
        astronautId,
        missionId,
        recordedAt: new Date(now - 2 * 3600000).toISOString(),
        category: 'mission_event',
        provenance: { source: 'mission_log', deviceId: 'COLBERT' },
        data: {
          eventType: 'exercise_session',
          durationMinutes: 45,
          intensity: 'high',
          description: 'T2 Treadmill Interval Protocol',
          equipmentUsed: 'COLBERT Treadmill',
        },
      });

      // 3. Log Workload / EVA Event
      await localDb.missionEvents.put({
        recordId: `syn-workload-${now}`,
        astronautId,
        missionId,
        recordedAt: new Date(now - 6 * 3600000).toISOString(),
        category: 'mission_event',
        provenance: { source: 'mission_log', deviceId: 'AIRLOCK-SYS' },
        data: {
          eventType: 'workload_event',
          description: 'Airlock Depressurization & Umbilical Prep',
        },
      });

      // 4. Log Cabin Environmental Telemetry
      if (localDb.environmentalRecords) {
        await localDb.environmentalRecords.put({
          recordId: `syn-env-${now}`,
          missionId,
          recordedAt: new Date(now - 30 * 60000).toISOString(),
          cabinTemp: 22.1,
          humidityPercent: 44,
          co2Percent: 0.32,
          o2Percent: 20.8,
        });
      }

      setActionFeedback({
        type: 'success',
        message: 'Successfully populated synthetic mission operational context (Sleep, Exercise, Workload & Environmental sensor feed). Clearly labeled synthetic.',
      });

      await loadMissionContext();
    } catch (err) {
      setActionFeedback({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Astronaut Selector & Mission Day Header Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 shadow-xl text-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
              Active Astronaut Context
            </label>
            <div className="flex gap-1.5">
              {astronauts.map((astro) => (
                <button
                  key={astro}
                  type="button"
                  onClick={() => setAstronautId(astro)}
                  className={`px-3 py-1.5 rounded text-xs font-mono font-medium border transition ${
                    astronautId === astro
                      ? 'bg-cyan-950 border-cyan-500 text-cyan-300 shadow'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {astro}
                </button>
              ))}
            </div>
          </div>

          <div className="px-3 py-1.5 rounded bg-slate-950 border border-slate-800 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-cyan-400" />
            <div className="text-xs font-mono">
              <span className="text-slate-400">Mission Day: </span>
              <span className="font-bold text-cyan-300">MET Day {currentMissionDay}</span>
              <span className="text-slate-500 ml-1.5">({missionId})</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={loadMissionContext}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-slate-300 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            type="button"
            onClick={handleLoadDemoContext}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs bg-cyan-950/80 hover:bg-cyan-900/80 border border-cyan-700 text-cyan-300 rounded transition font-mono"
            title="Inject operational exercise, sleep, and environmental context"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            Load Synthetic Context (Demo)
          </button>
        </div>
      </div>

      {/* Action Notification Feedback */}
      {actionFeedback && (
        <div className={`p-4 rounded-md border text-xs flex items-center justify-between ${
          actionFeedback.type === 'success'
            ? 'bg-emerald-950/60 border-emerald-500 text-emerald-200'
            : 'bg-rose-950/60 border-rose-500 text-rose-200'
        }`}>
          <div>{actionFeedback.message}</div>
          <button
            type="button"
            onClick={() => setActionFeedback(null)}
            className="text-[10px] underline ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Contextual Synthesis & Non-Causal Explanation */}
      <ContextualExplanation contextSnapshot={contextSnapshot} />

      {/* Operational Context Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ActivityContextCard
          activityContext={activityContext}
          workloadEvents={recentEventsData.workloadEvents}
        />
        <EnvironmentalContextCard environmentalContext={environmentalContext} />
        <RadiationContextCard radiationContext={radiationContext} />
      </div>

      {/* Unified Mission Operational Timeline */}
      <MissionTimeline events={timelineEvents} />
    </div>
  );
}


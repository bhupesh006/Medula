import React, { useState, useEffect } from 'react';
import { localDb } from '../../../database/localDatabase.js';
import { getStorageOverview } from '../services/dataManagementService.js';
import { continuitySyncEngine } from '../services/continuitySyncEngine.js';
import { connectivityService } from '../services/connectivityService.js';
import { loadFlightDemoScenario, resetDemoScenario } from '../services/demoScenarioService.js';
import { ScientificProvenanceBadge } from '../../research-evidence/components/ScientificProvenanceBadge.jsx';
import {
  Activity,
  Heart,
  Moon,
  ShieldCheck,
  AlertTriangle,
  Database,
  Radio,
  RefreshCw,
  Sparkles,
  CheckCircle,
  ExternalLink,
  ChevronRight,
  User,
  Compass,
  Trash2,
  Thermometer,
  Wind,
  Zap,
} from 'lucide-react';

export function MissionOverviewPage({ onNavigateTab }) {
  const [astronautId, setAstronautId] = useState('ASTRO-01');
  const [missionId, setMissionId] = useState('ARES-V-MARS-TRANSIT');
  const [storageStats, setStorageStats] = useState(null);
  const [syncMetrics, setSyncMetrics] = useState(null);
  const [connState, setConnState] = useState(connectivityService.getStatus());
  const [latestHr, setLatestHr] = useState(null);
  const [latestHrv, setLatestHrv] = useState(null);
  const [latestBp, setLatestBp] = useState(null);
  const [latestSpo2, setLatestSpo2] = useState(null);
  const [latestTemp, setLatestTemp] = useState(null);
  const [latestAssess, setLatestAssess] = useState(null);
  const [recentEvents, setRecentEvents] = useState([]);
  const [latestEnv, setLatestEnv] = useState(null);
  const [activeBaselineHr, setActiveBaselineHr] = useState(null);
  const [activePatterns, setActivePatterns] = useState([]);
  const [latestGuidance, setLatestGuidance] = useState([]);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [hasSyntheticData, setHasSyntheticData] = useState(false);
  const [notification, setNotification] = useState(null);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Storage stats
      const stats = await getStorageOverview();
      setStorageStats(stats);

      // 2. Sync metrics
      const sync = await continuitySyncEngine.getSyncMetrics();
      setSyncMetrics(sync);

      // 3. Connectivity
      const conn = await connectivityService.checkServerReachability();
      setConnState(conn);

      // 4. Latest observations for astronaut from Dexie
      const measurements = await localDb.measurements
        .where('astronautId')
        .equals(astronautId)
        .toArray();

      const hrRecords = measurements
        .filter((m) => m.metric === 'heart_rate')
        .sort((a, b) => new Date(b.recordedAt) - new Date(a.recordedAt));
      setLatestHr(hrRecords[0] || null);

      const hrvRecords = measurements
        .filter((m) => m.metric === 'hrv')
        .sort((a, b) => new Date(b.recordedAt) - new Date(a.recordedAt));
      setLatestHrv(hrvRecords[0] || null);

      const bpRecords = measurements
        .filter((m) => m.metric === 'blood_pressure')
        .sort((a, b) => new Date(b.recordedAt) - new Date(a.recordedAt));
      setLatestBp(bpRecords[0] || null);

      const spo2Records = measurements
        .filter((m) => m.metric === 'spo2')
        .sort((a, b) => new Date(b.recordedAt) - new Date(a.recordedAt));
      setLatestSpo2(spo2Records[0] || null);

      const tempRecords = measurements
        .filter((m) => m.metric === 'body_temperature')
        .sort((a, b) => new Date(b.recordedAt) - new Date(a.recordedAt));
      setLatestTemp(tempRecords[0] || null);

      const assessments = await localDb.assessments
        .where('astronautId')
        .equals(astronautId)
        .toArray();
      const sortedAssessments = assessments.sort((a, b) => new Date(b.recordedAt) - new Date(a.recordedAt));
      setLatestAssess(sortedAssessments[0] || null);

      // Check synthetic demonstration data flag
      const isDemo = measurements.some(
        (m) => m.isSynthetic || m.sourceProvenance === 'SYNTHETIC_SIMULATED_RECORD'
      );
      setHasSyntheticData(isDemo);

      // Recent Mission Events (Exercise, EVA, Sleep windows)
      const events = await localDb.missionEvents
        .where('astronautId')
        .equals(astronautId)
        .toArray();
      const sortedEvents = events.sort((a, b) => new Date(b.recordedAt) - new Date(a.recordedAt)).slice(0, 3);
      setRecentEvents(sortedEvents);

      // Environmental cabin conditions
      const envRecords = await localDb.environmentalRecords.toArray();
      const sortedEnv = envRecords.sort((a, b) => new Date(b.recordedAt) - new Date(a.recordedAt));
      setLatestEnv(sortedEnv[0] || null);

      // 5. Active Baselines
      const baselines = await localDb.baselines
        .where('astronautId')
        .equals(astronautId)
        .toArray();
      const hrBase = baselines.find((b) => b.metric === 'heart_rate');
      setActiveBaselineHr(hrBase || null);

      // 6. Active Health Patterns
      const patterns = await localDb.patternResults
        .where('astronautId')
        .equals(astronautId)
        .toArray();
      setActivePatterns(patterns);

      // 7. Latest Medical Guidance
      if (localDb.medicalGuidanceHistory) {
        const guidance = await localDb.medicalGuidanceHistory
          .where('astronautId')
          .equals(astronautId)
          .toArray();
        setLatestGuidance(guidance.sort((a, b) => new Date(b.generatedAt) - new Date(a.generatedAt)).slice(0, 3));
      }
    } catch (err) {
      console.error('Failed to load mission overview data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [astronautId]);

  const handleLoadDemo = async () => {
    setDemoLoading(true);
    setNotification(null);
    try {
      const res = await loadFlightDemoScenario({ missionId });
      setNotification({
        type: 'success',
        message: `Loaded 14-day flight scenario: ${res.counts.measurements} measurements, ${res.counts.baselines} baselines, ${res.counts.patterns} patterns.`,
      });
      await loadDashboardData();
    } catch (err) {
      setNotification({
        type: 'error',
        message: `Failed to load demo scenario: ${err.message}`,
      });
    } finally {
      setDemoLoading(false);
    }
  };

  const handleResetDemo = async () => {
    if (
      !window.confirm(
        'Purge synthetic flight demonstration data? User records and imported NASA research datasets will be preserved.'
      )
    ) {
      return;
    }
    setDemoLoading(true);
    setNotification(null);
    try {
      const res = await resetDemoScenario();
      setNotification({
        type: 'info',
        message: `Reset complete: Purged ${res.totalDeleted} synthetic demonstration records across stores.`,
      });
      await loadDashboardData();
    } catch (err) {
      setNotification({
        type: 'error',
        message: `Failed to reset demo scenario: ${err.message}`,
      });
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Synthetic Demonstration Data Banner */}
      {hasSyntheticData && (
        <div className="bg-amber-950/40 border border-amber-500/50 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2.5 text-amber-300">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
            <span>
              <strong className="text-amber-200 uppercase tracking-wide">SYNTHETIC DEMONSTRATION DATA:</strong> Active 14-day simulated flight trajectory ({missionId}). Real NASA research datasets and personal user records remain strictly demarcated.
            </span>
          </div>
          <button
            type="button"
            disabled={demoLoading}
            onClick={handleResetDemo}
            className="px-2.5 py-1 rounded bg-amber-950 border border-amber-600 text-amber-200 hover:bg-amber-900 transition flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
          >
            <Trash2 className="w-3.5 h-3.5 text-amber-400" />
            Purge Demo Data
          </button>
        </div>
      )}

      {/* Flight Operations Cockpit Header */}
      <div className="bg-[#0C1527] border border-cyan-500/30 rounded-xl p-5 space-y-4 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono bg-cyan-950 border border-cyan-800 text-cyan-300 px-2 py-0.5 rounded">
                MISSION COCKPIT • FLIGHT LOG
              </span>
              <span className="text-xs font-mono text-slate-400">
                MET: Mission Day 46
              </span>
            </div>
            <h1 className="text-xl font-bold font-mono text-slate-100 tracking-wide">
              {missionId} — HEALTH INTELLIGENCE OVERVIEW
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Autonomous physiological monitoring, active personal baselines, multi-indicator patterns, and clinical guidance.
            </p>
          </div>

          {/* Controls: Astronaut & Demo Loader */}
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 px-2.5 py-1.5 rounded">
              <User className="w-3.5 h-3.5 text-cyan-400" />
              <select
                value={astronautId}
                onChange={(e) => setAstronautId(e.target.value)}
                className="bg-transparent text-cyan-300 focus:outline-none"
              >
                <option value="ASTRO-01">ASTRO-01 (Commander Alex Rivera)</option>
                <option value="ASTRO-02">ASTRO-02 (Dr. Sarah Chen)</option>
              </select>
            </div>

            <button
              type="button"
              disabled={demoLoading}
              onClick={handleLoadDemo}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-cyan-950 border border-cyan-600 text-cyan-300 hover:bg-cyan-900 font-medium transition disabled:opacity-50"
              title="Populate complete 14-day flight dataset"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>{demoLoading ? 'Processing...' : 'Load Flight Scenario'}</span>
            </button>

            <button
              type="button"
              disabled={demoLoading}
              onClick={handleResetDemo}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-300 hover:text-rose-400 hover:border-rose-600 font-medium transition disabled:opacity-50"
              title="Purge synthetic flight scenario"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Reset Demo Data</span>
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={loadDashboardData}
              className="p-2 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-cyan-400 transition"
              title="Refresh Telemetry"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {notification && (
          <div
            className={`p-3 rounded text-xs font-mono border ${
              notification.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-600/80 text-emerald-300'
                : notification.type === 'error'
                ? 'bg-rose-950/80 border-rose-600/80 text-rose-300'
                : 'bg-slate-900 border-slate-700 text-cyan-300'
            }`}
          >
            {notification.message}
          </div>
        )}

        {/* Connectivity & Operational Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono pt-2 border-t border-slate-800/80">
          <div className="bg-slate-950/60 border border-slate-800 rounded p-2.5">
            <span className="text-slate-500 text-[10px] uppercase block">Operational Network State</span>
            <span className={`font-semibold ${connState.isOnline ? 'text-emerald-400' : 'text-amber-400'}`}>
              {connState.mode}
            </span>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded p-2.5">
            <span className="text-slate-500 text-[10px] uppercase block">Local IndexedDB Records</span>
            <span className="font-semibold text-slate-200">
              {storageStats?.totalRecords || 0} Total Records
            </span>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded p-2.5">
            <span className="text-slate-500 text-[10px] uppercase block">Pending Sync Transmission</span>
            <span className={`font-semibold ${syncMetrics?.pending > 0 ? 'text-amber-400' : 'text-slate-200'}`}>
              {syncMetrics?.pending || 0} Queued Records
            </span>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded p-2.5">
            <span className="text-slate-500 text-[10px] uppercase block">Last Server Sync</span>
            <span className="font-semibold text-slate-300 truncate block">
              {syncMetrics?.lastSuccessfulSyncAt
                ? new Date(syncMetrics.lastSuccessfulSyncAt).toLocaleTimeString()
                : 'Offline Autonomous'}
            </span>
          </div>
        </div>
      </div>

      {/* Grid: Health Telemetry & Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. Latest Physiological Telemetry Card */}
        <div className="bg-[#0C1527] border border-slate-800 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <h2 className="text-xs font-semibold text-slate-100 font-mono uppercase tracking-wider">
                Physiological Telemetry
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab && onNavigateTab('assessment')}
              className="text-[10px] font-mono text-cyan-400 hover:underline"
            >
              Acquisition &rarr;
            </button>
          </div>

          {latestHr ? (
            <div className="space-y-2.5 font-mono text-xs">
              <div className="flex items-center justify-between p-2 rounded bg-slate-950/80 border border-slate-800/80">
                <span className="text-slate-400">Resting Heart Rate</span>
                <span className="font-bold text-slate-100">{latestHr.value} {latestHr.unit}</span>
              </div>

              {latestHrv && (
                <div className="flex items-center justify-between p-2 rounded bg-slate-950/80 border border-slate-800/80">
                  <span className="text-slate-400">HRV (RMSSD)</span>
                  <span className="font-bold text-slate-100">{latestHrv.value} {latestHrv.unit}</span>
                </div>
              )}

              {latestBp && (
                <div className="flex items-center justify-between p-2 rounded bg-slate-950/80 border border-slate-800/80">
                  <span className="text-slate-400">Blood Pressure</span>
                  <span className="font-bold text-slate-100">{latestBp.systolic}/{latestBp.diastolic} mmHg</span>
                </div>
              )}

              {latestSpo2 && (
                <div className="flex items-center justify-between p-2 rounded bg-slate-950/80 border border-slate-800/80">
                  <span className="text-slate-400">Blood Oxygen (SpO2)</span>
                  <span className="font-bold text-cyan-400">{latestSpo2.value}%</span>
                </div>
              )}

              {latestTemp && (
                <div className="flex items-center justify-between p-2 rounded bg-slate-950/80 border border-slate-800/80">
                  <span className="text-slate-400">Body Temperature</span>
                  <span className="font-bold text-slate-100">{latestTemp.value}°C</span>
                </div>
              )}

              <div className="text-[10px] text-slate-500 text-right pt-1">
                Recorded: {new Date(latestHr.recordedAt).toLocaleString()}
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-xs font-mono text-slate-500 bg-slate-950/40 rounded border border-slate-900">
              No physiological measurements recorded. Click "Load Flight Scenario" above or ingest via Health Assessment.
            </div>
          )}
        </div>

        {/* 2. Personal Baseline Status Card */}
        <div className="bg-[#0C1527] border border-slate-800 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <h2 className="text-xs font-semibold text-slate-100 font-mono uppercase tracking-wider">
                Personal Baseline Engine
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab && onNavigateTab('baseline')}
              className="text-[10px] font-mono text-cyan-400 hover:underline"
            >
              Baselines &rarr;
            </button>
          </div>

          {activeBaselineHr ? (
            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 rounded bg-slate-950/80 border border-slate-800/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-semibold">Heart Rate Baseline</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-300">
                    Confidence: {activeBaselineHr.confidence}
                  </span>
                </div>
                <div className="text-lg font-bold text-cyan-300">
                  {activeBaselineHr.median} <span className="text-xs font-normal text-slate-400">bpm (Median)</span>
                </div>
                <div className="text-[11px] text-slate-500">
                  MAD: &plusmn;{activeBaselineHr.mad} • IQR: {activeBaselineHr.p25} - {activeBaselineHr.p75} bpm
                </div>
              </div>

              <div className="text-[11px] text-slate-400 leading-relaxed font-sans">
                Computed from {activeBaselineHr.sampleSize} validated measurements using robust non-parametric aerospace statistics.
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-xs font-mono text-slate-500 bg-slate-950/40 rounded border border-slate-900">
              No personal baseline established yet. Minimum 3 validated records required.
            </div>
          )}
        </div>

        {/* 3. Sleep & Daily Assessment Card */}
        <div className="bg-[#0C1527] border border-slate-800 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Moon className="w-4 h-4 text-cyan-400" />
              <h2 className="text-xs font-semibold text-slate-100 font-mono uppercase tracking-wider">
                Sleep &amp; Subjective Recovery
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab && onNavigateTab('assessment')}
              className="text-[10px] font-mono text-cyan-400 hover:underline"
            >
              Assessments &rarr;
            </button>
          </div>

          {latestAssess ? (
            <div className="space-y-3 font-mono text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded bg-slate-950/80 border border-slate-800/80">
                  <span className="text-slate-500 text-[10px] uppercase block">Sleep Duration</span>
                  <span className="font-bold text-slate-100 text-sm">{latestAssess.sleepHours} hrs</span>
                </div>

                <div className="p-2.5 rounded bg-slate-950/80 border border-slate-800/80">
                  <span className="text-slate-500 text-[10px] uppercase block">Fatigue Score</span>
                  <span className="font-bold text-slate-100 text-sm">{latestAssess.fatigueScore} / 10</span>
                </div>

                <div className="p-2.5 rounded bg-slate-950/80 border border-slate-800/80">
                  <span className="text-slate-500 text-[10px] uppercase block">Mood Rating</span>
                  <span className="font-bold text-slate-100 text-sm">{latestAssess.moodScore} / 10</span>
                </div>

                <div className="p-2.5 rounded bg-slate-950/80 border border-slate-800/80">
                  <span className="text-slate-500 text-[10px] uppercase block">Stress Rating</span>
                  <span className="font-bold text-slate-100 text-sm">{latestAssess.stressScore} / 10</span>
                </div>
              </div>

              <div className="text-[10px] text-slate-500 text-right">
                Logged: {new Date(latestAssess.recordedAt).toLocaleString()}
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-xs font-mono text-slate-500 bg-slate-950/40 rounded border border-slate-900">
              No manual health assessment recorded for this astronaut.
            </div>
          )}
        </div>
      </div>

      {/* Row: Mission Events & Cabin Context */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Recent Mission Events Card */}
        <div className="bg-[#0C1527] border border-slate-800 rounded-lg p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              <h2 className="text-xs font-semibold text-slate-100 font-mono uppercase tracking-wider">
                Recent Mission Activities
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab && onNavigateTab('context')}
              className="text-[10px] font-mono text-cyan-400 hover:underline"
            >
              Mission Context &rarr;
            </button>
          </div>

          <div className="space-y-2 font-mono text-xs">
            {recentEvents.map((evt) => (
              <div key={evt.recordId} className="bg-slate-950/70 border border-slate-800/80 rounded p-2.5 flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-slate-200 capitalize">
                    {evt.eventType.replace(/_/g, ' ')}
                  </div>
                  <div className="text-[11px] text-slate-400 font-sans mt-0.5">
                    {evt.description} ({evt.durationMinutes} min, {evt.workloadIntensity || 'normal'})
                  </div>
                </div>
                <span className="text-[10px] text-slate-500 shrink-0">
                  {new Date(evt.recordedAt).toLocaleDateString()}
                </span>
              </div>
            ))}

            {recentEvents.length === 0 && (
              <div className="p-4 text-center text-xs font-mono text-slate-500 bg-slate-950/40 rounded border border-slate-900">
                No recent mission activities recorded.
              </div>
            )}
          </div>
        </div>

        {/* Cabin Environmental Telemetry Card */}
        <div className="bg-[#0C1527] border border-slate-800 rounded-lg p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Wind className="w-4 h-4 text-cyan-400" />
              <h2 className="text-xs font-semibold text-slate-100 font-mono uppercase tracking-wider">
                Cabin Life Support Telemetry
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab && onNavigateTab('context')}
              className="text-[10px] font-mono text-cyan-400 hover:underline"
            >
              Cabin Sensors &rarr;
            </button>
          </div>

          {latestEnv ? (
            <div className="grid grid-cols-2 gap-2 font-mono text-xs">
              <div className="p-2.5 rounded bg-slate-950/80 border border-slate-800/80">
                <span className="text-slate-500 text-[10px] uppercase block">Cabin Temperature</span>
                <span className="font-bold text-slate-100">{Math.round(latestEnv.cabinTemperature * 10) / 10}°C</span>
              </div>

              <div className="p-2.5 rounded bg-slate-950/80 border border-slate-800/80">
                <span className="text-slate-500 text-[10px] uppercase block">Carbon Dioxide (CO2)</span>
                <span className="font-bold text-amber-300">{Math.round(latestEnv.cabinCo2 * 100) / 100}%</span>
              </div>

              <div className="p-2.5 rounded bg-slate-950/80 border border-slate-800/80">
                <span className="text-slate-500 text-[10px] uppercase block">Relative Humidity</span>
                <span className="font-bold text-slate-100">{Math.round(latestEnv.cabinHumidity * 10) / 10}%</span>
              </div>

              <div className="p-2.5 rounded bg-slate-950/80 border border-slate-800/80">
                <span className="text-slate-500 text-[10px] uppercase block">Cabin Pressure</span>
                <span className="font-bold text-slate-100">{latestEnv.cabinPressure} kPa</span>
              </div>
            </div>
          ) : (
            <div className="p-4 text-center text-xs font-mono text-slate-500 bg-slate-950/40 rounded border border-slate-900">
              No cabin environmental telemetry recorded.
            </div>
          )}
        </div>
      </div>

      {/* Health Pattern Alerts & Clinical Decision Support Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Multi-Indicator Patterns */}
        <div className="bg-[#0C1527] border border-slate-800 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-cyan-400" />
              <h2 className="text-xs font-semibold text-slate-100 font-mono uppercase tracking-wider">
                Multi-Indicator Pattern Alerts ({activePatterns.length})
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab && onNavigateTab('patterns')}
              className="text-[10px] font-mono text-cyan-400 hover:underline"
            >
              Full Pattern Engine &rarr;
            </button>
          </div>

          <div className="space-y-3 font-mono text-xs">
            {activePatterns.map((p) => (
              <div
                key={p.patternId}
                className="bg-slate-950/80 border border-slate-800 rounded p-3 flex items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-slate-200 capitalize">{p.domain} Domain</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded border ${
                        p.operationalState === 'ESCALATE'
                          ? 'bg-rose-950 border-rose-700 text-rose-300'
                          : p.operationalState === 'ASSESS'
                          ? 'bg-amber-950 border-amber-700 text-amber-300'
                          : 'bg-cyan-950 border-cyan-800 text-cyan-300'
                      }`}
                    >
                      {p.operationalState}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-sans">
                    {p.summary}
                  </div>
                </div>

                <span className="text-[10px] text-slate-500 shrink-0">
                  Confidence: {Math.round((p.confidence || 0.8) * 100)}%
                </span>
              </div>
            ))}

            {activePatterns.length === 0 && (
              <div className="p-6 text-center text-xs font-mono text-slate-500 bg-slate-950/40 rounded border border-slate-900">
                All health indicator combinations operating within baseline envelopes.
              </div>
            )}
          </div>
        </div>

        {/* Latest Clinical Decision Support Guidance */}
        <div className="bg-[#0C1527] border border-slate-800 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-cyan-400" />
              <h2 className="text-xs font-semibold text-slate-100 font-mono uppercase tracking-wider">
                Clinical Decision Support ({latestGuidance.length})
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab && onNavigateTab('decision')}
              className="text-[10px] font-mono text-cyan-400 hover:underline"
            >
              Guidance Cockpit &rarr;
            </button>
          </div>

          <div className="space-y-3 font-mono text-xs">
            {latestGuidance.map((g) => (
              <div
                key={g.guidanceId}
                className="bg-slate-950/80 border border-slate-800 rounded p-3 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200">{g.title}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-cyan-300">
                    {g.priority}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                  {g.operationalContext}
                </p>
                {g.clinicalRecommendations && g.clinicalRecommendations[0] && (
                  <div className="text-[11px] text-cyan-300 font-sans">
                    Action: {g.clinicalRecommendations[0]}
                  </div>
                )}
              </div>
            ))}

            {latestGuidance.length === 0 && (
              <div className="p-6 text-center text-xs font-mono text-slate-500 bg-slate-950/40 rounded border border-slate-900">
                No active medical guidance directives required.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

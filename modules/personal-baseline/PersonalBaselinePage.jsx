import React, { useState, useEffect } from 'react';
import {
  User,
  Activity,
  Calculator,
  RefreshCw,
  PlusCircle,
  TrendingUp,
  AlertOctagon,
  Clock,
  Sparkles,
  Layers,
} from 'lucide-react';
import { localDb } from '../../database/localDatabase.js';
import { calculateBaseline } from './services/baselineCalculationService.js';
import { BaselineStorageService } from './services/baselineStorageService.js';
import { BaselineTrendService, TrendDirection } from './services/baselineTrendService.js';
import { BaselineSummary } from './components/BaselineSummary.jsx';
import { BaselineComparison } from './components/BaselineComparison.jsx';
import { BaselineTrendChart } from './components/BaselineTrendChart.jsx';
import { BaselineConfidenceBadge } from './components/BaselineConfidence.jsx';

export function PersonalBaselinePage() {
  const [astronautId, setAstronautId] = useState('ASTRO-01');
  const [metric, setMetric] = useState('heart_rate');
  const [missionId, setMissionId] = useState('ARES-V');

  // Loaded data state
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState([]);
  const [activeBaseline, setActiveBaseline] = useState(null);
  const [trendAnalysis, setTrendAnalysis] = useState(null);
  const [actionFeedback, setActionFeedback] = useState(null);

  // Available astronauts and supported baseline metrics
  const astronauts = ['ASTRO-01', 'ASTRO-02', 'ASTRO-03'];
  const metrics = [
    { id: 'heart_rate', label: 'Heart Rate', unit: 'bpm', category: 'wearable_physiological' },
    { id: 'hrv', label: 'Heart Rate Variability (HRV)', unit: 'ms', category: 'wearable_physiological' },
    { id: 'spo2', label: 'Blood Oxygen (SpO2)', unit: '%', category: 'wearable_physiological' },
    { id: 'systolic_bp', label: 'Systolic Blood Pressure', unit: 'mmHg', category: 'wearable_physiological' },
    { id: 'diastolic_bp', label: 'Diastolic Blood Pressure', unit: 'mmHg', category: 'wearable_physiological' },
    { id: 'body_temperature', label: 'Body Temperature', unit: '°C', category: 'wearable_physiological' },
    { id: 'sleep_duration', label: 'Sleep Duration (Recovery)', unit: 'hours', category: 'mission_event' },
    { id: 'stress_score', label: 'Subjective Stress Score', unit: 'score', category: 'manual_assessment' },
    { id: 'fatigue_score', label: 'Subjective Fatigue Score', unit: 'score', category: 'manual_assessment' },
    { id: 'mood_score', label: 'Astronaut Mood Score', unit: 'score', category: 'manual_assessment' },
  ];

  const currentMetricConfig = metrics.find((m) => m.id === metric) || metrics[0];

  // Fetch records and active baseline from local IndexedDB
  const loadData = async () => {
    setLoading(true);
    setActionFeedback(null);
    try {
      // 1. Fetch relevant historical records from IndexedDB
      let fetched = [];
      if (currentMetricConfig.category === 'wearable_physiological') {
        fetched = await localDb.measurements
          .where('astronautId')
          .equals(astronautId)
          .toArray();
      } else if (currentMetricConfig.category === 'manual_assessment') {
        fetched = await localDb.assessments
          .where('astronautId')
          .equals(astronautId)
          .toArray();
      } else if (currentMetricConfig.category === 'mission_event') {
        fetched = await localDb.missionEvents
          .where('astronautId')
          .equals(astronautId)
          .toArray();
      }
      setRecords(fetched);

      // 2. Fetch saved active baseline from IndexedDB
      const saved = await BaselineStorageService.getBaseline(astronautId, metric, missionId);
      setActiveBaseline(saved);

      // 3. Compute current trend if records exist
      if (fetched.length > 0) {
        const trend = BaselineTrendService.analyseTrend(fetched, saved, { astronautId, metric });
        setTrendAnalysis(trend);
      } else {
        setTrendAnalysis(null);
      }
    } catch (err) {
      console.error('Failed to load baseline data from IndexedDB:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [astronautId, metric, missionId]);

  // Recalculate baseline and persist to IndexedDB
  const handleCalculateAndSave = async () => {
    setLoading(true);
    setActionFeedback(null);
    try {
      if (records.length === 0) {
        setActionFeedback({
          type: 'error',
          message: 'No records available for calculation. Ingest telemetry or load demonstration data first.',
        });
        return;
      }

      // Calculate new baseline using statistical calculation service
      const calculated = calculateBaseline(records, astronautId, metric, { missionId });

      // Save to IndexedDB (updates baselines and preserves version history)
      const saved = await BaselineStorageService.saveBaseline({ ...calculated, missionId });
      setActiveBaseline(saved);

      // Recalculate trend
      const trend = BaselineTrendService.analyseTrend(records, saved, { astronautId, metric });
      setTrendAnalysis(trend);

      setActionFeedback({
        type: 'success',
        message: `Personal baseline v${saved.version} calculated and stored successfully (${saved.sampleCount} observations processed).`,
      });
    } catch (err) {
      setActionFeedback({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  // Populate synthetic demonstration records for testing
  const handleLoadDemoRecords = async () => {
    setLoading(true);
    setActionFeedback(null);
    try {
      const now = Date.now();
      const syntheticRecords = [];

      // Generate 12 historical records spread across 12 days
      const demoValuesMap = {
        heart_rate: [68, 70, 71, 72, 70, 74, 72, 73, 75, 74, 76, 75],
        hrv: [55, 52, 58, 60, 54, 50, 56, 62, 58, 54, 52, 50],
        spo2: [98, 97, 98, 99, 97, 98, 98, 97, 98, 99, 98, 98],
        systolic_bp: [118, 120, 122, 119, 121, 124, 120, 118, 122, 120, 125, 122],
        diastolic_bp: [76, 78, 80, 77, 79, 82, 78, 76, 80, 78, 81, 79],
        body_temperature: [36.7, 36.6, 36.8, 36.7, 36.9, 36.8, 36.7, 36.6, 36.8, 36.7, 36.9, 36.8],
        sleep_duration: [420, 450, 480, 460, 510, 440, 480, 470, 500, 450, 480, 490], // in minutes
        stress_score: [20, 25, 30, 25, 35, 40, 30, 25, 30, 35, 25, 30],
        fatigue_score: [30, 35, 40, 35, 45, 50, 40, 35, 40, 45, 35, 40],
        mood_score: [8, 8, 7, 8, 7, 6, 7, 8, 8, 7, 8, 8],
      };

      const values = demoValuesMap[metric] || [70, 72, 74, 72, 75];

      for (let i = 0; i < values.length; i++) {
        const recordedAt = new Date(now - (values.length - i) * 86400000).toISOString();
        const recId = `synthetic-${astronautId}-${metric}-${i}`;

        if (currentMetricConfig.category === 'wearable_physiological') {
          syntheticRecords.push({
            recordId: recId,
            astronautId,
            missionId,
            recordedAt,
            category: 'wearable_physiological',
            provenance: { source: 'wearable_sensor', deviceId: 'SYNTHETIC-GENERATOR', softwareVersion: '1.0.0' },
            syncStatus: 'pending',
            data: {
              metric,
              value: values[i],
              unit: currentMetricConfig.unit,
            },
          });
        } else if (currentMetricConfig.category === 'manual_assessment') {
          syntheticRecords.push({
            recordId: recId,
            astronautId,
            missionId,
            recordedAt,
            category: 'manual_assessment',
            provenance: { source: 'manual_entry', deviceId: 'SYNTHETIC-GENERATOR', softwareVersion: '1.0.0' },
            syncStatus: 'pending',
            data: {
              [metric]: values[i],
            },
          });
        } else if (currentMetricConfig.category === 'mission_event') {
          syntheticRecords.push({
            recordId: recId,
            astronautId,
            missionId,
            recordedAt,
            category: 'mission_event',
            provenance: { source: 'mission_log', deviceId: 'SYNTHETIC-GENERATOR', softwareVersion: '1.0.0' },
            syncStatus: 'pending',
            data: {
              eventType: 'sleep_session',
              durationMinutes: values[i],
              description: 'Synthetic sleep cycle record',
            },
          });
        }
      }

      // Store in relevant Dexie table
      const targetTable = localDb.getTableByCategory(currentMetricConfig.category);
      await targetTable.bulkPut(syntheticRecords);

      setActionFeedback({
        type: 'success',
        message: `Successfully loaded ${syntheticRecords.length} synthetic demonstration records for [${astronautId} / ${metric}]. Clearly labeled as synthetic.`,
      });

      await loadData();
    } catch (err) {
      setActionFeedback({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const getTrendBadge = (direction) => {
    switch (direction) {
      case TrendDirection.INCREASING:
        return { label: 'Upward Trajectory (Increasing)', bg: 'bg-amber-950/80 border-amber-500 text-amber-300' };
      case TrendDirection.DECREASING:
        return { label: 'Downward Trajectory (Decreasing)', bg: 'bg-indigo-950/80 border-indigo-500 text-indigo-300' };
      case TrendDirection.STABLE:
        return { label: 'Stable Pattern', bg: 'bg-emerald-950/80 border-emerald-500 text-emerald-300' };
      case TrendDirection.REPEATED_DEVIATIONS:
        return { label: 'Repeated Deviations', bg: 'bg-rose-950/80 border-rose-500 text-rose-300' };
      case TrendDirection.INSUFFICIENT_DATA:
      default:
        return { label: 'Insufficient Data for Trend', bg: 'bg-slate-800 border-slate-700 text-slate-400' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Astronaut & Metric Selector Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 shadow-xl text-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Astronaut Selector */}
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

          {/* Metric Selector */}
          <div className="min-w-[240px]">
            <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
              Health Metric
            </label>
            <select
              value={metric}
              onChange={(e) => setMetric(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-xs font-mono text-cyan-300 focus:border-cyan-500 focus:outline-none"
            >
              {metrics.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label} ({m.unit})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-slate-300 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            type="button"
            onClick={handleLoadDemoRecords}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs bg-indigo-950/80 hover:bg-indigo-900/80 border border-indigo-700 text-indigo-300 rounded transition"
            title="Populate test telemetry if local database is empty"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            Load Synthetic Demo Records
          </button>

          <button
            type="button"
            onClick={handleCalculateAndSave}
            disabled={loading || records.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded transition shadow"
          >
            <Calculator className="w-3.5 h-3.5" />
            {loading ? 'Calculating...' : 'Calculate & Store Baseline'}
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

      {/* Empty State when no records exist */}
      {records.length === 0 && !loading && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-8 text-center space-y-4">
          <AlertOctagon className="w-8 h-8 text-cyan-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-200">No Historical Observations Recorded</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            No local measurements found in IndexedDB for <b className="text-cyan-300">{astronautId}</b> under metric <b className="text-cyan-300">{currentMetricConfig.label}</b>.
            Submit new telemetry through Module 01 Ingestion Portal, or click "Load Synthetic Demo Records" above to evaluate personal baseline algorithms.
          </p>
        </div>
      )}

      {/* Main Analysis Workspace (Rendered when baseline or records exist) */}
      {(records.length > 0 || activeBaseline) && (
        <div className="space-y-6">
          {/* Top Row: Baseline Summary & Confidence Badge */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <BaselineSummary baseline={activeBaseline} />
            </div>
            <div>
              <BaselineConfidenceBadge
                confidence={activeBaseline?.confidence || 'INSUFFICIENT_DATA'}
                sampleCount={activeBaseline?.sampleCount || records.length}
                warnings={activeBaseline?.warnings || []}
              />

              {/* Trend Direction Card */}
              {trendAnalysis && (
                <div className="mt-4 bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-2">
                  <div className="text-[11px] uppercase font-semibold text-slate-400 font-mono">
                    Observed Trajectory:
                  </div>
                  {(() => {
                    const badge = getTrendBadge(trendAnalysis.direction);
                    return (
                      <span className={`inline-block px-3 py-1 rounded text-xs font-semibold border ${badge.bg}`}>
                        {badge.label}
                      </span>
                    );
                  })()}
                  <p className="text-xs text-slate-300 mt-2">
                    {trendAnalysis.explanation}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Middle Row: Trend Chart */}
          <BaselineTrendChart
            dataPoints={trendAnalysis?.dataPoints || []}
            baseline={activeBaseline}
            metric={metric}
            unit={currentMetricConfig.unit}
          />

          {/* Bottom Row: Personal Baseline Comparison Tool */}
          <BaselineComparison
            baseline={activeBaseline}
            onCompare={(res) => {
              // Trigger any required downstream listeners
            }}
          />
        </div>
      )}
    </div>
  );
}


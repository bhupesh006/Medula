import React, { useState, useEffect } from 'react';
import {
  Activity,
  Cpu,
  RefreshCw,
  Sparkles,
  Layers,
  ShieldAlert,
  Play,
  Database,
} from 'lucide-react';
import { localDb } from '../../database/localDatabase.js';
import {
  PatternDetectionService,
  HealthDomains,
  OperationalState,
} from './services/patternDetectionService.js';
import { PatternStorageService } from './services/patternStorageService.js';
import { BaselineStorageService } from '../personal-baseline/services/baselineStorageService.js';
import { HealthDomainOverview } from './components/HealthDomainOverview.jsx';
import { PatternAlertCard } from './components/PatternAlertCard.jsx';
import { IndicatorCorrelationView } from './components/IndicatorCorrelationView.jsx';
import { PatternExplanation } from './components/PatternExplanation.jsx';
import { PatternTimeline } from './components/PatternTimeline.jsx';

export function HealthPatternDetectionPage() {
  const [astronautId, setAstronautId] = useState('ASTRO-01');
  const [activeDomain, setActiveDomain] = useState(HealthDomains.CARDIOVASCULAR);
  const [loading, setLoading] = useState(false);
  const [activePattern, setActivePattern] = useState(null);
  const [domainSummaries, setDomainSummaries] = useState({});
  const [historicalPatterns, setHistoricalPatterns] = useState([]);
  const [actionFeedback, setActionFeedback] = useState(null);

  const astronauts = ['ASTRO-01', 'ASTRO-02', 'ASTRO-03'];

  // Load all telemetry, baselines, and evaluate patterns from IndexedDB
  const runEvaluation = async () => {
    setLoading(true);
    setActionFeedback(null);
    try {
      // 1. Fetch all local measurements, assessments, missionEvents, and radiationRecords
      const [mRecords, aRecords, eRecords, rRecords, allBaselines] = await Promise.all([
        localDb.measurements.where('astronautId').equals(astronautId).toArray(),
        localDb.assessments.where('astronautId').equals(astronautId).toArray(),
        localDb.missionEvents.where('astronautId').equals(astronautId).toArray(),
        localDb.radiationRecords.where('astronautId').equals(astronautId).toArray(),
        BaselineStorageService.getAllBaselines(astronautId),
      ]);

      const combinedTelemetry = [...mRecords, ...aRecords, ...eRecords, ...rRecords];

      // Map baselines by metric
      const baselinesMap = {};
      for (const b of allBaselines) {
        baselinesMap[b.metric] = b;
      }

      // 2. Evaluate all 5 domains to populate domain overview cards
      const summaries = {};
      for (const dom of Object.values(HealthDomains)) {
        const evalOutcome = PatternDetectionService.analyseHealthDomain(
          astronautId,
          dom,
          combinedTelemetry,
          baselinesMap,
          eRecords
        );
        summaries[dom] = evalOutcome;
      }
      setDomainSummaries(summaries);

      // Set active domain pattern
      const currentDomainResult = summaries[activeDomain];
      setActivePattern(currentDomainResult);

      // 3. Persist active evaluation to patternResults table
      if (currentDomainResult) {
        await PatternStorageService.savePatternResult(currentDomainResult);
      }

      // 4. Load pattern history from IndexedDB
      const history = await PatternStorageService.getPatternHistory(astronautId, activeDomain);
      setHistoricalPatterns(history);
    } catch (err) {
      console.error('Failed to run pattern evaluation:', err);
      setActionFeedback({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runEvaluation();
  }, [astronautId, activeDomain]);

  // Scenario Loader: Multi-Indicator Strain Simulation (Clearly Labeled Synthetic)
  const handleLoadScenario = async (scenarioType) => {
    setLoading(true);
    setActionFeedback(null);
    try {
      const now = Date.now();
      const synthetic = [];

      if (scenarioType === 'cardio_strain') {
        // Multi-indicator Cardiovascular Strain: High HR, Low HRV, Elevated Systolic BP
        synthetic.push(
          {
            recordId: `syn-hr-${now}`,
            astronautId,
            missionId: 'ARES-V',
            recordedAt: new Date(now - 15 * 60000).toISOString(),
            category: 'wearable_physiological',
            provenance: { source: 'wearable_sensor', deviceId: 'SYNTHETIC-SCENARIO' },
            data: { metric: 'heart_rate', value: 88, unit: 'bpm' },
          },
          {
            recordId: `syn-hrv-${now}`,
            astronautId,
            missionId: 'ARES-V',
            recordedAt: new Date(now - 15 * 60000).toISOString(),
            category: 'wearable_physiological',
            provenance: { source: 'wearable_sensor', deviceId: 'SYNTHETIC-SCENARIO' },
            data: { metric: 'hrv', value: 36, unit: 'ms' },
          },
          {
            recordId: `syn-bp-${now}`,
            astronautId,
            missionId: 'ARES-V',
            recordedAt: new Date(now - 15 * 60000).toISOString(),
            category: 'wearable_physiological',
            provenance: { source: 'wearable_sensor', deviceId: 'SYNTHETIC-SCENARIO' },
            data: { metric: 'systolic_bp', value: 138, unit: 'mmHg' },
          },
          {
            recordId: `syn-spo2-${now}`,
            astronautId,
            missionId: 'ARES-V',
            recordedAt: new Date(now - 15 * 60000).toISOString(),
            category: 'wearable_physiological',
            provenance: { source: 'wearable_sensor', deviceId: 'SYNTHETIC-SCENARIO' },
            data: { metric: 'spo2', value: 96, unit: '%' },
          }
        );

        // Also ensure baselines exist for comparison
        await BaselineStorageService.saveBaseline({
          astronautId,
          metric: 'heart_rate',
          unit: 'bpm',
          median: 72,
          mean: 72.5,
          percentile25: 68,
          percentile75: 76,
          standardDeviation: 4.8,
          confidence: 'HIGH_CONFIDENCE',
          sampleCount: 30,
        });
        await BaselineStorageService.saveBaseline({
          astronautId,
          metric: 'hrv',
          unit: 'ms',
          median: 55,
          mean: 55,
          percentile25: 48,
          percentile75: 62,
          standardDeviation: 6.0,
          confidence: 'HIGH_CONFIDENCE',
          sampleCount: 30,
        });
        await BaselineStorageService.saveBaseline({
          astronautId,
          metric: 'systolic_bp',
          unit: 'mmHg',
          median: 120,
          mean: 120,
          percentile25: 115,
          percentile75: 125,
          standardDeviation: 5.0,
          confidence: 'HIGH_CONFIDENCE',
          sampleCount: 30,
        });

        // Add contextual mission exercise event
        await localDb.missionEvents.put({
          recordId: `syn-eva-${now}`,
          astronautId,
          missionId: 'ARES-V',
          recordedAt: new Date(now - 2 * 3600000).toISOString(),
          category: 'mission_event',
          provenance: { source: 'mission_log' },
          data: {
            eventType: 'exercise_session',
            durationMinutes: 60,
            intensity: 'extreme',
            description: 'T2 High-Intensity Countermeasure Protocol',
          },
        });

        await localDb.measurements.bulkPut(synthetic);
        setActiveDomain(HealthDomains.CARDIOVASCULAR);

        setActionFeedback({
          type: 'success',
          message: 'Loaded synthetic multi-indicator strain scenario (Cardiovascular ASSESS state). Clearly labeled synthetic demonstration.',
        });
      } else if (scenarioType === 'solar_particle') {
        // Solar Particle Radiation Event: 180 µSv/h
        await localDb.radiationRecords.put({
          recordId: `syn-rad-${now}`,
          astronautId,
          missionId: 'ARES-V',
          recordedAt: new Date(now - 10 * 60000).toISOString(),
          category: 'radiation_measurement',
          provenance: { source: 'radiation_dosimeter' },
          data: {
            cumulative_dose: 22.4,
            cumulative_dose_unit: 'mSv',
            dose_rate: 180.0,
            dose_rate_unit: 'µSv/h',
            sensorLocation: 'Airlock Module',
          },
        });

        setActiveDomain(HealthDomains.RADIATION_EXPOSURE);
        setActionFeedback({
          type: 'success',
          message: 'Loaded synthetic solar particle event (Radiation ASSESS state). Clearly labeled synthetic demonstration.',
        });
      }

      await runEvaluation();
    } catch (err) {
      setActionFeedback({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Astronaut Context & Scenario Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 shadow-xl text-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
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

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={runEvaluation}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-slate-300 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Re-evaluate
          </button>

          <button
            type="button"
            onClick={() => handleLoadScenario('cardio_strain')}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs bg-amber-950/80 hover:bg-amber-900/80 border border-amber-700 text-amber-300 rounded transition"
            title="Inject synthetic multi-indicator cardio deviations"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Simulate Cardio Strain (Demo)
          </button>

          <button
            type="button"
            onClick={() => handleLoadScenario('solar_particle')}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs bg-rose-950/80 hover:bg-rose-900/80 border border-rose-700 text-rose-300 rounded transition"
            title="Inject synthetic solar particle radiation event"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            Simulate Solar Event (Demo)
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

      {/* Domain Selection Overview Grid */}
      <HealthDomainOverview
        activeDomain={activeDomain}
        onSelectDomain={setActiveDomain}
        domainSummaries={domainSummaries}
      />

      {/* Active Pattern Alert & Rationale */}
      {activePattern && (
        <div className="space-y-6">
          <PatternAlertCard patternResult={activePattern} />

          <IndicatorCorrelationView
            indicators={activePattern.allIndicators || []}
            missingMetrics={activePattern.missingMetrics || []}
            staleMetrics={activePattern.staleMetrics || []}
          />

          <PatternExplanation patternResult={activePattern} />

          <PatternTimeline patterns={historicalPatterns} />
        </div>
      )}
    </div>
  );
}


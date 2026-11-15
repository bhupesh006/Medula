import React, { useState } from 'react';
import { ArrowUpRight, ArrowDownRight, CheckCircle2, AlertCircle, Scale, Activity } from 'lucide-react';
import { BaselineComparisonService, ComparisonDirection } from '../services/baselineComparisonService.js';

export function BaselineComparison({ baseline, onCompare }) {
  const [testValue, setTestValue] = useState(74);
  const [comparisonResult, setComparisonResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleEvaluate = (e) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!baseline) {
      setErrorMsg('No active baseline available to compare against.');
      return;
    }

    try {
      const measurement = {
        astronautId: baseline.astronautId,
        metric: baseline.metric,
        value: Number(testValue),
        unit: baseline.unit,
        recordedAt: new Date().toISOString(),
      };

      const result = BaselineComparisonService.compareWithBaseline(measurement, baseline);
      setComparisonResult(result);
      if (onCompare) onCompare(result);
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const getDirectionBadge = (direction) => {
    switch (direction) {
      case ComparisonDirection.ABOVE_BASELINE_PATTERN:
        return {
          label: 'Above Historical Central Pattern (> Q3)',
          bg: 'bg-amber-950/80 border-amber-500 text-amber-300',
          icon: ArrowUpRight,
        };
      case ComparisonDirection.BELOW_BASELINE_PATTERN:
        return {
          label: 'Below Historical Central Pattern (< Q1)',
          bg: 'bg-indigo-950/80 border-indigo-500 text-indigo-300',
          icon: ArrowDownRight,
        };
      case ComparisonDirection.WITHIN_BASELINE_PATTERN:
        return {
          label: 'Within Historical Central Pattern (Q1–Q3)',
          bg: 'bg-emerald-950/80 border-emerald-500 text-emerald-300',
          icon: CheckCircle2,
        };
      case ComparisonDirection.INSUFFICIENT_DATA:
      default:
        return {
          label: 'Insufficient Baseline Data',
          bg: 'bg-slate-800 border-slate-700 text-slate-400',
          icon: AlertCircle,
        };
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 shadow-xl text-slate-100 space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <h3 className="text-lg font-bold text-cyan-400 font-mono tracking-wide flex items-center gap-2">
            <Scale className="w-5 h-5 text-cyan-400" />
            Personal Baseline Comparison Engine
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Compare incoming observations against individual historical distributions
          </p>
        </div>
      </div>

      {/* Measurement Evaluation Input Bar */}
      <form onSubmit={handleEvaluate} className="flex flex-col sm:flex-row items-end gap-3 bg-slate-950/80 p-4 rounded-lg border border-slate-800">
        <div className="flex-1 w-full">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Evaluate Observation ({baseline?.metric || 'metric'})
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="any"
              value={testValue}
              onChange={(e) => setTestValue(e.target.value)}
              required
              placeholder="e.g. 74"
              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm font-mono text-cyan-300 focus:border-cyan-500 focus:outline-none"
            />
            <span className="text-xs font-mono text-slate-400 px-2">
              {baseline?.unit || 'units'}
            </span>
          </div>
        </div>

        <button
          type="submit"
          className="w-full sm:w-auto px-5 py-2 text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white rounded transition shadow font-mono"
        >
          Compare With Baseline
        </button>
      </form>

      {errorMsg && (
        <div className="p-3 rounded bg-rose-950/80 border border-rose-500/80 text-rose-300 text-xs">
          {errorMsg}
        </div>
      )}

      {/* Comparison Results Card */}
      {comparisonResult && (
        <div className="bg-slate-950 rounded-lg p-5 border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              {(() => {
                const badge = getDirectionBadge(comparisonResult.direction);
                const BadgeIcon = badge.icon;
                return (
                  <span className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold border ${badge.bg}`}>
                    <BadgeIcon className="w-4 h-4 shrink-0" />
                    {badge.label}
                  </span>
                );
              })()}
            </div>

            <div className="text-[11px] font-mono text-slate-400">
              Compared at: {new Date(comparisonResult.comparedAt).toLocaleTimeString()}
            </div>
          </div>

          {/* Deviation Metrics Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
            <div className="p-3 rounded bg-slate-900 border border-slate-800">
              <div className="text-[10px] uppercase font-semibold text-slate-400">Current Value</div>
              <div className="text-xl font-bold font-mono text-cyan-300 mt-1">
                {comparisonResult.currentValue} <span className="text-xs text-slate-400">{comparisonResult.unit}</span>
              </div>
            </div>

            <div className="p-3 rounded bg-slate-900 border border-slate-800">
              <div className="text-[10px] uppercase font-semibold text-slate-400">Baseline Median</div>
              <div className="text-xl font-bold font-mono text-slate-300 mt-1">
                {comparisonResult.baselineMedian !== null ? comparisonResult.baselineMedian : 'N/A'}{' '}
                <span className="text-xs text-slate-400">{comparisonResult.unit}</span>
              </div>
            </div>

            <div className="p-3 rounded bg-slate-900 border border-slate-800">
              <div className="text-[10px] uppercase font-semibold text-slate-400">Delta vs Median</div>
              <div className={`text-xl font-bold font-mono mt-1 ${
                comparisonResult.absoluteDifferenceFromMedian > 0
                  ? 'text-amber-400'
                  : comparisonResult.absoluteDifferenceFromMedian < 0
                  ? 'text-indigo-400'
                  : 'text-emerald-400'
              }`}>
                {comparisonResult.absoluteDifferenceFromMedian !== null
                  ? `${comparisonResult.absoluteDifferenceFromMedian > 0 ? '+' : ''}${comparisonResult.absoluteDifferenceFromMedian}`
                  : 'N/A'}{' '}
                <span className="text-xs text-slate-400">{comparisonResult.unit}</span>
              </div>
            </div>

            <div className="p-3 rounded bg-slate-900 border border-slate-800">
              <div className="text-[10px] uppercase font-semibold text-slate-400">Percentage Shift</div>
              <div className={`text-xl font-bold font-mono mt-1 ${
                comparisonResult.percentageDifferenceFromMedian > 0
                  ? 'text-amber-400'
                  : comparisonResult.percentageDifferenceFromMedian < 0
                  ? 'text-indigo-400'
                  : 'text-emerald-400'
              }`}>
                {comparisonResult.percentageDifferenceFromMedian !== null
                  ? `${comparisonResult.percentageDifferenceFromMedian > 0 ? '+' : ''}${comparisonResult.percentageDifferenceFromMedian}%`
                  : 'N/A'}
              </div>
            </div>
          </div>

          {/* Explanation Text */}
          <div className="p-3 rounded bg-slate-900/60 border border-slate-800 text-xs text-slate-300">
            <span className="font-semibold text-cyan-300">Observation: </span>
            {comparisonResult.explanation}
          </div>

          <div className="text-[10px] text-slate-500 italic">
            Statistical observation only. Evaluates relative positioning against historical interquartile range (IQR). Does not represent a clinical diagnosis or medical emergency.
          </div>
        </div>
      )}
    </div>
  );
}


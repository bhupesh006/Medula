import React from 'react';
import { ArrowUpRight, ArrowDownRight, CheckCircle2, AlertOctagon, Clock, Layers } from 'lucide-react';
import { ComparisonDirection } from '../../personal-baseline/services/baselineComparisonService.js';

export function IndicatorCorrelationView({ indicators = [], missingMetrics = [], staleMetrics = [] }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 shadow-xl text-slate-100 space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-cyan-400 font-mono tracking-wide flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            Domain Indicator Alignment & Baseline Comparison
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Current telemetry observations compared synchronously against individual astronaut baselines
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded border border-slate-800">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px]">
            <tr>
              <th className="p-3">Indicator Metric</th>
              <th className="p-3">Current Observation</th>
              <th className="p-3">Personal Baseline (Median / IQR)</th>
              <th className="p-3">Status vs Historical Pattern</th>
              <th className="p-3">Observed At</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80 bg-slate-900/50">
            {indicators.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-6 text-center text-slate-500">
                  No active indicator telemetry recorded for this domain.
                </td>
              </tr>
            ) : (
              indicators.map((ind) => {
                const isAbove = ind.direction === ComparisonDirection.ABOVE_BASELINE_PATTERN;
                const isBelow = ind.direction === ComparisonDirection.BELOW_BASELINE_PATTERN;
                const isWithin = ind.direction === ComparisonDirection.WITHIN_BASELINE_PATTERN;

                return (
                  <tr key={ind.metric} className="hover:bg-slate-800/40 font-mono">
                    <td className="p-3 text-slate-200 font-sans font-semibold">
                      {ind.metric.replace('_', ' ').toUpperCase()}
                    </td>
                    <td className="p-3 text-cyan-300 font-bold">
                      {ind.value} <span className="text-[10px] text-slate-400 font-normal">{ind.unit}</span>
                    </td>
                    <td className="p-3 text-slate-300">
                      {ind.baselineMedian !== null ? (
                        <span>
                          {ind.baselineMedian} {ind.unit}{' '}
                          <span className="text-[10px] text-slate-500 font-normal">
                            ({ind.baselineIQR ? `${ind.baselineIQR[0]}–${ind.baselineIQR[1]}` : 'N/A'})
                          </span>
                        </span>
                      ) : (
                        <span className="text-slate-500 italic">No Baseline Established</span>
                      )}
                    </td>
                    <td className="p-3">
                      {isAbove && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-950 border border-amber-500 text-amber-300">
                          <ArrowUpRight className="w-3 h-3" /> Above Historical Pattern
                        </span>
                      )}
                      {isBelow && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-950 border border-indigo-500 text-indigo-300">
                          <ArrowDownRight className="w-3 h-3" /> Below Historical Pattern
                        </span>
                      )}
                      {isWithin && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950 border border-emerald-500 text-emerald-300">
                          <CheckCircle2 className="w-3 h-3" /> Within Historical Pattern
                        </span>
                      )}
                      {!isAbove && !isBelow && !isWithin && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 border border-slate-700 text-slate-400">
                          Baseline Pending
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-slate-400 text-[11px]">
                      {ind.recordedAt ? new Date(ind.recordedAt).toLocaleTimeString() : 'N/A'}
                    </td>
                  </tr>
                );
              })
            )}

            {/* Missing Indicators Rows */}
            {missingMetrics.map((missing) => (
              <tr key={missing} className="bg-slate-950/40 text-slate-500 font-mono italic">
                <td className="p-3">{missing.replace('_', ' ').toUpperCase()}</td>
                <td className="p-3" colSpan="3">
                  <span className="text-rose-400/80 text-[11px] not-italic">Missing telemetry</span> — No observation recorded within analysis window
                </td>
                <td className="p-3">—</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


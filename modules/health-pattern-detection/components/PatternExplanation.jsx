import React from 'react';
import { Info, HelpCircle, Compass, AlertCircle } from 'lucide-react';

export function PatternExplanation({ patternResult }) {
  if (!patternResult) return null;

  const {
    domain,
    operationalState,
    explanation,
    contributingIndicators = [],
    missingMetrics = [],
    staleMetrics = [],
    contextualObservations = [],
  } = patternResult;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 shadow-xl text-slate-100 space-y-4">
      <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
        <Info className="w-4 h-4 text-cyan-400" />
        <h3 className="text-sm font-bold text-cyan-400 font-mono tracking-wide">
          Explainable Pattern Audit & Operational Rationale
        </h3>
      </div>

      {/* Main explanation paragraph */}
      <div className="bg-slate-950 p-4 rounded-lg border border-slate-800/80 text-xs text-slate-200 leading-relaxed font-sans">
        {explanation}
      </div>

      {/* Detailed breakdown sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        {/* Mission Context */}
        <div className="bg-slate-950/60 p-4 rounded-lg border border-slate-800 space-y-2">
          <div className="flex items-center gap-1.5 font-semibold text-slate-300 uppercase tracking-wider font-mono text-[11px]">
            <Compass className="w-3.5 h-3.5 text-cyan-400" /> Mission Contextual Events:
          </div>
          {contextualObservations.length === 0 ? (
            <p className="text-slate-500 italic text-[11px]">
              No relevant exercise, EVA, or sleep events recorded in this observation window.
            </p>
          ) : (
            <ul className="space-y-1 text-slate-300 text-[11px]">
              {contextualObservations.map((ctx, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="text-cyan-400">•</span>
                  <span>{ctx}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="text-[10px] text-slate-500 italic pt-1 border-t border-slate-800/60">
            Contextual correlations represent temporal observations requiring crew interpretation, not clinical causality.
          </p>
        </div>

        {/* Contributing Deviations & Data Quality */}
        <div className="bg-slate-950/60 p-4 rounded-lg border border-slate-800 space-y-2">
          <div className="flex items-center gap-1.5 font-semibold text-slate-300 uppercase tracking-wider font-mono text-[11px]">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400" /> Contributing Indicators:
          </div>
          {contributingIndicators.length === 0 ? (
            <p className="text-slate-500 italic text-[11px]">
              All measured indicators align with personal historical central ranges.
            </p>
          ) : (
            <div className="space-y-1 text-[11px]">
              {contributingIndicators.map((ind, idx) => (
                <div key={idx} className="flex justify-between text-slate-300 border-b border-slate-800/60 pb-0.5">
                  <span className="font-mono text-cyan-300">{ind.metric}:</span>
                  <span>{ind.value} {ind.unit} (median {ind.baselineMedian} {ind.unit})</span>
                </div>
              ))}
            </div>
          )}

          {missingMetrics.length > 0 && (
            <div className="pt-2 text-[10px] text-slate-400">
              <span className="font-semibold text-rose-400">Missing Telemetry:</span> {missingMetrics.join(', ')}
            </div>
          )}
          {staleMetrics.length > 0 && (
            <div className="text-[10px] text-slate-400">
              <span className="font-semibold text-amber-400">Stale (&gt;36h):</span> {staleMetrics.join(', ')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

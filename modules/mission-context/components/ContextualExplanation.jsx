import React from 'react';
import { Compass, Info, AlertCircle } from 'lucide-react';

export function ContextualExplanation({ contextSnapshot }) {
  if (!contextSnapshot) return null;

  const {
    missionDay,
    explanation,
    sleepContext,
    exerciseContext,
    workloadContext,
    missingContextIndicators = [],
  } = contextSnapshot;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 shadow-xl text-slate-100 space-y-4">
      <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
        <Compass className="w-4 h-4 text-cyan-400" />
        <h3 className="text-sm font-bold text-cyan-400 font-mono tracking-wide">
          Mission Contextual Synthesis (Mission Day {missionDay})
        </h3>
      </div>

      <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 leading-relaxed font-sans">
        {explanation}
      </div>

      {missingContextIndicators.length > 0 && (
        <div className="p-3 bg-slate-950/60 rounded border border-slate-800/80 flex items-start gap-2 text-xs text-slate-400">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-amber-300">Unrecorded Context Dimensions: </span>
            {missingContextIndicators.join(', ')}.
          </div>
        </div>
      )}
    </div>
  );
}


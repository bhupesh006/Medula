import React from 'react';
import { History, Clock, ArrowRight } from 'lucide-react';

export function PatternTimeline({ patterns = [] }) {
  if (!patterns || patterns.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 text-center text-slate-500 text-xs">
        No previous pattern evaluation records logged in local audit history.
      </div>
    );
  }

  const getStateBadge = (state) => {
    switch (state) {
      case 'ESCALATE':
        return 'bg-rose-950 border-rose-500 text-rose-300';
      case 'ASSESS':
        return 'bg-amber-950 border-amber-500 text-amber-300';
      case 'OBSERVE':
        return 'bg-cyan-950 border-cyan-500 text-cyan-300';
      case 'NORMAL':
      default:
        return 'bg-emerald-950 border-emerald-500 text-emerald-300';
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 shadow-xl text-slate-100 space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-cyan-400 font-mono tracking-wide flex items-center gap-2">
            <History className="w-4 h-4 text-cyan-400" />
            Historical Pattern Detection Audit Timeline
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Immutable log of previously evaluated operational health states
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {patterns.map((pat) => (
          <div
            key={pat.patternId}
            className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${getStateBadge(pat.operationalState)}`}>
                  {pat.operationalState}
                </span>
                <span className="font-semibold text-slate-200 uppercase font-mono text-[11px]">
                  {pat.domain?.replace('_', ' ')}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  [{pat.confidence}]
                </span>
              </div>
              <p className="text-slate-300 text-[11px] line-clamp-1">{pat.patternDescription}</p>
            </div>

            <div className="text-slate-500 font-mono text-[10px] flex items-center gap-1.5 shrink-0">
              <Clock className="w-3 h-3 text-slate-400" />
              <span>{pat.detectionTimestamp ? new Date(pat.detectionTimestamp).toLocaleString() : 'N/A'}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


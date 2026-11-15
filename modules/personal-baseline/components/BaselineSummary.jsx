import React from 'react';
import { Layers, Calendar, Clock, GitBranch, Cpu, Database } from 'lucide-react';

export function BaselineSummary({ baseline }) {
  if (!baseline) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 text-center text-slate-500 text-sm">
        No active personal baseline found for this astronaut and metric.
      </div>
    );
  }

  const {
    astronautId,
    missionId,
    metric,
    unit,
    median,
    mean,
    standardDeviation,
    medianAbsoluteDeviation,
    minimum,
    maximum,
    percentile25,
    percentile75,
    sampleCount,
    version,
    updatedAt,
    calculationPeriodStart,
    calculationPeriodEnd,
    calculationMethod,
  } = baseline;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 shadow-xl text-slate-100 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-cyan-400 font-mono tracking-wide">
              {astronautId} — {metric.replace('_', ' ').toUpperCase()} BASELINE
            </h3>
            <span className="text-[10px] font-mono bg-cyan-950 border border-cyan-800 text-cyan-300 px-2 py-0.5 rounded">
              v{version || 1}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Mission: {missionId} • Derived using {calculationMethod || 'robust statistics'}
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
          <div className="flex items-center gap-1">
            <Database className="w-3.5 h-3.5 text-cyan-400" />
            <span>N = {sampleCount} records</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>Updated: {updatedAt ? new Date(updatedAt).toLocaleTimeString() : 'N/A'}</span>
          </div>
        </div>
      </div>

      {/* Primary Statistical Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Median (Primary Reference) */}
        <div className="bg-cyan-950/40 border border-cyan-500/40 p-4 rounded-lg">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-cyan-300">
            Median (Primary Ref)
          </div>
          <div className="text-2xl font-bold font-mono text-cyan-400 mt-1">
            {median !== null ? median : 'N/A'} <span className="text-xs font-normal text-cyan-200">{unit}</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Robust central location</div>
        </div>

        {/* Mean */}
        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Arithmetic Mean
          </div>
          <div className="text-2xl font-bold font-mono text-slate-200 mt-1">
            {mean !== null ? mean : 'N/A'} <span className="text-xs font-normal text-slate-400">{unit}</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Parametric average</div>
        </div>

        {/* Interquartile Range (Q1 - Q3) */}
        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Central Range (Q1 – Q3)
          </div>
          <div className="text-xl font-bold font-mono text-slate-200 mt-1">
            {percentile25 !== null ? percentile25 : '—'} – {percentile75 !== null ? percentile75 : '—'}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">25th to 75th percentiles (50% central)</div>
        </div>

        {/* Dispersion (MAD & Std Dev) */}
        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Dispersion (MAD / σ)
          </div>
          <div className="text-xl font-bold font-mono text-slate-200 mt-1">
            ±{medianAbsoluteDeviation !== null ? medianAbsoluteDeviation : '—'} <span className="text-xs text-slate-400">MAD</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            Std Dev: ±{standardDeviation !== null ? standardDeviation : '—'} {unit}
          </div>
        </div>
      </div>

      {/* Secondary Metrics & Calculation Window Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono bg-slate-950/70 p-4 rounded-lg border border-slate-800/80">
        <div className="space-y-1.5">
          <div className="text-slate-400 font-sans font-semibold text-[11px] uppercase tracking-wide">
            Extreme Observed Range:
          </div>
          <div className="flex justify-between border-b border-slate-800/60 pb-1">
            <span className="text-slate-400">Historical Minimum:</span>
            <span className="text-cyan-300 font-bold">{minimum !== null ? minimum : '—'} {unit}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Historical Maximum:</span>
            <span className="text-cyan-300 font-bold">{maximum !== null ? maximum : '—'} {unit}</span>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="text-slate-400 font-sans font-semibold text-[11px] uppercase tracking-wide">
            Calculation Observation Period:
          </div>
          <div className="flex justify-between border-b border-slate-800/60 pb-1">
            <span className="text-slate-400">Window Start:</span>
            <span className="text-slate-200">{calculationPeriodStart || 'N/A'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Window End:</span>
            <span className="text-slate-200">{calculationPeriodEnd || 'N/A'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}


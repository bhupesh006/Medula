import React from 'react';
import { ShieldCheck, AlertCircle, AlertTriangle, HelpCircle } from 'lucide-react';
import { BaselineConfidence } from '../services/baselineCalculationService.js';

export function BaselineConfidenceBadge({ confidence, sampleCount, warnings = [] }) {
  const getConfidenceConfig = () => {
    switch (confidence) {
      case BaselineConfidence.HIGH_CONFIDENCE:
        return {
          label: 'High Confidence',
          desc: 'Sufficient sample size (≥ 30 observations). High statistical stability.',
          bg: 'bg-emerald-950/70 border-emerald-500/80 text-emerald-300',
          dot: 'bg-emerald-400',
          icon: ShieldCheck,
        };
      case BaselineConfidence.MODERATE_CONFIDENCE:
        return {
          label: 'Moderate Confidence',
          desc: 'Adequate sample size (10–29 observations). Moderate statistical stability.',
          bg: 'bg-cyan-950/70 border-cyan-500/80 text-cyan-300',
          dot: 'bg-cyan-400',
          icon: ShieldCheck,
        };
      case BaselineConfidence.LOW_CONFIDENCE:
        return {
          label: 'Low Confidence',
          desc: 'Minimal sample size (5–9 observations). Statistical variance may be high.',
          bg: 'bg-amber-950/70 border-amber-500/80 text-amber-300',
          dot: 'bg-amber-400',
          icon: AlertTriangle,
        };
      case BaselineConfidence.INSUFFICIENT_DATA:
      default:
        return {
          label: 'Insufficient Data',
          desc: 'Fewer than 5 observations. Baseline cannot be reliably established.',
          bg: 'bg-rose-950/70 border-rose-500/80 text-rose-300',
          dot: 'bg-rose-400',
          icon: AlertCircle,
        };
    }
  };

  const config = getConfidenceConfig();
  const Icon = config.icon;

  return (
    <div className={`p-4 rounded-lg border ${config.bg} space-y-2`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 shrink-0" />
          <span className="font-semibold text-xs tracking-wider uppercase font-mono">
            Statistical Confidence: {config.label}
          </span>
        </div>
        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-black/40 border border-white/10">
          N = {sampleCount} samples
        </span>
      </div>

      <p className="text-xs opacity-90">{config.desc}</p>

      {/* Warnings list if any */}
      {warnings && warnings.length > 0 && (
        <div className="pt-2 border-t border-white/10 space-y-1 text-[11px]">
          <div className="font-semibold uppercase tracking-wider text-amber-300 flex items-center gap-1">
            <HelpCircle className="w-3 h-3" /> Data Quality Notices:
          </div>
          {warnings.map((w, idx) => (
            <div key={idx} className="opacity-90">• {w}</div>
          ))}
        </div>
      )}

      <div className="pt-2 text-[10px] opacity-70 italic border-t border-white/10">
        Notice: Statistical data-sufficiency indicator only. Does not represent medical diagnosis or certainty.
      </div>
    </div>
  );
}


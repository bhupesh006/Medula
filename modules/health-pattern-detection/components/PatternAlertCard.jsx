import React from 'react';
import { ShieldCheck, AlertCircle, AlertTriangle, Flame, Clock } from 'lucide-react';
import { OperationalState } from '../services/patternDetectionService.js';

export function PatternAlertCard({ patternResult }) {
  if (!patternResult) return null;

  const { operationalState, patternDescription, confidence, detectionTimestamp, domain } = patternResult;

  const getStateConfig = () => {
    switch (operationalState) {
      case OperationalState.ESCALATE:
        return {
          label: 'OPERATIONAL STATE: ESCALATE',
          sub: 'Independent onboard safety protocol triggered. Multi-indicator critical pattern.',
          bg: 'bg-rose-950/80 border-rose-500 text-rose-200',
          badgeBg: 'bg-rose-500 text-black',
          icon: Flame,
        };
      case OperationalState.ASSESS:
        return {
          label: 'OPERATIONAL STATE: ASSESS',
          sub: 'Multiple persistent deviations identified across related domain indicators.',
          bg: 'bg-amber-950/80 border-amber-500 text-amber-200',
          badgeBg: 'bg-amber-500 text-black',
          icon: AlertTriangle,
        };
      case OperationalState.OBSERVE:
        return {
          label: 'OPERATIONAL STATE: OBSERVE',
          sub: 'Single indicator deviation or emerging trajectory. Continue passive observation.',
          bg: 'bg-cyan-950/80 border-cyan-500 text-cyan-200',
          badgeBg: 'bg-cyan-500 text-black',
          icon: AlertCircle,
        };
      case OperationalState.NORMAL:
      default:
        return {
          label: 'OPERATIONAL STATE: NORMAL',
          sub: 'All observed indicators align with astronaut personal baseline central patterns.',
          bg: 'bg-emerald-950/80 border-emerald-500 text-emerald-200',
          badgeBg: 'bg-emerald-500 text-black',
          icon: ShieldCheck,
        };
    }
  };

  const config = getStateConfig();
  const Icon = config.icon;

  return (
    <div className={`p-5 rounded-lg border ${config.bg} shadow-lg space-y-3`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 shrink-0" />
          <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded tracking-wide ${config.badgeBg}`}>
            {config.label}
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/40 border border-white/10 uppercase">
            {domain?.replace('_', ' ')}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] font-mono opacity-80">
          <Clock className="w-3.5 h-3.5" />
          <span>{detectionTimestamp ? new Date(detectionTimestamp).toLocaleTimeString() : 'Recent'}</span>
        </div>
      </div>

      <p className="text-sm font-semibold">{patternDescription}</p>
      <p className="text-xs opacity-90">{config.sub}</p>

      <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] font-mono opacity-80">
        <span>Evidence Confidence: <b className="uppercase">{confidence}</b></span>
        <span className="italic">Software state classification only. Not a medical emergency or diagnosis.</span>
      </div>
    </div>
  );
}


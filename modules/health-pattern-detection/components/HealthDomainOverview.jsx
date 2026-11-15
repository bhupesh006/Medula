import React from 'react';
import { Heart, Moon, Brain, Dumbbell, Zap, AlertTriangle, ShieldCheck } from 'lucide-react';
import { HealthDomains } from '../services/patternDetectionService.js';

export function HealthDomainOverview({ activeDomain, onSelectDomain, domainSummaries = {} }) {
  const domainsConfig = [
    {
      id: HealthDomains.CARDIOVASCULAR,
      label: 'Cardiovascular',
      icon: Heart,
      metrics: 'Heart Rate, HRV, Blood Pressure, SpO2',
    },
    {
      id: HealthDomains.SLEEP_RECOVERY,
      label: 'Sleep & Recovery',
      icon: Moon,
      metrics: 'Sleep Duration, Fatigue Score, Nocturnal HRV',
    },
    {
      id: HealthDomains.PSYCHOLOGICAL,
      label: 'Psychological Wellbeing',
      icon: Brain,
      metrics: 'Stress Score, Mood Score, Fatigue',
    },
    {
      id: HealthDomains.PHYSICAL_PERFORMANCE,
      label: 'Physical Performance',
      icon: Dumbbell,
      metrics: 'Exercise Duration, Activity HR, Recovery Fatigue',
    },
    {
      id: HealthDomains.RADIATION_EXPOSURE,
      label: 'Radiation Exposure',
      icon: Zap,
      metrics: 'Cumulative Dose (mSv), Dose Rate (µSv/h)',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
      {domainsConfig.map((dom) => {
        const Icon = dom.icon;
        const isSelected = activeDomain === dom.id;
        const summary = domainSummaries[dom.id] || null;
        const state = summary?.operationalState || 'NORMAL';

        const getStatePill = () => {
          switch (state) {
            case 'ESCALATE':
              return 'bg-rose-950 border-rose-500 text-rose-300';
            case 'ASSESS':
              return 'bg-amber-950 border-amber-500 text-amber-300';
            case 'OBSERVE':
              return 'bg-cyan-950 border-cyan-500 text-cyan-300';
            default:
              return 'bg-emerald-950 border-emerald-500 text-emerald-300';
          }
        };

        return (
          <button
            key={dom.id}
            type="button"
            onClick={() => onSelectDomain(dom.id)}
            className={`p-4 rounded-lg border text-left transition flex flex-col justify-between space-y-3 ${
              isSelected
                ? 'bg-slate-900 border-cyan-500 shadow-[0_0_15px_rgba(0,209,255,0.15)] ring-1 ring-cyan-500'
                : 'bg-slate-900/60 border-slate-800 hover:bg-slate-900 hover:border-slate-700'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded bg-cyan-950/80 border border-cyan-800/80 flex items-center justify-center text-cyan-400">
                  <Icon className="w-4 h-4" />
                </div>
                <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${getStatePill()}`}>
                  {state}
                </span>
              </div>
              <h4 className="text-xs font-bold text-slate-100 mt-2 font-mono tracking-wide">
                {dom.label}
              </h4>
              <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-2">
                {dom.metrics}
              </p>
            </div>

            {summary && (
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span>Deviations: {summary.contributingIndicators?.length || 0}</span>
                <span className="uppercase text-[9px] opacity-75">{summary.confidence}</span>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}


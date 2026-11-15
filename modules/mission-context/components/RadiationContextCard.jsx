import React from 'react';
import { Zap, ShieldAlert, Clock, AlertTriangle } from 'lucide-react';

export function RadiationContextCard({ radiationContext }) {
  if (!radiationContext || !radiationContext.available) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 shadow-xl text-slate-100 space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
          <Zap className="w-4 h-4 text-slate-400" />
          <h3 className="text-xs font-bold text-slate-400 font-mono uppercase tracking-wider">
            Radiological Context
          </h3>
        </div>
        <div className="p-3 bg-slate-950/60 rounded border border-slate-800 text-xs text-slate-400">
          No radiation dosimeter records logged for this astronaut in current window.
        </div>
      </div>
    );
  }

  const { doseRate, cumulativeDose, sensorLocation, recordedAt } = radiationContext;
  const isElevated = doseRate > 50;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 shadow-xl text-slate-100 space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-bold text-cyan-400 font-mono uppercase tracking-wider">
            Radiological Context (Dosimeter CPD)
          </h3>
        </div>
        <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
          isElevated ? 'bg-amber-950 border-amber-500 text-amber-300' : 'bg-slate-950 border-slate-800 text-slate-300'
        }`}>
          {sensorLocation || 'Habitat Module'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs font-mono">
        <div className="bg-slate-950 p-3 rounded border border-slate-800">
          <div className="text-[10px] text-slate-400 uppercase">Dose Rate</div>
          <div className="text-lg font-bold text-cyan-300 mt-0.5">
            {doseRate} <span className="text-xs font-normal text-slate-400">µSv/h</span>
          </div>
        </div>

        <div className="bg-slate-950 p-3 rounded border border-slate-800">
          <div className="text-[10px] text-slate-400 uppercase">Cumulative Mission Dose</div>
          <div className="text-lg font-bold text-cyan-300 mt-0.5">
            {cumulativeDose} <span className="text-xs font-normal text-slate-400">mSv</span>
          </div>
        </div>
      </div>

      <div className="text-[10px] text-slate-500 italic">
        Radiation exposure is strictly tracked as a physical environmental hazard and is not averaged with physiological indicators.
      </div>
    </div>
  );
}


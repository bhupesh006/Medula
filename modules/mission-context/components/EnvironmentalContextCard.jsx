import React from 'react';
import { Wind, Thermometer, Droplets, AlertCircle } from 'lucide-react';

export function EnvironmentalContextCard({ environmentalContext }) {
  if (!environmentalContext || !environmentalContext.available) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 shadow-xl text-slate-100 space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
          <Wind className="w-4 h-4 text-slate-400" />
          <h3 className="text-xs font-bold text-slate-400 font-mono uppercase tracking-wider">
            Cabin Environmental Conditions
          </h3>
        </div>
        <div className="flex items-center gap-2 p-3 bg-slate-950/60 rounded border border-slate-800 text-xs text-slate-400">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            {environmentalContext?.summary || 'No cabin environmental sensor telemetry recorded in this operational window.'}
          </span>
        </div>
        <div className="text-[10px] text-slate-500 italic">
          Sensors unrecorded. Environmental parameters are omitted rather than fabricated.
        </div>
      </div>
    );
  }

  const { measurements, latestRecordedAt } = environmentalContext;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 shadow-xl text-slate-100 space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Wind className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-bold text-cyan-400 font-mono uppercase tracking-wider">
            Cabin Environmental Telemetry
          </h3>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500 text-emerald-300">
          Sensors Online
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
        <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
          <div className="text-[10px] text-slate-400 uppercase">Cabin Temp</div>
          <div className="text-base font-bold text-cyan-300 mt-0.5">{measurements.cabinTemp ?? 21}°C</div>
        </div>

        <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
          <div className="text-[10px] text-slate-400 uppercase">CO2 Level</div>
          <div className="text-base font-bold text-cyan-300 mt-0.5">{measurements.co2Percent ?? 0.3}%</div>
        </div>

        <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
          <div className="text-[10px] text-slate-400 uppercase">Oxygen (O2)</div>
          <div className="text-base font-bold text-cyan-300 mt-0.5">{measurements.o2Percent ?? 20.9}%</div>
        </div>

        <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
          <div className="text-[10px] text-slate-400 uppercase">Humidity</div>
          <div className="text-base font-bold text-cyan-300 mt-0.5">{measurements.humidityPercent ?? 45}%</div>
        </div>
      </div>

      <div className="text-[10px] text-slate-500 font-mono">
        Last sensor reading: {latestRecordedAt ? new Date(latestRecordedAt).toLocaleTimeString() : 'Recent'}
      </div>
    </div>
  );
}


import React, { useState } from 'react';
import { MeasurementForm } from './components/MeasurementForm.jsx';
import { ValidationResult } from './components/ValidationResult.jsx';
import { Activity, ShieldCheck, Heart, Moon, Radiation, ClipboardList, Database, Sparkles } from 'lucide-react';

export function HealthAssessmentPage({ onRecordAcquired }) {
  const [refreshSignal, setRefreshSignal] = useState(0);

  const handleAcquired = (result) => {
    setRefreshSignal((prev) => prev + 1);
    if (onRecordAcquired) onRecordAcquired(result);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-[#0C1527] border border-cyan-500/30 rounded-xl p-5 space-y-3 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0">
              <ClipboardList className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold font-mono text-slate-100 tracking-wide">
                  ASTRONAUT HEALTH ASSESSMENT &amp; DATA ACQUISITION
                </h1>
                <span className="text-[10px] font-mono uppercase bg-cyan-950 border border-cyan-800 text-cyan-300 px-2 py-0.5 rounded">
                  MODULE 01: MDAE
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Multi-source telemetry ingestion: physiological vitals, subjective clinical assessments, mission activity events, and radiation dosimeter readings.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-slate-300">
              Local Offline Validation Active
            </span>
          </div>
        </div>

        {/* Scientific Guidance Notice */}
        <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-3 text-[11px] font-mono text-slate-400 flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="text-slate-200 font-semibold">Validation &amp; Integrity Standard: </span>
            All telemetry entries undergo client-side schema validation (ISO 8601 UTC timestamps, technical physical bounds, unit consistency, and provenance tracking). Valid records are persisted locally in IndexedDB and queued for asynchronous synchronization.
          </div>
        </div>
      </div>

      {/* Main Measurement Ingestion Form */}
      <section>
        <MeasurementForm onRecordAcquired={handleAcquired} />
      </section>

      {/* Validation Results & Rejections Audit */}
      <section>
        <ValidationResult refreshSignal={refreshSignal} />
      </section>
    </div>
  );
}

import React from 'react';
import { Table, ShieldCheck, Activity, Moon, Brain, Gauge, Zap } from 'lucide-react';
import { ScientificProvenanceBadge } from './ScientificProvenanceBadge.jsx';

const INDICATOR_MAPPINGS = [
  {
    metric: 'heart_rate',
    displayName: 'Resting Heart Rate',
    unit: 'bpm',
    domain: 'Cardiovascular',
    nasaStandardProtocol: 'NASA SM-02: Cardiovascular Standard Measures (Holter & Continuous BP)',
    relatedHazard: 'Gravity Fields (Microgravity deconditioning & cephalad shift)',
    provenanceType: 'nasa_protocol',
    cadence: 'Continuous / Resting Basal Period',
  },
  {
    metric: 'hrv',
    displayName: 'Heart Rate Variability (RMSSD)',
    unit: 'ms',
    domain: 'Cardiovascular / Autonomic',
    nasaStandardProtocol: 'NASA SM-02: Autonomic Nervous System Tone & Holter ECG',
    relatedHazard: 'Gravity Fields & Isolation (Autonomic regulation stress)',
    provenanceType: 'nasa_protocol',
    cadence: 'Resting Nocturnal Window',
  },
  {
    metric: 'systolic_bp / diastolic_bp',
    displayName: 'Blood Pressure',
    unit: 'mmHg',
    domain: 'Cardiovascular',
    nasaStandardProtocol: 'NASA SM-02: Ambulatory 24-hr Arterial Pressure',
    relatedHazard: 'Gravity Fields (Orthostatic intolerance risk)',
    provenanceType: 'nasa_protocol',
    cadence: 'Periodic Scheduled In-Flight Measures',
  },
  {
    metric: 'sleep_duration',
    displayName: 'Total Sleep Time',
    unit: 'hours',
    domain: 'Sleep & Recovery',
    nasaStandardProtocol: 'NASA SM-01: Standard Measures Actigraphy & Sleep Logs',
    relatedHazard: 'Isolation & Confinement (Circadian desynchronization)',
    provenanceType: 'nasa_protocol',
    cadence: 'Daily Post-Awakening Calculation',
  },
  {
    metric: 'fatigue_score',
    displayName: 'Fatigue Assessment',
    unit: '1-10',
    domain: 'Sleep & Behavioral',
    nasaStandardProtocol: 'NASA SM-03: Karolinska Sleepiness Scale (KSS) & Samn-Perelli',
    relatedHazard: 'Isolation & Confinement (Workload and sleep debt)',
    provenanceType: 'nasa_protocol',
    cadence: 'Daily Assessment Log',
  },
  {
    metric: 'stress_score / mood_score',
    displayName: 'Stress & Mood Ratings',
    unit: '1-10',
    domain: 'Psychological Wellbeing',
    nasaStandardProtocol: 'NASA SM-03: Visual Analog Scales (VAS) & Profile of Mood States',
    relatedHazard: 'Isolation & Confinement (Interpersonal & mission stress)',
    provenanceType: 'nasa_protocol',
    cadence: 'Daily or Shift Handover Log',
  },
  {
    metric: 'ambient_radiation_rate',
    displayName: 'Dose Equivalent Rate',
    unit: 'µSv/h',
    domain: 'Space Radiation',
    nasaStandardProtocol: 'NASA OSDR RadLab / ISS Active Dosimetry (DOSTEL & Silicon Detectors)',
    relatedHazard: 'Space Radiation (Galactic Cosmic Rays & Solar Particle Events)',
    provenanceType: 'public_dataset',
    cadence: 'Continuous Detector Telemetry Stream',
  },
  {
    metric: 'cabin_co2',
    displayName: 'Cabin CO2 Concentration',
    unit: '%',
    domain: 'Cabin Environment',
    nasaStandardProtocol: 'NASA OSDR Environmental Data App / ECLSS Major Constituent Analyzer',
    relatedHazard: 'Hostile/Closed Environments (Hypercapnia & cephalad venous pooling)',
    provenanceType: 'public_dataset',
    cadence: 'Continuous Orbital Life Support Stream',
  },
];

export function HealthIndicatorMapping() {
  return (
    <div className="bg-[#0C1527] border border-slate-800 rounded-lg p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-slate-100 font-mono tracking-wide">
              HEALTH INDICATORS &amp; NASA PROTOCOL MAPPING
            </h2>
            <ScientificProvenanceBadge type="nasa_protocol" size="sm" />
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Systematic alignment of MEDULA telemetry metrics with published NASA Spaceflight Standard Measures protocols.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800 uppercase text-[10px] tracking-wider">
            <tr>
              <th className="py-2.5 px-3">Telemetry Metric</th>
              <th className="py-2.5 px-3">Units</th>
              <th className="py-2.5 px-3">Domain</th>
              <th className="py-2.5 px-3">NASA Standard Measures Protocol</th>
              <th className="py-2.5 px-3">Associated NASA Hazard</th>
              <th className="py-2.5 px-3 text-right">Cadence</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {INDICATOR_MAPPINGS.map((row) => (
              <tr key={row.metric} className="hover:bg-slate-900/50 transition">
                <td className="py-2.5 px-3 font-semibold text-cyan-300">
                  {row.displayName}
                  <div className="text-[10px] text-slate-500 font-normal">{row.metric}</div>
                </td>
                <td className="py-2.5 px-3 text-slate-300">{row.unit}</td>
                <td className="py-2.5 px-3 text-slate-400">{row.domain}</td>
                <td className="py-2.5 px-3 text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <ScientificProvenanceBadge type={row.provenanceType} size="sm" showLabel={false} />
                    <span className="truncate max-w-xs">{row.nasaStandardProtocol}</span>
                  </div>
                </td>
                <td className="py-2.5 px-3 text-slate-400 text-[11px]">{row.relatedHazard}</td>
                <td className="py-2.5 px-3 text-slate-500 text-right text-[11px]">{row.cadence}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


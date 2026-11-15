import React from 'react';
import { ScientificProvenanceBadge } from './ScientificProvenanceBadge.jsx';
import {
  BookOpen,
  Calendar,
  Activity,
  Heart,
  Moon,
  ShieldCheck,
  ExternalLink,
  Layers,
  Clock,
  Compass,
  FileText,
  CheckCircle,
} from 'lucide-react';

const STANDARD_CADENCES = [
  {
    phase: 'Pre-Flight Terrestrial Baseline',
    code: 'L-180 & L-60',
    description: 'Establishes individual resting physiological baseline in 1g terrestrial conditions prior to microgravity exposure.',
    measures: ['Resting HR & HRV Holter', '24-hr Ambulatory BP', 'Subjective Sleep Quality Logs', 'Cognitive Battery'],
  },
  {
    phase: 'In-Flight Early Adaptation',
    code: 'FD15 (Flight Day 15)',
    description: 'Captures acute cephalad fluid shift, initial vestibular re-adaptation, and acute circadian shift responses.',
    measures: ['Continuous Actigraphy', 'Daily Sleep/Fatigue Logs', 'Vascular Ultrasound', 'Resting Vitals'],
  },
  {
    phase: 'In-Flight Mid-Mission',
    code: 'FD60 & FD120',
    description: 'Monitors chronic microgravity adaptations, cardiovascular deconditioning, bone/muscle loss, and cumulative stress.',
    measures: ['Aerobic Capacity Assessment', 'Holter Autonomic Dynamics', 'Radiation Dosimetry', 'Cognitive Performance'],
  },
  {
    phase: 'In-Flight Pre-Landing',
    code: 'R-15 (Return minus 15 days)',
    description: 'Evaluates readiness for gravitational re-entry, orthostatic tolerance risk, and mission-long cumulative fatigue.',
    measures: ['Fluid Loading Assessment', 'Orthostatic Challenge Protocol', 'Fatigue Inventory', 'Biochemical Biomarkers'],
  },
  {
    phase: 'Post-Flight Recovery',
    code: 'R+3 & R+30',
    description: 'Tracks post-landing recovery trajectory, baroreceptor autonomic recalibration, and musculoskeletal rehabilitation.',
    measures: ['Postural Blood Pressure', 'Resting Heart Rate Trajectory', 'Sleep Restoration Tracking', 'Sensorimotor Testing'],
  },
];

const STANDARD_DISCIPLINES = [
  {
    name: 'Cardiovascular & Autonomic',
    icon: Heart,
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/30',
    nasaProtocol: 'Standard Measures SM-02: Cardiovascular Health',
    metrics: ['heart_rate (bpm)', 'hrv (RMSSD, ms)', 'blood_pressure (mmHg)'],
    description:
      'Standardized ECG Holter recordings and continuous blood pressure monitoring evaluating autonomic balance, baroreflex sensitivity, and vascular deconditioning.',
  },
  {
    name: 'Sleep, Actigraphy & Behavioral Health',
    icon: Moon,
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/30',
    nasaProtocol: 'Standard Measures SM-01 & SM-03: Behavioral & Sleep',
    metrics: ['sleep_duration (hours)', 'fatigue_score (1-10)', 'stress_score (1-10)', 'mood_score (1-10)'],
    description:
      'Continuous wrist actigraphy accelerometry and daily subjective sleep/fatigue rating scales evaluating circadian phase shifts and cognitive readiness.',
  },
  {
    name: 'Physical Performance & Countermeasures',
    icon: Activity,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    nasaProtocol: 'Standard Measures SM-04: Sensorimotor & Exercise',
    metrics: ['exercise_duration (min)', 'workload_intensity (moderate/heavy)', 'extravehicular_activity (EVA)'],
    description:
      'Tracks daily resistive (ARED) and cycle/treadmill (T2/CEVIS) countermeasure sessions and EVA workloads to preserve aerobic capacity and bone density.',
  },
  {
    name: 'Space Radiation & Environmental ECLSS',
    icon: ShieldCheck,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    nasaProtocol: 'NASA OSDR RadLab & Environmental Standards',
    metrics: ['ambient_radiation_rate (µSv/h)', 'cumulative_dose (mSv)', 'cabin_co2 (%)', 'cabin_temperature (°C)'],
    description:
      'Continuous area and personal dosimetry paired with cabin life support gas composition telemetry to guard against hypercapnia and radiation toxicity.',
  },
];

export function StandardMeasuresView() {
  return (
    <div className="space-y-6">
      {/* Hero Overview Box */}
      <div className="bg-[#0C1527] border border-cyan-500/40 rounded-xl p-6 space-y-4 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl -z-10" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0">
              <Layers className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold font-mono text-slate-100 tracking-wide">
                  NASA SPACEFLIGHT STANDARD MEASURES PROJECT
                </h2>
                <ScientificProvenanceBadge type="nasa_protocol" size="sm" />
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Standardized physiological, behavioral, and biochemical data collection protocols for long-duration spaceflight.
              </p>
            </div>
          </div>

          <a
            href="https://www.nasa.gov/reference/standard-measures/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-950 border border-cyan-600 text-cyan-300 hover:bg-cyan-900 font-mono text-xs font-medium transition shrink-0"
          >
            <span>Official NASA Reference</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Narrative Description */}
        <div className="text-xs text-slate-300 leading-relaxed font-sans space-y-2">
          <p>
            The <strong>NASA Spaceflight Standard Measures Project</strong> represents a cross-disciplinary effort directed by the NASA Human Research Program (HRP). Its goal is to collect a consistent set of core measurements from astronauts before, during, and after long-duration missions. This longitudinal dataset provides an invaluable historical record to assess how spaceflight hazards impact human anatomy and physiology over time.
          </p>
          <p className="text-slate-400">
            <strong>How MEDULA Leverages Standard Measures:</strong> Rather than relying on generic terrestrial population clinical reference ranges (which misclassify normal microgravity adaptation as pathological illness), MEDULA incorporates the NASA Standard Measures taxonomy and collection cadences. MEDULA calculates <em>personalized non-parametric baselines</em> (Median and Median Absolute Deviation) for each crewmember and evaluates multi-indicator patterns relative to these spaceflight-calibrated protocols.
          </p>
        </div>
      </div>

      {/* Cadence Timeline */}
      <div className="bg-[#0C1527] border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-semibold text-slate-100 font-mono uppercase tracking-wider">
              Standard Measures Mission Cadence Timeline
            </h3>
          </div>
          <span className="text-[10px] font-mono text-slate-500">
            Pre-Flight • In-Flight • Post-Flight
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {STANDARD_CADENCES.map((cadence, idx) => (
            <div
              key={cadence.code}
              className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-3.5 flex flex-col justify-between space-y-2 relative"
            >
              <div>
                <div className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-wide">
                  Step 0{idx + 1}
                </div>
                <div className="text-xs font-bold text-slate-200 font-mono mt-0.5">
                  {cadence.code}
                </div>
                <div className="text-[11px] font-semibold text-slate-300 mt-1">
                  {cadence.phase}
                </div>
                <p className="text-[10px] text-slate-400 font-sans mt-1.5 leading-normal">
                  {cadence.description}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-900">
                <span className="text-[9px] font-mono text-slate-500 block uppercase mb-1">
                  Target Protocols:
                </span>
                <ul className="text-[10px] text-slate-400 space-y-0.5 list-disc list-inside">
                  {cadence.measures.map((m, mIdx) => (
                    <li key={mIdx} className="truncate" title={m}>
                      {m}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Disciplines & Integration in MEDULA */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {STANDARD_DISCIPLINES.map((disc) => {
          const Icon = disc.icon;
          return (
            <div
              key={disc.name}
              className="bg-[#0C1527] border border-slate-800 rounded-lg p-5 space-y-3"
            >
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg ${disc.bg} border ${disc.border} flex items-center justify-center ${disc.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold font-mono text-slate-200">
                    {disc.name}
                  </h4>
                  <span className="text-[10px] font-mono text-slate-400 block">
                    {disc.nasaProtocol}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-300 font-sans leading-relaxed">
                {disc.description}
              </p>

              <div className="bg-slate-950/80 border border-slate-800/80 rounded p-2.5 font-mono text-[11px] space-y-1">
                <span className="text-[10px] text-slate-500 block uppercase">
                  MEDULA Telemetry Keys:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {disc.metrics.map((m) => (
                    <span
                      key={m}
                      className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-cyan-300 text-[10px]"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Scientific Citation Footer */}
      <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3 text-[11px] font-mono text-slate-400 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>
            NASA Human Research Program Standard Measures Project (2024). Reference standard protocols for spaceflight human research studies. NASA Johnson Space Center, Houston, TX.
          </span>
        </div>
        <a
          href="https://www.nasa.gov/reference/standard-measures/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-cyan-400 hover:underline shrink-0 flex items-center gap-1"
        >
          View Source <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}

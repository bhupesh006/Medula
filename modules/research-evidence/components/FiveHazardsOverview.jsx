import React, { useState } from 'react';
import { Radiation, Users, Navigation, Compass, AlertTriangle, ExternalLink, ChevronRight } from 'lucide-react';
import { ScientificProvenanceBadge } from './ScientificProvenanceBadge.jsx';

const NASA_FIVE_HAZARDS = [
  {
    id: 'radiation',
    name: 'Space Radiation',
    icon: Radiation,
    color: 'from-purple-950/60 to-purple-900/20 border-purple-500/40 text-purple-300',
    badgeColor: 'border-purple-500 text-purple-300 bg-purple-950',
    summary: 'Galactic cosmic rays, solar particle events, and trapped radiation belts.',
    nasaDescription: 'Outside Earth’s protective magnetic field and atmosphere, radiation exposure is significantly more hazardous. Galactic cosmic rays (GCRs) and solar particle events (SPEs) elevate lifetime cancer risks, central nervous system damage, and degenerative tissue pathology.',
    relatedDomains: ['Radiation Exposure', 'Cardiovascular System'],
    trackedIndicators: ['ambient_radiation_rate (µSv/h)', 'cumulative_dose (mSv)', 'heart_rate_variability'],
    nasaUrl: 'https://www.nasa.gov/hrp/hazards/',
  },
  {
    id: 'isolation',
    name: 'Isolation and Confinement',
    icon: Users,
    color: 'from-amber-950/60 to-amber-900/20 border-amber-500/40 text-amber-300',
    badgeColor: 'border-amber-500 text-amber-300 bg-amber-950',
    summary: 'Prolonged confinement in confined habitats with small crew complements.',
    nasaDescription: 'Sleep loss, circadian desynchronization, and work overload compound over multi-month missions. Behavioral health degradation, interpersonal friction, and mood decrements directly impact executive cognitive function and mission success.',
    relatedDomains: ['Sleep & Recovery', 'Psychological Wellbeing'],
    trackedIndicators: ['sleep_duration (hours)', 'fatigue_score (1-10)', 'stress_score (1-10)', 'mood_score (1-10)'],
    nasaUrl: 'https://www.nasa.gov/hrp/hazards/',
  },
  {
    id: 'distance',
    name: 'Distance from Earth',
    icon: Navigation,
    color: 'from-cyan-950/60 to-cyan-900/20 border-cyan-500/40 text-cyan-300',
    badgeColor: 'border-cyan-500 text-cyan-300 bg-cyan-950',
    summary: 'Up to 22-minute one-way communication latency with zero evacuation capability.',
    nasaDescription: 'A Mars mission will be the farthest humans have ever traveled. The communication delay prevents real-time telemedicine from mission control. The crew must be capable of autonomous physiological monitoring, diagnosis, and clinical triage.',
    relatedDomains: ['Mission Context', 'Autonomous Decision Support'],
    trackedIndicators: ['offline_sync_queue', 'baseline_confidence_index', 'telemetry_provenance'],
    nasaUrl: 'https://www.nasa.gov/hrp/hazards/',
  },
  {
    id: 'gravity',
    name: 'Gravity Fields',
    icon: Compass,
    color: 'from-emerald-950/60 to-emerald-900/20 border-emerald-500/40 text-emerald-300',
    badgeColor: 'border-emerald-500 text-emerald-300 bg-emerald-950',
    summary: 'Transitions across 0g microgravity, planetary gravity (0.16g Moon, 0.38g Mars), and launch hypergravity.',
    nasaDescription: 'Weightlessness induces cephalad fluid shifts, cardiovascular deconditioning, orthostatic intolerance upon re-gravitation, muscle atrophy, bone mineral density loss (~1-1.5% per month), and Spaceflight Associated Neuro-ocular Syndrome (SANS).',
    relatedDomains: ['Cardiovascular', 'Physical Performance'],
    trackedIndicators: ['heart_rate (bpm)', 'blood_pressure (mmHg)', 'hrv (ms)', 'exercise_duration (min)'],
    nasaUrl: 'https://www.nasa.gov/hrp/hazards/',
  },
  {
    id: 'environment',
    name: 'Hostile/Closed Environments',
    icon: AlertTriangle,
    color: 'from-rose-950/60 to-rose-900/20 border-rose-500/40 text-rose-300',
    badgeColor: 'border-rose-500 text-rose-300 bg-rose-950',
    summary: 'Closed-loop ECLSS life support, elevated CO2, microbes, and toxic contaminants.',
    nasaDescription: 'Spacecraft are sealed ecosystems where air and water are endlessly recycled. Elevated ambient CO2 concentrations, acoustic stress, microbial ecosystem shifts, and potential toxic leaks pose acute and chronic health threats.',
    relatedDomains: ['Cabin Environment', 'Cardiopulmonary'],
    trackedIndicators: ['cabin_co2 (%)', 'cabin_temperature (°C)', 'cabin_humidity (%)', 'spo2 (%)'],
    nasaUrl: 'https://www.nasa.gov/hrp/hazards/',
  },
];

export function FiveHazardsOverview({ onSelectHazard, selectedHazardId }) {
  const [activeHazardId, setActiveHazardId] = useState(selectedHazardId || 'radiation');

  const activeHazard =
    NASA_FIVE_HAZARDS.find((h) => h.id === activeHazardId) || NASA_FIVE_HAZARDS[0];

  const handleSelect = (id) => {
    setActiveHazardId(id);
    if (onSelectHazard) onSelectHazard(id);
  };

  return (
    <div className="bg-[#0C1527] border border-slate-800 rounded-lg p-5 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-slate-100 font-mono tracking-wide">
              NASA FIVE HAZARDS OF HUMAN SPACEFLIGHT
            </h2>
            <ScientificProvenanceBadge type="nasa_finding" size="sm" />
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Framework established by the NASA Human Research Program (HRP) classifying deep space operational stressors.
          </p>
        </div>

        <a
          href="https://www.nasa.gov/hrp/hazards/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-cyan-400 hover:text-cyan-300 hover:underline shrink-0"
        >
          NASA HRP Hazards Reference
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Hazard Selector Pills */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {NASA_FIVE_HAZARDS.map((h) => {
          const Icon = h.icon;
          const isSelected = activeHazardId === h.id;
          return (
            <button
              key={h.id}
              type="button"
              onClick={() => handleSelect(h.id)}
              className={`p-3 rounded-lg border text-left transition flex flex-col justify-between ${
                isSelected
                  ? 'bg-gradient-to-b ' + h.color + ' ring-1 ring-cyan-500 shadow-md'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-400'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-2">
                <Icon className={`w-4 h-4 ${isSelected ? 'text-slate-100' : 'text-slate-400'}`} />
                <span className="text-[10px] font-mono uppercase opacity-75">HRP-0{NASA_FIVE_HAZARDS.indexOf(h) + 1}</span>
              </div>
              <div className="font-mono text-xs font-semibold text-slate-200">{h.name}</div>
            </button>
          );
        })}
      </div>

      {/* Selected Hazard Deep Dive Details */}
      <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-4 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            {React.createElement(activeHazard.icon, { className: 'w-5 h-5 text-cyan-400' })}
            <h3 className="text-sm font-bold text-slate-100 font-mono">
              {activeHazard.name} — Risk Context & Operational Profile
            </h3>
          </div>
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${activeHazard.badgeColor}`}>
            Active Selection
          </span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          {activeHazard.nasaDescription}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono pt-2">
          <div className="bg-slate-900/80 border border-slate-800 rounded p-3">
            <span className="text-slate-400 text-[11px] block mb-1.5 uppercase tracking-wider">
              Correlated MEDULA Health Domains
            </span>
            <div className="flex flex-wrap gap-1.5">
              {activeHazard.relatedDomains.map((d) => (
                <span
                  key={d}
                  className="px-2 py-0.5 rounded bg-cyan-950/70 border border-cyan-800/60 text-cyan-300 text-[11px]"
                >
                  {d}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded p-3">
            <span className="text-slate-400 text-[11px] block mb-1.5 uppercase tracking-wider">
              Monitored Telemetry Indicators
            </span>
            <div className="flex flex-wrap gap-1.5">
              {activeHazard.trackedIndicators.map((ind) => (
                <span
                  key={ind}
                  className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 text-[11px]"
                >
                  {ind}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


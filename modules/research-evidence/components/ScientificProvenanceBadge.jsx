import React from 'react';
import { ShieldCheck, BookOpen, Database, Sparkles, Binary } from 'lucide-react';

/**
 * Standardized Scientific Provenance Badge
 * Clearly differentiates NASA Research Findings, Protocols, Public Datasets, Synthetic Data, and Interpretations.
 *
 * Types:
 * - 'nasa_finding': NASA peer-reviewed or HRP research finding
 * - 'nasa_protocol': NASA Standard Measures measurement protocol
 * - 'public_dataset': Public NASA Open Science Data Repository (OSDR) dataset
 * - 'synthetic_demo': Synthetic astronaut telemetry for testing/demo (Not NASA data)
 * - 'algorithm_interpretation': Software-generated non-diagnostic operational output
 */
export function ScientificProvenanceBadge({ type, size = 'sm', showLabel = true }) {
  const configs = {
    nasa_finding: {
      label: 'NASA Research Finding',
      subtext: 'NASA Human Research Program (HRP)',
      icon: BookOpen,
      containerClass: 'bg-blue-950/80 border-blue-600/60 text-blue-300',
      iconClass: 'text-blue-400',
    },
    nasa_protocol: {
      label: 'NASA Measurement Protocol',
      subtext: 'Spaceflight Standard Measures',
      icon: ShieldCheck,
      containerClass: 'bg-emerald-950/80 border-emerald-600/60 text-emerald-300',
      iconClass: 'text-emerald-400',
    },
    public_dataset: {
      label: 'Public NASA Dataset (Real)',
      subtext: 'NASA OSDR Open Science Telemetry',
      icon: Database,
      containerClass: 'bg-purple-950/80 border-purple-600/60 text-purple-300',
      iconClass: 'text-purple-400',
    },
    synthetic_demo: {
      label: 'Synthetic Demo Record',
      subtext: 'Simulated Astronaut Data — Not NASA Data',
      icon: Sparkles,
      containerClass: 'bg-amber-950/80 border-amber-600/60 text-amber-300',
      iconClass: 'text-amber-400',
    },
    algorithm_interpretation: {
      label: 'Software-Generated Interpretation',
      subtext: 'Non-Diagnostic Algorithmic Synthesis',
      icon: Binary,
      containerClass: 'bg-slate-900 border-slate-700 text-slate-300',
      iconClass: 'text-slate-400',
    },
  };

  const config = configs[type] || configs.algorithm_interpretation;
  const Icon = config.icon;
  const isSm = size === 'sm';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 font-mono ${
        isSm ? 'text-[10px]' : 'text-xs'
      } ${config.containerClass}`}
      title={config.subtext}
    >
      <Icon className={isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      {showLabel && <span>{config.label}</span>}
    </span>
  );
}


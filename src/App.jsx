import React, { useState } from 'react';
import { HealthAssessmentPage } from '../modules/data-acquisition/index.js';
import { PersonalBaselinePage } from '../modules/personal-baseline/index.js';
import { HealthPatternDetectionPage } from '../modules/health-pattern-detection/index.js';
import { MissionContextPage } from '../modules/mission-context/index.js';
import { MedicalDecisionSupportPage } from '../modules/medical-decision-support/index.js';
import {
  ConnectivityStatusBar,
  MissionOverviewPage,
  MissionDataManagementPage,
} from '../modules/mission-continuity/index.js';
import {
  Activity,
  Cpu,
  Scale,
  Database,
  Network,
  Compass,
  Stethoscope,
  LayoutDashboard,
  ServerCog,
} from 'lucide-react';

export default function App() {
  const [activeModule, setActiveModuleState] = useState('overview'); // Default to Unified Mission Overview
  const [refreshSignal, setRefreshSignal] = useState(0);

  const normalizeModule = (mod) => {
    switch (mod) {
      case 'mdae':
      case 'assessment':
        return 'assessment';
      case 'pbe':
      case 'baseline':
        return 'baseline';
      case 'mhpde':
      case 'patterns':
        return 'patterns';
      case 'mce':
      case 'context':
        return 'context';
      case 'mdse':
      case 'decision':
        return 'decision';
      case 'management':
        return 'management';
      default:
        return 'overview';
    }
  };

  const setActiveModule = (mod) => {
    setActiveModuleState(normalizeModule(mod));
  };

  const handleRecordAcquired = (result) => {
    setRefreshSignal((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-[#060B14] text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      {/* Persistent Connectivity & Sync Status Bar */}
      <ConnectivityStatusBar onSyncCompleted={() => setRefreshSignal((prev) => prev + 1)} />

      {/* Aerospace Header */}
      <header className="border-b border-slate-800 bg-[#0C1527]/80 backdrop-blur sticky top-0 z-50 px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-cyan-500/10 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(0,209,255,0.2)]">
              <Activity className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-wider text-slate-100 font-mono">
                  MEDULA
                </h1>
                <span className="text-[10px] font-mono uppercase bg-cyan-950 border border-cyan-800 text-cyan-300 px-2 py-0.5 rounded">
                  ASTRONAUT HEALTH INTELLIGENCE
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Autonomous Offline-First Medical Intelligence • Deep Space Mission Operations
              </p>
            </div>
          </div>

          {/* Main Navigation (7 Sections) */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={() => setActiveModule('overview')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono font-medium transition ${
                activeModule === 'overview'
                  ? 'bg-cyan-950 border border-cyan-500 text-cyan-300 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              1. Mission Overview
            </button>

            <button
              type="button"
              onClick={() => setActiveModule('assessment')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono font-medium transition ${
                activeModule === 'assessment'
                  ? 'bg-cyan-950 border border-cyan-500 text-cyan-300 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              2. Health Assessment
            </button>

            <button
              type="button"
              onClick={() => setActiveModule('baseline')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono font-medium transition ${
                activeModule === 'baseline'
                  ? 'bg-cyan-950 border border-cyan-500 text-cyan-300 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Scale className="w-3.5 h-3.5" />
              3. Personal Baseline
            </button>

            <button
              type="button"
              onClick={() => setActiveModule('patterns')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono font-medium transition ${
                activeModule === 'patterns'
                  ? 'bg-cyan-950 border border-cyan-500 text-cyan-300 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              4. Health Pattern Analysis
            </button>

            <button
              type="button"
              onClick={() => setActiveModule('context')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono font-medium transition ${
                activeModule === 'context'
                  ? 'bg-cyan-950 border border-cyan-500 text-cyan-300 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              5. Mission Context
            </button>

            <button
              type="button"
              onClick={() => setActiveModule('decision')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono font-medium transition ${
                activeModule === 'decision'
                  ? 'bg-cyan-950 border border-cyan-500 text-cyan-300 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Stethoscope className="w-3.5 h-3.5" />
              6. Medical Decision Support
            </button>

            <button
              type="button"
              onClick={() => setActiveModule('management')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono font-medium transition ${
                activeModule === 'management'
                  ? 'bg-cyan-950 border border-cyan-500 text-cyan-300 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ServerCog className="w-3.5 h-3.5" />
              7. Mission Data Management
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-8">
        {/* Module Sub-Header & Spec Overview */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-950 border border-slate-800 p-4 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <Cpu className="w-6 h-6 text-cyan-400 shrink-0" />
            <div>
              <div className="font-semibold text-slate-200">
                {activeModule === 'overview' && 'Mission Overview: Unified Health Intelligence Cockpit'}
                {activeModule === 'assessment' && 'Section 02: Astronaut Health Assessment & Data Acquisition (MDAE)'}
                {activeModule === 'baseline' && 'Section 03: Personal Baseline and Comparison Engine (PBE)'}
                {activeModule === 'patterns' && 'Section 04: Multi-Indicator Health Pattern Detection Engine (MHPDE)'}
                {activeModule === 'context' && 'Section 05: Mission Context Engine (MCE)'}
                {activeModule === 'decision' && 'Section 06: Medical Decision Support Engine (MDSE)'}
                {activeModule === 'management' && 'Section 07: Mission Continuity, Storage & Synchronization Engine (MCSI)'}
              </div>
              <div className="text-slate-400 text-[11px] mt-0.5">
                {activeModule === 'overview' && 'Integrated operational view combining active baselines, multi-indicator patterns, clinical guidance, and storage metrics.'}
                {activeModule === 'assessment' && 'Multi-source aerospace telemetry ingestion: physiological vitals, subjective clinical ratings, operational events, and radiation dosimeter readings.'}
                {activeModule === 'baseline' && 'Individual astronaut statistical baselines, interquartile pattern evaluation, and chronological trend trajectories.'}
                {activeModule === 'patterns' && 'Evaluates multi-indicator combinations against personal baselines and mission events across 5 independent domains.'}
                {activeModule === 'context' && 'Correlates mission activities, exercise protocols, sleep cycles, and cabin environmental conditions without asserting causation.'}
                {activeModule === 'decision' && 'Autonomous clinical protocol decision support derived from NASA spaceflight clinical practice guidelines.'}
                {activeModule === 'management' && 'Offline-first IndexedDB audit, pending sync queue management, validation rejection logs, and storage telemetry.'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
            <span className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-slate-300">
              Offline-First IndexedDB v6
            </span>
            <span className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-cyan-300">
              {activeModule === 'overview' && 'Integrated Operations'}
              {activeModule === 'assessment' && 'UUID Idempotency'}
              {activeModule === 'baseline' && 'Robust Median / MAD'}
              {activeModule === 'patterns' && 'Software States'}
              {activeModule === 'context' && 'Contextual Non-Causality'}
              {activeModule === 'decision' && 'Clinical Protocol Rules'}
              {activeModule === 'management' && 'Atomic Sync Queue'}
            </span>
          </div>
        </div>

        {/* Render Selected Module Content */}
        {activeModule === 'overview' && (
          <section>
            <MissionOverviewPage onNavigateTab={(tab) => setActiveModule(tab)} />
          </section>
        )}

        {activeModule === 'assessment' && (
          <section>
            <HealthAssessmentPage onRecordAcquired={handleRecordAcquired} />
          </section>
        )}

        {activeModule === 'baseline' && (
          <section>
            <PersonalBaselinePage />
          </section>
        )}

        {activeModule === 'patterns' && (
          <section>
            <HealthPatternDetectionPage />
          </section>
        )}

        {activeModule === 'context' && (
          <section>
            <MissionContextPage />
          </section>
        )}

        {activeModule === 'decision' && (
          <section>
            <MedicalDecisionSupportPage />
          </section>
        )}

        {activeModule === 'management' && (
          <section>
            <MissionDataManagementPage />
          </section>
        )}
      </main>

      {/* Aerospace Footer */}
      <footer className="border-t border-slate-800/80 bg-[#060B14] py-4 px-6 text-center text-xs text-slate-500 font-mono">
        MEDULA Autonomous Astronaut Health Intelligence System • Modules 01–06 Fully Integrated • Offline-First Spacecraft Operation
      </footer>
    </div>
  );
}

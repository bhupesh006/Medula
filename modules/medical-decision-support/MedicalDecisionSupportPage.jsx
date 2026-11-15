import React, { useState, useEffect } from 'react';
import { generateMedicalGuidance, getGuidanceHistory } from './services/decisionSupportService.js';
import { MedicalGuidanceCard } from './components/MedicalGuidanceCard.jsx';
import { Stethoscope, User, RefreshCw, ShieldCheck, AlertTriangle } from 'lucide-react';

export function MedicalDecisionSupportPage() {
  const [astronautId, setAstronautId] = useState('ASTRO-01');
  const [guidanceList, setGuidanceList] = useState([]);
  const [historyList, setHistoryList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('active');

  const loadData = async () => {
    setLoading(true);
    try {
      const active = await generateMedicalGuidance(astronautId);
      setGuidanceList(active);

      const history = await getGuidanceHistory(astronautId);
      setHistoryList(history);
    } catch (err) {
      console.error('Failed to load decision support guidance:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [astronautId]);

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="bg-[#0C1527] border border-cyan-500/30 rounded-xl p-5 space-y-3 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0">
              <Stethoscope className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold font-mono text-slate-100 tracking-wide">
                  MODULE 05: MEDICAL DECISION SUPPORT ENGINE (MDSE)
                </h1>
                <span className="text-[10px] font-mono uppercase bg-cyan-950 border border-cyan-800 text-cyan-300 px-2 py-0.5 rounded">
                  Autonomous Clinical Guidance
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Evidence-based spaceflight protocol recommendations synthesizing health patterns, baselines, and mission context.
              </p>
            </div>
          </div>

          {/* Astronaut Selector */}
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="text-slate-400 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-cyan-400" />
              Astronaut:
            </span>
            <select
              value={astronautId}
              onChange={(e) => setAstronautId(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-cyan-300 rounded px-2.5 py-1 focus:outline-none focus:border-cyan-500"
            >
              <option value="ASTRO-01">ASTRO-01 (Commander Alex Rivera)</option>
              <option value="ASTRO-02">ASTRO-02 (Dr. Sarah Chen)</option>
              <option value="ASTRO-03">ASTRO-03 (Liam Vance)</option>
            </select>

            <button
              type="button"
              disabled={loading}
              onClick={loadData}
              className="p-1.5 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-cyan-400 transition"
              title="Refresh guidance"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Clinical Disclaimer */}
        <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-3 text-[11px] font-mono text-slate-400 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="text-slate-200 font-semibold">Clinical Decision Support Rule: </span>
            Recommendations provided herein are operational guidelines derived from established NASA spaceflight protocols. They serve as cognitive decision aids for the Crew Medical Officer and do not replace primary medical judgment or established mission safety abort criteria.
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 text-xs font-mono">
        <button
          type="button"
          onClick={() => setActiveTab('active')}
          className={`px-3 py-1.5 rounded-lg transition ${
            activeTab === 'active'
              ? 'bg-cyan-950 border border-cyan-500 text-cyan-300'
              : 'text-slate-400 hover:text-slate-200 bg-slate-900/60 border border-slate-800'
          }`}
        >
          Active Recommendations ({guidanceList.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`px-3 py-1.5 rounded-lg transition ${
            activeTab === 'history'
              ? 'bg-cyan-950 border border-cyan-500 text-cyan-300'
              : 'text-slate-400 hover:text-slate-200 bg-slate-900/60 border border-slate-800'
          }`}
        >
          Guidance Audit History ({historyList.length})
        </button>
      </div>

      {/* Active Guidance Cards */}
      {activeTab === 'active' && (
        <div className="space-y-4">
          {guidanceList.map((g) => (
            <MedicalGuidanceCard
              key={g.guidanceId}
              guidance={g}
              onStatusChanged={loadData}
            />
          ))}

          {guidanceList.length === 0 && !loading && (
            <div className="p-8 text-center bg-slate-950/60 rounded-lg border border-slate-800/60 font-mono text-xs text-slate-500">
              No active medical guidance items for {astronautId}. Health observations are nominal.
            </div>
          )}
        </div>
      )}

      {/* History View */}
      {activeTab === 'history' && (
        <div className="space-y-3 font-mono text-xs">
          {historyList.map((h) => (
            <div
              key={h.guidanceId}
              className="bg-slate-950/70 border border-slate-800/70 rounded p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-slate-200">{h.title}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-400">
                    {h.status}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500">
                  Domain: {h.domain} • Priority: {h.priority} • Generated: {new Date(h.generatedAt).toLocaleString()}
                </div>
              </div>

              {h.reviewedAt && (
                <div className="text-[10px] text-emerald-400">
                  Reviewed: {new Date(h.reviewedAt).toLocaleDateString()}
                </div>
              )}
            </div>
          ))}

          {historyList.length === 0 && (
            <div className="p-8 text-center text-slate-500 text-xs">
              No historical guidance records on file.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

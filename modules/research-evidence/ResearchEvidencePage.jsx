import React, { useState } from 'react';
import { FiveHazardsOverview } from './components/FiveHazardsOverview.jsx';
import { HealthIndicatorMapping } from './components/HealthIndicatorMapping.jsx';
import { ResearchEvidenceBrowser } from './components/ResearchEvidenceBrowser.jsx';
import { DatasetCatalogueView } from './components/DatasetCatalogueView.jsx';
import { DatasetImportPanel } from './components/DatasetImportPanel.jsx';
import { StandardMeasuresView } from './components/StandardMeasuresView.jsx';
import { ScientificProvenanceBadge } from './components/ScientificProvenanceBadge.jsx';
import {
  BookOpen,
  ShieldCheck,
  Database,
  Compass,
  DownloadCloud,
  AlertTriangle,
  ExternalLink,
  Layers,
} from 'lucide-react';

export function ResearchEvidencePage() {
  const [activeTab, setActiveTab] = useState('standards');
  const [selectedHazardId, setSelectedHazardId] = useState(null);

  const handleSelectHazardFromOverview = (hazardId) => {
    setSelectedHazardId(hazardId);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Scientific Foundation & Provenance */}
      <div className="bg-[#0C1527] border border-cyan-500/30 rounded-xl p-5 space-y-3 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0">
              <BookOpen className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold font-mono text-slate-100 tracking-wide">
                  NASA RESEARCH &amp; EVIDENCE LAYER
                </h1>
                <span className="text-[10px] font-mono uppercase bg-cyan-950 border border-cyan-800 text-cyan-300 px-2 py-0.5 rounded">
                  HRP &amp; OSDR INTEGRATION
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Scientific Grounding • Five Spaceflight Hazards • Standard Measures Protocols • Open Science Data Repository
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
            <ScientificProvenanceBadge type="nasa_finding" size="sm" />
            <ScientificProvenanceBadge type="nasa_protocol" size="sm" />
            <ScientificProvenanceBadge type="public_dataset" size="sm" />
          </div>
        </div>

        {/* Scientific Disclaimer & Non-Affiliation Notice */}
        <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-3 text-[11px] font-mono text-slate-400 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="text-slate-200 font-semibold">Scientific Integrity Notice: </span>
            This module integrates publicly accessible NASA Human Research Program (HRP) research, published Spaceflight Standard Measures protocols (
            <a
              href="https://www.nasa.gov/reference/standard-measures/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 underline hover:text-cyan-300"
            >
              nasa.gov/reference/standard-measures/
            </a>
            ), and verified NASA Open Science Data Repository (OSDR) telemetry. This software is an independent research prototype and does not claim NASA endorsement or affiliation. Synthetic demonstration data is strictly demarcated from verified NASA open datasets.
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('standards')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition ${
            activeTab === 'standards'
              ? 'bg-cyan-950 border border-cyan-500 text-cyan-300 shadow'
              : 'text-slate-400 hover:text-slate-200 bg-slate-900/60 border border-slate-800'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          NASA Standard Measures
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('hazards')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition ${
            activeTab === 'hazards'
              ? 'bg-cyan-950 border border-cyan-500 text-cyan-300 shadow'
              : 'text-slate-400 hover:text-slate-200 bg-slate-900/60 border border-slate-800'
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          Five Spaceflight Hazards
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('evidence')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition ${
            activeTab === 'evidence'
              ? 'bg-cyan-950 border border-cyan-500 text-cyan-300 shadow'
              : 'text-slate-400 hover:text-slate-200 bg-slate-900/60 border border-slate-800'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          Research Evidence Registry
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('mapping')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition ${
            activeTab === 'mapping'
              ? 'bg-cyan-950 border border-cyan-500 text-cyan-300 shadow'
              : 'text-slate-400 hover:text-slate-200 bg-slate-900/60 border border-slate-800'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          Indicator &amp; Protocol Mapping
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('catalogue')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition ${
            activeTab === 'catalogue'
              ? 'bg-cyan-950 border border-cyan-500 text-cyan-300 shadow'
              : 'text-slate-400 hover:text-slate-200 bg-slate-900/60 border border-slate-800'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          OSDR Dataset Catalogue
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('importer')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition ${
            activeTab === 'importer'
              ? 'bg-cyan-950 border border-cyan-500 text-cyan-300 shadow'
              : 'text-slate-400 hover:text-slate-200 bg-slate-900/60 border border-slate-800'
          }`}
        >
          <DownloadCloud className="w-3.5 h-3.5" />
          Dataset Import Pipeline
        </button>
      </div>

      {/* Main Tab Content */}
      <div className="space-y-6">
        {activeTab === 'standards' && <StandardMeasuresView />}

        {activeTab === 'hazards' && (
          <FiveHazardsOverview
            selectedHazardId={selectedHazardId}
            onSelectHazard={handleSelectHazardFromOverview}
          />
        )}

        {activeTab === 'evidence' && (
          <ResearchEvidenceBrowser initialHazardFilter={selectedHazardId} />
        )}

        {activeTab === 'mapping' && <HealthIndicatorMapping />}

        {activeTab === 'catalogue' && <DatasetCatalogueView />}

        {activeTab === 'importer' && <DatasetImportPanel />}
      </div>
    </div>
  );
}

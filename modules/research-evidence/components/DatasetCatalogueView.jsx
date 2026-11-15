import React, { useState, useMemo } from 'react';
import { getDatasetCatalogue, getDatasetCatalogueSummary } from '../services/osdrDatasetService.js';
import { ScientificProvenanceBadge } from './ScientificProvenanceBadge.jsx';
import { Database, Lock, CheckCircle, ExternalLink, AlertTriangle, Layers, FileText } from 'lucide-react';

export function DatasetCatalogueView({ onSelectDataset }) {
  const [statusFilter, setStatusFilter] = useState('all');
  const summary = useMemo(() => getDatasetCatalogueSummary(), []);
  const allDatasets = useMemo(() => getDatasetCatalogue(), []);

  const filteredDatasets = useMemo(() => {
    if (statusFilter === 'all') return allDatasets;
    return allDatasets.filter((d) => d.integrationStatus === statusFilter);
  }, [allDatasets, statusFilter]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'VERIFIED_AND_INTEGRATED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950 border border-emerald-600/70 text-emerald-300 text-[10px] font-mono">
            <CheckCircle className="w-3 h-3 text-emerald-400" />
            Verified &amp; Integrated
          </span>
        );
      case 'CATALOGUED_REFERENCE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-950 border border-blue-600/70 text-blue-300 text-[10px] font-mono">
            <Layers className="w-3 h-3 text-blue-400" />
            Catalogued OSDR Reference
          </span>
        );
      case 'PROTOCOL_REFERENCED_ONLY':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-950 border border-amber-600/70 text-amber-300 text-[10px] font-mono">
            <Lock className="w-3 h-3 text-amber-400" />
            Restricted / IRB Protected
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-[#0C1527] border border-slate-800 rounded-lg p-5 space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-slate-100 font-mono tracking-wide">
              NASA OPEN SCIENCE DATA REPOSITORY (OSDR) CATALOGUE
            </h2>
            <ScientificProvenanceBadge type="public_dataset" size="sm" />
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Systematic exploration of public spaceflight datasets from NASA OSDR, RadLab, and Ames Life Sciences Data Archive (ALSDA).
          </p>
        </div>

        <a
          href="https://osdr.nasa.gov/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-cyan-400 hover:text-cyan-300 hover:underline shrink-0"
        >
          NASA OSDR Main Portal
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
        <div className="bg-slate-900/80 border border-slate-800 rounded p-3">
          <span className="text-slate-400 text-[10px] uppercase block">Total Investigated</span>
          <span className="text-base font-bold text-slate-100">{summary.total} Datasets</span>
        </div>
        <div className="bg-emerald-950/30 border border-emerald-900/60 rounded p-3">
          <span className="text-emerald-400 text-[10px] uppercase block">Imported &amp; Verified</span>
          <span className="text-base font-bold text-emerald-300">{summary.verifiedAndIntegrated} Datasets</span>
        </div>
        <div className="bg-blue-950/30 border border-blue-900/60 rounded p-3">
          <span className="text-blue-400 text-[10px] uppercase block">OSDR Catalogued</span>
          <span className="text-base font-bold text-blue-300">{summary.cataloguedReference} Datasets</span>
        </div>
        <div className="bg-amber-950/30 border border-amber-900/60 rounded p-3">
          <span className="text-amber-400 text-[10px] uppercase block">NASA IRB Restricted</span>
          <span className="text-base font-bold text-amber-300">{summary.protocolReferencedOnly} Datasets</span>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 text-xs font-mono border-b border-slate-800/80 pb-3">
        <span className="text-slate-400">Filter by Status:</span>
        <button
          type="button"
          onClick={() => setStatusFilter('all')}
          className={`px-2.5 py-1 rounded transition ${
            statusFilter === 'all'
              ? 'bg-cyan-950 border border-cyan-600 text-cyan-300'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          All ({allDatasets.length})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('VERIFIED_AND_INTEGRATED')}
          className={`px-2.5 py-1 rounded transition ${
            statusFilter === 'VERIFIED_AND_INTEGRATED'
              ? 'bg-emerald-950 border border-emerald-600 text-emerald-300'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Integrated ({summary.verifiedAndIntegrated})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('CATALOGUED_REFERENCE')}
          className={`px-2.5 py-1 rounded transition ${
            statusFilter === 'CATALOGUED_REFERENCE'
              ? 'bg-blue-950 border border-blue-600 text-blue-300'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          OSDR Reference ({summary.cataloguedReference})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('PROTOCOL_REFERENCED_ONLY')}
          className={`px-2.5 py-1 rounded transition ${
            statusFilter === 'PROTOCOL_REFERENCED_ONLY'
              ? 'bg-amber-950 border border-amber-600 text-amber-300'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          IRB Restricted ({summary.protocolReferencedOnly})
        </button>
      </div>

      {/* Dataset List */}
      <div className="space-y-4">
        {filteredDatasets.map((ds) => (
          <div
            key={ds.datasetAccession}
            className="bg-slate-950/80 border border-slate-800 rounded-lg p-4 space-y-3"
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono font-bold text-cyan-300">
                    {ds.datasetAccession}
                  </span>
                  {getStatusBadge(ds.integrationStatus)}
                </div>
                <h3 className="text-sm font-semibold text-slate-100 font-mono">
                  {ds.datasetName}
                </h3>
                <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                  Source: {ds.sourceSystem}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={ds.sourceURL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-cyan-300 hover:border-cyan-500 text-xs font-mono transition"
                >
                  Source Endpoint
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              {ds.researchObjective}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono pt-1">
              <div className="bg-slate-900/80 border border-slate-800 rounded p-2.5">
                <span className="text-slate-500 text-[10px] uppercase block mb-1">Study Subjects / Platform</span>
                <span className="text-slate-200 text-[11px]">{ds.studySubjects}</span>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded p-2.5">
                <span className="text-slate-500 text-[10px] uppercase block mb-1">Time Coverage</span>
                <span className="text-slate-200 text-[11px]">{ds.timeCoverage}</span>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded p-2.5">
                <span className="text-slate-500 text-[10px] uppercase block mb-1">Access Governance</span>
                <span className={`text-[11px] ${ds.accessRestrictions.includes('RESTRICTED') ? 'text-amber-300' : 'text-slate-200'}`}>
                  {ds.accessRestrictions}
                </span>
              </div>
            </div>

            {/* Relevance & Provenance Note */}
            <div className="bg-slate-900/40 border border-slate-800/80 rounded p-3 text-[11px] font-mono space-y-1">
              <div>
                <span className="text-cyan-400 font-semibold">Relevance to MEDULA: </span>
                <span className="text-slate-300">{ds.relevanceToMedula}</span>
              </div>
              <div className="text-slate-500 text-[10px] pt-0.5">
                Provenance: {ds.provenance}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Scientific Governance Disclaimer */}
      <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 text-xs font-mono text-slate-400 flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1 text-[11px] leading-relaxed">
          <div className="font-semibold text-slate-200">
            NASA Scientific Governance &amp; Data Ethics Note
          </div>
          <div>
            Continuous raw astronaut wearable telemetry is restricted under the NASA Institutional Review Board (IRB) and the Privacy Act of 1974 to protect astronaut identity. MEDULA strictly honors these protections: we catalog published cohort reference norms and import verified open telemetry (RadLab radiation physics and ISS ECLSS cabin environmental telemetry) without fabricating restricted medical files.
          </div>
        </div>
      </div>
    </div>
  );
}


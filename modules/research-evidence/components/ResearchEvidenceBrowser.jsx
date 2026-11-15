import React, { useState, useMemo } from 'react';
import { getEvidenceRegistry } from '../services/evidenceRegistryService.js';
import { ScientificProvenanceBadge } from './ScientificProvenanceBadge.jsx';
import { Search, ExternalLink, ShieldCheck, Filter, Info, X, BookOpen, AlertCircle } from 'lucide-react';

export function ResearchEvidenceBrowser({ onSelectEvidence, initialHazardFilter }) {
  const [hazardFilter, setHazardFilter] = useState(initialHazardFilter || 'all');
  const [domainFilter, setDomainFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntry, setSelectedEntry] = useState(null);

  const allEntries = useMemo(() => getEvidenceRegistry(), []);

  const filteredEntries = useMemo(() => {
    return allEntries.filter((entry) => {
      if (hazardFilter !== 'all') {
        if (!entry.relatedHazard || !entry.relatedHazard.toLowerCase().includes(hazardFilter.toLowerCase())) {
          return false;
        }
      }

      if (domainFilter !== 'all') {
        if (!entry.relatedHealthDomain || entry.relatedHealthDomain.toLowerCase() !== domainFilter.toLowerCase()) {
          return false;
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = entry.sourceTitle.toLowerCase().includes(q);
        const matchesSummary = entry.researchSummary.toLowerCase().includes(q);
        const matchesId = entry.evidenceId.toLowerCase().includes(q);
        const matchesOrg = entry.sourceOrganization.toLowerCase().includes(q);
        if (!matchesTitle && !matchesSummary && !matchesId && !matchesOrg) return false;
      }

      return true;
    });
  }, [allEntries, hazardFilter, domainFilter, searchQuery]);

  const mapEvidenceTypeToProvenance = (type) => {
    switch (type) {
      case 'standard_measure_protocol':
        return 'nasa_protocol';
      case 'public_dataset':
        return 'public_dataset';
      case 'hazard_taxonomy':
      case 'risk_framework':
      case 'research_finding':
      default:
        return 'nasa_finding';
    }
  };

  return (
    <div className="bg-[#0C1527] border border-slate-800 rounded-lg p-5 space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-slate-100 font-mono tracking-wide">
              NASA RESEARCH &amp; EVIDENCE REGISTRY
            </h2>
            <span className="text-[10px] font-mono bg-cyan-950 border border-cyan-800 text-cyan-300 px-2 py-0.5 rounded">
              {filteredEntries.length} Records
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Curated repository of NASA Human Research Program (HRP) publications, standard measures protocols, and space biological findings.
          </p>
        </div>

        {/* Search bar */}
        <div className="relative w-full md:w-64">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search research evidence..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
          />
        </div>
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
        <div className="flex items-center gap-1.5 text-slate-400">
          <Filter className="w-3.5 h-3.5 text-cyan-400" />
          <span>Filters:</span>
        </div>

        {/* Hazard filter */}
        <select
          value={hazardFilter}
          onChange={(e) => setHazardFilter(e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-slate-300 focus:outline-none focus:border-cyan-500"
        >
          <option value="all">All NASA Hazards</option>
          <option value="radiation">Space Radiation</option>
          <option value="isolation">Isolation and Confinement</option>
          <option value="distance">Distance from Earth</option>
          <option value="gravity">Gravity Fields</option>
          <option value="environment">Hostile/Closed Environments</option>
        </select>

        {/* Domain filter */}
        <select
          value={domainFilter}
          onChange={(e) => setDomainFilter(e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-slate-300 focus:outline-none focus:border-cyan-500"
        >
          <option value="all">All Health Domains</option>
          <option value="cardiovascular">Cardiovascular</option>
          <option value="sleep_recovery">Sleep &amp; Recovery</option>
          <option value="psychological">Psychological</option>
          <option value="physical_performance">Physical Performance</option>
          <option value="radiation">Space Radiation</option>
          <option value="environmental">Cabin Environment</option>
        </select>

        {(hazardFilter !== 'all' || domainFilter !== 'all' || searchQuery) && (
          <button
            type="button"
            onClick={() => {
              setHazardFilter('all');
              setDomainFilter('all');
              setSearchQuery('');
            }}
            className="text-[11px] text-cyan-400 hover:text-cyan-300 underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Evidence Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {filteredEntries.map((entry) => (
          <div
            key={entry.evidenceId}
            className="bg-slate-950/80 border border-slate-800/80 hover:border-slate-700 rounded-lg p-4 space-y-3 flex flex-col justify-between transition group"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-mono text-slate-500 uppercase">
                  {entry.evidenceId}
                </span>
                <ScientificProvenanceBadge
                  type={mapEvidenceTypeToProvenance(entry.evidenceType)}
                  size="sm"
                />
              </div>

              <h3 className="text-xs font-semibold text-slate-100 font-mono group-hover:text-cyan-300 transition leading-snug">
                {entry.sourceTitle}
              </h3>

              <div className="text-[11px] text-cyan-400/90 font-mono">
                {entry.sourceOrganization}
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-3">
                {entry.researchSummary}
              </p>
            </div>

            <div className="pt-2 border-t border-slate-900 flex items-center justify-between text-[11px] font-mono">
              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                {entry.relatedHazard}
              </span>

              <button
                type="button"
                onClick={() => setSelectedEntry(entry)}
                className="text-cyan-400 hover:text-cyan-300 font-medium inline-flex items-center gap-1 transition"
              >
                Inspect Source &amp; Evidence
                <Info className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredEntries.length === 0 && (
        <div className="p-8 text-center bg-slate-950/60 rounded-lg border border-slate-800/60 font-mono text-xs text-slate-500">
          No NASA research evidence records matching the selected criteria.
        </div>
      )}

      {/* Inspector Modal for Supporting Source & Evidence */}
      {selectedEntry && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0C1527] border border-cyan-500/40 rounded-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-mono text-cyan-400 font-semibold">
                    {selectedEntry.evidenceId}
                  </span>
                  <ScientificProvenanceBadge
                    type={mapEvidenceTypeToProvenance(selectedEntry.evidenceType)}
                    size="sm"
                  />
                </div>
                <h3 className="text-base font-bold text-slate-100 font-mono">
                  {selectedEntry.sourceTitle}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedEntry.sourceOrganization}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedEntry(null)}
                className="text-slate-400 hover:text-slate-100 p-1 rounded hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-4 text-xs font-mono">
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-2">
                <span className="text-cyan-400 text-[11px] font-semibold uppercase tracking-wider block">
                  Official Research Summary
                </span>
                <p className="text-slate-200 leading-relaxed font-sans text-xs">
                  {selectedEntry.researchSummary}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-900/80 border border-slate-800 rounded p-3">
                  <span className="text-slate-400 text-[10px] uppercase block mb-1">
                    Associated NASA Hazard
                  </span>
                  <span className="text-slate-200 font-semibold">{selectedEntry.relatedHazard}</span>
                </div>

                <div className="bg-slate-900/80 border border-slate-800 rounded p-3">
                  <span className="text-slate-400 text-[10px] uppercase block mb-1">
                    Related Health Domain
                  </span>
                  <span className="text-slate-200 font-semibold capitalize">{selectedEntry.relatedHealthDomain}</span>
                </div>
              </div>

              {selectedEntry.relatedIndicators && selectedEntry.relatedIndicators.length > 0 && (
                <div className="bg-slate-900/80 border border-slate-800 rounded p-3">
                  <span className="text-slate-400 text-[10px] uppercase block mb-1.5">
                    Tracked Indicators
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedEntry.relatedIndicators.map((ind) => (
                      <span
                        key={ind}
                        className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[11px]"
                      >
                        {ind}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Research Limitations Alert */}
              <div className="bg-amber-950/40 border border-amber-600/40 rounded-lg p-4 space-y-1.5">
                <div className="flex items-center gap-2 text-amber-300 font-semibold text-xs">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Scientific &amp; Observational Limitations</span>
                </div>
                <p className="text-amber-200/90 text-[11px] leading-relaxed">
                  {selectedEntry.limitations}
                </p>
              </div>

              {/* Source Attribution & Link */}
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-2">
                <span className="text-slate-400 text-[10px] uppercase block">
                  Official Attribution &amp; Citation
                </span>
                <p className="text-slate-300 text-[11px] italic">
                  {selectedEntry.attribution}
                </p>
                {selectedEntry.publicationDate && (
                  <div className="text-[10px] text-slate-500 pt-1">
                    Publication Date: {selectedEntry.publicationDate} • Verified Access: {selectedEntry.accessDate}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <a
                href={selectedEntry.sourceURL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-mono bg-cyan-950 border border-cyan-700 text-cyan-300 hover:bg-cyan-900 px-3 py-1.5 rounded transition"
              >
                Open Official NASA Resource
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                type="button"
                onClick={() => setSelectedEntry(null)}
                className="px-4 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


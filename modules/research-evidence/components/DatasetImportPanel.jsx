import React, { useState, useEffect } from 'react';
import {
  importVerifiedNasaDataset,
  getImportStatus,
  getImportedDatasetRecords,
  purgeImportedDataset,
} from '../services/datasetImportPipeline.js';
import { ScientificProvenanceBadge } from './ScientificProvenanceBadge.jsx';
import { DownloadCloud, CheckCircle2, Trash2, Eye, ShieldCheck, Database, ArrowRight } from 'lucide-react';

export function DatasetImportPanel() {
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [inspectingAccession, setInspectingAccession] = useState(null);
  const [inspectedRecords, setInspectedRecords] = useState([]);
  const [notification, setNotification] = useState(null);

  const refreshStatuses = async () => {
    try {
      const s = await getImportStatus();
      setStatuses(s);
    } catch (err) {
      console.error('Failed to load import statuses:', err);
    }
  };

  useEffect(() => {
    refreshStatuses();
  }, []);

  const handleImport = async (accession) => {
    setLoading(true);
    setNotification(null);
    try {
      const res = await importVerifiedNasaDataset(accession);
      setNotification({
        type: 'success',
        message: `Successfully imported ${res.recordsCount} verified records from ${res.datasetTitle}`,
      });
      await refreshStatuses();
      if (inspectingAccession === accession) {
        handleInspect(accession);
      }
    } catch (err) {
      setNotification({
        type: 'error',
        message: `Import failed: ${err.message}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePurge = async (accession) => {
    setLoading(true);
    setNotification(null);
    try {
      await purgeImportedDataset(accession);
      setNotification({
        type: 'info',
        message: `Purged imported records for ${accession}`,
      });
      await refreshStatuses();
      if (inspectingAccession === accession) {
        setInspectedRecords([]);
      }
    } catch (err) {
      setNotification({
        type: 'error',
        message: `Purge failed: ${err.message}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInspect = async (accession) => {
    setInspectingAccession(accession);
    try {
      const records = await getImportedDatasetRecords(accession);
      setInspectedRecords(records);
    } catch (err) {
      console.error('Failed to retrieve inspected records:', err);
    }
  };

  return (
    <div className="bg-[#0C1527] border border-slate-800 rounded-lg p-5 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-slate-100 font-mono tracking-wide">
              AUTHENTIC NASA DATASET IMPORT PIPELINE
            </h2>
            <ScientificProvenanceBadge type="public_dataset" size="sm" />
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Ingests verified public NASA OSDR telemetry into MEDULA's local storage with strict provenance tracking and zero synthetic alteration.
          </p>
        </div>
      </div>

      {notification && (
        <div
          className={`p-3 rounded text-xs font-mono border ${
            notification.type === 'success'
              ? 'bg-emerald-950/70 border-emerald-600/70 text-emerald-300'
              : notification.type === 'error'
              ? 'bg-rose-950/70 border-rose-600/70 text-rose-300'
              : 'bg-slate-900 border-slate-700 text-slate-300'
          }`}
        >
          {notification.message}
        </div>
      )}

      {/* Dataset Pipelines List */}
      <div className="space-y-3.5">
        {statuses.map((item) => (
          <div
            key={item.datasetAccession}
            className="bg-slate-950/80 border border-slate-800 rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-cyan-300">
                  {item.datasetAccession}
                </span>
                <ScientificProvenanceBadge type="public_dataset" size="sm" showLabel={false} />
                {item.imported ? (
                  <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-700 text-emerald-300 text-[10px] font-mono flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    {item.recordCount} Records Ingested
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-400 text-[10px] font-mono">
                    Ready for Ingestion
                  </span>
                )}
              </div>

              <h3 className="text-xs font-semibold text-slate-200 font-mono">
                {item.datasetTitle}
              </h3>

              <div className="text-[11px] text-slate-400 font-mono">
                Source System: {item.sourceSystem} • Provenance: {item.provenance}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 font-mono text-xs">
              {!item.imported ? (
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleImport(item.datasetAccession)}
                  className="px-3.5 py-1.5 rounded bg-cyan-950 border border-cyan-600 text-cyan-300 hover:bg-cyan-900 font-medium transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <DownloadCloud className="w-3.5 h-3.5" />
                  Import Dataset
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => handleInspect(item.datasetAccession)}
                    className="px-3 py-1.5 rounded bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-300 transition flex items-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5 text-cyan-400" />
                    Inspect ({item.recordCount})
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handlePurge(item.datasetAccession)}
                    className="p-1.5 rounded bg-slate-900 border border-slate-800 hover:border-rose-700 text-slate-400 hover:text-rose-400 transition"
                    title="Purge imported records"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Record Inspector Drawer */}
      {inspectingAccession && (
        <div className="bg-slate-950 border border-cyan-500/30 rounded-lg p-4 space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-cyan-400" />
              <span className="font-semibold text-slate-200">
                IndexedDB Inspection — {inspectingAccession}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setInspectingAccession(null)}
              className="text-slate-400 hover:text-slate-200 text-xs"
            >
              Close
            </button>
          </div>

          {inspectedRecords.length > 0 ? (
            <div className="overflow-x-auto max-h-64 overflow-y-auto">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-900 text-slate-400 sticky top-0">
                  <tr>
                    <th className="p-2">Record ID</th>
                    <th className="p-2">Timestamp (UTC)</th>
                    <th className="p-2">Mapped Metric</th>
                    <th className="p-2">Value</th>
                    <th className="p-2">Unit</th>
                    <th className="p-2">Hardware / Module</th>
                    <th className="p-2 text-right">Synthetic?</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {inspectedRecords.map((r) => (
                    <tr key={r.recordId} className="hover:bg-slate-900/40">
                      <td className="p-2 text-slate-300 font-mono">{r.recordId}</td>
                      <td className="p-2 text-slate-400">{r.recordedAt}</td>
                      <td className="p-2 text-cyan-300">{r.metric}</td>
                      <td className="p-2 text-slate-200 font-bold">{r.value}</td>
                      <td className="p-2 text-slate-400">{r.unit}</td>
                      <td className="p-2 text-slate-300">
                        {r.module || r.instrumentId || 'ISS USOS'}
                        {r.orbitalRegion && (
                          <span className="text-[10px] text-slate-500 block truncate max-w-xs">
                            {r.orbitalRegion}
                          </span>
                        )}
                      </td>
                      <td className="p-2 text-right">
                        <span className="px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-300 text-[10px]">
                          false (Real NASA Data)
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-4 text-center text-slate-500 text-xs">
              No imported records currently stored for this dataset. Click "Import Dataset" above.
            </div>
          )}
        </div>
      )}
    </div>
  );
}


import React, { useState, useEffect } from 'react';
import {
  queryStoredRecords,
  getStorageOverview,
  getRejectedRecordsAudit,
  getPendingSyncQueue,
} from '../services/dataManagementService.js';
import { continuitySyncEngine } from '../services/continuitySyncEngine.js';
import { resetDemoScenario } from '../services/demoScenarioService.js';
import { ScientificProvenanceBadge } from '../../research-evidence/components/ScientificProvenanceBadge.jsx';
import {
  Database,
  Filter,
  RefreshCw,
  AlertOctagon,
  CheckCircle2,
  Clock,
  HardDrive,
  Search,
  RotateCcw,
  Trash2,
} from 'lucide-react';

export function MissionDataManagementPage() {
  const [activeTab, setActiveTab] = useState('stored');
  const [records, setRecords] = useState([]);
  const [rejectedRecords, setRejectedRecords] = useState([]);
  const [syncQueue, setSyncQueue] = useState([]);
  const [storageStats, setStorageStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [syncFilter, setSyncFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [notification, setNotification] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const stats = await getStorageOverview();
      setStorageStats(stats);

      const stored = await queryStoredRecords({
        category: categoryFilter,
        syncStatus: syncFilter !== 'all' ? syncFilter : undefined,
        query: searchQuery,
      });
      setRecords(stored);

      const rejected = await getRejectedRecordsAudit();
      setRejectedRecords(rejected);

      const queue = await getPendingSyncQueue();
      setSyncQueue(queue);
    } catch (err) {
      console.error('Failed to load mission data management records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [categoryFilter, syncFilter, searchQuery]);

  const handleForceSync = async () => {
    setSyncing(true);
    setNotification(null);
    try {
      const res = await continuitySyncEngine.triggerSync({ force: true });
      setNotification({
        type: res.success ? 'success' : 'info',
        message: res.message || 'Sync operation completed.',
      });
      await loadData();
    } catch (err) {
      setNotification({
        type: 'error',
        message: `Sync failed: ${err.message}`,
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleResetFailed = async () => {
    setSyncing(true);
    try {
      const res = await continuitySyncEngine.resetFailedRecordsForRetry();
      setNotification({
        type: 'info',
        message: `Reset ${res.resetCount} failed records back to pending status.`,
      });
      await loadData();
    } catch (err) {
      setNotification({
        type: 'error',
        message: `Reset failed: ${err.message}`,
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleResetDemo = async () => {
    if (
      !window.confirm(
        'Purge synthetic flight demonstration data? Real user records and imported NASA research datasets will be preserved.'
      )
    ) {
      return;
    }
    setLoading(true);
    setNotification(null);
    try {
      const res = await resetDemoScenario();
      setNotification({
        type: 'info',
        message: `Purged ${res.totalDeleted} synthetic demonstration records across stores.`,
      });
      await loadData();
    } catch (err) {
      setNotification({
        type: 'error',
        message: `Failed to reset demonstration data: ${err.message}`,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#0C1527] border border-cyan-500/30 rounded-xl p-5 space-y-3 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0">
              <Database className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold font-mono text-slate-100 tracking-wide">
                  MISSION DATA &amp; STORAGE MANAGEMENT
                </h1>
                <span className="text-[10px] font-mono uppercase bg-cyan-950 border border-cyan-800 text-cyan-300 px-2 py-0.5 rounded">
                  Dexie v6 Local Engine
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Inspect local persistent stores, audit validation rejections, manage transmission queues, and monitor telemetry provenance.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
            <button
              type="button"
              disabled={loading}
              onClick={handleResetDemo}
              className="px-3 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-300 hover:text-rose-400 hover:border-rose-600 font-medium transition flex items-center gap-1.5 disabled:opacity-50"
              title="Purge all synthetic demonstration records while preserving user data and verified datasets"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Purge Demo Data
            </button>

            <button
              type="button"
              disabled={syncing}
              onClick={handleForceSync}
              className="px-3.5 py-1.5 rounded bg-cyan-950 border border-cyan-600 text-cyan-300 hover:bg-cyan-900 font-medium transition flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              Sync Outbox
            </button>
          </div>
        </div>

        {notification && (
          <div
            className={`p-3 rounded text-xs font-mono border ${
              notification.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-600/80 text-emerald-300'
                : 'bg-slate-900 border-slate-700 text-slate-300'
            }`}
          >
            {notification.message}
          </div>
        )}

        {/* Storage Telemetry KPI Row */}
        {storageStats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono pt-2 border-t border-slate-800">
            <div className="bg-slate-950/70 border border-slate-800 rounded p-2.5">
              <span className="text-slate-500 text-[10px] uppercase block">Total Stored Records</span>
              <span className="text-sm font-bold text-slate-100">{storageStats.totalRecords}</span>
            </div>
            <div className="bg-slate-950/70 border border-slate-800 rounded p-2.5">
              <span className="text-slate-500 text-[10px] uppercase block">Physiological Measurements</span>
              <span className="text-sm font-bold text-slate-100">{storageStats.tableCounts.measurements || 0}</span>
            </div>
            <div className="bg-slate-950/70 border border-slate-800 rounded p-2.5">
              <span className="text-slate-500 text-[10px] uppercase block">Sync Queue Depth</span>
              <span className="text-sm font-bold text-amber-300">{storageStats.tableCounts.syncQueue || 0}</span>
            </div>
            <div className="bg-slate-950/70 border border-slate-800 rounded p-2.5">
              <span className="text-slate-500 text-[10px] uppercase block">Validation Rejections</span>
              <span className="text-sm font-bold text-rose-400">{storageStats.tableCounts.rejectedRecords || 0}</span>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 text-xs font-mono">
        <button
          type="button"
          onClick={() => setActiveTab('stored')}
          className={`px-3 py-1.5 rounded-lg transition ${
            activeTab === 'stored'
              ? 'bg-cyan-950 border border-cyan-500 text-cyan-300'
              : 'text-slate-400 hover:text-slate-200 bg-slate-900/60 border border-slate-800'
          }`}
        >
          Stored Records ({records.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('queue')}
          className={`px-3 py-1.5 rounded-lg transition ${
            activeTab === 'queue'
              ? 'bg-cyan-950 border border-cyan-500 text-cyan-300'
              : 'text-slate-400 hover:text-slate-200 bg-slate-900/60 border border-slate-800'
          }`}
        >
          Sync Outbox ({syncQueue.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('rejected')}
          className={`px-3 py-1.5 rounded-lg transition ${
            activeTab === 'rejected'
              ? 'bg-cyan-950 border border-cyan-500 text-cyan-300'
              : 'text-slate-400 hover:text-slate-200 bg-slate-900/60 border border-slate-800'
          }`}
        >
          Rejected Audit Log ({rejectedRecords.length})
        </button>
      </div>

      {/* Tab 1: Stored Records View */}
      {activeTab === 'stored' && (
        <div className="bg-[#0C1527] border border-slate-800 rounded-lg p-5 space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 text-slate-400">
                <Filter className="w-3.5 h-3.5 text-cyan-400" />
                <span>Filter:</span>
              </div>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-slate-300 focus:outline-none focus:border-cyan-500"
              >
                <option value="all">All Categories</option>
                <option value="wearable_physiological">Wearable Physiological</option>
                <option value="manual_assessment">Manual Assessment</option>
                <option value="mission_event">Mission Event</option>
                <option value="radiation_measurement">Radiation Measurement</option>
              </select>

              <select
                value={syncFilter}
                onChange={(e) => setSyncFilter(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-slate-300 focus:outline-none focus:border-cyan-500"
              >
                <option value="all">All Sync Statuses</option>
                <option value="synced">Synced Upstream</option>
                <option value="pending">Pending Local Sync</option>
                <option value="failed">Failed Transmission</option>
              </select>
            </div>

            <div className="relative w-full sm:w-56">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search record ID or metric..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded pl-8 pr-3 py-1 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Records Table */}
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-900/90 text-slate-400 sticky top-0 border-b border-slate-800 uppercase text-[10px]">
                <tr>
                  <th className="p-2.5">Record ID</th>
                  <th className="p-2.5">Astronaut</th>
                  <th className="p-2.5">Category &amp; Metric</th>
                  <th className="p-2.5">Value / Observation</th>
                  <th className="p-2.5">Timestamp (UTC)</th>
                  <th className="p-2.5">Provenance</th>
                  <th className="p-2.5 text-right">Sync Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-[11px]">
                {records.map((r) => (
                  <tr key={r.recordId} className="hover:bg-slate-900/40 transition">
                    <td className="p-2.5 text-slate-300 font-mono text-[10px] truncate max-w-[140px]" title={r.recordId}>
                      {r.recordId}
                    </td>
                    <td className="p-2.5 text-cyan-300 font-semibold">{r.astronautId}</td>
                    <td className="p-2.5 text-slate-300">
                      <div>{r.metric || r.eventType || 'Assessment'}</div>
                      <div className="text-[10px] text-slate-500">{r.category}</div>
                    </td>
                    <td className="p-2.5 text-slate-100 font-medium">
                      {r.value !== undefined ? `${r.value} ${r.unit || ''}` : ''}
                      {r.systolic !== undefined ? `${r.systolic}/${r.diastolic} mmHg` : ''}
                      {r.sleepHours !== undefined ? `${r.sleepHours}h sleep (fatigue ${r.fatigueScore})` : ''}
                      {r.durationMinutes !== undefined ? `${r.durationMinutes} min (${r.workloadIntensity})` : ''}
                      {r.doseRate !== undefined ? `${r.doseRate} µSv/h` : ''}
                    </td>
                    <td className="p-2.5 text-slate-400">{new Date(r.recordedAt).toLocaleString()}</td>
                    <td className="p-2.5">
                      <ScientificProvenanceBadge
                        type={r.isSynthetic ? 'synthetic_demo' : 'public_dataset'}
                        size="sm"
                      />
                    </td>
                    <td className="p-2.5 text-right">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] border ${
                          r.syncStatus === 'synced'
                            ? 'bg-emerald-950 border-emerald-700 text-emerald-300'
                            : 'bg-amber-950 border-amber-700 text-amber-300'
                        }`}
                      >
                        {r.syncStatus || 'pending'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {records.length === 0 && (
            <div className="p-8 text-center text-xs font-mono text-slate-500">
              No matching stored records found.
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Sync Outbox Queue */}
      {activeTab === 'queue' && (
        <div className="bg-[#0C1527] border border-slate-800 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 text-xs font-mono">
            <span className="text-slate-400">Items queued for atomic synchronization</span>
            <button
              type="button"
              onClick={handleResetFailed}
              className="text-cyan-400 hover:underline flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              Reset Failed Retries
            </button>
          </div>

          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-900 text-slate-400 sticky top-0 uppercase text-[10px]">
                <tr>
                  <th className="p-2.5">Record ID</th>
                  <th className="p-2.5">Category</th>
                  <th className="p-2.5">Status</th>
                  <th className="p-2.5">Attempts</th>
                  <th className="p-2.5">Last Error</th>
                  <th className="p-2.5 text-right">Queued At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-[11px]">
                {syncQueue.map((item) => (
                  <tr key={item.recordId} className="hover:bg-slate-900/40">
                    <td className="p-2.5 text-slate-300 truncate max-w-[150px]">{item.recordId}</td>
                    <td className="p-2.5 text-slate-400">{item.category}</td>
                    <td className="p-2.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] border ${
                          item.status === 'synced'
                            ? 'bg-emerald-950 border-emerald-700 text-emerald-300'
                            : item.status === 'failed'
                            ? 'bg-rose-950 border-rose-700 text-rose-300'
                            : 'bg-amber-950 border-amber-700 text-amber-300'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="p-2.5 text-slate-300">{item.attempts || 0}</td>
                    <td className="p-2.5 text-slate-500 truncate max-w-xs">{item.lastError || 'None'}</td>
                    <td className="p-2.5 text-slate-400 text-right">{new Date(item.createdAt).toLocaleTimeString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {syncQueue.length === 0 && (
            <div className="p-8 text-center text-xs font-mono text-slate-500">
              Sync queue is completely empty. All records are currently synchronized.
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Rejected Records Audit */}
      {activeTab === 'rejected' && (
        <div className="bg-[#0C1527] border border-slate-800 rounded-lg p-5 space-y-4">
          <div className="text-xs font-mono text-slate-400 border-b border-slate-800 pb-3">
            Audit log of telemetry payloads rejected by client or server validation rules.
          </div>

          <div className="space-y-3 font-mono text-xs">
            {rejectedRecords.map((r) => (
              <div key={r.recordId} className="bg-slate-950/80 border border-rose-900/50 rounded p-4 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-rose-300">Rejected Record: {r.recordId}</span>
                  <span className="text-slate-500">{new Date(r.rejectedAt).toLocaleString()}</span>
                </div>
                <div className="text-slate-300 text-xs">
                  <span className="text-slate-500">Validation Failure: </span>
                  {r.reason}
                </div>
                <div className="text-[10px] text-slate-500">
                  Astronaut: {r.astronautId || 'Unknown'} • Category: {r.category}
                </div>
              </div>
            ))}

            {rejectedRecords.length === 0 && (
              <div className="p-8 text-center text-xs font-mono text-slate-500">
                Zero rejected records on file. All ingested telemetry conforms to schema validation rules.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

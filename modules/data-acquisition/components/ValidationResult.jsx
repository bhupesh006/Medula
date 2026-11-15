import React, { useState, useEffect } from 'react';
import {
  Database,
  RefreshCw,
  Send,
  CheckCircle,
  AlertOctagon,
  Clock,
  Layers,
  ShieldAlert,
  Info,
} from 'lucide-react';
import { localDb } from '../../../database/localDatabase.js';
import { syncService } from '../services/syncService.js';
import { AcquisitionService } from '../services/acquisitionService.js';

export function ValidationResult({ refreshSignal }) {
  const [activeTab, setActiveTab] = useState('accepted');
  const [dbStats, setDbStats] = useState({
    measurements: 0,
    assessments: 0,
    missionEvents: 0,
    radiationRecords: 0,
    rejectedRecords: 0,
  });
  const [queueStats, setQueueStats] = useState({
    pending: 0,
    syncing: 0,
    synced: 0,
    failed: 0,
    total: 0,
  });
  const [acceptedRecords, setAcceptedRecords] = useState([]);
  const [rejectedRecords, setRejectedRecords] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncOutcome, setSyncOutcome] = useState(null);

  // Load telemetry data from local IndexedDB
  const refreshData = async () => {
    try {
      // 1. Table item counts
      const [mCount, aCount, eCount, rCount, rejCount] = await Promise.all([
        localDb.measurements.count(),
        localDb.assessments.count(),
        localDb.missionEvents.count(),
        localDb.radiationRecords.count(),
        localDb.rejectedRecords.count(),
      ]);

      setDbStats({
        measurements: mCount,
        assessments: aCount,
        missionEvents: eCount,
        radiationRecords: rCount,
        rejectedRecords: rejCount,
      });

      // 2. Queue statistics
      const qStatus = await AcquisitionService.getSyncQueueStatus();
      setQueueStats(qStatus);

      // 3. Accepted records list (latest from each category)
      const [recentM, recentA, recentE, recentR] = await Promise.all([
        localDb.measurements.orderBy('recordedAt').reverse().limit(10).toArray(),
        localDb.assessments.orderBy('recordedAt').reverse().limit(10).toArray(),
        localDb.missionEvents.orderBy('recordedAt').reverse().limit(10).toArray(),
        localDb.radiationRecords.orderBy('recordedAt').reverse().limit(10).toArray(),
      ]);

      const combined = [...recentM, ...recentA, ...recentE, ...recentR].sort(
        (a, b) => new Date(b.recordedAt) - new Date(a.recordedAt)
      );
      setAcceptedRecords(combined.slice(0, 20));

      // 4. Rejected records list from inspection audit log
      const rejList = await AcquisitionService.getRejectedRecords();
      setRejectedRecords(rejList.slice(0, 20));
    } catch (err) {
      console.error('Failed to query local database status:', err);
    }
  };

  useEffect(() => {
    refreshData();
  }, [refreshSignal]);

  // Handle Manual Synchronisation Trigger
  const handleTriggerSync = async () => {
    setIsSyncing(true);
    setSyncOutcome(null);
    try {
      const outcome = await syncService.syncPendingRecords();
      setSyncOutcome(outcome);
      await refreshData();
    } catch (err) {
      setSyncOutcome({
        success: false,
        message: err.message,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 shadow-xl text-slate-100 space-y-6">
      {/* Header and Queue Synchronization Status Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold tracking-wide flex items-center gap-2 text-cyan-400">
            <Database className="w-5 h-5 text-cyan-400" />
            Local Telemetry Store & Sync Queue Engine
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Primary storage: IndexedDB (Dexie) • Synchronized mission DB: MongoDB
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={refreshData}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-slate-300 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>

          <button
            type="button"
            onClick={handleTriggerSync}
            disabled={isSyncing || queueStats.pending === 0}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded transition shadow"
          >
            <Send className={`w-3.5 h-3.5 ${isSyncing ? 'animate-pulse' : ''}`} />
            {isSyncing ? 'Synchronizing...' : `Sync Pending (${queueStats.pending})`}
          </button>
        </div>
      </div>

      {/* Sync Status Feedback Alert */}
      {syncOutcome && (
        <div className={`p-4 rounded-md border text-xs flex items-start gap-2 ${
          syncOutcome.success
            ? 'bg-emerald-950/60 border-emerald-500 text-emerald-200'
            : 'bg-rose-950/60 border-rose-500 text-rose-200'
        }`}>
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">{syncOutcome.message}</span>
            {syncOutcome.accepted?.length > 0 && (
              <span className="ml-2 font-mono">Accepted: {syncOutcome.accepted.length}</span>
            )}
            {syncOutcome.duplicates?.length > 0 && (
              <span className="ml-2 font-mono">Duplicates Acknowledged: {syncOutcome.duplicates.length}</span>
            )}
          </div>
        </div>
      )}

      {/* Local Storage Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-950/80 p-3 rounded border border-slate-800">
          <div className="text-[10px] uppercase font-semibold text-slate-400">Physiological</div>
          <div className="text-xl font-bold font-mono text-cyan-400 mt-1">{dbStats.measurements}</div>
          <div className="text-[10px] text-slate-500">measurements</div>
        </div>

        <div className="bg-slate-950/80 p-3 rounded border border-slate-800">
          <div className="text-[10px] uppercase font-semibold text-slate-400">Assessments</div>
          <div className="text-xl font-bold font-mono text-cyan-400 mt-1">{dbStats.assessments}</div>
          <div className="text-[10px] text-slate-500">assessments</div>
        </div>

        <div className="bg-slate-950/80 p-3 rounded border border-slate-800">
          <div className="text-[10px] uppercase font-semibold text-slate-400">Mission Events</div>
          <div className="text-xl font-bold font-mono text-cyan-400 mt-1">{dbStats.missionEvents}</div>
          <div className="text-[10px] text-slate-500">missionEvents</div>
        </div>

        <div className="bg-slate-950/80 p-3 rounded border border-slate-800">
          <div className="text-[10px] uppercase font-semibold text-slate-400">Radiation</div>
          <div className="text-xl font-bold font-mono text-cyan-400 mt-1">{dbStats.radiationRecords}</div>
          <div className="text-[10px] text-slate-500">radiationRecords</div>
        </div>

        <div className="bg-slate-950/80 p-3 rounded border border-amber-900/40">
          <div className="text-[10px] uppercase font-semibold text-amber-400">Sync Pending</div>
          <div className="text-xl font-bold font-mono text-amber-400 mt-1">{queueStats.pending}</div>
          <div className="text-[10px] text-slate-500">{queueStats.synced} Synced</div>
        </div>

        <div className="bg-slate-950/80 p-3 rounded border border-rose-900/40">
          <div className="text-[10px] uppercase font-semibold text-rose-400">Rejected Log</div>
          <div className="text-xl font-bold font-mono text-rose-400 mt-1">{dbStats.rejectedRecords}</div>
          <div className="text-[10px] text-slate-500">Inspection audit</div>
        </div>
      </div>

      {/* Accepted Records vs Rejected Audit Log Tabs */}
      <div>
        <div className="flex border-b border-slate-800 mb-4">
          <button
            type="button"
            onClick={() => setActiveTab('accepted')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold border-b-2 transition ${
              activeTab === 'accepted'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            Locally Accepted Records ({acceptedRecords.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('rejected')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold border-b-2 transition ${
              activeTab === 'rejected'
                ? 'border-rose-400 text-rose-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            Inspection Audit: Rejected Records ({rejectedRecords.length})
          </button>
        </div>

        {/* Tab 1: Accepted Records Table */}
        {activeTab === 'accepted' && (
          <div className="overflow-x-auto rounded border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px]">
                <tr>
                  <th className="p-3">Record ID</th>
                  <th className="p-3">Astronaut</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Payload Summary</th>
                  <th className="p-3">Recorded At</th>
                  <th className="p-3">Sync Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 bg-slate-900/50">
                {acceptedRecords.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-6 text-center text-slate-500">
                      No records currently stored in local database. Ingest telemetry above.
                    </td>
                  </tr>
                ) : (
                  acceptedRecords.map((r) => (
                    <tr key={r.recordId} className="hover:bg-slate-800/40 font-mono">
                      <td className="p-3 text-cyan-300 truncate max-w-[150px]" title={r.recordId}>
                        {r.recordId.slice(0, 8)}...
                      </td>
                      <td className="p-3 text-slate-200 font-sans">{r.astronautId}</td>
                      <td className="p-3 text-slate-300 font-sans">
                        <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px]">
                          {r.category}
                        </span>
                      </td>
                      <td className="p-3 text-slate-300 font-sans">
                        {r.category === 'wearable_physiological' && (
                          <span>{r.data.metric}: <b className="text-cyan-400">{r.data.value} {r.data.unit}</b></span>
                        )}
                        {r.category === 'manual_assessment' && (
                          <span>Stress: <b>{r.data.stress_score}</b>, Fatigue: <b>{r.data.fatigue_score}</b>, Mood: <b>{r.data.mood_score}</b></span>
                        )}
                        {r.category === 'mission_event' && (
                          <span>{r.data.eventType} ({r.data.durationMinutes} min) - {r.data.description}</span>
                        )}
                        {r.category === 'radiation_measurement' && (
                          <span>Dose: <b>{r.data.cumulative_dose} mSv</b>, Rate: <b>{r.data.dose_rate} µSv/h</b></span>
                        )}
                      </td>
                      <td className="p-3 text-slate-400 text-[11px]">{r.recordedAt}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          r.syncStatus === 'synced'
                            ? 'bg-emerald-950 border border-emerald-500 text-emerald-300'
                            : r.syncStatus === 'syncing'
                            ? 'bg-cyan-950 border border-cyan-500 text-cyan-300 animate-pulse'
                            : 'bg-amber-950 border border-amber-500 text-amber-300'
                        }`}>
                          {r.syncStatus || 'pending'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Rejected Records Audit Table */}
        {activeTab === 'rejected' && (
          <div className="overflow-x-auto rounded border border-rose-900/40">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-rose-300 uppercase font-mono text-[10px]">
                <tr>
                  <th className="p-3">Record ID</th>
                  <th className="p-3">Astronaut</th>
                  <th className="p-3">Rejected At</th>
                  <th className="p-3">Reason / Validation Failures</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 bg-slate-900/50">
                {rejectedRecords.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="p-6 text-center text-slate-500">
                      No rejected records logged. All submitted telemetry has passed aerospace validation checks.
                    </td>
                  </tr>
                ) : (
                  rejectedRecords.map((rej) => (
                    <tr key={rej.recordId} className="hover:bg-slate-800/40">
                      <td className="p-3 font-mono text-rose-400 truncate max-w-[150px]">
                        {rej.recordId}
                      </td>
                      <td className="p-3 text-slate-200">{rej.astronautId}</td>
                      <td className="p-3 text-slate-400 text-[11px] font-mono">{rej.rejectedAt}</td>
                      <td className="p-3 text-rose-300">
                        {rej.reason}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}


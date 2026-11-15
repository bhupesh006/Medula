import React, { useState, useEffect } from 'react';
import { connectivityService } from '../services/connectivityService.js';
import { continuitySyncEngine } from '../services/continuitySyncEngine.js';
import { Wifi, WifiOff, RefreshCw, Server, HardDrive, CheckCircle2 } from 'lucide-react';

export function ConnectivityStatusBar({ onSyncCompleted }) {
  const [conn, setConn] = useState(connectivityService.getStatus());
  const [syncMetrics, setSyncMetrics] = useState({ pending: 0, synced: 0, failed: 0 });
  const [isSyncing, setIsSyncing] = useState(false);

  const refreshState = async () => {
    const c = await connectivityService.checkServerReachability();
    setConn(c);
    const m = await continuitySyncEngine.getSyncMetrics();
    setSyncMetrics(m);
  };

  useEffect(() => {
    refreshState();
    connectivityService.startPeriodicProbe(20000);

    const unsubConn = connectivityService.subscribe((state) => {
      setConn(state);
    });

    const unsubSync = continuitySyncEngine.subscribe((event, data) => {
      if (event === 'sync_started') setIsSyncing(true);
      if (event === 'sync_completed' || event === 'sync_error' || event === 'sync_skipped') {
        setIsSyncing(false);
        continuitySyncEngine.getSyncMetrics().then(setSyncMetrics);
        if (onSyncCompleted) onSyncCompleted();
      }
    });

    return () => {
      connectivityService.stopPeriodicProbe();
      unsubConn();
      unsubSync();
    };
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await continuitySyncEngine.triggerSync({ force: true });
      await refreshState();
    } catch (err) {
      console.error('Manual sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const isFullyOnline = conn.isOnline && conn.isServerReachable;

  return (
    <div className="bg-[#0C1527] border-b border-slate-800 px-6 py-2 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
      {/* Left: Mode & Connectivity */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          {isFullyOnline ? (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-600/70 text-emerald-300 text-[11px]">
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              ONLINE • Server Connected
            </span>
          ) : (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-950/80 border border-amber-600/70 text-amber-300 text-[11px]">
              <WifiOff className="w-3.5 h-3.5 text-amber-400" />
              OFFLINE • Autonomous Local Mode
            </span>
          )}
        </div>

        <div className="hidden sm:flex items-center gap-1 text-slate-400 text-[11px]">
          <HardDrive className="w-3 h-3 text-cyan-400" />
          <span>Local IndexedDB Active</span>
        </div>
      </div>

      {/* Right: Sync Status & Trigger */}
      <div className="flex items-center gap-3">
        {syncMetrics.pending > 0 ? (
          <span className="px-2 py-0.5 rounded bg-amber-950/60 border border-amber-700/80 text-amber-300 text-[11px] flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
            {syncMetrics.pending} Pending Sync
          </span>
        ) : (
          <span className="text-slate-400 text-[11px] flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            All Records Stored Locally
          </span>
        )}

        <button
          type="button"
          disabled={isSyncing}
          onClick={handleManualSync}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-700 hover:border-cyan-500 text-slate-300 hover:text-cyan-300 transition text-[11px] disabled:opacity-50"
          title="Trigger Synchronization"
        >
          <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-cyan-400' : ''}`} />
          <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
        </button>
      </div>
    </div>
  );
}

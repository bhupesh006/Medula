import React, { useState } from 'react';
import { updateGuidanceStatus } from '../services/decisionSupportService.js';
import { ShieldAlert, CheckCircle, AlertCircle, Info, ArrowRight, ExternalLink } from 'lucide-react';

export function MedicalGuidanceCard({ guidance, onStatusChanged }) {
  const [updating, setUpdating] = useState(false);

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'CRITICAL_ACTION':
        return 'bg-rose-950 border-rose-600 text-rose-300';
      case 'CAUTION':
        return 'bg-amber-950 border-amber-600 text-amber-300';
      case 'ADVISORY':
        return 'bg-cyan-950 border-cyan-600 text-cyan-300';
      case 'ROUTINE':
      default:
        return 'bg-slate-900 border-slate-700 text-slate-300';
    }
  };

  const handleAcknowledge = async () => {
    setUpdating(true);
    try {
      await updateGuidanceStatus(guidance.guidanceId, 'ACKNOWLEDGED', 'Acknowledged by Crew Medical Officer');
      if (onStatusChanged) onStatusChanged();
    } catch (err) {
      console.error('Failed to acknowledge guidance:', err);
    } finally {
      setUpdating(false);
    }
  };

  const handleImplement = async () => {
    setUpdating(true);
    try {
      await updateGuidanceStatus(guidance.guidanceId, 'IMPLEMENTED', 'Countermeasures deployed in habitat');
      if (onStatusChanged) onStatusChanged();
    } catch (err) {
      console.error('Failed to implement guidance:', err);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${getPriorityBadge(guidance.priority)}`}>
            {guidance.priority}
          </span>
          <span className="text-xs font-mono text-slate-400 capitalize">
            {guidance.domain} Domain
          </span>
          {guidance.status === 'IMPLEMENTED' && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 border border-emerald-700 text-emerald-300 flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-emerald-400" />
              Countermeasure Implemented
            </span>
          )}
        </div>

        <div className="text-[10px] font-mono text-slate-500">
          Generated: {new Date(guidance.generatedAt).toLocaleString()}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-slate-100 font-mono">
          {guidance.title}
        </h3>
        <p className="text-xs text-slate-300 mt-1 leading-relaxed font-sans">
          {guidance.operationalContext}
        </p>
      </div>

      {/* Clinical Countermeasure Recommendations */}
      <div className="bg-slate-900/80 border border-slate-800 rounded p-3 space-y-2">
        <span className="text-[11px] font-mono font-semibold text-cyan-400 uppercase tracking-wider block">
          Protocol Countermeasure Actions
        </span>
        <ul className="space-y-1.5 text-xs text-slate-200">
          {guidance.clinicalRecommendations.map((action, i) => (
            <li key={i} className="flex items-start gap-2">
              <ArrowRight className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
              <span>{action}</span>
            </li>
          ))}
        </ul>
      </div>

      {guidance.contraindications && (
        <div className="bg-amber-950/30 border border-amber-900/60 rounded p-3 text-xs text-amber-300/90 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block font-mono text-[10px] uppercase">Contraindication / Precaution:</span>
            <span>{guidance.contraindications}</span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-900 text-xs font-mono">
        <div className="text-[11px] text-slate-500">
          Evidence Ref: <span className="text-cyan-400">{guidance.supportingEvidenceId}</span>
        </div>

        <div className="flex items-center gap-2">
          {guidance.status === 'PENDING_REVIEW' && (
            <button
              type="button"
              disabled={updating}
              onClick={handleAcknowledge}
              className="px-3 py-1.5 rounded bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-300 transition"
            >
              Acknowledge
            </button>
          )}

          {guidance.status !== 'IMPLEMENTED' && (
            <button
              type="button"
              disabled={updating}
              onClick={handleImplement}
              className="px-3 py-1.5 rounded bg-cyan-950 border border-cyan-600 text-cyan-300 hover:bg-cyan-900 font-medium transition"
            >
              Deploy Countermeasure
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { Dumbbell, Clock, Zap, CheckCircle2 } from 'lucide-react';

export function ActivityContextCard({ activityContext, workloadEvents = [] }) {
  if (!activityContext) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 text-center text-slate-500 text-xs">
        No physical exercise activity logged in current operational window.
      </div>
    );
  }

  const { sessionsCount, totalDurationMinutes, highIntensitySessions, lastExerciseSession } = activityContext;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 shadow-xl text-slate-100 space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Dumbbell className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-bold text-cyan-400 font-mono uppercase tracking-wider">
            Physical Activity & Workload Context
          </h3>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
          {sessionsCount} Sessions ({totalDurationMinutes} min total)
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs font-mono">
        <div className="bg-slate-950 p-3 rounded border border-slate-800">
          <div className="text-[10px] text-slate-400 uppercase">High Intensity Workouts</div>
          <div className="text-lg font-bold text-cyan-400 mt-0.5">{highIntensitySessions}</div>
        </div>
        <div className="bg-slate-950 p-3 rounded border border-slate-800">
          <div className="text-[10px] text-slate-400 uppercase">Recent Workload / EVAs</div>
          <div className="text-lg font-bold text-cyan-400 mt-0.5">{workloadEvents.length}</div>
        </div>
      </div>

      {lastExerciseSession && (
        <div className="bg-slate-950/70 p-3 rounded border border-slate-800/80 text-xs space-y-1">
          <div className="font-semibold text-slate-200 text-[11px] flex items-center justify-between">
            <span>Last Completed Exercise:</span>
            <span className="text-[10px] font-mono text-cyan-300 uppercase">
              {lastExerciseSession.intensity || 'moderate'} intensity
            </span>
          </div>
          <p className="text-slate-400 text-[11px]">
            {lastExerciseSession.description || 'Routine countermeasure exercise'} ({lastExerciseSession.durationMinutes} min)
          </p>
          <div className="text-[10px] text-slate-500 font-mono">
            Logged at: {new Date(lastExerciseSession.recordedAt).toLocaleTimeString()}
          </div>
        </div>
      )}
    </div>
  );
}


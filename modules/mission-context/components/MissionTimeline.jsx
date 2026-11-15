import React from 'react';
import {
  Activity,
  Dumbbell,
  Moon,
  Briefcase,
  Zap,
  Wind,
  AlertTriangle,
  FileText,
  Clock,
  Layers,
} from 'lucide-react';
import { TimelineEventType } from '../services/missionContextService.js';

export function MissionTimeline({ events = [] }) {
  if (!events || events.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 text-center text-slate-500 text-xs">
        No mission timeline events logged for this astronaut.
      </div>
    );
  }

  const getEventBadge = (type) => {
    switch (type) {
      case TimelineEventType.EXERCISE_SESSION:
        return {
          icon: Dumbbell,
          bg: 'bg-indigo-950 text-indigo-300 border-indigo-700/80',
          dot: 'bg-indigo-400',
        };
      case TimelineEventType.SLEEP_SESSION:
        return {
          icon: Moon,
          bg: 'bg-purple-950 text-purple-300 border-purple-700/80',
          dot: 'bg-purple-400',
        };
      case TimelineEventType.WORKLOAD_EVENT:
        return {
          icon: Briefcase,
          bg: 'bg-amber-950 text-amber-300 border-amber-700/80',
          dot: 'bg-amber-400',
        };
      case TimelineEventType.RADIATION_LOG:
        return {
          icon: Zap,
          bg: 'bg-rose-950 text-rose-300 border-rose-700/80',
          dot: 'bg-rose-400',
        };
      case TimelineEventType.ENVIRONMENTAL_LOG:
        return {
          icon: Wind,
          bg: 'bg-teal-950 text-teal-300 border-teal-700/80',
          dot: 'bg-teal-400',
        };
      case TimelineEventType.PATTERN_ALERT:
        return {
          icon: AlertTriangle,
          bg: 'bg-amber-950 text-amber-300 border-amber-600',
          dot: 'bg-amber-400',
        };
      case TimelineEventType.HEALTH_ASSESSMENT:
        return {
          icon: FileText,
          bg: 'bg-slate-800 text-slate-300 border-slate-700',
          dot: 'bg-slate-400',
        };
      case TimelineEventType.HEALTH_MEASUREMENT:
      default:
        return {
          icon: Activity,
          bg: 'bg-cyan-950 text-cyan-300 border-cyan-700/80',
          dot: 'bg-cyan-400',
        };
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 shadow-xl text-slate-100 space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-cyan-400 font-mono tracking-wide flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            Unified Mission Operational & Health Timeline
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Synchronized sequence of physical activities, sleep cycles, environmental logs, and health observations
          </p>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-400">
          {events.length} Timeline Entries
        </span>
      </div>

      <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-800">
        {events.map((evt) => {
          const config = getEventBadge(evt.type);
          const Icon = config.icon;

          return (
            <div key={evt.id} className="relative flex items-start gap-3 group">
              {/* Timeline marker */}
              <div className={`absolute -left-6 mt-1 w-5 h-5 rounded-full ${config.bg} border flex items-center justify-center shrink-0 shadow`}>
                <Icon className="w-3 h-3" />
              </div>

              {/* Event Card */}
              <div className="flex-1 bg-slate-950 border border-slate-800/80 rounded-lg p-3 hover:border-slate-700 transition space-y-1">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-slate-200">
                      {evt.title}
                    </span>
                    <span className={`px-2 py-0.2 rounded text-[9px] font-mono uppercase border ${config.bg}`}>
                      {evt.category || 'event'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                    <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-cyan-400">
                      Day {evt.missionDay}
                    </span>
                    <span>{evt.timestamp ? new Date(evt.timestamp).toLocaleTimeString() : 'N/A'}</span>
                  </div>
                </div>

                <p className="text-xs text-slate-400">{evt.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


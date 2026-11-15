import React, { useState } from 'react';
import { TrendingUp, Info } from 'lucide-react';

export function BaselineTrendChart({ dataPoints = [], baseline, metric, unit }) {
  const [hoveredPoint, setHoveredPoint] = useState(null);

  if (!dataPoints || dataPoints.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 text-center text-slate-500 text-xs">
        No chronological data points available to render trend trajectory.
      </div>
    );
  }

  // Dimensions
  const width = 700;
  const height = 240;
  const padding = { top: 25, right: 30, bottom: 35, left: 50 };

  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  // Extract values
  const values = dataPoints.map((d) => d.value);
  const minVal = Math.min(...values, baseline?.percentile25 ?? Infinity, baseline?.minimum ?? Infinity);
  const maxVal = Math.max(...values, baseline?.percentile75 ?? -Infinity, baseline?.maximum ?? -Infinity);

  const rangeSpan = maxVal - minVal || 1;
  const yMin = Math.floor(minVal - rangeSpan * 0.1);
  const yMax = Math.ceil(maxVal + rangeSpan * 0.1);
  const ySpan = yMax - yMin || 1;

  // Scale functions
  const getX = (index) => {
    if (dataPoints.length === 1) return padding.left + plotWidth / 2;
    return padding.left + (index / (dataPoints.length - 1)) * plotWidth;
  };

  const getY = (val) => {
    return padding.top + plotHeight - ((val - yMin) / ySpan) * plotHeight;
  };

  // Generate SVG path for points
  const pointsCoords = dataPoints.map((d, idx) => ({
    x: getX(idx),
    y: getY(d.value),
    point: d,
  }));

  const linePath = pointsCoords.reduce((acc, curr, idx) => {
    return idx === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`;
  }, '');

  // Calculate IQR corridor (Q1 to Q3)
  const hasIQR = baseline && baseline.percentile25 !== null && baseline.percentile75 !== null;
  const q1Y = hasIQR ? getY(baseline.percentile25) : 0;
  const q3Y = hasIQR ? getY(baseline.percentile75) : 0;
  const medianY = baseline && baseline.median !== null ? getY(baseline.median) : null;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 shadow-xl text-slate-100 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-cyan-400 font-mono tracking-wide flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-cyan-400" />
            Historical Trajectory & Baseline Corridor
          </h3>
          <p className="text-[11px] text-slate-400">
            Chronological measurement points mapped against historical IQR (Q1–Q3)
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-[10px] font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
            <span className="text-slate-300">Observation</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 border-t border-dashed border-amber-400"></span>
            <span className="text-amber-300">Median Ref</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-2.5 bg-cyan-500/15 border border-cyan-500/30 rounded-sm"></span>
            <span className="text-slate-400">IQR Corridor (Q1–Q3)</span>
          </div>
        </div>
      </div>

      {/* SVG Plot */}
      <div className="relative w-full overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto min-w-[500px]">
          {/* Horizontal Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const val = yMin + ratio * ySpan;
            const y = getY(val);
            return (
              <g key={ratio}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="#1E293B"
                  strokeWidth="1"
                />
                <text
                  x={padding.left - 8}
                  y={y + 3}
                  textAnchor="end"
                  fontSize="9"
                  fontFamily="monospace"
                  fill="#64748B"
                >
                  {val.toFixed(0)}
                </text>
              </g>
            );
          })}

          {/* Shaded IQR Corridor (Q1 to Q3) */}
          {hasIQR && (
            <rect
              x={padding.left}
              y={q3Y}
              width={plotWidth}
              height={Math.max(0, q1Y - q3Y)}
              fill="rgba(0, 209, 255, 0.08)"
              stroke="rgba(0, 209, 255, 0.25)"
              strokeDasharray="3 3"
            />
          )}

          {/* Baseline Median Reference Line */}
          {medianY !== null && (
            <line
              x1={padding.left}
              y1={medianY}
              x2={width - padding.right}
              y2={medianY}
              stroke="#F59E0B"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
          )}

          {/* Connecting Line */}
          <path
            d={linePath}
            fill="none"
            stroke="#00D1FF"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Observation Points */}
          {pointsCoords.map((pt, idx) => (
            <circle
              key={idx}
              cx={pt.x}
              cy={pt.y}
              r="4.5"
              fill="#060B14"
              stroke="#00D1FF"
              strokeWidth="2"
              className="cursor-pointer hover:r-6 transition-all"
              onMouseEnter={() => setHoveredPoint(pt)}
              onMouseLeave={() => setHoveredPoint(null)}
            />
          ))}

          {/* X-axis labels (start and end timestamps) */}
          <text
            x={padding.left}
            y={height - 10}
            fontSize="9"
            fontFamily="monospace"
            fill="#64748B"
          >
            {dataPoints[0]?.recordedAt ? new Date(dataPoints[0].recordedAt).toLocaleDateString() : ''}
          </text>
          <text
            x={width - padding.right}
            y={height - 10}
            textAnchor="end"
            fontSize="9"
            fontFamily="monospace"
            fill="#64748B"
          >
            {dataPoints[dataPoints.length - 1]?.recordedAt
              ? new Date(dataPoints[dataPoints.length - 1].recordedAt).toLocaleDateString()
              : ''}
          </text>
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredPoint && (
          <div
            className="absolute z-20 pointer-events-none bg-slate-950 border border-cyan-500/60 rounded px-3 py-1.5 shadow-xl text-[11px] font-mono text-slate-100"
            style={{
              left: `${(hoveredPoint.x / width) * 100}%`,
              top: `${(hoveredPoint.y / height) * 100}%`,
              transform: 'translate(-50%, -120%)',
            }}
          >
            <div className="font-bold text-cyan-400">
              {hoveredPoint.point.value} {unit}
            </div>
            <div className="text-[10px] text-slate-400">
              {new Date(hoveredPoint.point.recordedAt).toLocaleString()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


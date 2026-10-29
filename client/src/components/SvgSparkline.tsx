import React, { useState } from 'react';

interface DataPoint {
  time: string;
  value: number;
}

interface SvgSparklineProps {
  data: DataPoint[];
  height?: number;
  color?: string;
  fillColor?: string;
  unit?: string;
}

export const SvgSparkline: React.FC<SvgSparklineProps> = ({
  data,
  height = 48,
  color = '#06b6d4',
  fillColor = 'rgba(6, 182, 212, 0.15)',
  unit = 'ms',
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; val: number; time: string } | null>(null);

  if (!data || data.length < 2) {
    return <div className="text-xs text-slate-500 font-mono">Insufficient telemetry</div>;
  }

  const values = data.map((d) => d.value);
  const min = Math.min(...values) * 0.85;
  const max = Math.max(...values) * 1.15;
  const range = max - min || 1;

  const width = 280;
  const paddingY = 8;
  const effectiveHeight = height - paddingY * 2;

  // Calculate coordinates
  const points = data.map((d, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - paddingY - ((d.value - min) / range) * effectiveHeight;
    return { x, y, val: d.value, time: d.time };
  });

  // Construct smooth bezier curve SVG path
  const pathD = points.reduce((acc, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`;
    const prev = points[index - 1];
    const cpX1 = prev.x + (point.x - prev.x) / 2;
    const cpY1 = prev.y;
    const cpX2 = prev.x + (point.x - prev.x) / 2;
    const cpY2 = point.y;
    return `${acc} C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${point.x} ${point.y}`;
  }, '');

  // Construct closed area path for gradient fill
  const areaD = `${pathD} L ${width} ${height} L 0 ${height} Z`;

  return (
    <div
      className="relative select-none"
      style={{ width: `${width}px`, height: `${height}px` }}
      onMouseLeave={() => setHoveredPoint(null)}
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="overflow-visible w-full h-full"
      >
        <defs>
          <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={fillColor} stopOpacity="0.8" />
            <stop offset="100%" stopColor={fillColor} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Gradient Area Fill */}
        <path d={areaD} fill={`url(#grad-${color})`} />

        {/* Smooth Curved Line */}
        <path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="sparkline-path"
        />

        {/* Interactive Scrub Points */}
        {points.map((pt, idx) => (
          <circle
            key={idx}
            cx={pt.x}
            cy={pt.y}
            r={hoveredPoint?.time === pt.time ? 4.5 : 2}
            className="transition-all cursor-pointer fill-slate-950 stroke-2"
            stroke={color}
            onMouseEnter={() => setHoveredPoint(pt)}
          />
        ))}

        {/* Hover Crosshair */}
        {hoveredPoint && (
          <line
            x1={hoveredPoint.x}
            y1={0}
            x2={hoveredPoint.x}
            y2={height}
            stroke="rgba(255, 255, 255, 0.25)"
            strokeDasharray="2,2"
          />
        )}
      </svg>

      {/* Scrubber Tooltip */}
      {hoveredPoint && (
        <div
          className="absolute z-30 pointer-events-none -top-8 px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-700 text-[10px] font-mono text-white shadow-xl -translate-x-1/2 flex items-center gap-1.5 whitespace-nowrap"
          style={{ left: `${hoveredPoint.x}px` }}
        >
          <span className="text-pulse-cyan font-bold">
            {hoveredPoint.val} {unit}
          </span>
          <span className="text-slate-400">({hoveredPoint.time})</span>
        </div>
      )}
    </div>
  );
};

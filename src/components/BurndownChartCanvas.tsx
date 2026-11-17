import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BurndownPoint } from '../types';

interface BurndownChartCanvasProps {
  data: BurndownPoint[];
  unitLabel?: string;
  height?: number;
}

const VIEW_W = 400;
const PAD = { top: 16, right: 20, bottom: 34, left: 44 };

export const BurndownChartCanvas: React.FC<BurndownChartCanvasProps> = ({
  data, unitLabel = 'điểm', height = 260,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewWidth, setViewWidth] = useState(VIEW_W);
  const innerW = viewWidth - PAD.left - PAD.right;
  const innerH = height - PAD.top - PAD.bottom;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(([entry]) => {
      setViewWidth(entry.contentRect.width || VIEW_W);
    });
    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  const stats = useMemo(() => {
    if (!data || data.length === 0) {
      return { yMax: 10, idealPath: '', actualPath: '', points: [], xLabels: [] as { x: number; label: string }[] };
    }
    const rawMax = Math.max(1, ...data.flatMap((d) => [d.idealRemaining, d.actualRemaining]));
    const yMax = Math.max(10, Math.ceil(rawMax / 10) * 10);
    const x = (i: number) => PAD.left + (data.length <= 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
    const y = (v: number) => PAD.top + (1 - v / yMax) * innerH;

    const idealPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(2)} ${y(d.idealRemaining).toFixed(2)}`).join(' ');
    const actualPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(2)} ${y(d.actualRemaining).toFixed(2)}`).join(' ');
    const points = data.map((d, i) => ({ cx: x(i), cy: y(d.actualRemaining), value: d.actualRemaining }));
    const step = data.length <= 6 ? 1 : Math.ceil(data.length / 6);
    const xLabels = data.map((d, i) => ({ x: x(i), label: d.dayLabel })).filter((_, i) => i % step === 0 || i === data.length - 1);
    return { yMax, idealPath, actualPath, points, xLabels };
  }, [data, innerW, innerH]);

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg" style={{ height }}>
        Chưa có dữ liệu Burndown
      </div>
    );
  }

  const gridLines = 4;

  return (
    <div ref={containerRef} className="w-full">
      <div className="flex items-center gap-4 text-xs text-slate-600 mb-1.5">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-4 h-0.5 bg-slate-400 border-t border-dashed border-slate-400" />
          <span>Lý tưởng</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-4 h-0.5 bg-blue-600" />
          <span>Thực tế</span>
        </span>
        <span className="ml-auto font-mono tabular-nums text-slate-500">Đơn vị: {unitLabel}</span>
      </div>

      <svg viewBox={`0 0 ${viewWidth} ${height}`} style={{ width: '100%', height }} role="img" aria-label="Biểu đồ Burndown">
        {Array.from({ length: gridLines + 1 }).map((_, i) => {
          const v = (stats.yMax / gridLines) * i;
          const yPos = PAD.top + innerH - (i / gridLines) * innerH;
          return (
            <g key={`y-${i}`}>
              <line x1={PAD.left} x2={PAD.left + innerW} y1={yPos} y2={yPos} stroke="#e2e8f0" strokeWidth={1} />
              <text x={PAD.left - 6} y={yPos + 4} textAnchor="end" fontSize={12} fill="#64748b" fontFamily="JetBrains Mono, monospace">{Math.round(v)}</text>
            </g>
          );
        })}
        <line x1={PAD.left} x2={PAD.left + innerW} y1={PAD.top + innerH} y2={PAD.top + innerH} stroke="#cbd5e1" strokeWidth={1} />
        {stats.xLabels.map((lbl, i) => (
          <text
            key={`x-${i}`}
            x={lbl.x}
            y={PAD.top + innerH + 14}
            textAnchor={lbl.x >= viewWidth - PAD.right - 12 ? 'end' : 'middle'}
            fontSize={12}
            fill="#475569"
            fontFamily="JetBrains Mono, monospace"
          >
            {lbl.label.replace('Ngày ', 'N')}
          </text>
        ))}
        <path d={stats.idealPath} fill="none" stroke="#94a3b8" strokeWidth={1.75} strokeDasharray="5 4" strokeLinecap="round" strokeLinejoin="round" />
        <path d={stats.actualPath} fill="none" stroke="#2563eb" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" />
        {stats.points.map((p, i) => (
          <circle key={`pt-${i}`} cx={p.cx} cy={p.cy} r={3} fill="#ffffff" stroke="#2563eb" strokeWidth={1.75} />
        ))}
      </svg>
    </div>
  );
};
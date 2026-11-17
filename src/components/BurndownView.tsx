import React, { useMemo } from 'react';
import { Activity, CalendarClock, Flag, TrendingDown } from 'lucide-react';
import { Project } from '../types';
import { buildLiveBurndownSeries, calculateProjectMetrics } from '../utils/metrics';
import { BurndownChartCanvas } from './BurndownChartCanvas';

interface BurndownViewProps {
  projects: Project[];
  activeProject: Project;
  onRecordSnapshot: (projectId: string) => void;
}

export const BurndownView: React.FC<BurndownViewProps> = ({ projects, activeProject, onRecordSnapshot }) => {
  const metrics = useMemo(() => calculateProjectMetrics(activeProject), [activeProject]);
  const series = useMemo(() => buildLiveBurndownSeries(activeProject), [activeProject]);

  const velocity = useMemo(() => {
    if (series.length < 2) return 0;
    const first = series[0].actualRemaining;
    const last = series[series.length - 1].actualRemaining;
    return Math.max(0, Math.round(((first - last) / (series.length - 1)) * 10) / 10);
  }, [series]);

  const statusText =
    series.length === 0
      ? 'Chưa có dữ liệu'
      : series[series.length - 1].actualRemaining <= series[series.length - 1].idealRemaining
      ? 'Đúng / vượt tiến độ lý tưởng'
      : 'Chậm hơn tiến độ lý tưởng';

  return (
    <div className="max-w-[1380px] mx-auto px-4 lg:px-6 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <TrendingDown className="w-6 h-6 text-blue-600" />
            Phân tích Biểu đồ Burndown
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Theo dõi tốc độ đốt cháy Story Points của dự án{' '}
            <strong className="text-slate-700">{activeProject.name}</strong> — {activeProject.sprintName}
          </p>
        </div>
        <button
          onClick={() => onRecordSnapshot(activeProject.id)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Ghi nhận Snapshot hôm nay</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">Tổng Story Points</div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-slate-900 tabular-nums">{metrics.totalStoryPoints}</span>
            <span className="text-xs text-slate-500">điểm</span>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">Đã hoàn tất</div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-emerald-600 tabular-nums">{metrics.completedStoryPoints}</span>
            <span className="text-xs text-slate-500">điểm</span>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">Còn lại</div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-blue-600 tabular-nums">{metrics.remainingStoryPoints}</span>
            <span className="text-xs text-slate-500">điểm</span>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">Velocity trung bình</div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-slate-900 tabular-nums">{velocity}</span>
            <span className="text-xs text-slate-500">điểm/ngày</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500 truncate">{statusText}</div>
        </div>
      </div>

      <section className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Biểu đồ Burndown theo Sprint</h2>
            <p className="text-xs text-slate-500 mt-0.5">Đường lý tưởng (nét đứt) so sánh với đường thực tế (nét liền)</p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 border border-blue-200 text-[11px] font-semibold text-blue-700 shrink-0">
            <Flag className="w-3 h-3" />
            {metrics.targetListTitle}
          </span>
        </div>
        <BurndownChartCanvas data={series} unitLabel="điểm" height={320} />
      </section>

      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-slate-500" />
            <h2 className="text-base font-bold text-slate-900">Dữ liệu Snapshot</h2>
          </div>
          <span className="text-xs text-slate-500 tabular-nums">
            {series.length} bản ghi · {projects.length} dự án đang quản lý
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500">
                <th className="py-3 px-4">Ngày</th>
                <th className="py-3 px-4 text-right">Lý tưởng</th>
                <th className="py-3 px-4 text-right">Thực tế</th>
                <th className="py-3 px-4 text-right">Chênh lệch</th>
                <th className="py-3 px-4 text-right">Ghi nhận lúc</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {series.map((p, idx) => {
                const diff = p.actualRemaining - p.idealRemaining;
                const ok = diff <= 0;
                return (
                  <tr key={idx} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 font-semibold text-slate-800">{p.dayLabel}</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600">{p.idealRemaining}</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-900 font-semibold">{p.actualRemaining}</td>
                    <td className={`py-3 px-4 text-right font-mono tabular-nums font-semibold ${ok ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {diff > 0 ? `+${diff}` : diff}
                    </td>
                    <td className="py-3 px-4 text-right text-xs text-slate-500 tabular-nums">{p.recordedAt ?? '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
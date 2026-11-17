import React, { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Award,
  CheckSquare,
  FolderKanban,
  MessageSquare,
  Send,
  Target,
  TrendingDown,
} from 'lucide-react';
import { ActiveView, BurndownPoint, Member, WorkspaceState } from '../types';
import { buildSystemBurndownSeries, calculateWorkspaceMetrics } from '../utils/metrics';
import { BurndownChartCanvas } from './BurndownChartCanvas';

interface DashboardViewProps {
  state: WorkspaceState;
  onOpenProjectBoard: (projectId: string) => void;
  onNavigateView: (view: ActiveView) => void;
  onAddLogComment: (projectId: string, cardId: string, logId: string, content: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  state,
  onOpenProjectBoard,
  onNavigateView,
  onAddLogComment,
}) => {
  const wsMetrics = useMemo(() => calculateWorkspaceMetrics(state.projects), [state.projects]);
  const [replyingLogId, setReplyingLogId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const memberMap = useMemo(() => {
    const map = new Map<string, Member>();
    state.members.forEach((m) => map.set(m.id, m));
    return map;
  }, [state.members]);

  // System-wide aggregated Burndown (live-synced with Story Points)
  const systemBurndown: BurndownPoint[] = useMemo(
    () => buildSystemBurndownSeries(state.projects),
    [state.projects]
  );

  // Collect recent card logs across all projects for quick review & commenting
  const recentCardLogs = useMemo(() => {
    const items: {
      projectId: string;
      projectName: string;
      cardId: string;
      cardTitle: string;
      log: WorkspaceState['projects'][0]['cards'][0]['logs'][0];
    }[] = [];

    for (const proj of state.projects) {
      for (const card of proj.cards) {
        for (const log of card.logs) {
          items.push({
            projectId: proj.id,
            projectName: proj.name,
            cardId: card.id,
            cardTitle: card.title,
            log,
          });
        }
      }
    }
    return items.slice(0, 5);
  }, [state.projects]);

  const topProject = wsMetrics.rankedProjects[0];

  const handleSubmitReply = (projectId: string, cardId: string, logId: string) => {
    if (!replyText.trim()) return;
    onAddLogComment(projectId, cardId, logId, replyText.trim());
    setReplyText('');
    setReplyingLogId(null);
  };

  return (
    <div className="max-w-[1380px] mx-auto px-4 lg:px-6 py-6 space-y-6">
      {/* Page Intro */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Bảng điều khiển hiệu suất toàn hệ thống
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Theo dõi hiệu suất mục tiêu theo từng dự án, xếp hạng tiến độ và xu hướng Burndown tổng thể.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onNavigateView('burndown')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors whitespace-nowrap"
          >
            <TrendingDown className="w-3.5 h-3.5 text-blue-600" />
            <span>Phân tích Burndown</span>
          </button>
          <button
            onClick={() => onNavigateView('automation')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors whitespace-nowrap"
          >
            <span>Power-Ups & Lệnh</span>
          </button>
        </div>
      </div>

      {/* 4-Column KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Tổng số dự án đang quản lý</span>
            <FolderKanban className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 tabular-nums">
              {wsMetrics.totalProjects}
            </span>
            <span className="text-xs text-slate-500">dự án hoạt động</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 tabular-nums">
            Tổng cộng {wsMetrics.totalCards} thẻ công việc · {wsMetrics.totalBugs} Issue/Bug
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Trung bình cộng tất cả dự án</span>
            <Target className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-blue-600 tabular-nums">
              {wsMetrics.averageEfficiencyPercent}%
            </span>
            <span className="text-xs text-slate-500">hiệu suất mục tiêu</span>
          </div>
          <div className="mt-2.5 w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, wsMetrics.averageEfficiencyPercent)}%` }}
            />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Hoàn thành mục tiêu & Checklist</span>
            <CheckSquare className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 tabular-nums">
              {wsMetrics.totalCompletedTargetCards}/{wsMetrics.totalCards}
            </span>
            <span className="text-xs text-slate-500">thẻ đạt đích</span>
          </div>
          <div className="mt-2 text-xs text-emerald-700 font-medium tabular-nums">
            Checklist trung bình: {wsMetrics.averageChecklistPercent}% hoàn tất
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Dự án dẫn đầu bảng xếp hạng</span>
            <Award className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2.5">
            <div className="text-base font-bold text-slate-900 truncate">
              {topProject ? topProject.projectName : 'Chưa có dự án'}
            </div>
            <div className="mt-1 flex items-center justify-between text-xs">
              <span className="text-slate-500 truncate">
                {topProject ? `Đích: ${topProject.targetListTitle}` : ''}
              </span>
              <span className="font-mono font-semibold text-emerald-700 tabular-nums">
                {topProject ? `${topProject.efficiencyPercent}%` : '0%'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Split: Ranking Table + System Burndown */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Project Ranking Leaderboard (7 cols) */}
        <section className="xl:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Bảng xếp hạng hiệu suất dự án
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Đánh giá % dựa trên tỷ lệ thẻ đạt danh sách mục tiêu (ví dụ: Done = 100%)
              </p>
            </div>
            <span className="text-xs font-mono font-semibold text-slate-600 tabular-nums shrink-0">
              TB hệ thống: {wsMetrics.averageEfficiencyPercent}%
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500">
                  <th className="py-3 px-4 w-12 text-center">Hạng</th>
                  <th className="py-3 px-4">Dự án & Sprint</th>
                  <th className="py-3 px-4">Danh sách đích</th>
                  <th className="py-3 px-4 text-right">Thẻ đạt đích</th>
                  <th className="py-3 px-4 text-right">Checklist</th>
                  <th className="py-3 px-4 w-44">Hiệu suất (%)</th>
                  <th className="py-3 px-4 w-20 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {wsMetrics.rankedProjects.map((item, idx) => {
                  const isPerfect = item.efficiencyPercent >= 100;
                  const barColor = isPerfect
                    ? 'bg-emerald-600'
                    : item.efficiencyPercent >= 60
                    ? 'bg-blue-600'
                    : 'bg-amber-500';
                  return (
                    <tr
                      key={item.projectId}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-3.5 px-4 text-center font-mono font-bold tabular-nums text-slate-700">
                        #{idx + 1}
                      </td>
                      <td className="py-3.5 px-4 max-w-[230px]">
                        <div className="font-semibold text-slate-900 truncate">
                          {item.projectName}
                        </div>
                        <div className="text-xs text-slate-500 truncate mt-0.5">
                          {item.projectCode} · {item.sprintName}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs font-medium text-slate-700 whitespace-nowrap">
                        {item.targetListTitle}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-xs text-slate-700 tabular-nums whitespace-nowrap">
                        {item.cardsInTargetList}/{item.targetGoalCards}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">
                        {item.checklistEfficiencyPercent}%
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                              style={{ width: `${Math.min(100, item.efficiencyPercent)}%` }}
                            />
                          </div>
                          <span
                            className={`font-mono text-xs font-bold tabular-nums w-12 text-right ${
                              isPerfect ? 'text-emerald-700' : 'text-slate-900'
                            }`}
                          >
                            {item.efficiencyPercent}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => onOpenProjectBoard(item.projectId)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 whitespace-nowrap"
                        >
                          <span>Mở</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* System-Wide Burndown Chart (5 cols) */}
        <section className="xl:col-span-5 bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Burndown tổng quan hệ thống
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Tổng hợp Story Points còn lại của {wsMetrics.totalProjects} dự án theo ngày
              </p>
            </div>
            <button
              onClick={() => onNavigateView('burndown')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 whitespace-nowrap"
            >
              Chi tiết
            </button>
          </div>
          <BurndownChartCanvas data={systemBurndown} unitLabel="điểm" height={265} />
        </section>
      </div>

      {/* Bottom Row: Project Efficiency Cards + Recent Commentable Logs */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Per-Project Efficiency Breakdown (7 cols) */}
        <section className="xl:col-span-7 bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Hiệu suất chi tiết từng dự án
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                So sánh tiến độ mục tiêu danh sách, mức hoàn tất checklist và lỗi phát sinh
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {wsMetrics.rankedProjects.map((m) => (
              <div
                key={m.projectId}
                className="border border-slate-200 rounded-lg p-4 hover:border-blue-300 transition-colors flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-bold text-slate-900 line-clamp-1">
                      {m.projectName}
                    </h3>
                    <span
                      className={`font-mono text-sm font-bold tabular-nums shrink-0 ${
                        m.efficiencyPercent >= 100
                          ? 'text-emerald-700'
                          : m.efficiencyPercent >= 60
                          ? 'text-blue-700'
                          : 'text-amber-700'
                      }`}
                    >
                      {m.efficiencyPercent}%
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1 tabular-nums">
                    Mục tiêu: {m.targetListTitle} ({m.cardsInTargetList}/{m.targetGoalCards} thẻ) · Checklist {m.checklistEfficiencyPercent}%
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        m.efficiencyPercent >= 100 ? 'bg-emerald-600' : 'bg-blue-600'
                      }`}
                      style={{ width: `${Math.min(100, m.efficiencyPercent)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500 tabular-nums">
                    <span>
                      Story Points: {m.completedStoryPoints}/{m.totalStoryPoints} · Bug: {m.bugCount}
                    </span>
                    <button
                      onClick={() => onOpenProjectBoard(m.projectId)}
                      className="font-semibold text-blue-600 hover:text-blue-800"
                    >
                      Vào bảng Kanban
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Recent Logs with Inline Commenting (5 cols) */}
        <section className="xl:col-span-5 bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Nhật ký hoạt động & Bình luận theo Log
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Phản hồi trực tiếp trên từng bản ghi log để tăng hiệu quả phối hợp
              </p>
            </div>
            <button
              onClick={() => onNavigateView('logs')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 whitespace-nowrap"
            >
              Xem tất cả
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {recentCardLogs.map((entry) => {
              const actor = memberMap.get(entry.log.actorId);
              const isReplying = replyingLogId === entry.log.id;
              return (
                <div key={entry.log.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-2 text-xs">
                    <div className="min-w-0">
                      <span className="font-semibold text-slate-900">
                        {actor ? actor.name : 'Hệ thống Tự động'}
                      </span>{' '}
                      <span className="text-slate-600">{entry.log.action}</span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400 shrink-0 tabular-nums">
                      {entry.log.createdAt}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                    {entry.projectName} · {entry.cardTitle}
                  </div>

                  {entry.log.comments.length > 0 && (
                    <div className="mt-2 space-y-1.5 pl-3 border-l border-slate-200">
                      {entry.log.comments.map((cm) => {
                        const author = memberMap.get(cm.authorId);
                        return (
                          <div key={cm.id} className="text-xs bg-slate-50 rounded-md px-2.5 py-1.5">
                            <span className="font-semibold text-slate-800">
                              {author?.name ?? 'Thành viên'}:
                            </span>{' '}
                            <span className="text-slate-600">{cm.content}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="mt-2 flex items-center gap-3">
                    <button
                      onClick={() => {
                        setReplyingLogId(isReplying ? null : entry.log.id);
                        setReplyText('');
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-blue-600"
                    >
                      <MessageSquare className="w-3 h-3" />
                      <span>Bình luận log ({entry.log.comments.length})</span>
                    </button>
                  </div>

                  {isReplying && (
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="text"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSubmitReply(entry.projectId, entry.cardId, entry.log.id);
                          }
                        }}
                        placeholder="Nhập bình luận cho log này..."
                        className="flex-1 text-xs px-2.5 py-1.5 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={() => handleSubmitReply(entry.projectId, entry.cardId, entry.log.id)}
                        className="p-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700"
                        title="Gửi bình luận"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};

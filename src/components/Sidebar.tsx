import React from 'react';
import {
  Activity,
  BarChart3,
  Kanban,
  LayoutDashboard,
  Pencil,
  Plus,
  Star,
  Trash2,
  TrendingDown,
  Zap,
  X,
} from 'lucide-react';
import { ActiveView, Project } from '../types';
import { calculateProjectMetrics } from '../utils/metrics';

interface SidebarProps {
  projects: Project[];
  activeProjectId: string;
  activeView: ActiveView;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onSelectView: (view: ActiveView) => void;
  onSelectProject: (projectId: string) => void;
  onOpenNewProject: () => void;
  onEditProject: (project: Project, confirmDelete?: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  projects,
  activeProjectId,
  activeView,
  isOpenMobile,
  onCloseMobile,
  onSelectView,
  onSelectProject,
  onOpenNewProject,
  onEditProject,
}) => {
  const navItems: { id: ActiveView; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Tổng quan & Xếp hạng', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'board', label: 'Bảng Kanban', icon: <Kanban className="w-4 h-4" /> },
    { id: 'burndown', label: 'Biểu đồ Burndown', icon: <TrendingDown className="w-4 h-4" /> },
    { id: 'automation', label: 'Power-Ups & Lệnh', icon: <Zap className="w-4 h-4" /> },
    { id: 'logs', label: 'Nhật ký & Bình luận', icon: <Activity className="w-4 h-4" /> },
  ];

  const content = (
    <div className="flex flex-col h-full bg-white border-r border-slate-200 w-64 select-none">
      {/* Brand */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
            <BarChart3 className="w-4 h-4" />
          </div>
          <span className="text-base font-bold tracking-tight text-slate-900 truncate">
            AgileFlow
          </span>
        </div>
        <button
          onClick={onCloseMobile}
          className="lg:hidden p-1.5 rounded-md text-slate-500 hover:bg-slate-100"
          aria-label="Đóng thanh điều hướng"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main Navigation */}
      <div className="p-3 space-y-1">
        <div className="px-2.5 pb-1 text-xs font-semibold text-slate-400">
          Không gian làm việc
        </div>
        {navItems.map((item) => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                onSelectView(item.id);
                onCloseMobile();
              }}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span className={isActive ? 'text-blue-600' : 'text-slate-400'}>{item.icon}</span>
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </div>

      <div className="mx-3 border-t border-slate-100" />

      {/* Projects List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1 kanban-scroll">
        <div className="flex items-center justify-between px-2.5 pb-1.5">
          <span className="text-xs font-semibold text-slate-400">
            Dự án ({projects.length})
          </span>
          <button
            onClick={onOpenNewProject}
            className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-blue-600 transition-colors"
            title="Tạo dự án mới"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {projects.map((proj) => {
          const metrics = calculateProjectMetrics(proj);
          const isSelected = proj.id === activeProjectId;
          return (
            <div
              key={proj.id}
              className={`group rounded-lg transition-colors flex items-center justify-between gap-1 px-2.5 py-2 ${
                isSelected
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  onSelectProject(proj.id);
                  if (activeView === 'dashboard') {
                    onSelectView('board');
                  }
                  onCloseMobile();
                }}
                className="min-w-0 flex-1 text-left"
              >
                <div className="flex items-center gap-1.5">
                  {proj.starred && (
                    <Star
                      className={`w-3 h-3 shrink-0 ${
                        isSelected ? 'text-amber-400 fill-amber-400' : 'text-amber-500 fill-amber-500'
                      }`}
                    />
                  )}
                  <span className="text-xs font-semibold truncate">{proj.name}</span>
                </div>
                <div
                  className={`text-[11px] mt-0.5 tabular-nums truncate ${
                    isSelected ? 'text-slate-300' : 'text-slate-400'
                  }`}
                >
                  {metrics.cardsInTargetList}/{metrics.targetGoalCards} {metrics.targetListTitle} · {metrics.efficiencyPercent}%
                </div>
              </button>

              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditProject(proj, false);
                  }}
                  title="Đổi tên dự án"
                  className={`p-1 rounded opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity ${
                    isSelected
                      ? 'hover:bg-slate-700 text-slate-300'
                      : 'hover:bg-slate-200 text-slate-500'
                  }`}
                >
                  <Pencil className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditProject(proj, true);
                  }}
                  title="Xóa dự án"
                  className={`p-1 rounded opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity ${
                    isSelected
                      ? 'hover:bg-rose-500/20 text-rose-300'
                      : 'hover:bg-rose-100 text-rose-600'
                  }`}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom quick action */}
      <div className="p-3 border-t border-slate-200 shrink-0">
        <button
          onClick={onOpenNewProject}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors whitespace-nowrap"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Tạo dự án mới</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block shrink-0 h-screen sticky top-0 z-30">{content}</aside>
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-slate-900/40" onClick={onCloseMobile} />
          <div className="relative z-10 h-full">{content}</div>
        </div>
      )}
    </>
  );
};

import React from 'react';
import { Download, Menu, Plus } from 'lucide-react';
import { ActiveView, Project } from '../types';

interface TopBarProps {
  activeView: ActiveView;
  activeProject?: Project;
  projects: Project[];
  onOpenMobileMenu: () => void;
  onSelectProject: (projectId: string) => void;
  onOpenExportModal: () => void;
  onOpenNewProject: () => void;
}

const VIEW_LABELS: Record<ActiveView, string> = {
  dashboard: 'Tổng quan & Bảng xếp hạng',
  board: 'Bảng Kanban',
  burndown: 'Biểu đồ Burndown',
  automation: 'Power-Ups & Tự động hóa',
  logs: 'Nhật ký hoạt động & Bình luận',
};

export const TopBar: React.FC<TopBarProps> = ({
  activeView,
  activeProject,
  projects,
  onOpenMobileMenu,
  onSelectProject,
  onOpenExportModal,
  onOpenNewProject,
}) => {
  return (
    <header className="h-14 bg-white border-b border-slate-200 px-4 lg:px-6 flex items-center justify-between gap-4 sticky top-0 z-20 shrink-0">
      {/* Left: Breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 -ml-1 rounded-lg text-slate-600 hover:bg-slate-100"
          aria-label="Mở menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-sm min-w-0">
          <span className="text-slate-400 font-medium hidden sm:inline whitespace-nowrap">
            Không gian Agile
          </span>
          <span className="text-slate-300 hidden sm:inline">/</span>
          {activeView !== 'dashboard' && activeProject ? (
            <>
              <select
                value={activeProject.id}
                onChange={(e) => onSelectProject(e.target.value)}
                aria-label="Chọn dự án"
                className="font-semibold text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md px-2.5 py-1 text-xs sm:text-sm max-w-[200px] sm:max-w-[280px] truncate focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <span className="text-slate-300 hidden md:inline">/</span>
              <span className="text-slate-600 font-medium hidden md:inline whitespace-nowrap truncate">
                {VIEW_LABELS[activeView]}
              </span>
            </>
          ) : (
            <span className="font-semibold text-slate-900 whitespace-nowrap truncate">
              {VIEW_LABELS[activeView]}
            </span>
          )}
        </div>
      </div>

      {/* Right: Primary Actions */}
      <div className="flex items-center gap-2.5 shrink-0">
        <button
          onClick={onOpenExportModal}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
        >
          <Download className="w-3.5 h-3.5 text-slate-500" />
          <span className="hidden sm:inline">Xuất dữ liệu</span>
        </button>

        <button
          onClick={onOpenNewProject}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Dự án mới</span>
        </button>
      </div>
    </header>
  );
};

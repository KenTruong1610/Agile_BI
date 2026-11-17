import React, { useState } from 'react';
import {
  AlertTriangle,
  Download,
  FileJson,
  FileSpreadsheet,
  Pencil,
  RotateCcw,
  Save,
  Target,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { Project, ProjectGoalConfig, WorkspaceState } from '../types';
import {
  calculateProjectMetrics,
  exportDataToJSON,
  exportProjectToCSV,
  exportWorkspaceToCSV,
} from '../utils/metrics';

interface NewProjectModalProps {
  onClose: () => void;
  onCreateProject: (data: {
    name: string;
    code: string;
    sprintName: string;
    description: string;
    listNames: string[];
    targetListName: string;
  }) => void;
}

export const NewProjectModal: React.FC<NewProjectModalProps> = ({
  onClose,
  onCreateProject,
}) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('PRJ-05');
  const [sprintName, setSprintName] = useState('Sprint 01');
  const [description, setDescription] = useState('');
  const [listsInput, setListsInput] = useState(
    'Product Backlog, Sprint Backlog, To Do, In Progress, In Review, Done, Issue/Bug'
  );
  const [targetListName, setTargetListName] = useState('Done');

  const parsedLists = listsInput
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || parsedLists.length === 0) return;
    onCreateProject({
      name: name.trim(),
      code: code.trim() || 'PRJ',
      sprintName: sprintName.trim() || 'Sprint 01',
      description: description.trim(),
      listNames: parsedLists,
      targetListName: parsedLists.includes(targetListName)
        ? targetListName
        : parsedLists[parsedLists.length - 1],
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg overflow-hidden shadow-xl">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">Tạo dự án Kanban mới</h2>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Tên dự án *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="VD: Hệ thống Đặt vé Sự kiện"
                className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Mã dự án</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full text-sm font-mono px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Sprint hiện tại</label>
            <input
              type="text"
              value={sprintName}
              onChange={(e) => setSprintName(e.target.value)}
              className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Danh sách luồng công việc (phân tách bằng dấu phẩy)
            </label>
            <input
              type="text"
              value={listsInput}
              onChange={(e) => setListsInput(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Danh sách mục tiêu (đạt 100% hiệu suất khi thẻ về đây)
            </label>
            <select
              value={targetListName}
              onChange={(e) => setTargetListName(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
            >
              {parsedLists.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Mô tả ngắn</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mục tiêu và phạm vi của dự án..."
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
            >
              Tạo dự án
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface GoalConfigModalProps {
  project: Project;
  onClose: () => void;
  onSaveGoal: (goalConfig: ProjectGoalConfig) => void;
}

export const GoalConfigModal: React.FC<GoalConfigModalProps> = ({
  project,
  onClose,
  onSaveGoal,
}) => {
  const [targetListId, setTargetListId] = useState(project.goalConfig.targetListId);
  const [goalMode, setGoalMode] = useState<ProjectGoalConfig['goalMode']>(
    project.goalConfig.goalMode
  );
  const [targetCardCount, setTargetCardCount] = useState(
    project.goalConfig.targetCardCount || Math.max(1, project.cards.length)
  );

  const previewProject: Project = {
    ...project,
    goalConfig: { targetListId, goalMode, targetCardCount },
  };
  const previewMetrics = calculateProjectMetrics(previewProject);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md overflow-hidden shadow-xl">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">
              Cấu hình mục tiêu hiệu suất (%)
            </h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Hiệu suất của dự án được tính theo tỷ lệ số thẻ đã nằm trong{' '}
            <strong>Danh sách mục tiêu</strong> so với mục tiêu đề ra. Ví dụ: tất cả thẻ nằm trong danh sách <strong>Done</strong> thì hiệu suất đạt <strong>100%</strong>.
          </p>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Chọn danh sách mục tiêu (Đích)
            </label>
            <select
              value={targetListId}
              onChange={(e) => setTargetListId(e.target.value)}
              className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg bg-white"
            >
              {project.lists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title} ({project.cards.filter((c) => c.listId === l.id).length} thẻ hiện có)
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 block">
              Cách tính mục tiêu tổng 100%
            </label>
            <label className="flex items-start gap-2.5 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
              <input
                type="radio"
                name="goalMode"
                checked={goalMode === 'all_cards'}
                onChange={() => setGoalMode('all_cards')}
                className="mt-0.5 text-blue-600"
              />
              <div className="text-xs">
                <div className="font-semibold text-slate-900">
                  Toàn bộ thẻ trong dự án ({project.cards.length} thẻ)
                </div>
                <div className="text-slate-500 mt-0.5">
                  Đạt 100% khi 100% thẻ hiện có của dự án nằm trong danh sách đích.
                </div>
              </div>
            </label>

            <label className="flex items-start gap-2.5 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
              <input
                type="radio"
                name="goalMode"
                checked={goalMode === 'fixed_count'}
                onChange={() => setGoalMode('fixed_count')}
                className="mt-0.5 text-blue-600"
              />
              <div className="text-xs flex-1">
                <div className="font-semibold text-slate-900">Số lượng thẻ mục tiêu cố định</div>
                <div className="text-slate-500 mt-0.5">
                  Đặt số thẻ KPI cần đưa vào danh sách đích (VD: 5 thẻ = 100%).
                </div>
                {goalMode === 'fixed_count' && (
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={targetCardCount}
                    onChange={(e) => setTargetCardCount(Math.max(1, Number(e.target.value) || 1))}
                    className="mt-2 w-28 text-xs font-mono px-2.5 py-1.5 border border-slate-300 rounded-md"
                  />
                )}
              </div>
            </label>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between text-xs">
            <span className="text-slate-600">Hiệu suất dự kiến sau khi áp dụng:</span>
            <span className="font-mono font-bold text-base text-blue-700 tabular-nums">
              {previewMetrics.cardsInTargetList}/{previewMetrics.targetGoalCards} thẻ ·{' '}
              {previewMetrics.efficiencyPercent}%
            </span>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Hủy
            </button>
            <button
              onClick={() => {
                onSaveGoal({ targetListId, goalMode, targetCardCount });
                onClose();
              }}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
            >
              Lưu mục tiêu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface ExportDataModalProps {
  state: WorkspaceState;
  activeProject?: Project;
  onClose: () => void;
  onImportJSON: (newState: WorkspaceState) => void;
  onResetSeed: () => void;
}

export const ExportDataModal: React.FC<ExportDataModalProps> = ({
  state,
  activeProject,
  onClose,
  onImportJSON,
  onResetSeed,
}) => {
  const [importError, setImportError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (parsed && Array.isArray(parsed.projects) && parsed.projects.length > 0) {
          onImportJSON(parsed as WorkspaceState);
          onClose();
        } else {
          setImportError('Tệp JSON không đúng định dạng AgileFlow.');
        }
      } catch {
        setImportError('Không thể đọc tệp JSON. Vui lòng kiểm tra lại.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg overflow-hidden shadow-xl">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">Xuất & Sao lưu dữ liệu đơn giản</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          {activeProject && (
            <button
              onClick={() => exportProjectToCSV(activeProject)}
              className="w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <div className="text-sm font-bold text-slate-900">
                    Xuất CSV dự án đang mở ({activeProject.code})
                  </div>
                  <div className="text-xs text-slate-500">
                    Bao gồm toàn bộ thẻ, checklist %, màu thẻ, số log và tổng kết hiệu suất.
                  </div>
                </div>
              </div>
              <span className="text-xs font-semibold text-blue-600 shrink-0">Tải CSV</span>
            </button>
          )}

          <button
            onClick={() => exportWorkspaceToCSV(state)}
            className="w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="w-5 h-5 text-blue-600 shrink-0" />
              <div>
                <div className="text-sm font-bold text-slate-900">
                  Xuất CSV Bảng xếp hạng toàn hệ thống
                </div>
                <div className="text-xs text-slate-500">
                  Xuất danh sách {state.projects.length} dự án, xếp hạng và trung bình cộng hiệu suất.
                </div>
              </div>
            </div>
            <span className="text-xs font-semibold text-blue-600 shrink-0">Tải CSV</span>
          </button>

          <button
            onClick={() => exportDataToJSON(state, 'agileflow_workspace_backup.json')}
            className="w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <FileJson className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <div className="text-sm font-bold text-slate-900">
                  Sao lưu toàn bộ dữ liệu (JSON)
                </div>
                <div className="text-xs text-slate-500">
                  Lưu trữ dự án, danh sách, thẻ, quy tắc Power-Ups và lịch sử log.
                </div>
              </div>
            </div>
            <span className="text-xs font-semibold text-blue-600 shrink-0">Tải JSON</span>
          </button>

          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>Nhập lại từ JSON</span>
              <input type="file" accept=".json" onChange={handleFileChange} className="hidden" />
            </label>

            <button
              onClick={() => {
                onResetSeed();
                onClose();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-rose-200 hover:bg-rose-50 text-xs font-semibold text-rose-700"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Khôi phục dữ liệu mẫu</span>
            </button>
          </div>

          {importError && (
            <div className="text-xs text-rose-600 font-medium">{importError}</div>
          )}
        </div>
      </div>
    </div>
  );
};

interface EditProjectModalProps {
  project: Project;
  initialConfirmDelete?: boolean;
  onClose: () => void;
  onSaveProject: (
    projectId: string,
    updates: { name: string; code: string; sprintName: string; description: string }
  ) => void;
  onDeleteProject: (projectId: string) => void;
}

export const EditProjectModal: React.FC<EditProjectModalProps> = ({
  project,
  initialConfirmDelete = false,
  onClose,
  onSaveProject,
  onDeleteProject,
}) => {
  const [name, setName] = useState(project.name);
  const [code, setCode] = useState(project.code);
  const [sprintName, setSprintName] = useState(project.sprintName);
  const [description, setDescription] = useState(project.description);
  const [confirmDelete, setConfirmDelete] = useState(initialConfirmDelete);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSaveProject(project.id, {
      name: name.trim(),
      code: code.trim() || project.code,
      sprintName: sprintName.trim() || project.sprintName,
      description: description.trim(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg overflow-hidden shadow-xl">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Pencil className="w-4 h-4 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">
              Đổi tên & Quản lý dự án
            </h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Tên dự án *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Mã dự án</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full text-sm font-mono px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Sprint hiện tại
            </label>
            <input
              type="text"
              value={sprintName}
              onChange={(e) => setSprintName(e.target.value)}
              className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Mô tả dự án</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>

          {/* Delete Project Section with Confirmation */}
          <div className="pt-3 border-t border-slate-100">
            {!confirmDelete ? (
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-slate-500">
                  Xóa dự án sẽ xóa toàn bộ danh sách và {project.cards.length} thẻ bên trong.
                </span>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa dự án</span>
                </button>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 space-y-2.5">
                <div className="flex items-start gap-2 text-xs text-rose-900 font-semibold">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>
                    Bạn chắc chắn muốn xóa dự án "{project.name}"? Thao tác này không thể hoàn tác.
                  </span>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="px-3 py-1.5 rounded-lg bg-white border border-rose-200 text-slate-700 text-xs font-semibold hover:bg-slate-50"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onDeleteProject(project.id);
                      onClose();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
                  >
                    Xác nhận xóa vĩnh viễn
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Đóng
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Lưu thay đổi</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


import React, { useMemo, useState } from 'react';
import {
  CalendarClock, Check, Clock, ListChecks, MessageSquare, Pause, Play, Plus,
  Power, Send, Sparkles, Terminal, Trash2, Workflow, X, Zap,
} from 'lucide-react';
import {
  AutomationRule, CardSurfaceColorKey, CommandExecutionLog, CustomFieldAction,
  Member, Project, QuickButton, ScheduledCommand,
} from '../types';

interface AutomationHubViewProps {
  project: Project;
  members: Member[];
  commandLogs: CommandExecutionLog[];
  onTogglePowerUp: (puId: string) => void;
  onAddQuickButton: (btn: Omit<QuickButton, 'id' | 'usageCount'>) => void;
  onDeleteQuickButton: (btnId: string) => void;
  onAddRule: (rule: Omit<AutomationRule, 'id' | 'runCount'>) => void;
  onToggleRule: (ruleId: string) => void;
  onDeleteRule: (ruleId: string) => void;
  onAddCustomFieldDef: (name: string, options: string[]) => void;
  onAddCustomFieldAction: (act: Omit<CustomFieldAction, 'id' | 'runCount'>) => void;
  onToggleCustomFieldAction: (actId: string) => void;
  onAddScheduledCommand: (cmd: Omit<ScheduledCommand, 'id' | 'runCount' | 'status'>) => void;
  onToggleScheduledCommand: (cmdId: string) => void;
  onRunScheduledCommandNow: (cmdId: string) => void;
  onAddCommandLogComment: (cmdLogId: string, content: string) => void;
  onOpenExportModal: () => void;
}

type TabId = 'powerups' | 'buttons' | 'rules' | 'customfields' | 'commands' | 'logs';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'powerups', label: 'Power-Ups', icon: <Zap className="w-3.5 h-3.5" /> },
  { id: 'buttons', label: 'Quick Buttons', icon: <Sparkles className="w-3.5 h-3.5" /> },
  { id: 'rules', label: 'Automation Rules', icon: <Workflow className="w-3.5 h-3.5" /> },
  { id: 'customfields', label: 'Custom Fields', icon: <ListChecks className="w-3.5 h-3.5" /> },
  { id: 'commands', label: 'Scheduled Commands', icon: <Clock className="w-3.5 h-3.5" /> },
  { id: 'logs', label: 'Command Logs', icon: <Terminal className="w-3.5 h-3.5" /> },
];

const LIST_TITLE_BY_ACTION: Record<CardSurfaceColorKey, string> = {
  default: 'Mặc định', blue: 'Xanh dương', emerald: 'Xanh lá',
  amber: 'Vàng', rose: 'Đỏ hồng', violet: 'Tím',
};

export const AutomationHubView: React.FC<AutomationHubViewProps> = ({
  project, members, commandLogs,
  onTogglePowerUp, onAddQuickButton, onDeleteQuickButton,
  onAddRule, onToggleRule, onDeleteRule,
  onAddCustomFieldDef, onAddCustomFieldAction, onToggleCustomFieldAction,
  onAddScheduledCommand, onToggleScheduledCommand, onRunScheduledCommandNow,
  onAddCommandLogComment, onOpenExportModal,
}) => {
  const [activeTab, setActiveTab] = useState<TabId>('powerups');
  const sortedLists = useMemo(() => [...project.lists].sort((a, b) => a.order - b.order), [project.lists]);
  const memberMap = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
  const projectLogs = useMemo(() => commandLogs.filter((l) => l.projectId === project.id), [commandLogs, project.id]);

  const [showAddButton, setShowAddButton] = useState(false);
  const [newBtn, setNewBtn] = useState({
    name: '', description: '',
    actionType: 'move_to_target_and_complete' as QuickButton['actionType'],
    targetListId: project.goalConfig.targetListId,
  });

  const [showAddRule, setShowAddRule] = useState(false);
  const [newRule, setNewRule] = useState({
    name: '',
    triggerType: 'card_moved_to_list' as AutomationRule['triggerType'],
    triggerValue: project.goalConfig.targetListId,
    actionType: 'complete_checklists' as AutomationRule['actionType'],
    actionValue: 'all',
  });

  const [showAddCf, setShowAddCf] = useState(false);
  const [newCfName, setNewCfName] = useState('');
  const [newCfOptions, setNewCfOptions] = useState('Thấp, Trung bình, Cao');

  const [showAddCfa, setShowAddCfa] = useState(false);
  const [newCfa, setNewCfa] = useState({
    name: '', fieldId: project.customFieldDefs[0]?.id ?? '', matchValue: '',
    actionType: 'set_card_color' as CustomFieldAction['actionType'],
    actionValue: 'rose',
  });

  const [showAddCmd, setShowAddCmd] = useState(false);
  const [newCmd, setNewCmd] = useState({
    name: '', scheduleLabel: '09:00 Mỗi ngày', scheduleCron: '0 9 * * *',
    commandType: 'audit_overdue' as ScheduledCommand['commandType'],
    permissionLevel: 'system' as ScheduledCommand['permissionLevel'],
  });

  const [replyingLogId, setReplyingLogId] = useState<string | null>(null);
  const [logReplyText, setLogReplyText] = useState('');

  const submitButton = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBtn.name.trim()) return;
    onAddQuickButton({
      name: newBtn.name.trim(),
      description: newBtn.description.trim() || 'Nút thao tác nhanh',
      scope: 'card',
      actionType: newBtn.actionType,
      targetListId: newBtn.actionType === 'move_to_target_and_complete' ? newBtn.targetListId : undefined,
    });
    setNewBtn({ ...newBtn, name: '', description: '' });
    setShowAddButton(false);
  };

  const submitRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRule.name.trim()) return;
    onAddRule({ name: newRule.name.trim(), enabled: true, triggerType: newRule.triggerType, triggerValue: newRule.triggerValue, actionType: newRule.actionType, actionValue: newRule.actionValue });
    setNewRule({ ...newRule, name: '' });
    setShowAddRule(false);
  };

  const submitCfDef = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCfName.trim()) return;
    const opts = newCfOptions.split(',').map((s) => s.trim()).filter(Boolean);
    onAddCustomFieldDef(newCfName.trim(), opts);
    setNewCfName('');
    setShowAddCf(false);
  };

  const submitCfa = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCfa.name.trim() || !newCfa.fieldId) return;
    onAddCustomFieldAction({ name: newCfa.name.trim(), enabled: true, fieldId: newCfa.fieldId, matchValue: newCfa.matchValue, actionType: newCfa.actionType, actionValue: newCfa.actionValue });
    setNewCfa({ ...newCfa, name: '', matchValue: '' });
    setShowAddCfa(false);
  };

  const submitCmd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCmd.name.trim()) return;
    onAddScheduledCommand({ name: newCmd.name.trim(), scheduleCron: newCmd.scheduleCron, scheduleLabel: newCmd.scheduleLabel, enabled: true, commandType: newCmd.commandType, permissionLevel: newCmd.permissionLevel });
    setNewCmd({ ...newCmd, name: '' });
    setShowAddCmd(false);
  };

  const btnBase = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors';

  return (
    <div className="max-w-[1380px] mx-auto px-4 lg:px-6 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Power-Ups & Tự động hóa</h1>
          <p className="text-sm text-slate-500 mt-1">
            Quản lý Power-Ups, nút thao tác nhanh, quy tắc tự động, custom fields và lệnh chạy theo lịch cho{' '}
            <strong className="text-slate-700">{project.name}</strong>
          </p>
        </div>
        <button onClick={onOpenExportModal} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0">
          <span>Xuất dữ liệu</span>
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-1.5 flex flex-wrap items-center gap-1">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${isActive ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Power-Ups */}
      {activeTab === 'powerups' && (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {project.powerUps.length === 0 ? (
            <div className="md:col-span-2 text-center py-10 text-sm text-slate-400 border border-dashed border-slate-200 rounded-xl">
              Dự án chưa kích hoạt Power-Up nào.
            </div>
          ) : (
            project.powerUps.map((pu) => (
              <div key={pu.id} className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <Power className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-slate-900 truncate">{pu.name}</h3>
                        <span className="text-[11px] text-slate-500">{pu.category}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => onTogglePowerUp(pu.id)}
                    className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold border ${pu.enabled ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-500'}`}
                  >
                    {pu.enabled ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                    {pu.enabled ? 'Đang bật' : 'Đang tắt'}
                  </button>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{pu.description}</p>
                <div className="text-[11px] text-slate-500 bg-slate-50 rounded-md px-2.5 py-1.5 border border-slate-100">
                  {pu.configSummary}
                </div>
              </div>
            ))
          )}
        </section>
      )}

      {/* Quick Buttons */}
      {activeTab === 'buttons' && (
        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Nút thao tác nhanh</h2>
              <p className="text-xs text-slate-500 mt-0.5">Hiển thị trong chi tiết thẻ để chạy chuỗi hành động một chạm</p>
            </div>
            <button onClick={() => setShowAddButton((v) => !v)} className={`${btnBase} bg-blue-600 hover:bg-blue-700 text-white`}>
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm nút</span>
            </button>
          </div>
          {showAddButton && (
            <form onSubmit={submitButton} className="px-5 py-4 border-b border-slate-100 bg-slate-50/60 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input type="text" required value={newBtn.name} onChange={(e) => setNewBtn({ ...newBtn, name: e.target.value })} placeholder="Tên nút (VD: Chốt nghiệm thu)" className="text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <select value={newBtn.actionType} onChange={(e) => setNewBtn({ ...newBtn, actionType: e.target.value as QuickButton['actionType'] })} className="text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white">
                  <option value="move_to_target_and_complete">Hoàn tất & Chuyển sang đích</option>
                  <option value="mark_bug_urgent">Báo lỗi khẩn cấp</option>
                  <option value="assign_lead">Giao cho Lead</option>
                  <option value="complete_all_checklists">Hoàn tất toàn bộ checklist</option>
                  <option value="reset_to_todo">Reset về To Do</option>
                </select>
              </div>
              <input type="text" value={newBtn.description} onChange={(e) => setNewBtn({ ...newBtn, description: e.target.value })} placeholder="Mô tả ngắn" className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg" />
              {newBtn.actionType === 'move_to_target_and_complete' && (
                <select value={newBtn.targetListId} onChange={(e) => setNewBtn({ ...newBtn, targetListId: e.target.value })} className="text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white">
                  {sortedLists.map((l) => (<option key={l.id} value={l.id}>Đích: {l.title}</option>))}
                </select>
              )}
              <div className="flex items-center justify-end gap-2">
                <button type="button" onClick={() => setShowAddButton(false)} className={`${btnBase} border border-slate-200 text-slate-600 hover:bg-slate-50`}>Hủy</button>
                <button type="submit" className={`${btnBase} bg-blue-600 hover:bg-blue-700 text-white`}>Lưu nút</button>
              </div>
            </form>
          )}
          <div className="divide-y divide-slate-100">
            {project.quickButtons.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-400">Chưa có nút thao tác nhanh nào.</div>
            ) : (
              project.quickButtons.map((btn) => (
                <div key={btn.id} className="px-5 py-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                      <span className="text-sm font-bold text-slate-900 truncate">{btn.name}</span>
                      <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{btn.actionType}</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">{btn.description}</p>
                    <p className="text-[11px] text-slate-500 mt-1 tabular-nums">Đã dùng {btn.usageCount} lần</p>
                  </div>
                  <button onClick={() => onDeleteQuickButton(btn.id)} className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 shrink-0" title="Xóa nút">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {/* Rules */}
      {activeTab === 'rules' && (
        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Quy tắc tự động hóa</h2>
              <p className="text-xs text-slate-500 mt-0.5">Kích hoạt hành động khi thẻ được di chuyển hoặc checklist đạt 100%</p>
            </div>
            <button onClick={() => setShowAddRule((v) => !v)} className={`${btnBase} bg-blue-600 hover:bg-blue-700 text-white`}>
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm quy tắc</span>
            </button>
          </div>
          {showAddRule && (
            <form onSubmit={submitRule} className="px-5 py-4 border-b border-slate-100 bg-slate-50/60 space-y-3">
              <input type="text" required value={newRule.name} onChange={(e) => setNewRule({ ...newRule, name: e.target.value })} placeholder="Tên quy tắc" className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select value={newRule.triggerType} onChange={(e) => setNewRule({ ...newRule, triggerType: e.target.value as AutomationRule['triggerType'] })} className="text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white">
                  <option value="card_moved_to_list">Khi thẻ được chuyển vào danh sách</option>
                  <option value="checklist_100_percent">Khi checklist đạt 100%</option>
                </select>
                {newRule.triggerType === 'card_moved_to_list' && (
                  <select value={newRule.triggerValue} onChange={(e) => setNewRule({ ...newRule, triggerValue: e.target.value })} className="text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white">
                    {sortedLists.map((l) => (<option key={l.id} value={l.id}>{l.title}</option>))}
                  </select>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select value={newRule.actionType} onChange={(e) => setNewRule({ ...newRule, actionType: e.target.value as AutomationRule['actionType'] })} className="text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white">
                  <option value="complete_checklists">Đánh dấu hoàn tất checklist</option>
                  <option value="set_card_color">Đổi màu thẻ</option>
                  <option value="move_to_list">Chuyển sang danh sách khác</option>
                  <option value="append_log">Ghi log thông báo</option>
                </select>
                {newRule.actionType === 'set_card_color' && (
                  <select value={newRule.actionValue} onChange={(e) => setNewRule({ ...newRule, actionValue: e.target.value })} className="text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white">
                    {(Object.keys(LIST_TITLE_BY_ACTION) as CardSurfaceColorKey[]).map((k) => (<option key={k} value={k}>{LIST_TITLE_BY_ACTION[k]}</option>))}
                  </select>
                )}
                {newRule.actionType === 'move_to_list' && (
                  <select value={newRule.actionValue} onChange={(e) => setNewRule({ ...newRule, actionValue: e.target.value })} className="text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white">
                    {sortedLists.map((l) => (<option key={l.id} value={l.id}>{l.title}</option>))}
                  </select>
                )}
                {newRule.actionType === 'append_log' && (
                  <input type="text" value={newRule.actionValue} onChange={(e) => setNewRule({ ...newRule, actionValue: e.target.value })} placeholder="Nội dung log" className="text-xs px-3 py-2 border border-slate-300 rounded-lg" />
                )}
              </div>
              <div className="flex items-center justify-end gap-2">
                <button type="button" onClick={() => setShowAddRule(false)} className={`${btnBase} border border-slate-200 text-slate-600 hover:bg-slate-50`}>Hủy</button>
                <button type="submit" className={`${btnBase} bg-blue-600 hover:bg-blue-700 text-white`}>Lưu quy tắc</button>
              </div>
            </form>
          )}
          <div className="divide-y divide-slate-100">
            {project.rules.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-400">Chưa có quy tắc tự động nào.</div>
            ) : (
              project.rules.map((rule) => (
                <div key={rule.id} className="px-5 py-3 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Workflow className="w-4 h-4 text-blue-600 shrink-0" />
                      <span className="text-sm font-bold text-slate-900 truncate">{rule.name}</span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${rule.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {rule.enabled ? 'Đang bật' : 'Đang tắt'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      Khi <span className="font-mono">{rule.triggerType}</span> = <span className="font-mono">{rule.triggerValue}</span> → <span className="font-mono">{rule.actionType}</span>
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1 tabular-nums">Đã chạy {rule.runCount} lần</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => onToggleRule(rule.id)} className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100" title={rule.enabled ? 'Tắt' : 'Bật'}>
                      {rule.enabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                    <button onClick={() => onDeleteRule(rule.id)} className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50" title="Xóa quy tắc">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {/* Custom Fields */}
      {activeTab === 'customfields' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">Trường tùy chỉnh</h2>
                <p className="text-xs text-slate-500 mt-0.5">Định nghĩa trường dữ liệu bổ sung</p>
              </div>
              <button onClick={() => setShowAddCf((v) => !v)} className={`${btnBase} bg-blue-600 hover:bg-blue-700 text-white`}>
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm trường</span>
              </button>
            </div>
            {showAddCf && (
              <form onSubmit={submitCfDef} className="px-5 py-4 border-b border-slate-100 bg-slate-50/60 space-y-3">
                <input type="text" required value={newCfName} onChange={(e) => setNewCfName(e.target.value)} placeholder="Tên trường" className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg" />
                <input type="text" value={newCfOptions} onChange={(e) => setNewCfOptions(e.target.value)} placeholder="Tùy chọn (phân tách bằng dấu phẩy)" className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg" />
                <div className="flex items-center justify-end gap-2">
                  <button type="button" onClick={() => setShowAddCf(false)} className={`${btnBase} border border-slate-200 text-slate-600 hover:bg-slate-50`}>Hủy</button>
                  <button type="submit" className={`${btnBase} bg-blue-600 hover:bg-blue-700 text-white`}>Lưu trường</button>
                </div>
              </form>
            )}
            <div className="divide-y divide-slate-100">
              {project.customFieldDefs.length === 0 ? (
                <div className="py-10 text-center text-sm text-slate-400">Chưa có trường tùy chỉnh nào.</div>
              ) : (
                project.customFieldDefs.map((cf) => (
                  <div key={cf.id} className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <ListChecks className="w-4 h-4 text-slate-500" />
                      <span className="text-sm font-bold text-slate-900">{cf.name}</span>
                      <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{cf.type}</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">Tùy chọn: {cf.options?.join(', ') || '—'}</p>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">Custom Field Actions</h2>
                <p className="text-xs text-slate-500 mt-0.5">Tự động hóa khi giá trị trường khớp điều kiện</p>
              </div>
              <button onClick={() => setShowAddCfa((v) => !v)} disabled={project.customFieldDefs.length === 0} className={`${btnBase} bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50`}>
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm</span>
              </button>
            </div>
            {showAddCfa && (
              <form onSubmit={submitCfa} className="px-5 py-4 border-b border-slate-100 bg-slate-50/60 space-y-3">
                <input type="text" required value={newCfa.name} onChange={(e) => setNewCfa({ ...newCfa, name: e.target.value })} placeholder="Tên action" className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <select value={newCfa.fieldId} onChange={(e) => setNewCfa({ ...newCfa, fieldId: e.target.value })} className="text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white">
                    {project.customFieldDefs.map((f) => (<option key={f.id} value={f.id}>{f.name}</option>))}
                  </select>
                  <input type="text" value={newCfa.matchValue} onChange={(e) => setNewCfa({ ...newCfa, matchValue: e.target.value })} placeholder="Giá trị khớp" className="text-xs px-3 py-2 border border-slate-300 rounded-lg" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <select value={newCfa.actionType} onChange={(e) => setNewCfa({ ...newCfa, actionType: e.target.value as CustomFieldAction['actionType'] })} className="text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white">
                    <option value="set_card_color">Đổi màu thẻ</option>
                    <option value="move_to_list">Chuyển danh sách</option>
                    <option value="add_log_warning">Ghi log cảnh báo</option>
                  </select>
                  {newCfa.actionType === 'set_card_color' && (
                    <select value={newCfa.actionValue} onChange={(e) => setNewCfa({ ...newCfa, actionValue: e.target.value })} className="text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white">
                      {(Object.keys(LIST_TITLE_BY_ACTION) as CardSurfaceColorKey[]).map((k) => (<option key={k} value={k}>{LIST_TITLE_BY_ACTION[k]}</option>))}
                    </select>
                  )}
                  {newCfa.actionType === 'move_to_list' && (
                    <select value={newCfa.actionValue} onChange={(e) => setNewCfa({ ...newCfa, actionValue: e.target.value })} className="text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white">
                      {sortedLists.map((l) => (<option key={l.id} value={l.id}>{l.title}</option>))}
                    </select>
                  )}
                  {newCfa.actionType === 'add_log_warning' && (
                    <input type="text" value={newCfa.actionValue} onChange={(e) => setNewCfa({ ...newCfa, actionValue: e.target.value })} placeholder="Nội dung cảnh báo" className="text-xs px-3 py-2 border border-slate-300 rounded-lg" />
                  )}
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button type="button" onClick={() => setShowAddCfa(false)} className={`${btnBase} border border-slate-200 text-slate-600 hover:bg-slate-50`}>Hủy</button>
                  <button type="submit" className={`${btnBase} bg-blue-600 hover:bg-blue-700 text-white`}>Lưu action</button>
                </div>
              </form>
            )}
            <div className="divide-y divide-slate-100">
              {project.customFieldActions.length === 0 ? (
                <div className="py-10 text-center text-sm text-slate-400">Chưa có action nào.</div>
              ) : (
                project.customFieldActions.map((a) => (
                  <div key={a.id} className="px-5 py-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 truncate">{a.name}</span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${a.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                          {a.enabled ? 'Bật' : 'Tắt'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">{a.fieldId} = {a.matchValue} → {a.actionType}</p>
                    </div>
                    <button onClick={() => onToggleCustomFieldAction(a.id)} className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 shrink-0">
                      {a.enabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      )}

      {/* Scheduled Commands */}
      {activeTab === 'commands' && (
        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Lệnh chạy theo lịch</h2>
              <p className="text-xs text-slate-500 mt-0.5">Tự động chạy các tác vụ bảo trì dự án theo cron</p>
            </div>
            <button onClick={() => setShowAddCmd((v) => !v)} className={`${btnBase} bg-blue-600 hover:bg-blue-700 text-white`}>
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm lệnh</span>
            </button>
          </div>
          {showAddCmd && (
            <form onSubmit={submitCmd} className="px-5 py-4 border-b border-slate-100 bg-slate-50/60 space-y-3">
              <input type="text" required value={newCmd.name} onChange={(e) => setNewCmd({ ...newCmd, name: e.target.value })} placeholder="Tên lệnh" className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input type="text" value={newCmd.scheduleLabel} onChange={(e) => setNewCmd({ ...newCmd, scheduleLabel: e.target.value })} placeholder="Mô tả lịch (VD: 09:00 Mỗi ngày)" className="text-xs px-3 py-2 border border-slate-300 rounded-lg" />
                <input type="text" value={newCmd.scheduleCron} onChange={(e) => setNewCmd({ ...newCmd, scheduleCron: e.target.value })} placeholder="Cron (* * * * *)" className="text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select value={newCmd.commandType} onChange={(e) => setNewCmd({ ...newCmd, commandType: e.target.value as ScheduledCommand['commandType'] })} className="text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white">
                  <option value="audit_overdue">Quét thẻ quá hạn</option>
                  <option value="check_missing_checklist">Kiểm tra thiếu checklist</option>
                  <option value="sync_burndown_snapshot">Ghi nhận Burndown snapshot</option>
                  <option value="highlight_blocked_bugs">Đánh dấu bug chặn release</option>
                </select>
                <select value={newCmd.permissionLevel} onChange={(e) => setNewCmd({ ...newCmd, permissionLevel: e.target.value as ScheduledCommand['permissionLevel'] })} className="text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white">
                  <option value="system">System</option>
                  <option value="admin">Admin</option>
                  <option value="member">Member</option>
                </select>
              </div>
              <div className="flex items-center justify-end gap-2">
                <button type="button" onClick={() => setShowAddCmd(false)} className={`${btnBase} border border-slate-200 text-slate-600 hover:bg-slate-50`}>Hủy</button>
                <button type="submit" className={`${btnBase} bg-blue-600 hover:bg-blue-700 text-white`}>Lưu lệnh</button>
              </div>
            </form>
          )}
          <div className="divide-y divide-slate-100">
            {project.scheduledCommands.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-400">Chưa có lệnh chạy theo lịch nào.</div>
            ) : (
              project.scheduledCommands.map((cmd) => (
                <div key={cmd.id} className="px-5 py-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CalendarClock className="w-4 h-4 text-slate-500 shrink-0" />
                      <span className="text-sm font-bold text-slate-900 truncate">{cmd.name}</span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${cmd.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {cmd.enabled ? 'Đang chạy' : 'Tạm dừng'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      {cmd.scheduleLabel} · <span className="font-mono text-slate-500">{cmd.scheduleCron}</span> · {cmd.commandType}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1 tabular-nums">Đã chạy {cmd.runCount} lần · Lần cuối: {cmd.lastRunAt ?? '—'}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => onToggleScheduledCommand(cmd.id)} className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100" title={cmd.enabled ? 'Tạm dừng' : 'Bật'}>
                      {cmd.enabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                    <button onClick={() => onRunScheduledCommandNow(cmd.id)} className="px-2.5 py-1.5 rounded-md bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-semibold hover:bg-blue-100">
                      Chạy ngay
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {/* Command Logs */}
      {activeTab === 'logs' && (
        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Command Logs</h2>
              <p className="text-xs text-slate-500 mt-0.5">Lịch sử thực thi lệnh & bình luận theo từng log</p>
            </div>
            <span className="text-xs text-slate-500 tabular-nums">{projectLogs.length} bản ghi</span>
          </div>
          <div className="divide-y divide-slate-100">
            {projectLogs.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-400">Chưa có log lệnh nào cho dự án này.</div>
            ) : (
              projectLogs.map((log) => {
                const isReplying = replyingLogId === log.id;
                return (
                  <div key={log.id} className="px-5 py-4 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Terminal className="w-4 h-4 text-slate-500 shrink-0" />
                          <span className="text-sm font-bold text-slate-900 truncate">{log.commandName}</span>
                          <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{log.source}</span>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${log.status === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                            {log.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 mt-1">{log.summary}</p>
                        <p className="text-[11px] text-slate-500 mt-1">Ảnh hưởng {log.affectedCards} thẻ</p>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400 shrink-0 tabular-nums">{log.executedAt}</span>
                    </div>
                    {log.comments.length > 0 && (
                      <div className="pl-3 border-l-2 border-blue-200 space-y-1.5">
                        {log.comments.map((cm) => {
                          const author = memberMap.get(cm.authorId);
                          return (
                            <div key={cm.id} className="bg-slate-50 border border-slate-200/80 rounded-lg px-3 py-2 text-xs">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-bold text-slate-900">{author?.name ?? 'Thành viên'}</span>
                                <span className="text-[10px] font-mono text-slate-400">{cm.createdAt}</span>
                              </div>
                              <p className="text-slate-700 mt-0.5">{cm.content}</p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <button
                      onClick={() => { setReplyingLogId(isReplying ? null : log.id); setLogReplyText(''); }}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Bình luận trên log này ({log.comments.length})</span>
                    </button>
                    {isReplying && (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={logReplyText}
                          onChange={(e) => setLogReplyText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && logReplyText.trim()) {
                              onAddCommandLogComment(log.id, logReplyText.trim());
                              setLogReplyText('');
                              setReplyingLogId(null);
                            }
                          }}
                          placeholder="Nhập bình luận..."
                          autoFocus
                          className="flex-1 text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          onClick={() => {
                            if (!logReplyText.trim()) return;
                            onAddCommandLogComment(log.id, logReplyText.trim());
                            setLogReplyText('');
                            setReplyingLogId(null);
                          }}
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Gửi</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>
      )}
    </div>
  );
};
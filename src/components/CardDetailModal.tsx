import React, { useMemo, useState } from 'react';
import {
  AlertTriangle, AlignLeft, Calendar, Check, CheckSquare, MessageSquare,
  Palette, Plus, Save, Send, Sliders, Trash2, UserPlus, X, Zap,
} from 'lucide-react';
import {
  Card, CardLabel, CardSurfaceColorKey, LabelColorKey, Member, Project, QuickButton,
} from '../types';
import { createLogEntry, nowTimestampLabel } from '../utils/automationEngine';
import { CARD_SURFACE_CLASSES, LABEL_COLOR_CLASSES } from '../utils/colorTokens';
import { getCardChecklistStats } from '../utils/metrics';

interface CardDetailModalProps {
  project: Project;
  card: Card;
  members: Member[];
  currentActorId: string;
  onClose: () => void;
  onSaveCard: (updatedCard: Card, originalCard: Card) => void;
  onDeleteCard: (cardId: string) => void;
}

export const CardDetailModal: React.FC<CardDetailModalProps> = ({
  project, card, members, currentActorId, onClose, onSaveCard, onDeleteCard,
}) => {
  const [draft, setDraft] = useState<Card>(() => JSON.parse(JSON.stringify(card)));
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [newChecklistText, setNewChecklistText] = useState('');
  const [newCommentText, setNewCommentText] = useState('');
  const [replyingLogId, setReplyingLogId] = useState<string | null>(null);
  const [logReplyText, setLogReplyText] = useState('');
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState<LabelColorKey>('blue');
  const [showUnsavedPrompt, setShowUnsavedPrompt] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const hasChanges = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(card),
    [draft, card]
  );
  const checklistStats = getCardChecklistStats(draft);
  const sortedLists = [...project.lists].sort((a, b) => a.order - b.order);
  const isCustomFieldsEnabled = project.powerUps.some(
    (p) => p.key === 'custom_fields' && p.enabled
  );
  const projectMembers = members.filter((m) => project.memberIds.includes(m.id));
  const memberMap = new Map<string, Member>();
  members.forEach((m) => memberMap.set(m.id, m));

  const updateDraft = (updater: (prev: Card) => Card) => setDraft((prev) => updater(prev));

  const handleRequestClose = () => {
    if (hasChanges) setShowUnsavedPrompt(true);
    else onClose();
  };
  const handleSaveAndClose = () => { onSaveCard(draft, card); onClose(); };
  const handleSaveOnly = () => { onSaveCard(draft, card); setShowUnsavedPrompt(false); };
  const handleDiscardAndClose = () => {
    setDraft(JSON.parse(JSON.stringify(card)));
    setShowUnsavedPrompt(false);
    onClose();
  };

  const handleToggleAssignee = (memberId: string) => {
    updateDraft((prev) => {
      const exists = prev.assigneeIds.includes(memberId);
      const nextIds = exists
        ? prev.assigneeIds.filter((id) => id !== memberId)
        : [...prev.assigneeIds, memberId];
      return { ...prev, assigneeIds: nextIds };
    });
  };

  const handleAddLabel = () => {
    if (!newLabelName.trim()) return;
    const lbl: CardLabel = {
      id: `lbl_${Date.now()}`, name: newLabelName.trim(), color: newLabelColor,
    };
    updateDraft((prev) => ({ ...prev, labels: [...prev.labels, lbl] }));
    setNewLabelName('');
  };
  const handleRemoveLabel = (labelId: string) => {
    updateDraft((prev) => ({ ...prev, labels: prev.labels.filter((l) => l.id !== labelId) }));
  };
  const handleToggleCheckItem = (itemId: string) => {
    updateDraft((prev) => ({
      ...prev,
      checklist: prev.checklist.map((i) =>
        i.id === itemId ? { ...i, completed: !i.completed } : i
      ),
    }));
  };
  const handleAddCheckItem = () => {
    if (!newChecklistText.trim()) return;
    updateDraft((prev) => ({
      ...prev,
      checklist: [
        ...prev.checklist,
        { id: `chk_${Date.now()}`, text: newChecklistText.trim(), completed: false },
      ],
    }));
    setNewChecklistText('');
  };
  const handleDeleteCheckItem = (itemId: string) => {
    updateDraft((prev) => ({
      ...prev,
      checklist: prev.checklist.filter((i) => i.id !== itemId),
    }));
  };

  const handleApplyQuickButtonToDraft = (button: QuickButton) => {
    updateDraft((prev) => {
      let next = { ...prev };
      let summary = '';
      if (button.actionType === 'move_to_target_and_complete') {
        const targetList = project.lists.find(
          (l) => l.id === (button.targetListId || project.goalConfig.targetListId)
        );
        next = {
          ...next,
          listId: targetList?.id ?? project.goalConfig.targetListId,
          cardColor: 'emerald',
          checklist: next.checklist.map((c) => ({ ...c, completed: true })),
        };
        summary = `Chuyển sang "${targetList?.title ?? 'Done'}", hoàn thành 100% checklist & tô màu xanh`;
      } else if (button.actionType === 'mark_bug_urgent') {
        const bugList = project.lists.find(
          (l) => l.title.toLowerCase().includes('bug') || l.title.toLowerCase().includes('issue')
        );
        next = { ...next, listId: bugList?.id ?? next.listId, cardColor: 'rose', isOverdue: true };
        summary = `Đánh dấu khẩn cấp & chuyển về "${bugList?.title ?? 'Issue/Bug'}"`;
      } else if (button.actionType === 'assign_lead') {
        if (!next.assigneeIds.includes(currentActorId)) {
          next = { ...next, assigneeIds: [currentActorId, ...next.assigneeIds] };
        }
        summary = 'Phân công nhanh thành viên phụ trách chính';
      } else if (button.actionType === 'complete_all_checklists') {
        next = { ...next, checklist: next.checklist.map((c) => ({ ...c, completed: true })) };
        summary = `Đánh dấu hoàn tất toàn bộ ${next.checklist.length} mục checklist`;
      } else if (button.actionType === 'reset_to_todo') {
        const todoList = project.lists.find((l) => l.title.toLowerCase().includes('to do'));
        next = {
          ...next,
          listId: todoList?.id ?? project.lists[0]?.id ?? next.listId,
          cardColor: 'default',
        };
        summary = `Đưa thẻ về danh sách "${todoList?.title ?? 'To Do'}"`;
      }
      return {
        ...next,
        logs: [
          createLogEntry('system', `Nút thao tác nhanh: ${button.name}`, 'automation', summary, next),
          ...next.logs,
        ],
      };
    });
  };

  const handlePostStandaloneComment = () => {
    if (!newCommentText.trim()) return;
    const newLog = createLogEntry(
      currentActorId, newCommentText.trim(), 'comment',
      'Bình luận trên thẻ (đang chờ lưu)', draft
    );
    updateDraft((prev) => ({ ...prev, logs: [newLog, ...prev.logs] }));
    setNewCommentText('');
  };
  const handlePostLogReply = (logId: string) => {
    if (!logReplyText.trim()) return;
    updateDraft((prev) => ({
      ...prev,
      logs: prev.logs.map((l) =>
        l.id === logId
          ? {
              ...l,
              comments: [
                ...l.comments,
                {
                  id: `cm_${Date.now()}`,
                  authorId: currentActorId,
                  content: logReplyText.trim(),
                  createdAt: nowTimestampLabel(),
                },
              ],
            }
          : l
      ),
    }));
    setLogReplyText('');
    setReplyingLogId(null);
  };

  const surfaceTheme = CARD_SURFACE_CLASSES[draft.cardColor] ?? CARD_SURFACE_CLASSES.default;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/50 backdrop-blur-[1px]">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className={`px-5 py-4 border-b border-slate-200 flex items-start justify-between gap-4 ${surfaceTheme.cardBg}`}>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-1.5">
              <span>{project.name}</span>
              <span>·</span>
              <span>Danh sách:</span>
              <select
                value={draft.listId}
                onChange={(e) => updateDraft((prev) => ({ ...prev, listId: e.target.value }))}
                className="font-semibold text-slate-900 bg-white border border-slate-300 rounded px-2 py-0.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {sortedLists.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.title}
                    {l.id === project.goalConfig.targetListId ? ' (Mục tiêu 100%)' : ''}
                  </option>
                ))}
              </select>
              {hasChanges && <span className="text-[11px] font-semibold text-amber-700">· Chưa lưu thay đổi</span>}
            </div>
            <input
              type="text"
              value={draft.title}
              onChange={(e) => updateDraft((prev) => ({ ...prev, title: e.target.value }))}
              className="w-full text-lg font-bold text-slate-900 bg-transparent border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-md px-1.5 py-0.5 -ml-1.5 focus:outline-none"
            />
          </div>
          <button
            onClick={handleRequestClose}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200/70 hover:text-slate-900 shrink-0"
            aria-label="Đóng chi tiết thẻ"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Unsaved banner */}
        {showUnsavedPrompt && (
          <div className="bg-amber-50 border-b border-amber-200 px-5 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-amber-900 font-medium">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Bạn có thay đổi chưa lưu. Nếu thoát mà không lưu, dữ liệu thẻ sẽ giữ nguyên như ban đầu.</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={handleSaveAndClose} className="px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold">Lưu & Đóng</button>
              <button onClick={handleDiscardAndClose} className="px-3 py-1.5 rounded-md bg-white border border-amber-300 text-amber-900 hover:bg-amber-100 font-semibold">Đóng không lưu</button>
              <button onClick={() => setShowUnsavedPrompt(false)} className="px-2.5 py-1.5 text-slate-600 hover:text-slate-900 font-medium">Tiếp tục sửa</button>
            </div>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 lg:grid-cols-12 gap-6 kanban-scroll">
          {/* LEFT 8 cols */}
          <div className="lg:col-span-8 space-y-6">
            {draft.labels.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {draft.labels.map((lbl) => (
                  <span
                    key={lbl.id}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${LABEL_COLOR_CLASSES[lbl.color].chip}`}
                  >
                    <span>{lbl.name}</span>
                    <button onClick={() => handleRemoveLabel(lbl.id)} className="hover:opacity-70" title="Gỡ nhãn">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <section>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <AlignLeft className="w-4 h-4 text-slate-500" />
                  <span>Mô tả công việc</span>
                </div>
                {!isEditingDesc && (
                  <button onClick={() => setIsEditingDesc(true)} className="text-xs font-semibold text-blue-600 hover:text-blue-800">Chỉnh sửa</button>
                )}
              </div>
              {isEditingDesc ? (
                <div className="space-y-2">
                  <textarea
                    rows={4}
                    value={draft.description}
                    onChange={(e) => updateDraft((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Nhập mô tả chi tiết yêu cầu công việc, tiêu chí nghiệm thu..."
                    className="w-full text-sm text-slate-800 border border-slate-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button onClick={() => setIsEditingDesc(false)} className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold">Xong phần mô tả</button>
                </div>
              ) : (
                <div
                  onClick={() => setIsEditingDesc(true)}
                  className="text-sm text-slate-700 bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 rounded-lg p-3 cursor-pointer leading-relaxed"
                >
                  {draft.description || 'Nhấn để thêm mô tả công việc chi tiết...'}
                </div>
              )}
            </section>

            <section className="border-t border-slate-100 pt-5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <CheckSquare className="w-4 h-4 text-blue-600" />
                  <span>Checklist đánh giá hiệu suất</span>
                </div>
                <span className="text-xs font-mono font-bold tabular-nums text-slate-700">
                  {checklistStats.completed}/{checklistStats.total} mục · {checklistStats.percent}%
                </span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-3">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${checklistStats.percent === 100 ? 'bg-emerald-600' : 'bg-blue-600'}`}
                  style={{ width: `${checklistStats.percent}%` }}
                />
              </div>
              <div className="space-y-1.5">
                {draft.checklist.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200 group">
                    <label className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={item.completed}
                        onChange={() => handleToggleCheckItem(item.id)}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className={`text-sm truncate ${item.completed ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                        {item.text}
                      </span>
                    </label>
                    <button onClick={() => handleDeleteCheckItem(item.id)} className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 rounded" title="Xóa mục">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <input
                  type="text"
                  value={newChecklistText}
                  onChange={(e) => setNewChecklistText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddCheckItem(); }}
                  placeholder="Thêm mục checklist mới..."
                  className="flex-1 text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button onClick={handleAddCheckItem} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shrink-0">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm mục</span>
                </button>
              </div>
            </section>

            <section className="border-t border-slate-100 pt-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <MessageSquare className="w-4 h-4 text-slate-500" />
                  <span>Nhật ký hoạt động & Bình luận theo từng Log</span>
                </div>
                <span className="text-xs text-slate-500 tabular-nums">{draft.logs.length} nhật ký</span>
              </div>
              <div className="flex items-center gap-2 mb-4">
                <input
                  type="text"
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handlePostStandaloneComment(); }}
                  placeholder="Viết ghi chú / nhật ký thảo luận mới cho thẻ..."
                  className="flex-1 text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button onClick={handlePostStandaloneComment} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold shrink-0">
                  <Send className="w-3.5 h-3.5" />
                  <span>Thêm vào log</span>
                </button>
              </div>
              {draft.logs.length === 0 ? (
                <div className="text-xs text-slate-400 py-4 text-center border border-dashed border-slate-200 rounded-lg">
                  Chưa có nhật ký hoạt động nào.
                </div>
              ) : (
                <div className="space-y-3">
                  {draft.logs.map((log) => {
                    const actor = memberMap.get(log.actorId);
                    const isReplying = replyingLogId === log.id;
                    return (
                      <div key={log.id} className="border border-slate-200 rounded-xl p-3 bg-slate-50/50">
                        <div className="flex items-start justify-between gap-2 text-xs">
                          <div>
                            <span className="font-bold text-slate-900">{actor ? actor.name : 'Hệ thống Tự động'}</span>{' '}
                            <span className="text-slate-700">{log.action}</span>
                            {log.detail && <p className="text-slate-500 mt-0.5">{log.detail}</p>}
                          </div>
                          <span className="text-[11px] font-mono text-slate-400 shrink-0 tabular-nums">{log.createdAt}</span>
                        </div>
                        {log.comments.length > 0 && (
                          <div className="mt-2.5 space-y-1.5 pl-3 border-l-2 border-blue-200">
                            {log.comments.map((cm) => {
                              const cmAuthor = memberMap.get(cm.authorId);
                              return (
                                <div key={cm.id} className="bg-white border border-slate-200/80 rounded-lg px-2.5 py-1.5 text-xs">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-semibold text-slate-900">{cmAuthor?.name ?? 'Thành viên'}</span>
                                    <span className="text-[10px] font-mono text-slate-400">{cm.createdAt}</span>
                                  </div>
                                  <p className="text-slate-700 mt-0.5">{cm.content}</p>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        <div className="mt-2 flex items-center gap-3">
                          <button
                            onClick={() => { setReplyingLogId(isReplying ? null : log.id); setLogReplyText(''); }}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800"
                          >
                            <MessageSquare className="w-3 h-3" />
                            <span>Bình luận trên log này ({log.comments.length})</span>
                          </button>
                        </div>
                        {isReplying && (
                          <div className="mt-2 flex items-center gap-2">
                            <input
                              type="text"
                              value={logReplyText}
                              onChange={(e) => setLogReplyText(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') handlePostLogReply(log.id); }}
                              placeholder="Phản hồi trực tiếp cho log này..."
                              autoFocus
                              className="flex-1 text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button onClick={() => handlePostLogReply(log.id)} className="px-2.5 py-1.5 rounded-md bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700">Thêm</button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          {/* RIGHT 4 cols */}
          <div className="lg:col-span-4 space-y-5">
            {project.quickButtons.length > 0 && (
              <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/70 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span>Nút thao tác nhanh (Buttons)</span>
                </div>
                <div className="space-y-1.5">
                  {project.quickButtons.map((btn) => (
                    <button
                      key={btn.id}
                      onClick={() => handleApplyQuickButtonToDraft(btn)}
                      title={btn.description}
                      className="w-full text-left px-2.5 py-2 rounded-lg bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-xs font-semibold text-slate-800 transition-colors flex items-center justify-between"
                    >
                      <span className="truncate">{btn.name}</span>
                      <span className="text-[10px] font-mono text-slate-400 shrink-0 ml-2">Áp dụng</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="border border-slate-200 rounded-xl p-3.5 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <Palette className="w-3.5 h-3.5 text-slate-500" />
                <span>Màu thẻ & Nhãn quan sát</span>
              </div>
              <div>
                <div className="text-[11px] text-slate-500 mb-1.5">Màu nền thẻ:</div>
                <div className="flex items-center gap-2 flex-wrap">
                  {(Object.keys(CARD_SURFACE_CLASSES) as CardSurfaceColorKey[]).map((key) => (
                    <button
                      key={key}
                      onClick={() => updateDraft((prev) => ({ ...prev, cardColor: key }))}
                      title={CARD_SURFACE_CLASSES[key].nameVi}
                      className={`w-6 h-6 rounded-full border flex items-center justify-center ${CARD_SURFACE_CLASSES[key].swatch} ${draft.cardColor === key ? 'ring-2 ring-blue-600 ring-offset-1' : ''}`}
                    >
                      {draft.cardColor === key && <Check className="w-3 h-3 text-slate-800" />}
                    </button>
                  ))}
                </div>
              </div>
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <div className="text-[11px] text-slate-500">Thêm nhãn màu mới:</div>
                <input
                  type="text"
                  value={newLabelName}
                  onChange={(e) => setNewLabelName(e.target.value)}
                  placeholder="Tên nhãn (VD: Backend, Gấp)..."
                  className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    {(Object.keys(LABEL_COLOR_CLASSES) as LabelColorKey[]).map((key) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setNewLabelColor(key)}
                        title={LABEL_COLOR_CLASSES[key].labelVi}
                        className={`w-5 h-5 rounded-full ${LABEL_COLOR_CLASSES[key].bar} ${newLabelColor === key ? 'ring-2 ring-offset-1 ring-slate-900 scale-110' : 'opacity-80 hover:opacity-100'}`}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={handleAddLabel}
                    disabled={!newLabelName.trim()}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[11px] font-semibold"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Thêm nhãn</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>Hạn hoàn thành</span>
              </div>
              <input
                type="text"
                value={draft.dueDateLabel ?? ''}
                onChange={(e) => updateDraft((prev) => ({ ...prev, dueDateLabel: e.target.value }))}
                placeholder="VD: 25 thg 5 - 28 thg 5"
                className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!draft.isOverdue}
                  onChange={(e) => updateDraft((prev) => ({ ...prev, isOverdue: e.target.checked }))}
                  className="rounded border-slate-300"
                />
                <span>Đánh dấu quá hạn</span>
              </label>
            </div>

            <div className="border border-slate-200 rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <UserPlus className="w-3.5 h-3.5 text-slate-500" />
                <span>Người phụ trách ({draft.assigneeIds.length})</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {projectMembers.map((m) => {
                  const selected = draft.assigneeIds.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handleToggleAssignee(m.id)}
                      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs border transition-colors ${selected ? 'bg-blue-50 border-blue-300 text-blue-800' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                    >
                      <span className={`w-5 h-5 rounded-full text-[10px] font-bold text-white flex items-center justify-center ${m.avatarBg}`}>
                        {m.initials}
                      </span>
                      <span className="truncate">{m.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl p-3.5 space-y-2">
              <label className="text-xs font-bold text-slate-800 block">Story Points</label>
              <input
                type="number"
                min={0}
                max={100}
                value={draft.storyPoints}
                onChange={(e) => updateDraft((prev) => ({ ...prev, storyPoints: Math.max(0, Number(e.target.value) || 0) }))}
                className="w-full text-xs font-mono px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {isCustomFieldsEnabled && project.customFieldDefs.length > 0 && (
              <div className="border border-slate-200 rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <Sliders className="w-3.5 h-3.5 text-slate-500" />
                  <span>Trường tùy chỉnh</span>
                </div>
                {project.customFieldDefs.map((cf) => (
                  <div key={cf.id}>
                    <label className="text-[11px] text-slate-600 block mb-1">{cf.name}</label>
                    {cf.type === 'select' ? (
                      <select
                        value={String(draft.customFields[cf.id] ?? '')}
                        onChange={(e) => updateDraft((prev) => ({ ...prev, customFields: { ...prev.customFields, [cf.id]: e.target.value } }))}
                        className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-md bg-white"
                      >
                        <option value="">-- Chọn --</option>
                        {cf.options?.map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
                      </select>
                    ) : (
                      <input
                        type={cf.type === 'number' ? 'number' : 'text'}
                        value={String(draft.customFields[cf.id] ?? '')}
                        onChange={(e) => updateDraft((prev) => ({
                          ...prev,
                          customFields: { ...prev.customFields, [cf.id]: cf.type === 'number' ? Number(e.target.value) : e.target.value },
                        }))}
                        className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-md"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {!confirmDelete ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa thẻ</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="text-xs text-rose-700 font-semibold">Xác nhận xóa thẻ này?</span>
              <button
                type="button"
                onClick={() => onDeleteCard(card.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
              >
                Xóa vĩnh viễn
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Hủy
              </button>
            </div>
          )}
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={handleRequestClose}
              className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={handleSaveOnly}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Lưu thay đổi</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
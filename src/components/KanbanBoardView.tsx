import React, { useMemo, useState } from 'react';
import {
  AlignLeft,
  Calendar,
  Check,
  CheckSquare,
  Clock,
  Download,
  Eye,
  Filter,
  MessageSquare,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Plug,
  Plus,
  Search,
  Star,
  Target,
  Trash2,
  TrendingDown,
  UserPlus,
  X,
  Zap,
} from 'lucide-react';
import { ActiveView, Card, KanbanList, LabelColorKey, Member, Project } from '../types';
import { CARD_SURFACE_CLASSES, LABEL_COLOR_CLASSES } from '../utils/colorTokens';
import { calculateProjectMetrics, getCardChecklistStats } from '../utils/metrics';

interface KanbanBoardViewProps {
  project: Project;
  members: Member[];
  onSelectCard: (cardId: string) => void;
  onMoveCard: (cardId: string, toListId: string) => void;
  onAddCard: (listId: string, title: string, color?: Card['cardColor']) => void;
  onAddList: (title: string) => void;
  onRenameList: (listId: string, newTitle: string) => void;
  onDeleteList: (listId: string) => void;
  onSetTargetList: (listId: string) => void;
  onToggleStar: () => void;
  onOpenGoalModal: () => void;
  onOpenMembersModal: () => void;
  onOpenEditProject: (confirmDelete?: boolean) => void;
  onOpenExportModal: () => void;
  onNavigateView: (view: ActiveView) => void;
}

export const KanbanBoardView: React.FC<KanbanBoardViewProps> = ({
  project,
  members,
  onSelectCard,
  onMoveCard,
  onAddCard,
  onAddList,
  onRenameList,
  onDeleteList,
  onSetTargetList,
  onToggleStar,
  onOpenGoalModal,
  onOpenMembersModal,
  onOpenEditProject,
  onOpenExportModal,
  onNavigateView,
}) => {
  const projectMembers = useMemo(
    () => members.filter((m) => project.memberIds.includes(m.id)),
    [members, project.memberIds]
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMemberId, setFilterMemberId] = useState<string | null>(null);
  const [filterLabelColor, setFilterLabelColor] = useState<LabelColorKey | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const [addingCardListId, setAddingCardListId] = useState<string | null>(null);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [newCardColor, setNewCardColor] = useState<Card['cardColor']>('default');

  const [isAddingList, setIsAddingList] = useState(false);
  const [newListTitle, setNewListTitle] = useState('');

  const [openListMenuId, setOpenListMenuId] = useState<string | null>(null);
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editingListTitle, setEditingListTitle] = useState('');

  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const [dragOverListId, setDragOverListId] = useState<string | null>(null);

  const metrics = useMemo(() => calculateProjectMetrics(project), [project]);

  const memberMap = useMemo(() => {
    const map = new Map<string, Member>();
    members.forEach((m) => map.set(m.id, m));
    return map;
  }, [members]);

  const sortedLists = useMemo(
    () => [...project.lists].sort((a, b) => a.order - b.order),
    [project.lists]
  );

  const filteredCardsByList = useMemo(() => {
    const map = new Map<string, Card[]>();
    sortedLists.forEach((l) => map.set(l.id, []));

    for (const card of project.cards) {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchText =
          card.title.toLowerCase().includes(q) ||
          card.description.toLowerCase().includes(q);
        if (!matchText) continue;
      }
      if (filterMemberId && !card.assigneeIds.includes(filterMemberId)) {
        continue;
      }
      if (
        filterLabelColor &&
        !card.labels.some((lbl) => lbl.color === filterLabelColor)
      ) {
        continue;
      }
      const listArr = map.get(card.listId);
      if (listArr) {
        listArr.push(card);
      }
    }
    return map;
  }, [project.cards, sortedLists, searchQuery, filterMemberId, filterLabelColor]);

  const handleCreateCard = (listId: string) => {
    if (!newCardTitle.trim()) return;
    onAddCard(listId, newCardTitle.trim(), newCardColor);
    setNewCardTitle('');
    setNewCardColor('default');
    setAddingCardListId(null);
  };

  const handleCreateList = () => {
    if (!newListTitle.trim()) return;
    onAddList(newListTitle.trim());
    setNewListTitle('');
    setIsAddingList(false);
  };

  const handleDragStart = (e: React.DragEvent, cardId: string) => {
    setDraggedCardId(cardId);
    e.dataTransfer.setData('text/plain', cardId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDropOnList = (e: React.DragEvent, listId: string) => {
    e.preventDefault();
    const cardId = e.dataTransfer.getData('text/plain') || draggedCardId;
    if (cardId) {
      onMoveCard(cardId, listId);
    }
    setDraggedCardId(null);
    setDragOverListId(null);
  };

  const isBurndownEnabled = project.powerUps.some((p) => p.key === 'burndown' && p.enabled);
  const isCardAgingEnabled = project.powerUps.some((p) => p.key === 'card_aging' && p.enabled);

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] bg-[#DCE7F9]">
      {/* Board Sub-Toolbar (Inspired directly by screenshot) */}
      <div className="bg-white/85 backdrop-blur-sm border-b border-slate-200/80 px-4 lg:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
        {/* Left: Project Title & Target Goal Progress */}
        <div className="flex flex-wrap items-center gap-3 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <h1
              onDoubleClick={() => onOpenEditProject(false)}
              title="Nhấp đúp để đổi tên dự án"
              className="text-sm sm:text-base font-bold text-slate-900 truncate max-w-[300px] cursor-pointer hover:text-blue-700 transition-colors"
            >
              {project.name}
            </h1>
            <button
              onClick={onToggleStar}
              className="p-1 rounded hover:bg-slate-200/70 transition-colors"
              title="Đánh dấu yêu thích"
            >
              <Star
                className={`w-4 h-4 ${
                  project.starred ? 'text-amber-500 fill-amber-500' : 'text-slate-400'
                }`}
              />
            </button>
            <button
              onClick={() => onOpenEditProject(false)}
              className="p-1 rounded hover:bg-slate-200/70 text-slate-500 hover:text-blue-600 transition-colors"
              title="Đổi tên / Sửa thông tin dự án"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onOpenEditProject(true)}
              className="p-1 rounded hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition-colors"
              title="Xóa dự án"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={onOpenGoalModal}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-lg border border-slate-200 bg-white hover:border-blue-400 text-xs font-medium text-slate-700 transition-colors whitespace-nowrap"
            title="Cấu hình danh sách mục tiêu tính % hiệu suất"
          >
            <Target className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>
              Mục tiêu: <strong className="text-slate-900">{metrics.targetListTitle}</strong>
            </span>
            <span className="text-slate-300">|</span>
            <span className="font-mono font-bold tabular-nums text-blue-700">
              {metrics.cardsInTargetList}/{metrics.targetGoalCards} ({metrics.efficiencyPercent}%)
            </span>
          </button>
        </div>

        {/* Right: Project Participants & Power-Up / Burndown / Automation Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Project Participants Avatar Stack (click to manage/invite via Gmail) */}
          <div className="flex items-center gap-1.5 mr-1">
            <button
              type="button"
              onClick={onOpenMembersModal}
              title="Xem & thêm người tham gia dự án qua Gmail"
              className="flex items-center -space-x-1.5 hover:opacity-95 transition-opacity"
            >
              {projectMembers.slice(0, 6).map((m) => (
                <span
                  key={m.id}
                  title={`${m.name} (${m.email})`}
                  className={`w-7 h-7 rounded-full text-[11px] font-bold text-white flex items-center justify-center border-2 border-white ${m.avatarBg}`}
                >
                  {m.initials}
                </span>
              ))}
              {projectMembers.length > 6 && (
                <span className="w-7 h-7 rounded-full text-[10px] font-bold text-slate-700 bg-slate-200 flex items-center justify-center border-2 border-white">
                  +{projectMembers.length - 6}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={onOpenMembersModal}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 whitespace-nowrap transition-colors"
              title="Mời người tham gia bằng Gmail"
            >
              <UserPlus className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">Mời thành viên</span>
            </button>
          </div>

          {isBurndownEnabled && (
            <button
              onClick={() => onNavigateView('burndown')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700 whitespace-nowrap transition-colors"
            >
              <TrendingDown className="w-3.5 h-3.5 text-blue-600" />
              <span>Burndown Chart</span>
            </button>
          )}

          <button
            onClick={() => onNavigateView('automation')}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700 whitespace-nowrap transition-colors"
            title="Power-Ups"
          >
            <Plug className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden sm:inline">Power-Ups</span>
          </button>

          <button
            onClick={() => onNavigateView('automation')}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700 whitespace-nowrap transition-colors"
            title="Tự động hóa & Lệnh"
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden sm:inline">Tự động hóa</span>
          </button>

          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium whitespace-nowrap transition-colors ${
              showFilters || searchQuery || filterMemberId || filterLabelColor
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Lọc</span>
          </button>

          <button
            onClick={onOpenExportModal}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium whitespace-nowrap transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Xuất CSV</span>
          </button>
        </div>
      </div>

      {/* Collapsible Filter Bar */}
      {showFilters && (
        <div className="bg-white border-b border-slate-200 px-4 lg:px-6 py-2.5 flex flex-wrap items-center gap-3 text-xs shrink-0">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm tên thẻ hoặc mô tả..."
              className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Thành viên:</span>
            <select
              value={filterMemberId ?? ''}
              onChange={(e) => setFilterMemberId(e.target.value || null)}
              className="px-2.5 py-1.5 border border-slate-200 rounded-md bg-white text-xs"
            >
              <option value="">Tất cả</option>
              {projectMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.initials})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-500 font-medium">Màu nhãn:</span>
            {(Object.keys(LABEL_COLOR_CLASSES) as LabelColorKey[]).map((key) => {
              const active = filterLabelColor === key;
              return (
                <button
                  key={key}
                  onClick={() => setFilterLabelColor(active ? null : key)}
                  className={`w-6 h-4 rounded transition-transform ${LABEL_COLOR_CLASSES[key].bar} ${
                    active ? 'ring-2 ring-offset-1 ring-slate-900 scale-110' : 'opacity-80 hover:opacity-100'
                  }`}
                  title={LABEL_COLOR_CLASSES[key].labelVi}
                />
              );
            })}
          </div>

          {(searchQuery || filterMemberId || filterLabelColor) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterMemberId(null);
                setFilterLabelColor(null);
              }}
              className="text-blue-600 hover:text-blue-800 font-semibold ml-auto"
            >
              Xóa bộ lọc
            </button>
          )}
        </div>
      )}

      {/* Horizontal Kanban Columns Canvas */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-4 lg:p-5 kanban-scroll">
        <div className="flex items-start gap-3.5 h-full">
          {sortedLists.map((list: KanbanList) => {
            const cards = filteredCardsByList.get(list.id) ?? [];
            const isTargetList = list.id === project.goalConfig.targetListId;
            const isDragTarget = dragOverListId === list.id;

            return (
              <div
                key={list.id}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverListId(list.id);
                }}
                onDragLeave={() => {
                  if (dragOverListId === list.id) setDragOverListId(null);
                }}
                onDrop={(e) => handleDropOnList(e, list.id)}
                className={`w-[288px] shrink-0 max-h-full flex flex-col rounded-xl bg-[#F1F4F9] border transition-colors ${
                  isDragTarget
                    ? 'border-blue-500 ring-2 ring-blue-300/60'
                    : isTargetList
                    ? 'border-emerald-300'
                    : 'border-slate-200/90'
                }`}
              >
                {/* Column Header */}
                <div className="px-3 py-2.5 flex items-center justify-between gap-2 relative">
                  {editingListId === list.id ? (
                    <div className="flex items-center gap-1 flex-1">
                      <input
                        type="text"
                        value={editingListTitle}
                        onChange={(e) => setEditingListTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && editingListTitle.trim()) {
                            onRenameList(list.id, editingListTitle.trim());
                            setEditingListId(null);
                          }
                          if (e.key === 'Escape') setEditingListId(null);
                        }}
                        autoFocus
                        className="w-full text-xs font-bold px-2 py-1 rounded border border-blue-400 bg-white focus:outline-none"
                      />
                      <button
                        onClick={() => {
                          if (editingListTitle.trim()) {
                            onRenameList(list.id, editingListTitle.trim());
                          }
                          setEditingListId(null);
                        }}
                        className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <h2
                        onDoubleClick={() => {
                          setEditingListId(list.id);
                          setEditingListTitle(list.title);
                        }}
                        className="text-xs font-bold text-slate-800 truncate cursor-pointer"
                        title="Nhấp đúp để đổi tên danh sách"
                      >
                        {list.title}
                      </h2>
                      {isTargetList && (
                        <span
                          className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 shrink-0"
                          title="Danh sách mục tiêu tính 100% hiệu suất"
                        >
                          <Target className="w-3 h-3" />
                          <span>Đích</span>
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-xs font-mono font-semibold text-slate-500 tabular-nums px-1.5">
                      {cards.length}
                    </span>
                    <button
                      onClick={() =>
                        setOpenListMenuId(openListMenuId === list.id ? null : list.id)
                      }
                      className="p-1 rounded hover:bg-slate-200/70 text-slate-500"
                      aria-label="Tùy chọn danh sách"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>

                  {/* List Context Menu */}
                  {openListMenuId === list.id && (
                    <div className="absolute right-2 top-9 z-30 w-52 bg-white border border-slate-200 rounded-lg shadow-lg py-1 text-xs">
                      <button
                        onClick={() => {
                          setAddingCardListId(list.id);
                          setOpenListMenuId(null);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-700 font-medium"
                      >
                        + Thêm thẻ vào danh sách
                      </button>
                      <button
                        onClick={() => {
                          onSetTargetList(list.id);
                          setOpenListMenuId(null);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 text-emerald-700 font-medium flex items-center gap-1.5"
                      >
                        <Target className="w-3.5 h-3.5" />
                        <span>Đặt làm danh sách mục tiêu</span>
                      </button>
                      <button
                        onClick={() => {
                          setEditingListId(list.id);
                          setEditingListTitle(list.title);
                          setOpenListMenuId(null);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-700"
                      >
                        Đổi tên danh sách
                      </button>
                      {project.lists.length > 1 && (
                        <button
                          onClick={() => {
                            onDeleteList(list.id);
                            setOpenListMenuId(null);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-rose-50 text-rose-600 flex items-center gap-1.5 border-t border-slate-100 mt-1 pt-2"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Xóa danh sách</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Cards Scrollable Container */}
                <div className="px-2.5 pb-2 space-y-2 overflow-y-auto kanban-scroll flex-1">
                  {cards.map((card) => {
                    const clStats = getCardChecklistStats(card);
                    const totalComments = card.logs.reduce(
                      (sum, l) => sum + l.comments.length,
                      0
                    );
                    const surfaceStyle =
                      CARD_SURFACE_CLASSES[card.cardColor] ?? CARD_SURFACE_CLASSES.default;

                    return (
                      <div
                        key={card.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, card.id)}
                        onDragEnd={() => {
                          setDraggedCardId(null);
                          setDragOverListId(null);
                        }}
                        onClick={() => onSelectCard(card.id)}
                        className={`group rounded-lg border p-2.5 cursor-pointer transition-all shadow-[0_1px_2px_rgba(15,23,42,0.06)] hover:shadow-sm ${surfaceStyle.cardBg} ${surfaceStyle.border}`}
                      >
                        {/* Top Color Label Bars (like screenshot) */}
                        {card.labels.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 mb-2">
                            {card.labels.map((lbl) => (
                              <span
                                key={lbl.id}
                                title={lbl.name}
                                className={`h-2 w-10 rounded-full ${LABEL_COLOR_CLASSES[lbl.color].bar}`}
                              />
                            ))}
                          </div>
                        )}

                        {/* Card Title */}
                        <div className="text-[13px] font-semibold text-slate-900 leading-snug">
                          {card.title}
                        </div>

                        {/* Checklist Mini Progress Bar */}
                        {clStats.total > 0 && (
                          <div className="mt-2 flex items-center gap-2">
                            <div className="flex-1 h-1 bg-slate-200/80 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  clStats.percent === 100 ? 'bg-emerald-500' : 'bg-blue-500'
                                }`}
                                style={{ width: `${clStats.percent}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-mono text-slate-500 tabular-nums">
                              {clStats.percent}%
                            </span>
                          </div>
                        )}

                        {/* Card Metadata & Avatars Row */}
                        <div className="mt-2.5 flex items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 tabular-nums">
                            {card.isWatching && (
                              <Eye className="w-3.5 h-3.5 text-slate-400" />
                            )}

                            {card.dueDateLabel && (
                              <span
                                className={`inline-flex items-center gap-1 font-medium ${
                                  card.isOverdue && isCardAgingEnabled && !isTargetList
                                    ? 'text-rose-700'
                                    : isTargetList
                                    ? 'text-emerald-700'
                                    : 'text-slate-600'
                                }`}
                              >
                                <Clock className="w-3 h-3" />
                                <span>{card.dueDateLabel}</span>
                              </span>
                            )}

                            {card.description && (
                              <AlignLeft className="w-3.5 h-3.5 text-slate-400" />
                            )}

                            {card.attachmentCount > 0 && (
                              <span className="inline-flex items-center gap-0.5">
                                <Paperclip className="w-3 h-3" />
                                <span>{card.attachmentCount}</span>
                              </span>
                            )}

                            {clStats.total > 0 && (
                              <span
                                className={`inline-flex items-center gap-1 font-mono ${
                                  clStats.percent === 100
                                    ? 'text-emerald-700 font-semibold'
                                    : 'text-slate-600'
                                }`}
                              >
                                <CheckSquare className="w-3 h-3" />
                                <span>
                                  {clStats.completed}/{clStats.total}
                                </span>
                              </span>
                            )}

                            {(card.logs.length > 0 || totalComments > 0) && (
                              <span className="inline-flex items-center gap-0.5 text-slate-500">
                                <MessageSquare className="w-3 h-3" />
                                <span>{totalComments || card.logs.length}</span>
                              </span>
                            )}
                          </div>

                          {/* Assignees */}
                          <div className="flex items-center -space-x-1 shrink-0">
                            {card.assigneeIds.slice(0, 2).map((mid) => {
                              const m = memberMap.get(mid);
                              if (!m) return null;
                              return (
                                <span
                                  key={m.id}
                                  title={`${m.name} (${m.role})`}
                                  className={`w-6 h-6 rounded-full text-[10px] font-bold text-white flex items-center justify-center border border-white ${m.avatarBg}`}
                                >
                                  {m.initials}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Inline Add Card Form */}
                  {addingCardListId === list.id && (
                    <div className="bg-white border border-blue-300 rounded-lg p-2.5 space-y-2">
                      <textarea
                        rows={2}
                        value={newCardTitle}
                        onChange={(e) => setNewCardTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleCreateCard(list.id);
                          }
                          if (e.key === 'Escape') {
                            setAddingCardListId(null);
                          }
                        }}
                        placeholder="Nhập tiêu đề thẻ công việc..."
                        autoFocus
                        className="w-full text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none resize-none"
                      />

                      {/* Quick Card Color Picker */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-500">Màu thẻ:</span>
                          {(Object.keys(CARD_SURFACE_CLASSES) as Card['cardColor'][]).map(
                            (cKey) => (
                              <button
                                key={cKey}
                                type="button"
                                onClick={() => setNewCardColor(cKey)}
                                title={CARD_SURFACE_CLASSES[cKey].nameVi}
                                className={`w-4 h-4 rounded-full border ${
                                  CARD_SURFACE_CLASSES[cKey].swatch
                                } ${
                                  newCardColor === cKey ? 'ring-2 ring-blue-600 ring-offset-1' : ''
                                }`}
                              />
                            )
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCreateCard(list.id)}
                          className="px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
                        >
                          Thêm thẻ
                        </button>
                        <button
                          onClick={() => {
                            setAddingCardListId(null);
                            setNewCardTitle('');
                          }}
                          className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Column Footer: + Thêm thẻ */}
                {addingCardListId !== list.id && (
                  <div className="p-2 pt-1">
                    <button
                      onClick={() => {
                        setAddingCardListId(list.id);
                        setNewCardTitle('');
                        setNewCardColor('default');
                      }}
                      className="w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-200/70 hover:text-slate-900 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Thêm thẻ</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {/* Add Another List Column (+ Thêm danh sách khác) */}
          <div className="w-[272px] shrink-0">
            {isAddingList ? (
              <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2.5 shadow-sm">
                <input
                  type="text"
                  value={newListTitle}
                  onChange={(e) => setNewListTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateList();
                    if (e.key === 'Escape') setIsAddingList(false);
                  }}
                  placeholder="Nhập tên danh sách mới..."
                  autoFocus
                  className="w-full text-xs px-2.5 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCreateList}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
                  >
                    Thêm danh sách
                  </button>
                  <button
                    onClick={() => {
                      setIsAddingList(false);
                      setNewListTitle('');
                    }}
                    className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsAddingList(true)}
                className="w-full flex items-center gap-2 px-4 py-3 rounded-xl bg-white/75 hover:bg-white border border-slate-200/80 text-xs font-semibold text-slate-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm danh sách khác</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

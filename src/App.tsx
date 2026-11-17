import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, FolderPlus } from 'lucide-react';
import { INITIAL_WORKSPACE_STATE } from './data/seedData';
import {
  ActiveView,
  AutomationRule,
  Card,
  CustomFieldAction,
  Member,
  Project,
  ProjectGoalConfig,
  ScheduledCommand,
  WorkspaceState,
} from './types';
import {
  applyCustomFieldActions,
  applyRulesAfterCardMove,
  applyRulesAfterChecklistToggle,
  createLogEntry,
  executeScheduledCommand,
  nowTimestampLabel,
} from './utils/automationEngine';
import { calculateProjectMetrics } from './utils/metrics';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { DashboardView } from './components/DashboardView';
import { KanbanBoardView } from './components/KanbanBoardView';
import { CardDetailModal } from './components/CardDetailModal';
import { BurndownView } from './components/BurndownView';
import { AutomationHubView } from './components/AutomationHubView';
import { LogsView } from './components/LogsView';
import { ProjectMembersModal } from './components/ProjectMembersModal';
import {
  EditProjectModal,
  ExportDataModal,
  GoalConfigModal,
  NewProjectModal,
} from './components/ProjectModals';

const STORAGE_KEY = 'agileflow_workspace_v1';

function loadInitialState(): WorkspaceState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as WorkspaceState;
      if (parsed && Array.isArray(parsed.projects)) {
        const defaultMemberIds = (parsed.members ?? INITIAL_WORKSPACE_STATE.members).map(
          (m) => m.id
        );
        return {
          ...parsed,
          members: (parsed.members ?? INITIAL_WORKSPACE_STATE.members).map((m) => ({
            ...m,
            email: m.email ?? `${m.initials.toLowerCase()}@gmail.com`,
            inviteStatus: m.inviteStatus ?? 'joined',
          })),
          projects: parsed.projects.map((p) => ({
            ...p,
            memberIds: Array.isArray(p.memberIds) ? p.memberIds : defaultMemberIds,
          })),
        };
      }
    }
  } catch {
    // fallback to seed
  }
  return INITIAL_WORKSPACE_STATE;
}

const AVATAR_BG_POOL = [
  'bg-indigo-700',
  'bg-emerald-600',
  'bg-amber-600',
  'bg-sky-600',
  'bg-rose-600',
  'bg-violet-600',
  'bg-teal-600',
];

export default function App() {
  const [state, setState] = useState<WorkspaceState>(loadInitialState);
  const [activeView, setActiveView] = useState<ActiveView>('board');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [editingProjectState, setEditingProjectState] = useState<{
    projectId: string;
    confirmDelete: boolean;
  } | null>(null);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore storage quota errors
    }
  }, [state]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3200);
  };

  const activeProject = useMemo(
    () =>
      state.projects.find((p) => p.id === state.activeProjectId) ?? state.projects[0],
    [state.projects, state.activeProjectId]
  );

  const editingProject = useMemo(
    () =>
      editingProjectState
        ? state.projects.find((p) => p.id === editingProjectState.projectId) ?? null
        : null,
    [state.projects, editingProjectState]
  );

  const selectedCard = useMemo(
    () => activeProject?.cards.find((c) => c.id === selectedCardId) ?? null,
    [activeProject, selectedCardId]
  );

  const currentActorId = state.members[0]?.id ?? 'm_tt';

  const updateProject = (
    projectId: string,
    updater: (proj: Project) => Project,
    extraCommandLogs?: WorkspaceState['commandLogs']
  ) => {
    setState((prev) => ({
      ...prev,
      projects: prev.projects.map((p) => (p.id === projectId ? updater(p) : p)),
      commandLogs: extraCommandLogs
        ? [...extraCommandLogs, ...prev.commandLogs]
        : prev.commandLogs,
    }));
  };

  // Board Handlers
  const handleMoveCard = (cardId: string, toListId: string) => {
    const card = activeProject.cards.find((c) => c.id === cardId);
    if (!card || card.listId === toListId) return;

    const fromList = activeProject.lists.find((l) => l.id === card.listId);
    const toList = activeProject.lists.find((l) => l.id === toListId);

    const movedWithLog: Card = {
      ...card,
      listId: toListId,
      updatedAt: nowTimestampLabel(),
      logs: [
        createLogEntry(
          currentActorId,
          `Chuyển thẻ từ "${fromList?.title ?? ''}" sang "${toList?.title ?? ''}"`,
          'move',
          undefined,
          card
        ),
        ...card.logs,
      ],
    };

    const { updatedCard, updatedRules, generatedLogs } = applyRulesAfterCardMove(
      activeProject,
      movedWithLog,
      toListId
    );

    updateProject(
      activeProject.id,
      (proj) => ({
        ...proj,
        rules: updatedRules,
        cards: proj.cards.map((c) => (c.id === cardId ? updatedCard : c)),
      }),
      generatedLogs
    );

    if (generatedLogs.length > 0) {
      showToast(`Quy tắc tự động đã chạy: ${generatedLogs[0].commandName}`);
    }
  };

  const handleAddCard = (listId: string, title: string, color: Card['cardColor'] = 'default') => {
    const list = activeProject.lists.find((l) => l.id === listId);
    const newCard: Card = {
      id: `card_${Date.now()}`,
      listId,
      title,
      description: '',
      labels: [],
      cardColor: color,
      attachmentCount: 0,
      assigneeIds: [currentActorId],
      storyPoints: 3,
      checklist: [],
      customFields: {},
      logs: [],
      createdAt: nowTimestampLabel(),
      updatedAt: nowTimestampLabel(),
    };
    newCard.logs = [
      createLogEntry(
        currentActorId,
        `Tạo thẻ mới trong danh sách "${list?.title ?? ''}"`,
        'update',
        undefined,
        newCard
      ),
    ];

    updateProject(activeProject.id, (proj) => ({
      ...proj,
      cards: [...proj.cards, newCard],
    }));
  };

  const handleDeleteCard = (cardId: string) => {
    updateProject(activeProject.id, (proj) => ({
      ...proj,
      cards: proj.cards.filter((c) => c.id !== cardId),
    }));
    showToast('Đã xóa thẻ công việc');
  };

  // List Handlers
  const handleAddList = (title: string) => {
    const maxOrder = Math.max(-1, ...activeProject.lists.map((l) => l.order));
    updateProject(activeProject.id, (proj) => ({
      ...proj,
      lists: [
        ...proj.lists,
        { id: `list_${Date.now()}`, title, order: maxOrder + 1 },
      ],
    }));
  };

  const handleRenameList = (listId: string, newTitle: string) => {
    updateProject(activeProject.id, (proj) => ({
      ...proj,
      lists: proj.lists.map((l) => (l.id === listId ? { ...l, title: newTitle } : l)),
    }));
  };

  const handleDeleteList = (listId: string) => {
    const fallbackList = activeProject.lists.find((l) => l.id !== listId);
    if (!fallbackList) return;
    updateProject(activeProject.id, (proj) => ({
      ...proj,
      lists: proj.lists.filter((l) => l.id !== listId),
      cards: proj.cards.map((c) =>
        c.listId === listId ? { ...c, listId: fallbackList.id } : c
      ),
      goalConfig:
        proj.goalConfig.targetListId === listId
          ? { ...proj.goalConfig, targetListId: fallbackList.id }
          : proj.goalConfig,
    }));
  };

  const handleSetTargetList = (listId: string) => {
    const list = activeProject.lists.find((l) => l.id === listId);
    updateProject(activeProject.id, (proj) => ({
      ...proj,
      goalConfig: { ...proj.goalConfig, targetListId: listId },
    }));
    showToast(`Đã đặt "${list?.title ?? ''}" làm danh sách mục tiêu 100%`);
  };

  // Log Comments (used by Dashboard & Logs views)
  const handleAddCardLogComment = (
    projectId: string,
    cardId: string,
    logId: string,
    content: string
  ) => {
    updateProject(projectId, (proj) => ({
      ...proj,
      cards: proj.cards.map((c) => {
        if (c.id !== cardId) return c;
        return {
          ...c,
          logs: c.logs.map((l) =>
            l.id === logId
              ? {
                  ...l,
                  comments: [
                    ...l.comments,
                    {
                      id: `cm_${Date.now()}`,
                      authorId: currentActorId,
                      content,
                      createdAt: nowTimestampLabel(),
                    },
                  ],
                }
              : l
          ),
        };
      }),
    }));
  };

  const handleAddCommandLogComment = (cmdLogId: string, content: string) => {
    setState((prev) => ({
      ...prev,
      commandLogs: prev.commandLogs.map((cl) =>
        cl.id === cmdLogId
          ? {
              ...cl,
              comments: [
                ...cl.comments,
                {
                  id: `cm_cmd_${Date.now()}`,
                  authorId: currentActorId,
                  content,
                  createdAt: nowTimestampLabel(),
                },
              ],
            }
          : cl
      ),
    }));
  };

  // Burndown Snapshot
  const handleRecordBurndownSnapshot = (projectId: string) => {
    const proj = state.projects.find((p) => p.id === projectId);
    if (!proj) return;
    const metrics = calculateProjectMetrics(proj);
    const nextIdx = proj.burndown.length + 1;
    const lastIdeal = proj.burndown[proj.burndown.length - 1]?.idealRemaining ?? 0;

    updateProject(projectId, (p) => ({
      ...p,
      burndown: [
        ...p.burndown,
        {
          dayLabel: `Ngày ${nextIdx}`,
          idealRemaining: Math.max(0, lastIdeal - 4),
          actualRemaining: metrics.remainingStoryPoints,
          recordedAt: nowTimestampLabel(),
        },
      ],
    }));
    showToast(`Đã ghi nhận Snapshot Burndown (${metrics.remainingStoryPoints} điểm còn lại)`);
  };

  // Transactional Save for CardDetailModal (nothing commits until "Lưu" is pressed)
  const handleSaveCardDraft = (updatedCard: Card, originalCard: Card) => {
    let nextCard: Card = {
      ...updatedCard,
      updatedAt: nowTimestampLabel(),
    };
    let nextRules = activeProject.rules;
    let nextActions = activeProject.customFieldActions;
    const generatedLogs: WorkspaceState['commandLogs'] = [];

    const summaryParts: string[] = [];
    if (updatedCard.title !== originalCard.title) {
      summaryParts.push(`Đổi tiêu đề thành "${updatedCard.title}"`);
    }
    if (updatedCard.description !== originalCard.description) {
      summaryParts.push('Cập nhật mô tả công việc');
    }
    if (updatedCard.storyPoints !== originalCard.storyPoints) {
      summaryParts.push(
        `Story Points: ${originalCard.storyPoints} → ${updatedCard.storyPoints}`
      );
    }
    if (updatedCard.cardColor !== originalCard.cardColor) {
      summaryParts.push(`Đổi màu thẻ (${updatedCard.cardColor})`);
    }
    if (updatedCard.listId !== originalCard.listId) {
      const fromList = activeProject.lists.find((l) => l.id === originalCard.listId);
      const toList = activeProject.lists.find((l) => l.id === updatedCard.listId);
      summaryParts.push(
        `Chuyển danh sách: "${fromList?.title ?? ''}" → "${toList?.title ?? ''}"`
      );
    }

    if (summaryParts.length > 0) {
      nextCard = {
        ...nextCard,
        logs: [
          createLogEntry(
            currentActorId,
            `Lưu cập nhật thẻ`,
            updatedCard.listId !== originalCard.listId ? 'move' : 'update',
            summaryParts.join(' · '),
            nextCard
          ),
          ...nextCard.logs,
        ],
      };
    }

    // Trigger Rules if list changed
    if (updatedCard.listId !== originalCard.listId) {
      const ruleMoveResult = applyRulesAfterCardMove(
        { ...activeProject, rules: nextRules },
        nextCard,
        updatedCard.listId
      );
      nextCard = ruleMoveResult.updatedCard;
      nextRules = ruleMoveResult.updatedRules;
      generatedLogs.push(...ruleMoveResult.generatedLogs);
    }

    // Trigger Rules if checklist changed & reached 100%
    const checklistChanged =
      JSON.stringify(updatedCard.checklist) !== JSON.stringify(originalCard.checklist);
    if (checklistChanged) {
      const checklistRuleResult = applyRulesAfterChecklistToggle(
        { ...activeProject, rules: nextRules },
        nextCard
      );
      nextCard = checklistRuleResult.finalCard;
      nextRules = checklistRuleResult.updatedRules;
      generatedLogs.push(...checklistRuleResult.generatedLogs);
    }

    // Trigger Custom Field Actions if any custom field changed
    for (const cfDef of activeProject.customFieldDefs) {
      const prevVal = originalCard.customFields[cfDef.id];
      const nextVal = updatedCard.customFields[cfDef.id];
      if (nextVal !== undefined && nextVal !== prevVal) {
        const cfResult = applyCustomFieldActions(
          { ...activeProject, customFieldActions: nextActions },
          nextCard,
          cfDef.id,
          nextVal
        );
        nextCard = cfResult.finalCard;
        nextActions = cfResult.updatedActions;
        generatedLogs.push(...cfResult.generatedLogs);
      }
    }

    updateProject(
      activeProject.id,
      (proj) => ({
        ...proj,
        rules: nextRules,
        customFieldActions: nextActions,
        cards: proj.cards.map((c) => (c.id === nextCard.id ? nextCard : c)),
      }),
      generatedLogs
    );

    if (updatedCard.storyPoints !== originalCard.storyPoints) {
      showToast(
        `Đã lưu thẻ & cập nhật Burndown (${originalCard.storyPoints} → ${updatedCard.storyPoints} điểm)`
      );
    } else if (generatedLogs.length > 0) {
      showToast(`Đã lưu thẻ & chạy tự động hóa: ${generatedLogs[0].commandName}`);
    } else {
      showToast('Đã lưu thay đổi thẻ thành công');
    }
  };

  // Member Invite via Gmail Handlers
  const handleInviteMemberByEmail = (data: {
    email: string;
    name: string;
    role: string;
  }): Member => {
    const existing = state.members.find(
      (m) => m.email.toLowerCase() === data.email.toLowerCase()
    );
    if (existing) {
      if (!activeProject.memberIds.includes(existing.id)) {
        updateProject(activeProject.id, (p) => ({
          ...p,
          memberIds: [...p.memberIds, existing.id],
        }));
      }
      showToast(`Đã thêm ${existing.name} (${existing.email}) vào dự án`);
      return existing;
    }

    const displayName = data.name || data.email.split('@')[0];
    const parts = displayName.trim().split(/\s+/);
    const initials =
      parts.length >= 2
        ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
        : displayName.slice(0, 2).toUpperCase();

    const newMember: Member = {
      id: `m_${Date.now()}`,
      initials,
      name: displayName,
      email: data.email,
      role: data.role,
      avatarBg: AVATAR_BG_POOL[state.members.length % AVATAR_BG_POOL.length],
      inviteStatus: 'invited',
      invitedAt: nowTimestampLabel(),
    };

    setState((prev) => ({
      ...prev,
      members: [...prev.members, newMember],
      projects: prev.projects.map((p) =>
        p.id === activeProject.id
          ? { ...p, memberIds: [...p.memberIds, newMember.id] }
          : p
      ),
    }));
    showToast(`Đã thêm & tạo email mời tham gia cho ${newMember.email}`);
    return newMember;
  };

  const handleAddExistingMemberToProject = (memberId: string) => {
    if (activeProject.memberIds.includes(memberId)) return;
    updateProject(activeProject.id, (p) => ({
      ...p,
      memberIds: [...p.memberIds, memberId],
    }));
  };

  const handleRemoveMemberFromProject = (memberId: string) => {
    updateProject(activeProject.id, (p) => ({
      ...p,
      memberIds: p.memberIds.filter((id) => id !== memberId),
    }));
  };

  const handleMarkMemberJoined = (memberId: string) => {
    setState((prev) => ({
      ...prev,
      members: prev.members.map((m) =>
        m.id === memberId ? { ...m, inviteStatus: 'joined' } : m
      ),
    }));
  };

  // Automation Hub Handlers
  const handleRunScheduledCommandNow = (cmdId: string) => {
    const cmd = activeProject.scheduledCommands.find((c) => c.id === cmdId);
    if (!cmd) return;
    const { updatedProject, executionLog } = executeScheduledCommand(activeProject, cmd);
    updateProject(activeProject.id, () => updatedProject, [executionLog]);
    showToast(executionLog.summary);
  };

  // New Project Handler
  const handleCreateProject = (data: {
    name: string;
    code: string;
    sprintName: string;
    description: string;
    listNames: string[];
    targetListName: string;
  }) => {
    const newId = `proj_${Date.now()}`;
    const lists = data.listNames.map((title, idx) => ({
      id: `${newId}_l${idx}`,
      title,
      order: idx,
    }));
    const targetList =
      lists.find((l) => l.title === data.targetListName) ?? lists[lists.length - 1];

    const newProject: Project = {
      id: newId,
      name: data.name,
      code: data.code,
      description: data.description,
      sprintName: data.sprintName,
      memberIds: [currentActorId],
      starred: false,
      lists,
      cards: [],
      goalConfig: {
        targetListId: targetList.id,
        goalMode: 'all_cards',
        targetCardCount: 5,
      },
      burndown: [
        { dayLabel: 'Ngày 1', idealRemaining: 20, actualRemaining: 20 },
        { dayLabel: 'Ngày 2', idealRemaining: 15, actualRemaining: 18 },
      ],
      customFieldDefs: [
        { id: 'cf_priority', name: 'Mức ưu tiên', type: 'select', options: ['Thấp', 'Trung bình', 'Cao', 'Khẩn cấp'] },
      ],
      powerUps: [
        {
          id: `pu_${newId}_1`,
          key: 'burndown',
          name: 'Burndown Charts for Agile',
          description: 'Biểu đồ đánh giá tiến độ Sprint.',
          category: 'Phân tích & Biểu đồ',
          enabled: true,
          configSummary: 'Đồng bộ Story Points',
        },
        {
          id: `pu_${newId}_2`,
          key: 'custom_fields',
          name: 'Custom Fields & Actions',
          description: 'Trường dữ liệu tùy chỉnh và kích hoạt tự động hóa.',
          category: 'Dữ liệu thẻ',
          enabled: true,
          configSummary: '1 trường đang kích hoạt',
        },
      ],
      quickButtons: [
        {
          id: `btn_${newId}_1`,
          name: 'Hoàn tất & Đẩy sang Đích',
          scope: 'card',
          actionType: 'move_to_target_and_complete',
          targetListId: targetList.id,
          description: 'Hoàn thành checklist và chuyển thẻ vào danh sách mục tiêu.',
          usageCount: 0,
        },
      ],
      rules: [],
      customFieldActions: [],
      scheduledCommands: [],
    };

    setState((prev) => ({
      ...prev,
      projects: [newProject, ...prev.projects],
      activeProjectId: newId,
    }));
    setActiveView('board');
    showToast(`Đã tạo dự án "${data.name}"`);
  };

  const handleSaveProjectDetails = (
    projectId: string,
    updates: { name: string; code: string; sprintName: string; description: string }
  ) => {
    updateProject(projectId, (p) => ({
      ...p,
      name: updates.name,
      code: updates.code,
      sprintName: updates.sprintName,
      description: updates.description,
    }));
    showToast(`Đã cập nhật thông tin dự án "${updates.name}"`);
  };

  const handleDeleteProject = (projectId: string) => {
    const target = state.projects.find((p) => p.id === projectId);
    setSelectedCardId(null);
    setState((prev) => {
      const remaining = prev.projects.filter((p) => p.id !== projectId);
      const nextActiveId =
        prev.activeProjectId === projectId
          ? remaining[0]?.id ?? ''
          : prev.activeProjectId;
      return {
        ...prev,
        projects: remaining,
        activeProjectId: nextActiveId,
        commandLogs: prev.commandLogs.filter((l) => l.projectId !== projectId),
      };
    });
    showToast(`Đã xóa dự án "${target?.name ?? ''}"`);
  };

  return (
    <div className="min-h-screen flex bg-[#F5F7FB] text-slate-900">
      {/* Left Navigation Sidebar */}
      <Sidebar
        projects={state.projects}
        activeProjectId={activeProject?.id ?? ''}
        activeView={activeView}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onSelectView={setActiveView}
        onSelectProject={(pid) =>
          setState((prev) => ({ ...prev, activeProjectId: pid }))
        }
        onOpenNewProject={() => setIsNewProjectModalOpen(true)}
        onEditProject={(proj, confirmDelete = false) =>
          setEditingProjectState({ projectId: proj.id, confirmDelete })
        }
      />

      {/* Right Main Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar
          activeView={activeView}
          activeProject={activeProject}
          projects={state.projects}
          onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
          onSelectProject={(pid) =>
            setState((prev) => ({ ...prev, activeProjectId: pid }))
          }
          onOpenExportModal={() => setIsExportModalOpen(true)}
          onOpenNewProject={() => setIsNewProjectModalOpen(true)}
        />

        <main className="flex-1 min-w-0">
          {!activeProject && activeView !== 'dashboard' ? (
            <div className="max-w-lg mx-auto my-16 bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                <FolderPlus className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Chưa có dự án nào</h2>
              <p className="text-sm text-slate-500">
                Hãy tạo một dự án Kanban mới để bắt đầu quản lý luồng công việc và theo dõi hiệu suất.
              </p>
              <button
                onClick={() => setIsNewProjectModalOpen(true)}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
              >
                + Tạo dự án mới
              </button>
            </div>
          ) : (
            <>
              {activeView === 'dashboard' && (
                <DashboardView
                  state={state}
                  onOpenProjectBoard={(pid) => {
                    setState((prev) => ({ ...prev, activeProjectId: pid }));
                    setActiveView('board');
                  }}
                  onNavigateView={setActiveView}
                  onAddLogComment={handleAddCardLogComment}
                />
              )}

              {activeView === 'board' && activeProject && (
                <KanbanBoardView
                  project={activeProject}
                  members={state.members}
                  onSelectCard={(cid) => setSelectedCardId(cid)}
                  onMoveCard={handleMoveCard}
                  onAddCard={handleAddCard}
                  onAddList={handleAddList}
                  onRenameList={handleRenameList}
                  onDeleteList={handleDeleteList}
                  onSetTargetList={handleSetTargetList}
                  onToggleStar={() =>
                    updateProject(activeProject.id, (p) => ({ ...p, starred: !p.starred }))
                  }
                  onOpenGoalModal={() => setIsGoalModalOpen(true)}
                  onOpenMembersModal={() => setIsMembersModalOpen(true)}
                  onOpenEditProject={(confirmDelete = false) =>
                    setEditingProjectState({ projectId: activeProject.id, confirmDelete })
                  }
                  onOpenExportModal={() => setIsExportModalOpen(true)}
                  onNavigateView={setActiveView}
                />
              )}

              {activeView === 'burndown' && activeProject && (
                <BurndownView
                  projects={state.projects}
                  activeProject={activeProject}
                  onRecordSnapshot={handleRecordBurndownSnapshot}
                />
              )}

              {activeView === 'automation' && activeProject && (
            <AutomationHubView
              project={activeProject}
              members={state.members}
              commandLogs={state.commandLogs}
              onTogglePowerUp={(puId) =>
                updateProject(activeProject.id, (p) => ({
                  ...p,
                  powerUps: p.powerUps.map((pu) =>
                    pu.id === puId ? { ...pu, enabled: !pu.enabled } : pu
                  ),
                }))
              }
              onAddQuickButton={(btn) =>
                updateProject(activeProject.id, (p) => ({
                  ...p,
                  quickButtons: [
                    ...p.quickButtons,
                    { ...btn, id: `btn_${Date.now()}`, usageCount: 0 },
                  ],
                }))
              }
              onDeleteQuickButton={(btnId) =>
                updateProject(activeProject.id, (p) => ({
                  ...p,
                  quickButtons: p.quickButtons.filter((b) => b.id !== btnId),
                }))
              }
              onAddRule={(rule: Omit<AutomationRule, 'id' | 'runCount'>) =>
                updateProject(activeProject.id, (p) => ({
                  ...p,
                  rules: [...p.rules, { ...rule, id: `rule_${Date.now()}`, runCount: 0 }],
                }))
              }
              onToggleRule={(ruleId) =>
                updateProject(activeProject.id, (p) => ({
                  ...p,
                  rules: p.rules.map((r) =>
                    r.id === ruleId ? { ...r, enabled: !r.enabled } : r
                  ),
                }))
              }
              onDeleteRule={(ruleId) =>
                updateProject(activeProject.id, (p) => ({
                  ...p,
                  rules: p.rules.filter((r) => r.id !== ruleId),
                }))
              }
              onAddCustomFieldDef={(name, options) =>
                updateProject(activeProject.id, (p) => ({
                  ...p,
                  customFieldDefs: [
                    ...p.customFieldDefs,
                    { id: `cf_${Date.now()}`, name, type: 'select', options },
                  ],
                }))
              }
              onAddCustomFieldAction={(act: Omit<CustomFieldAction, 'id' | 'runCount'>) =>
                updateProject(activeProject.id, (p) => ({
                  ...p,
                  customFieldActions: [
                    ...p.customFieldActions,
                    { ...act, id: `cfa_${Date.now()}`, runCount: 0 },
                  ],
                }))
              }
              onToggleCustomFieldAction={(actId) =>
                updateProject(activeProject.id, (p) => ({
                  ...p,
                  customFieldActions: p.customFieldActions.map((a) =>
                    a.id === actId ? { ...a, enabled: !a.enabled } : a
                  ),
                }))
              }
              onAddScheduledCommand={(cmd: Omit<ScheduledCommand, 'id' | 'runCount' | 'status'>) =>
                updateProject(activeProject.id, (p) => ({
                  ...p,
                  scheduledCommands: [
                    ...p.scheduledCommands,
                    {
                      ...cmd,
                      id: `cmd_${Date.now()}`,
                      runCount: 0,
                      status: 'active',
                    },
                  ],
                }))
              }
              onToggleScheduledCommand={(cmdId) =>
                updateProject(activeProject.id, (p) => ({
                  ...p,
                  scheduledCommands: p.scheduledCommands.map((c) =>
                    c.id === cmdId
                      ? {
                          ...c,
                          enabled: !c.enabled,
                          status: !c.enabled ? 'active' : 'paused',
                        }
                      : c
                  ),
                }))
              }
              onRunScheduledCommandNow={handleRunScheduledCommandNow}
              onAddCommandLogComment={handleAddCommandLogComment}
              onOpenExportModal={() => setIsExportModalOpen(true)}
            />
          )}

          {activeView === 'logs' && activeProject && (
            <LogsView
              project={activeProject}
              members={state.members}
              commandLogs={state.commandLogs}
              onOpenCard={(cid) => {
                setActiveView('board');
                setSelectedCardId(cid);
              }}
              onAddCardLogComment={handleAddCardLogComment}
              onAddCommandLogComment={handleAddCommandLogComment}
            />
          )}
            </>
          )}
        </main>
      </div>

      {/* Card Detail Modal (Transactional Draft with explicit Save) */}
      {selectedCard && activeProject && (
        <CardDetailModal
          key={selectedCard.id}
          project={activeProject}
          card={selectedCard}
          members={state.members}
          currentActorId={currentActorId}
          onClose={() => setSelectedCardId(null)}
          onSaveCard={handleSaveCardDraft}
          onDeleteCard={handleDeleteCard}
        />
      )}

      {/* Modals */}
      {isMembersModalOpen && activeProject && (
        <ProjectMembersModal
          project={activeProject}
          allMembers={state.members}
          onClose={() => setIsMembersModalOpen(false)}
          onInviteMemberByEmail={handleInviteMemberByEmail}
          onAddExistingMember={handleAddExistingMemberToProject}
          onRemoveMemberFromProject={handleRemoveMemberFromProject}
          onMarkMemberJoined={handleMarkMemberJoined}
        />
      )}

      {editingProject && (
        <EditProjectModal
          key={editingProject.id}
          project={editingProject}
          initialConfirmDelete={editingProjectState?.confirmDelete ?? false}
          onClose={() => setEditingProjectState(null)}
          onSaveProject={handleSaveProjectDetails}
          onDeleteProject={handleDeleteProject}
        />
      )}

      {isNewProjectModalOpen && (
        <NewProjectModal
          onClose={() => setIsNewProjectModalOpen(false)}
          onCreateProject={handleCreateProject}
        />
      )}

      {isGoalModalOpen && activeProject && (
        <GoalConfigModal
          project={activeProject}
          onClose={() => setIsGoalModalOpen(false)}
          onSaveGoal={(goalConfig: ProjectGoalConfig) => {
            updateProject(activeProject.id, (p) => ({ ...p, goalConfig }));
            showToast('Đã cập nhật cấu hình mục tiêu hiệu suất dự án');
          }}
        />
      )}

      {isExportModalOpen && (
        <ExportDataModal
          state={state}
          activeProject={activeProject}
          onClose={() => setIsExportModalOpen(false)}
          onImportJSON={(newState) => {
            setState(newState);
            showToast('Đã khôi phục dữ liệu thành công');
          }}
          onResetSeed={() => {
            setState(INITIAL_WORKSPACE_STATE);
            showToast('Đã khôi phục dữ liệu mẫu ban đầu');
          }}
        />
      )}

      {/* Subtle Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-lg border border-slate-700 flex items-center gap-2 text-xs font-medium max-w-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

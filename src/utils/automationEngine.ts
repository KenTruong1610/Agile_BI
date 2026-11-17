import {
  ActivityLog,
  Card,
  CardSurfaceColorKey,
  CommandExecutionLog,
  Project,
  QuickButton,
  ScheduledCommand,
} from '../types';
import { calculateProjectMetrics, getCardChecklistStats } from './metrics';

export function nowTimestampLabel(): string {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const mo = String(now.getMonth() + 1).padStart(2, '0');
  return `${hh}:${mm} · ${dd}/${mo}`;
}

export function createLogEntry(
  actorId: string,
  action: string,
  category: ActivityLog['category'],
  detail?: string,
  card?: Pick<Card, 'id' | 'title'>
): ActivityLog {
  return {
    id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    cardId: card?.id,
    cardTitle: card?.title,
    actorId,
    action,
    detail,
    category,
    createdAt: nowTimestampLabel(),
    comments: [],
  };
}

export function applyRulesAfterCardMove(
  project: Project,
  movedCard: Card,
  toListId: string
): {
  updatedCard: Card;
  updatedRules: Project['rules'];
  generatedLogs: CommandExecutionLog[];
} {
  let card = { ...movedCard, listId: toListId };
  const generatedLogs: CommandExecutionLog[] = [];

  const updatedRules = project.rules.map((rule) => {
    if (!rule.enabled) return rule;
    if (rule.triggerType === 'card_moved_to_list' && rule.triggerValue === toListId) {
      let actionSummary = '';
      if (rule.actionType === 'complete_checklists') {
        card = {
          ...card,
          checklist: card.checklist.map((item) => ({ ...item, completed: true })),
        };
        actionSummary = `Tự động đánh dấu hoàn thành ${card.checklist.length} mục checklist`;
      } else if (rule.actionType === 'set_card_color') {
        card = {
          ...card,
          cardColor: rule.actionValue as CardSurfaceColorKey,
        };
        actionSummary = `Đổi màu thẻ sang "${rule.actionValue}"`;
      } else if (rule.actionType === 'append_log') {
        actionSummary = rule.actionValue;
      }

      const autoLog = createLogEntry(
        'system',
        `Quy tắc tự động: ${rule.name}`,
        'automation',
        actionSummary,
        card
      );
      card = { ...card, logs: [autoLog, ...card.logs], updatedAt: nowTimestampLabel() };

      generatedLogs.push({
        id: `cmdlog_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        projectId: project.id,
        commandId: rule.id,
        commandName: rule.name,
        source: 'rule',
        summary: `${card.title}: ${actionSummary}`,
        affectedCards: 1,
        status: 'success',
        executedAt: nowTimestampLabel(),
        comments: [],
      });

      return { ...rule, runCount: rule.runCount + 1 };
    }
    return rule;
  });

  return { updatedCard: card, updatedRules, generatedLogs };
}

export function applyRulesAfterChecklistToggle(
  project: Project,
  updatedCard: Card
): {
  finalCard: Card;
  updatedRules: Project['rules'];
  generatedLogs: CommandExecutionLog[];
} {
  let card = { ...updatedCard };
  const stats = getCardChecklistStats(card);
  const generatedLogs: CommandExecutionLog[] = [];

  if (stats.total === 0 || stats.percent < 100) {
    return { finalCard: card, updatedRules: project.rules, generatedLogs };
  }

  const updatedRules = project.rules.map((rule) => {
    if (!rule.enabled) return rule;
    if (rule.triggerType === 'checklist_100_percent') {
      if (rule.actionType === 'move_to_list' && rule.actionValue && card.listId !== rule.actionValue) {
        const targetList = project.lists.find((l) => l.id === rule.actionValue);
        if (targetList) {
          card = {
            ...card,
            listId: targetList.id,
            updatedAt: nowTimestampLabel(),
            logs: [
              createLogEntry(
                'system',
                `Quy tắc tự động: ${rule.name}`,
                'automation',
                `Checklist đạt 100% -> Tự động chuyển sang danh sách "${targetList.title}"`,
                card
              ),
              ...card.logs,
            ],
          };
          generatedLogs.push({
            id: `cmdlog_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            projectId: project.id,
            commandId: rule.id,
            commandName: rule.name,
            source: 'rule',
            summary: `${card.title} đạt 100% checklist -> Chuyển sang "${targetList.title}"`,
            affectedCards: 1,
            status: 'success',
            executedAt: nowTimestampLabel(),
            comments: [],
          });
          return { ...rule, runCount: rule.runCount + 1 };
        }
      }
    }
    return rule;
  });

  return { finalCard: card, updatedRules, generatedLogs };
}

export function applyCustomFieldActions(
  project: Project,
  card: Card,
  fieldId: string,
  newValue: string | number
): {
  finalCard: Card;
  updatedActions: Project['customFieldActions'];
  generatedLogs: CommandExecutionLog[];
} {
  let nextCard = {
    ...card,
    customFields: {
      ...card.customFields,
      [fieldId]: newValue,
    },
    updatedAt: nowTimestampLabel(),
  };

  const generatedLogs: CommandExecutionLog[] = [];
  const fieldDef = project.customFieldDefs.find((f) => f.id === fieldId);

  const updatedActions = project.customFieldActions.map((act) => {
    if (!act.enabled) return act;
    if (act.fieldId === fieldId && String(act.matchValue).toLowerCase() === String(newValue).toLowerCase()) {
      let detailMsg = '';
      if (act.actionType === 'set_card_color') {
        nextCard = {
          ...nextCard,
          cardColor: act.actionValue as CardSurfaceColorKey,
        };
        detailMsg = `Trường "${fieldDef?.name ?? fieldId}" = "${newValue}" -> Đổi màu thẻ sang "${act.actionValue}"`;
      } else if (act.actionType === 'move_to_list') {
        const destList = project.lists.find((l) => l.id === act.actionValue);
        if (destList) {
          nextCard = { ...nextCard, listId: destList.id };
          detailMsg = `Trường "${fieldDef?.name ?? fieldId}" = "${newValue}" -> Chuyển thẻ sang "${destList.title}"`;
        }
      } else if (act.actionType === 'add_log_warning') {
        detailMsg = act.actionValue;
      }

      if (detailMsg) {
        nextCard = {
          ...nextCard,
          logs: [
            createLogEntry('system', `Custom Field Action: ${act.name}`, 'automation', detailMsg, nextCard),
            ...nextCard.logs,
          ],
        };
        generatedLogs.push({
          id: `cmdlog_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          projectId: project.id,
          commandId: act.id,
          commandName: act.name,
          source: 'custom_field',
          summary: `${nextCard.title}: ${detailMsg}`,
          affectedCards: 1,
          status: 'success',
          executedAt: nowTimestampLabel(),
          comments: [],
        });
        return { ...act, runCount: act.runCount + 1 };
      }
    }
    return act;
  });

  return { finalCard: nextCard, updatedActions, generatedLogs };
}

export function executeQuickButtonOnCard(
  project: Project,
  card: Card,
  button: QuickButton,
  leadMemberId: string
): {
  updatedCard: Card;
  executionLog: CommandExecutionLog;
} {
  let nextCard = { ...card };
  let summary = '';

  if (button.actionType === 'move_to_target_and_complete') {
    const targetList = project.lists.find((l) => l.id === (button.targetListId || project.goalConfig.targetListId));
    nextCard = {
      ...nextCard,
      listId: targetList?.id ?? project.goalConfig.targetListId,
      cardColor: 'emerald',
      checklist: nextCard.checklist.map((c) => ({ ...c, completed: true })),
    };
    summary = `Chuyển sang "${targetList?.title ?? 'Done'}", hoàn thành 100% checklist & tô màu xanh`;
  } else if (button.actionType === 'mark_bug_urgent') {
    const bugList = project.lists.find(
      (l) => l.title.toLowerCase().includes('bug') || l.title.toLowerCase().includes('issue')
    );
    nextCard = {
      ...nextCard,
      listId: bugList?.id ?? nextCard.listId,
      cardColor: 'rose',
      isOverdue: true,
    };
    summary = `Đánh dấu khẩn cấp (màu đỏ) & chuyển về "${bugList?.title ?? 'Issue/Bug'}"`;
  } else if (button.actionType === 'assign_lead') {
    if (!nextCard.assigneeIds.includes(leadMemberId)) {
      nextCard = { ...nextCard, assigneeIds: [leadMemberId, ...nextCard.assigneeIds] };
    }
    summary = `Đã phân công nhanh thành viên phụ trách chính`;
  } else if (button.actionType === 'complete_all_checklists') {
    nextCard = {
      ...nextCard,
      checklist: nextCard.checklist.map((c) => ({ ...c, completed: true })),
    };
    summary = `Đánh dấu hoàn tất toàn bộ ${nextCard.checklist.length} mục checklist`;
  } else if (button.actionType === 'reset_to_todo') {
    const todoList = project.lists.find((l) => l.title.toLowerCase().includes('to do'));
    nextCard = {
      ...nextCard,
      listId: todoList?.id ?? project.lists[0]?.id ?? nextCard.listId,
      cardColor: 'default',
    };
    summary = `Đưa thẻ về danh sách "${todoList?.title ?? 'To Do'}"`;
  }

  nextCard = {
    ...nextCard,
    updatedAt: nowTimestampLabel(),
    logs: [
      createLogEntry('system', `Nút thao tác nhanh: ${button.name}`, 'automation', summary, nextCard),
      ...nextCard.logs,
    ],
  };

  return {
    updatedCard: nextCard,
    executionLog: {
      id: `cmdlog_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      projectId: project.id,
      commandId: button.id,
      commandName: button.name,
      source: 'button',
      summary: `${nextCard.title}: ${summary}`,
      affectedCards: 1,
      status: 'success',
      executedAt: nowTimestampLabel(),
      comments: [],
    },
  };
}

export function executeScheduledCommand(
  project: Project,
  command: ScheduledCommand
): {
  updatedProject: Project;
  executionLog: CommandExecutionLog;
} {
  let affectedCards = 0;
  let summary = '';
  let nextCards = [...project.cards];
  let nextBurndown = [...project.burndown];

  if (command.commandType === 'audit_overdue') {
    nextCards = project.cards.map((c) => {
      if (c.isOverdue && c.listId !== project.goalConfig.targetListId) {
        affectedCards += 1;
        return {
          ...c,
          cardColor: 'amber' as CardSurfaceColorKey,
          logs: [
            createLogEntry(
              'system',
              `Lệnh lên lịch: ${command.name}`,
              'automation',
              'Cảnh báo thẻ quá hạn chưa nằm trong danh sách mục tiêu',
              c
            ),
            ...c.logs,
          ],
        };
      }
      return c;
    });
    summary = `Đã quét toàn bộ dự án: phát hiện & gắn cảnh báo ${affectedCards} thẻ quá hạn.`;
  } else if (command.commandType === 'check_missing_checklist') {
    nextCards = project.cards.map((c) => {
      if (c.checklist.length === 0) {
        affectedCards += 1;
        return {
          ...c,
          checklist: [
            { id: `chk_${Date.now()}_1`, text: 'Xác nhận yêu cầu & tiêu chí hoàn thành', completed: false },
            { id: `chk_${Date.now()}_2`, text: 'Kiểm thử trước khi chuyển Done', completed: false },
          ],
          logs: [
            createLogEntry(
              'system',
              `Lệnh lên lịch: ${command.name}`,
              'automation',
              'Tự động bổ sung checklist chuẩn cho thẻ chưa có mục đánh giá',
              c
            ),
            ...c.logs,
          ],
        };
      }
      return c;
    });
    summary =
      affectedCards > 0
        ? `Đã tự động thêm checklist chuẩn cho ${affectedCards} thẻ thiếu tiêu chí.`
        : 'Tất cả thẻ trong dự án đều đã có checklist đầy đủ.';
  } else if (command.commandType === 'sync_burndown_snapshot') {
    const metrics = calculateProjectMetrics(project);
    const nextDayIdx = nextBurndown.length + 1;
    const lastIdeal = nextBurndown[nextBurndown.length - 1]?.idealRemaining ?? 0;
    nextBurndown = [
      ...nextBurndown,
      {
        dayLabel: `Ngày ${nextDayIdx}`,
        idealRemaining: Math.max(0, Math.round(lastIdeal * 0.7)),
        actualRemaining: metrics.remainingStoryPoints,
        recordedAt: nowTimestampLabel(),
      },
    ];
    affectedCards = project.cards.length;
    summary = `Đã ghi nhận snapshot Burndown mới (${metrics.remainingStoryPoints} điểm còn lại, hiệu suất ${metrics.efficiencyPercent}%).`;
  } else if (command.commandType === 'highlight_blocked_bugs') {
    const bugListIds = new Set(
      project.lists
        .filter((l) => l.title.toLowerCase().includes('bug') || l.title.toLowerCase().includes('issue'))
        .map((l) => l.id)
    );
    nextCards = project.cards.map((c) => {
      if (bugListIds.has(c.listId)) {
        affectedCards += 1;
        return {
          ...c,
          cardColor: 'rose' as CardSurfaceColorKey,
          logs: [
            createLogEntry(
              'system',
              `Lệnh lên lịch: ${command.name}`,
              'automation',
              'Đánh dấu ưu tiên xử lý lỗi trong danh sách Issue/Bug',
              c
            ),
            ...c.logs,
          ],
        };
      }
      return c;
    });
    summary = `Đã tô màu cảnh báo đỏ cho ${affectedCards} thẻ lỗi thuộc danh sách Issue/Bug.`;
  }

  const now = nowTimestampLabel();
  const updatedCommands = project.scheduledCommands.map((cmd) =>
    cmd.id === command.id ? { ...cmd, lastRunAt: now, runCount: cmd.runCount + 1 } : cmd
  );

  return {
    updatedProject: {
      ...project,
      cards: nextCards,
      burndown: nextBurndown,
      scheduledCommands: updatedCommands,
    },
    executionLog: {
      id: `cmdlog_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      projectId: project.id,
      commandId: command.id,
      commandName: command.name,
      source: 'scheduled',
      summary,
      affectedCards,
      status: affectedCards > 0 || command.commandType === 'sync_burndown_snapshot' ? 'success' : 'warning',
      executedAt: now,
      comments: [],
    },
  };
}

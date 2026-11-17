import { BurndownPoint, Card, Project, WorkspaceState } from '../types';

export interface ProjectMetrics {
  projectId: string;
  projectName: string;
  projectCode: string;
  sprintName: string;
  targetListTitle: string;
  totalCards: number;
  targetGoalCards: number;
  cardsInTargetList: number;
  efficiencyPercent: number;
  checklistTotalItems: number;
  checklistCompletedItems: number;
  checklistEfficiencyPercent: number;
  totalStoryPoints: number;
  completedStoryPoints: number;
  remainingStoryPoints: number;
  bugCount: number;
  overdueCount: number;
  totalLogsCount: number;
  totalCommentsCount: number;
}

export interface WorkspaceMetrics {
  totalProjects: number;
  averageEfficiencyPercent: number;
  averageChecklistPercent: number;
  totalCards: number;
  totalCompletedTargetCards: number;
  totalBugs: number;
  rankedProjects: ProjectMetrics[];
}

export function getCardChecklistStats(card: Card): {
  completed: number;
  total: number;
  percent: number;
} {
  const total = card.checklist.length;
  if (total === 0) {
    return { completed: 0, total: 0, percent: 0 };
  }
  const completed = card.checklist.filter((item) => item.completed).length;
  return {
    completed,
    total,
    percent: Math.round((completed / total) * 100),
  };
}

export function calculateProjectMetrics(project: Project): ProjectMetrics {
  const targetList = project.lists.find((l) => l.id === project.goalConfig.targetListId) || project.lists[project.lists.length - 1];
  const targetListId = targetList?.id ?? '';
  const targetListTitle = targetList?.title ?? 'Done';

  const totalCards = project.cards.length;
  const cardsInTargetList = project.cards.filter((c) => c.listId === targetListId).length;

  const targetGoalCards =
    project.goalConfig.goalMode === 'fixed_count'
      ? Math.max(1, project.goalConfig.targetCardCount)
      : totalCards;

  const rawEfficiency =
    targetGoalCards === 0 ? 0 : Math.min(100, (cardsInTargetList / targetGoalCards) * 100);
  const efficiencyPercent = Math.round(rawEfficiency * 10) / 10;

  let checklistTotalItems = 0;
  let checklistCompletedItems = 0;
  let totalStoryPoints = 0;
  let completedStoryPoints = 0;
  let overdueCount = 0;
  let totalLogsCount = 0;
  let totalCommentsCount = 0;

  const bugLists = new Set(
    project.lists
      .filter((l) => l.title.toLowerCase().includes('bug') || l.title.toLowerCase().includes('issue'))
      .map((l) => l.id)
  );

  let bugCount = 0;

  for (const card of project.cards) {
    checklistTotalItems += card.checklist.length;
    checklistCompletedItems += card.checklist.filter((i) => i.completed).length;
    totalStoryPoints += card.storyPoints;
    if (card.listId === targetListId) {
      completedStoryPoints += card.storyPoints;
    }
    if (card.isOverdue && card.listId !== targetListId) {
      overdueCount += 1;
    }
    if (bugLists.has(card.listId)) {
      bugCount += 1;
    }
    totalLogsCount += card.logs.length;
    for (const log of card.logs) {
      totalCommentsCount += log.comments.length;
    }
  }

  const checklistEfficiencyPercent =
    checklistTotalItems === 0
      ? 0
      : Math.round((checklistCompletedItems / checklistTotalItems) * 1000) / 10;

  return {
    projectId: project.id,
    projectName: project.name,
    projectCode: project.code,
    sprintName: project.sprintName,
    targetListTitle,
    totalCards,
    targetGoalCards,
    cardsInTargetList,
    efficiencyPercent,
    checklistTotalItems,
    checklistCompletedItems,
    checklistEfficiencyPercent,
    totalStoryPoints,
    completedStoryPoints,
    remainingStoryPoints: Math.max(0, totalStoryPoints - completedStoryPoints),
    bugCount,
    overdueCount,
    totalLogsCount,
    totalCommentsCount,
  };
}

export function calculateWorkspaceMetrics(projects: Project[]): WorkspaceMetrics {
  const allMetrics = projects.map(calculateProjectMetrics);
  const totalProjects = allMetrics.length;

  const sumEfficiency = allMetrics.reduce((acc, m) => acc + m.efficiencyPercent, 0);
  const averageEfficiencyPercent =
    totalProjects === 0 ? 0 : Math.round((sumEfficiency / totalProjects) * 10) / 10;

  const sumChecklist = allMetrics.reduce((acc, m) => acc + m.checklistEfficiencyPercent, 0);
  const averageChecklistPercent =
    totalProjects === 0 ? 0 : Math.round((sumChecklist / totalProjects) * 10) / 10;

  const rankedProjects = [...allMetrics].sort((a, b) => {
    if (b.efficiencyPercent !== a.efficiencyPercent) {
      return b.efficiencyPercent - a.efficiencyPercent;
    }
    return b.checklistEfficiencyPercent - a.checklistEfficiencyPercent;
  });

  return {
    totalProjects,
    averageEfficiencyPercent,
    averageChecklistPercent,
    totalCards: allMetrics.reduce((acc, m) => acc + m.totalCards, 0),
    totalCompletedTargetCards: allMetrics.reduce((acc, m) => acc + m.cardsInTargetList, 0),
    totalBugs: allMetrics.reduce((acc, m) => acc + m.bugCount, 0),
    rankedProjects,
  };
}

export function buildLiveBurndownSeries(project: Project): BurndownPoint[] {
  const metrics = calculateProjectMetrics(project);
  const base = project.burndown;
  const totalPts = metrics.totalStoryPoints;
  const remPts = metrics.remainingStoryPoints;

  if (base.length === 0) {
    return [
      { dayLabel: 'Bắt đầu', idealRemaining: totalPts, actualRemaining: totalPts },
      { dayLabel: 'Hiện tại', idealRemaining: Math.round(totalPts * 0.5), actualRemaining: remPts },
    ];
  }

  const origStart = base[0].idealRemaining || 1;
  const scaleFactor = totalPts > 0 ? totalPts / origStart : 1;

  return base.map((pt, idx) => {
    const isLast = idx === base.length - 1;
    const ideal = Math.max(0, Math.round(totalPts * (1 - idx / Math.max(1, base.length))));
    const actual = isLast
      ? remPts
      : idx === 0
      ? totalPts
      : Math.max(0, Math.round(pt.actualRemaining * scaleFactor));

    return {
      dayLabel: isLast ? `${pt.dayLabel} (Hiện tại)` : pt.dayLabel,
      idealRemaining: ideal,
      actualRemaining: actual,
      recordedAt: pt.recordedAt,
    };
  });
}

export function buildSystemBurndownSeries(projects: Project[]): BurndownPoint[] {
  const perProject = projects.map(buildLiveBurndownSeries);
  const maxLen = Math.max(0, ...perProject.map((s) => s.length));
  if (maxLen === 0) return [];

  const result: BurndownPoint[] = [];
  for (let i = 0; i < maxLen; i++) {
    let sumIdeal = 0;
    let sumActual = 0;
    for (const series of perProject) {
      const pt = series[i] ?? series[series.length - 1];
      if (pt) {
        sumIdeal += pt.idealRemaining;
        sumActual += pt.actualRemaining;
      }
    }
    const isLast = i === maxLen - 1;
    result.push({
      dayLabel: isLast ? `Ngày ${i + 1} (Hiện tại)` : `Ngày ${i + 1}`,
      idealRemaining: sumIdeal,
      actualRemaining: sumActual,
    });
  }
  return result;
}

function escapeCsvCell(value: string | number): string {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportProjectToCSV(project: Project): void {
  const metrics = calculateProjectMetrics(project);
  const listMap = new Map(project.lists.map((l) => [l.id, l.title]));

  const headers = [
    'Dự án',
    'Mã thẻ / Tiêu đề',
    'Danh sách hiện tại',
    'Thuộc danh sách mục tiêu',
    'Màu thẻ',
    'Story Points',
    'Checklist hoàn thành',
    'Hiệu suất Checklist (%)',
    'Hạn hoàn thành',
    'Số Log',
    'Số Bình luận trên Log',
    'Mô tả công việc',
  ];

  const rows = project.cards.map((card) => {
    const cl = getCardChecklistStats(card);
    const commentCount = card.logs.reduce((sum, l) => sum + l.comments.length, 0);
    return [
      project.name,
      card.title,
      listMap.get(card.listId) ?? '',
      card.listId === project.goalConfig.targetListId ? 'Đạt mục tiêu' : 'Đang thực hiện',
      card.cardColor,
      card.storyPoints,
      `${cl.completed}/${cl.total}`,
      `${cl.percent}%`,
      card.dueDateLabel ?? '',
      card.logs.length,
      commentCount,
      card.description,
    ]
      .map(escapeCsvCell)
      .join(',');
  });

  const summaryRow = [
    `TỔNG KẾT (${project.name})`,
    `Mục tiêu: ${metrics.targetListTitle}`,
    `${metrics.cardsInTargetList}/${metrics.targetGoalCards} thẻ`,
    `Hiệu suất dự án: ${metrics.efficiencyPercent}%`,
    '',
    metrics.totalStoryPoints,
    `${metrics.checklistCompletedItems}/${metrics.checklistTotalItems}`,
    `${metrics.checklistEfficiencyPercent}%`,
    '',
    metrics.totalLogsCount,
    metrics.totalCommentsCount,
    '',
  ]
    .map(escapeCsvCell)
    .join(',');

  const csvContent = '\uFEFF' + [headers.map(escapeCsvCell).join(','), ...rows, summaryRow].join('\n');
  downloadFile(csvContent, `${project.code.toLowerCase()}_export.csv`, 'text/csv;charset=utf-8;');
}

export function exportWorkspaceToCSV(state: WorkspaceState): void {
  const headers = [
    'Xếp hạng',
    'Mã dự án',
    'Tên dự án',
    'Sprint',
    'Danh sách mục tiêu',
    'Thẻ đạt mục tiêu',
    'Tổng số thẻ mục tiêu',
    'Hiệu suất dự án (%)',
    'Hiệu suất Checklist (%)',
    'Story Points còn lại',
    'Số Issue/Bug',
  ];

  const wsMetrics = calculateWorkspaceMetrics(state.projects);
  const rows = wsMetrics.rankedProjects.map((m, idx) =>
    [
      idx + 1,
      m.projectCode,
      m.projectName,
      m.sprintName,
      m.targetListTitle,
      m.cardsInTargetList,
      m.targetGoalCards,
      `${m.efficiencyPercent}%`,
      `${m.checklistEfficiencyPercent}%`,
      m.remainingStoryPoints,
      m.bugCount,
    ]
      .map(escapeCsvCell)
      .join(',')
  );

  const avgRow = [
    '-',
    'TRUNG BÌNH CỘNG',
    `${wsMetrics.totalProjects} dự án`,
    '',
    '',
    wsMetrics.totalCompletedTargetCards,
    wsMetrics.totalCards,
    `${wsMetrics.averageEfficiencyPercent}%`,
    `${wsMetrics.averageChecklistPercent}%`,
    '',
    wsMetrics.totalBugs,
  ]
    .map(escapeCsvCell)
    .join(',');

  const csvContent = '\uFEFF' + [headers.map(escapeCsvCell).join(','), ...rows, avgRow].join('\n');
  downloadFile(csvContent, 'agileflow_workspace_report.csv', 'text/csv;charset=utf-8;');
}

export function exportDataToJSON(data: unknown, filename: string): void {
  const jsonContent = JSON.stringify(data, null, 2);
  downloadFile(jsonContent, filename, 'application/json;charset=utf-8;');
}

function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

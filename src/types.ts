export type LabelColorKey = 'red' | 'blue' | 'amber' | 'emerald' | 'purple' | 'cyan';
export type CardSurfaceColorKey = 'default' | 'blue' | 'emerald' | 'amber' | 'rose' | 'violet';

export interface Member {
  id: string;
  initials: string;
  name: string;
  email: string;
  role: string;
  avatarBg: string;
  inviteStatus?: 'joined' | 'invited';
  invitedAt?: string;
}

export interface CardLabel {
  id: string;
  name: string;
  color: LabelColorKey;
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface LogComment {
  id: string;
  authorId: string;
  content: string;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  cardId?: string;
  cardTitle?: string;
  actorId: string;
  action: string;
  detail?: string;
  category: 'move' | 'checklist' | 'update' | 'automation' | 'comment' | 'system';
  createdAt: string;
  comments: LogComment[];
}

export interface CustomFieldDef {
  id: string;
  name: string;
  type: 'select' | 'number' | 'text';
  options?: string[];
}

export interface Card {
  id: string;
  listId: string;
  title: string;
  description: string;
  labels: CardLabel[];
  cardColor: CardSurfaceColorKey;
  dueDateLabel?: string;
  isOverdue?: boolean;
  isWatching?: boolean;
  attachmentCount: number;
  assigneeIds: string[];
  storyPoints: number;
  checklist: ChecklistItem[];
  customFields: Record<string, string | number>;
  logs: ActivityLog[];
  createdAt: string;
  updatedAt: string;
}

export interface KanbanList {
  id: string;
  title: string;
  order: number;
}

export interface ProjectGoalConfig {
  targetListId: string;
  goalMode: 'all_cards' | 'fixed_count';
  targetCardCount: number;
}

export interface BurndownPoint {
  dayLabel: string;
  idealRemaining: number;
  actualRemaining: number;
  recordedAt?: string;
}

export interface PowerUpItem {
  id: string;
  key: 'burndown' | 'custom_fields' | 'card_aging' | 'bug_sync' | 'export_pro';
  name: string;
  description: string;
  category: string;
  enabled: boolean;
  configSummary: string;
}

export interface QuickButton {
  id: string;
  name: string;
  scope: 'card' | 'board';
  actionType: 'move_to_target_and_complete' | 'mark_bug_urgent' | 'assign_lead' | 'complete_all_checklists' | 'reset_to_todo';
  targetListId?: string;
  colorTint?: CardSurfaceColorKey;
  description: string;
  usageCount: number;
}

export interface AutomationRule {
  id: string;
  name: string;
  enabled: boolean;
  triggerType: 'card_moved_to_list' | 'checklist_100_percent' | 'card_color_changed';
  triggerValue: string;
  actionType: 'complete_checklists' | 'set_card_color' | 'move_to_list' | 'append_log';
  actionValue: string;
  runCount: number;
}

export interface CustomFieldAction {
  id: string;
  name: string;
  enabled: boolean;
  fieldId: string;
  matchValue: string;
  actionType: 'set_card_color' | 'move_to_list' | 'add_log_warning';
  actionValue: string;
  runCount: number;
}

export interface ScheduledCommand {
  id: string;
  name: string;
  scheduleCron: string;
  scheduleLabel: string;
  enabled: boolean;
  commandType: 'audit_overdue' | 'check_missing_checklist' | 'sync_burndown_snapshot' | 'highlight_blocked_bugs';
  permissionLevel: 'admin' | 'member' | 'system';
  lastRunAt?: string;
  runCount: number;
  status: 'active' | 'paused';
}

export interface CommandExecutionLog {
  id: string;
  projectId: string;
  commandId: string;
  commandName: string;
  source: 'scheduled' | 'manual' | 'rule' | 'button' | 'custom_field';
  summary: string;
  affectedCards: number;
  status: 'success' | 'warning';
  executedAt: string;
  comments: LogComment[];
}

export interface Project {
  id: string;
  name: string;
  code: string;
  description: string;
  sprintName: string;
  memberIds: string[];
  lists: KanbanList[];
  cards: Card[];
  goalConfig: ProjectGoalConfig;
  burndown: BurndownPoint[];
  customFieldDefs: CustomFieldDef[];
  powerUps: PowerUpItem[];
  quickButtons: QuickButton[];
  rules: AutomationRule[];
  customFieldActions: CustomFieldAction[];
  scheduledCommands: ScheduledCommand[];
  starred?: boolean;
}

export interface WorkspaceState {
  projects: Project[];
  members: Member[];
  activeProjectId: string;
  commandLogs: CommandExecutionLog[];
}

export type ActiveView = 'dashboard' | 'board' | 'burndown' | 'automation' | 'logs';

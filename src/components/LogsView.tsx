import React, { useMemo, useState } from 'react';
import { MessageSquare, Search, Send } from 'lucide-react';
import { CommandExecutionLog, Member, Project } from '../types';

interface LogsViewProps {
  project: Project;
  members: Member[];
  commandLogs: CommandExecutionLog[];
  onOpenCard: (cardId: string) => void;
  onAddCardLogComment: (projectId: string, cardId: string, logId: string, content: string) => void;
  onAddCommandLogComment: (cmdLogId: string, content: string) => void;
}

export const LogsView: React.FC<LogsViewProps> = ({
  project,
  members,
  commandLogs,
  onOpenCard,
  onAddCardLogComment,
  onAddCommandLogComment,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'card' | 'command'>('all');
  const [search, setSearch] = useState('');
  const [replyTargetId, setReplyTargetId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const memberMap = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

  const combinedLogs = useMemo(() => {
    const cardEntries = project.cards.flatMap((card) =>
      card.logs.map((log) => ({
        kind: 'card' as const,
        id: log.id,
        cardId: card.id,
        title: card.title,
        actorName:
          log.actorId === 'system'
            ? 'Hệ thống Tự động'
            : memberMap.get(log.actorId)?.name ?? 'Thành viên',
        action: log.action,
        detail: log.detail,
        timestamp: log.createdAt,
        comments: log.comments,
      }))
    );

    const cmdEntries = commandLogs
      .filter((c) => c.projectId === project.id)
      .map((c) => ({
        kind: 'command' as const,
        id: c.id,
        cardId: undefined,
        title: `Lệnh: ${c.commandName}`,
        actorName: `Tự động hóa (${c.source})`,
        action: c.summary,
        detail: `Ảnh hưởng ${c.affectedCards} thẻ`,
        timestamp: c.executedAt,
        comments: c.comments,
      }));

    return [...cmdEntries, ...cardEntries].filter((item) => {
      if (filterType !== 'all' && item.kind !== filterType) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          item.title.toLowerCase().includes(q) ||
          item.action.toLowerCase().includes(q) ||
          (item.detail ?? '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [project, commandLogs, memberMap, filterType, search]);

  return (
    <div className="max-w-[1040px] mx-auto px-4 lg:px-6 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Nhật ký hoạt động & Bình luận theo Log
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Trao đổi, phản hồi trực tiếp trên từng sự kiện của dự án <strong>{project.name}</strong> để nâng cao hiệu quả xử lý công việc.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs font-semibold">
          {(
            [
              { id: 'all', label: 'Tất cả Log' },
              { id: 'card', label: 'Log thẻ công việc' },
              { id: 'command', label: 'Log lệnh & Automation' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                filterType === tab.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative flex-1 min-w-[220px] max-w-xs">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm trong nhật ký..."
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Feed */}
      <div className="space-y-3">
        {combinedLogs.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-400">
            Không tìm thấy bản ghi nhật ký nào phù hợp.
          </div>
        ) : (
          combinedLogs.map((entry) => {
            const isReplying = replyTargetId === entry.id;
            return (
              <div
                key={entry.id}
                className="bg-white border border-slate-200 rounded-xl p-4 space-y-2.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs text-slate-500 flex items-center gap-2">
                      <span className="font-semibold text-slate-900">{entry.actorName}</span>
                      <span>·</span>
                      {entry.cardId ? (
                        <button
                          onClick={() => onOpenCard(entry.cardId!)}
                          className="font-semibold text-blue-600 hover:underline"
                        >
                          {entry.title}
                        </button>
                      ) : (
                        <span className="font-semibold text-slate-700">{entry.title}</span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-slate-900 mt-1">{entry.action}</p>
                    {entry.detail && (
                      <p className="text-xs text-slate-500 mt-0.5">{entry.detail}</p>
                    )}
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 tabular-nums shrink-0">
                    {entry.timestamp}
                  </span>
                </div>

                {/* Threaded Comments */}
                {entry.comments.length > 0 && (
                  <div className="pl-3 border-l-2 border-blue-200 space-y-1.5 pt-1">
                    {entry.comments.map((cm) => {
                      const author = memberMap.get(cm.authorId);
                      return (
                        <div
                          key={cm.id}
                          className="bg-slate-50 border border-slate-200/80 rounded-lg px-3 py-2 text-xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-slate-900">
                              {author?.name ?? 'Thành viên'}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              {cm.createdAt}
                            </span>
                          </div>
                          <p className="text-slate-700 mt-0.5">{cm.content}</p>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="pt-1 flex items-center gap-3">
                  <button
                    onClick={() => {
                      setReplyTargetId(isReplying ? null : entry.id);
                      setReplyText('');
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Bình luận trên log này ({entry.comments.length})</span>
                  </button>
                </div>

                {isReplying && (
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && replyText.trim()) {
                          if (entry.kind === 'card' && entry.cardId) {
                            onAddCardLogComment(project.id, entry.cardId, entry.id, replyText.trim());
                          } else {
                            onAddCommandLogComment(entry.id, replyText.trim());
                          }
                          setReplyText('');
                          setReplyTargetId(null);
                        }
                      }}
                      placeholder="Nhập bình luận phản hồi cho bản ghi log này..."
                      autoFocus
                      className="flex-1 text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => {
                        if (!replyText.trim()) return;
                        if (entry.kind === 'card' && entry.cardId) {
                          onAddCardLogComment(project.id, entry.cardId, entry.id, replyText.trim());
                        } else {
                          onAddCommandLogComment(entry.id, replyText.trim());
                        }
                        setReplyText('');
                        setReplyTargetId(null);
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
    </div>
  );
};

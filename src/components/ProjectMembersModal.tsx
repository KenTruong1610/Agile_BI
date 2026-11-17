import React, { useState } from 'react';
import {
  Check,
  Copy,
  Mail,
  Send,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { Member, Project } from '../types';

interface ProjectMembersModalProps {
  project: Project;
  allMembers: Member[];
  onClose: () => void;
  onInviteMemberByEmail: (data: {
    email: string;
    name: string;
    role: string;
  }) => Member;
  onAddExistingMember: (memberId: string) => void;
  onRemoveMemberFromProject: (memberId: string) => void;
  onMarkMemberJoined: (memberId: string) => void;
}

export const ProjectMembersModal: React.FC<ProjectMembersModalProps> = ({
  project,
  allMembers,
  onClose,
  onInviteMemberByEmail,
  onAddExistingMember,
  onRemoveMemberFromProject,
  onMarkMemberJoined,
}) => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('Thành viên dự án');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastInvitedMember, setLastInvitedMember] = useState<Member | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const projectMembers = allMembers.filter((m) => project.memberIds.includes(m.id));
  const otherWorkspaceMembers = allMembers.filter((m) => !project.memberIds.includes(m.id));

  const buildMailtoHref = (targetEmail: string, targetName: string) => {
    const subject = encodeURIComponent(
      `[AgileFlow] Mời tham gia dự án: ${project.name}`
    );
    const body = encodeURIComponent(
      `Chào ${targetName || targetEmail},\n\nBạn được mời tham gia dự án "${project.name}" (${project.code}) trên AgileFlow.\nSprint hiện tại: ${project.sprintName}\nLink truy cập không gian làm việc: ${window.location.href}\n\nTrân trọng.`
    );
    return `mailto:${targetEmail}?subject=${subject}&body=${body}`;
  };

  const handleCopyInvite = (member: Member) => {
    const text = `Mời ${member.name} (${member.email}) tham gia dự án ${project.name}: ${window.location.href}`;
    navigator.clipboard?.writeText(text);
    setCopiedId(member.id);
    window.setTimeout(() => setCopiedId(null), 2000);
  };

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedEmail = email.trim().toLowerCase();
    if (!cleanedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanedEmail)) {
      setErrorMsg('Vui lòng nhập địa chỉ Gmail hợp lệ (VD: tenban@gmail.com).');
      return;
    }
    setErrorMsg(null);
    const created = onInviteMemberByEmail({
      email: cleanedEmail,
      name: name.trim(),
      role: role.trim() || 'Thành viên',
    });
    setLastInvitedMember(created);
    setEmail('');
    setName('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Users className="w-5 h-5 text-blue-600" />
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Thành viên tham gia dự án
              </h2>
              <p className="text-xs text-slate-500">
                {project.name} · {projectMembers.length} người tham gia
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5 kanban-scroll">
          {/* Invite via Gmail Form */}
          <form
            onSubmit={handleInviteSubmit}
            className="border border-slate-200 rounded-xl p-4 bg-slate-50/70 space-y-3"
          >
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
              <UserPlus className="w-4 h-4 text-blue-600" />
              <span>Mời người tham gia mới qua Gmail</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="sm:col-span-2">
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Địa chỉ Gmail *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nguyenvana@gmail.com"
                  className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Tên hiển thị
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="VD: Minh Anh"
                  className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2.5">
              <div className="sm:w-56">
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Vai trò trong dự án
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg"
                >
                  <option value="Thành viên dự án">Thành viên dự án</option>
                  <option value="Frontend Dev">Frontend Dev</option>
                  <option value="Backend Dev">Backend Dev</option>
                  <option value="QA / Tester">QA / Tester</option>
                  <option value="Scrum Master">Scrum Master</option>
                  <option value="Product Owner">Product Owner</option>
                </select>
              </div>

              <button
                type="submit"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors whitespace-nowrap"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Thêm & Gửi email mời</span>
              </button>
            </div>

            {errorMsg && (
              <p className="text-xs text-rose-600 font-medium">{errorMsg}</p>
            )}

            {lastInvitedMember && (
              <div className="mt-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="text-emerald-900">
                  Đã thêm <strong>{lastInvitedMember.name}</strong> ({lastInvitedMember.email}) vào danh sách tham gia dự án.
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={buildMailtoHref(lastInvitedMember.email, lastInvitedMember.name)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-emerald-700 hover:bg-emerald-800 text-white font-semibold"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Gửi qua ứng dụng Email</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => handleCopyInvite(lastInvitedMember)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-white border border-emerald-300 text-emerald-800 font-semibold hover:bg-emerald-100"
                  >
                    {copiedId === lastInvitedMember.id ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Đã chép</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Chép lời mời</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </form>

          {/* Current Project Members List */}
          <div>
            <h3 className="text-xs font-bold text-slate-700 mb-2.5">
              Danh sách người tham gia hiện tại ({projectMembers.length})
            </h3>
            <div className="border border-slate-200 rounded-xl divide-y divide-slate-100">
              {projectMembers.map((m) => (
                <div
                  key={m.id}
                  className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 hover:bg-slate-50/70"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-8 h-8 rounded-full text-xs font-bold text-white flex items-center justify-center shrink-0 ${m.avatarBg}`}
                    >
                      {m.initials}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 truncate">
                          {m.name}
                        </span>
                        <span className="text-xs text-slate-500">· {m.role}</span>
                      </div>
                      <div className="text-xs text-slate-500 truncate">
                        {m.email}
                        {m.inviteStatus === 'invited' && (
                          <span className="text-amber-700 font-semibold ml-2">
                            · Đang chờ xác nhận email
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <a
                      href={buildMailtoHref(m.email, m.name)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700"
                      title="Gửi email mời tới Gmail này"
                    >
                      <Mail className="w-3.5 h-3.5 text-blue-600" />
                      <span>Gửi email</span>
                    </a>

                    {m.inviteStatus === 'invited' && (
                      <button
                        onClick={() => onMarkMemberJoined(m.id)}
                        className="px-2.5 py-1.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold hover:bg-emerald-100"
                      >
                        Đã vào nhóm
                      </button>
                    )}

                    {projectMembers.length > 1 && (
                      <button
                        onClick={() => onRemoveMemberFromProject(m.id)}
                        className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                        title="Xóa khỏi dự án"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick-add existing workspace members */}
          {otherWorkspaceMembers.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-slate-700 mb-2">
                Thêm nhanh thành viên từ không gian làm việc
              </h3>
              <div className="flex flex-wrap gap-2">
                {otherWorkspaceMembers.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => onAddExistingMember(m.id)}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:border-blue-400 text-xs font-medium text-slate-700"
                  >
                    <span
                      className={`w-5 h-5 rounded-full text-[10px] font-bold text-white flex items-center justify-center ${m.avatarBg}`}
                    >
                      {m.initials}
                    </span>
                    <span>+ {m.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Archive, ArchiveRestore, Search, MessageSquare, X } from 'lucide-react';
import { listConversations, startConversation, getMessages, markConversationRead, sendMessage, listStudentProfiles, setConversationArchived } from '../../action/counselor';
import ConversationPanel from '../../../components/ConversationPanel';
import InlineError from '../../../components/InlineError';
import { useCurrentUser } from '../../../components/CurrentUser';

const POLL_INTERVAL_MS = 5000;

interface Conversation {
  id: string;
  participantName: string;
  participantRole: string;
  lastMessage: string;
  lastMessageAt: Date;
  unreadCount: number;
  isArchived: boolean;
  avatarUrl: string | null;
  profileUrl: string | null;
}

type StudentProfile = Awaited<ReturnType<typeof listStudentProfiles>>[number];

// "Jeron Abanes" -> "JA"; the picture for people without a profile photo.
function initialsOf(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "?";
}

const MessagesDashboard: React.FC = () => {
  const me = useCurrentUser();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showArchived, setShowArchived] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);

  const [isNewMessageOpen, setIsNewMessageOpen] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<'Student' | 'Faculty' | 'Parent'>('Student');
  // A chat with someone who has no conversation yet; it's created when the first message is sent.
  const [draft, setDraft] = useState<{ name: string; role: 'Student' | 'Faculty' | 'Parent' } | null>(null);
  const startedId = useRef<string | null>(null);
  const [studentProfiles, setStudentProfiles] = useState<StudentProfile[]>([]);
  const [studentQuery, setStudentQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await listStudentProfiles();
      if (!cancelled) setStudentProfiles(data);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Guards against an in-flight poll resolving after a more recent refresh
  // (e.g. right after a delete) and overwriting it with stale data.
  const refreshRequestId = useRef(0);
  const refreshConversations = async () => {
    const requestId = ++refreshRequestId.current;
    const data = await listConversations();
    if (requestId === refreshRequestId.current) setConversations(data);
  };

  useEffect(() => {
    refreshConversations();
    const interval = setInterval(refreshConversations, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  const archivedCount = conversations.filter((c) => c.isArchived).length;
  const filteredConversations = conversations.filter((chat) => chat.isArchived === showArchived).filter((chat) =>
    chat.participantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.participantRole.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedConversation = conversations.find((c) => c.id === selectedId) ?? null;

  const sq = studentQuery.trim().toLowerCase();
  const studentMatches = studentProfiles.filter(
    (s) => !sq || s.name.toLowerCase().includes(sq) || s.studentId.toLowerCase().includes(sq) || s.gradeSection.toLowerCase().includes(sq)
  );

  // Archiving hides it from the inbox (until someone writes again); closes it here.
  const toggleArchived = async (chat: Conversation) => {
    setArchiveError(null);
    const result = await setConversationArchived(chat.id, !chat.isArchived);
    if (result.success) {
      setSelectedId(null);
      await refreshConversations();
    } else {
      setArchiveError(result.error || "Couldn't update this conversation.");
    }
  };

  const openConversation = (id: string) => {
    setDraft(null);
    setSelectedId(id);
  };

  // Opens the chat with this person: their existing conversation (archived or
  // not), or an empty one that is saved once the first message is sent.
  const handleOpenChat = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    const existing = conversations.find((c) => c.participantRole === newRole && c.participantName.toLowerCase() === name.toLowerCase());
    if (existing) {
      setShowArchived(existing.isArchived);
      openConversation(existing.id);
    } else {
      setSelectedId(null);
      setShowArchived(false);
      setDraft({ name, role: newRole });
    }
    setIsNewMessageOpen(false);
    setNewName('');
    setStudentQuery('');
    setNewRole('Student');
  };

  const draftProfile = draft?.role === 'Student' ? studentProfiles.find((s) => s.name === draft.name) : undefined;

  return (
    <div className="fill-screen flex flex-col h-[calc(100dvh-var(--topbar-h)-var(--footer-h))] bg-paper font-sans antialiased text-slate-800">
      {/* Header Section */}
      <header className="px-5 sm:px-8 lg:px-12 pt-8 pb-5 border-b border-rule">
        <h1 className="page-title">Messages</h1>
      </header>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left Sidebar: Conversation List */}
        <aside className="w-[360px] border-r border-slate-200 flex flex-col bg-white shrink-0">
          {/* Action Area: Search & New Message Button */}
          <div className="p-4 space-y-3 border-b border-slate-100">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
              <input
                type="text"
                aria-label="Search conversations"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>

            {/* New Message Button */}
            <button
              onClick={() => { setStartError(null); setNewName(''); setStudentQuery(''); setIsNewMessageOpen(true); }}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-full transition-colors text-sm shadow-sm"
            >
              <MessageSquare className="w-4 h-4 fill-current" />
              <span>New Message</span>
            </button>

            <div role="tablist" aria-label="Conversations" className="flex gap-1">
              {[false, true].map((archived) => (
                <button key={String(archived)} role="tab" aria-selected={showArchived === archived}
                  onClick={() => { setShowArchived(archived); setSelectedId(null); }}
                  className={`flex-1 min-h-9 rounded-full text-[13px] transition-colors ${showArchived === archived ? 'bg-butter-200 text-ink font-medium' : 'text-slate-600 hover:bg-slate-100'}`}>
                  {archived ? `Archived${archivedCount ? ` (${archivedCount})` : ''}` : 'Inbox'}
                </button>
              ))}
            </div>
            <InlineError message={archiveError} onDismiss={() => setArchiveError(null)} />
          </div>

          {/* Conversations Scroll Container */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {filteredConversations.length > 0 ? (
              filteredConversations.map((chat) => {
                const isSelected = chat.id === selectedId;
                return (
                  <button
                    key={chat.id}
                    onClick={() => openConversation(chat.id)}
                    className={`w-full text-left p-4 flex items-start gap-3 transition-colors ${
                      isSelected ? 'bg-slate-50' : 'hover:bg-slate-50/60'
                    }`}
                  >
                    {/* Avatar Badge Container */}
                    <div className="relative shrink-0 mt-0.5">
                      {chat.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- private, session-checked photo route
                        <img src={chat.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover border border-slate-200 bg-slate-100" />
                      ) : (
                        <div aria-hidden className="w-10 h-10 rounded-full bg-blue-100 text-blue-800 grid place-items-center text-[13px] font-semibold border border-blue-200">
                          {initialsOf(chat.participantName)}
                        </div>
                      )}
                    </div>

                    {/* Chat Metatext & Excerpt */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-semibold text-slate-900 truncate text-sm leading-tight">
                            {chat.participantName}
                          </h4>
                          <span className="text-xs text-slate-500 font-medium">
                            {chat.participantRole}
                          </span>
                        </div>

                        {/* Unread Pill Indicator */}
                        {chat.unreadCount > 0 && (
                          <span className="bg-blue-600 text-white text-xs font-semibold min-w-[18px] h-[18px] px-1 rounded flex items-center justify-center shrink-0">
                            {chat.unreadCount}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 mt-1.5 line-clamp-2 leading-relaxed">
                        {chat.lastMessage || "No messages yet"}
                      </p>

                      <span className="text-xs text-slate-500 block mt-1 font-mono">
                        {new Date(chat.lastMessageAt).toLocaleString()}
                      </span>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="p-6 text-center text-sm text-slate-500">
                {showArchived && !searchQuery ? "No archived conversations" : "No conversations found"}
              </div>
            )}
          </div>
        </aside>

        {/* Right Main Panel: Workspace View */}
        {selectedConversation ? (
          <ConversationPanel
            key={selectedConversation.id}
            conversationId={selectedConversation.id}
            viewerRole={me.roleLabel}
            viewerName={me.name}
            title={selectedConversation.participantName}
            subtitle={selectedConversation.participantRole}
            avatarUrl={selectedConversation.avatarUrl}
            profileHref={selectedConversation.profileUrl}
            onMessageSent={refreshConversations}
            getMessages={getMessages}
            markConversationRead={markConversationRead}
            sendMessage={sendMessage}
            headerActions={
              <button
                type="button"
                onClick={() => toggleArchived(selectedConversation)}
                className="inline-flex items-center gap-1.5 px-3 min-h-9 rounded-full text-[13px] text-slate-600 hover:text-ink hover:bg-slate-100 transition-colors shrink-0"
              >
                {selectedConversation.isArchived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
                {selectedConversation.isArchived ? 'Move to inbox' : 'Archive'}
              </button>
            }
          />
        ) : draft ? (
          <ConversationPanel
            key={`draft-${draft.role}-${draft.name}`}
            conversationId="new"
            viewerRole={me.roleLabel}
            viewerName={me.name}
            title={draft.name}
            subtitle={draft.role}
            profileHref={draftProfile ? `/inventory?student=${encodeURIComponent(draftProfile.id)}` : null}
            getMessages={async () => []}
            markConversationRead={async () => ({ success: true })}
            sendMessage={async ({ content }) => {
              const result = await startConversation({ participantName: draft.name, participantRole: draft.role, content });
              if (result.success && result.conversation) startedId.current = result.conversation.id;
              return result;
            }}
            onMessageSent={async () => {
              await refreshConversations();
              if (startedId.current) openConversation(startedId.current);
              startedId.current = null;
            }}
          />
        ) : (
          <main className="flex-1 bg-white flex flex-col items-center justify-center p-8 select-none">
            <div className="text-center max-w-sm flex flex-col items-center">
              {/* Minimalist Dialogue Bubble Icon */}
              <div className="text-slate-300 mb-4 transform scale-[2.5]">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1"
                  stroke="currentColor"
                  className="w-12 h-12"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785 4.5 4.5 0 003.23-.74c.504-.316 1.137-.36 1.7-.168A8.825 8.825 0 0012 20.25z"
                  />
                </svg>
              </div>
              <p className="text-slate-500 font-medium text-[15px]">
                Select a conversation to start messaging
              </p>
            </div>
          </main>
        )}

      </div>

      {/* NEW MESSAGE MODAL */}
      {isNewMessageOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md p-6 rounded-2xl shadow-xl border border-slate-100 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">New Message</h3>
                <p className="text-xs text-slate-500">Open a chat with a student, faculty member, or parent</p>
              </div>
              <button
                onClick={() => setIsNewMessageOpen(false)}
                aria-label="Close" className="w-11 h-11 -m-2 grid place-items-center text-slate-500 hover:text-ink hover:bg-slate-100 rounded-full transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleOpenChat} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Recipient Role</label>
                <select
                  value={newRole}
                  onChange={(e) => { setNewRole(e.target.value as 'Student' | 'Faculty' | 'Parent'); setNewName(''); setStudentQuery(''); }}
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none"
                >
                  <option value="Student">Student</option>
                  <option value="Faculty">Faculty</option>
                  <option value="Parent">Parent</option>
                </select>
              </div>

              {newRole === 'Student' ? (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Recipient</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                      type="text"
                      value={studentQuery}
                      onChange={(e) => { setStudentQuery(e.target.value); setNewName(''); }}
                      placeholder="Search by name, student ID, or section"
                      className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                    />
                  </div>
                  <div className="max-h-44 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
                    {studentMatches.length === 0 ? (
                      <p className="px-3 py-3 text-[13px] text-slate-500">No students match your search.</p>
                    ) : (
                      studentMatches.map((s) => (
                        <button type="button" key={s.id} onClick={() => setNewName(s.name)}
                          className={`w-full text-left px-3 py-2.5 text-sm hover:bg-blue-50 transition-colors ${newName === s.name ? "bg-blue-50" : ""}`}>
                          <span className="font-medium text-ink">{s.name}</span>
                          <span className="block text-[12px] text-slate-500">{s.studentId} · {s.gradeSection}</span>
                        </button>
                      ))
                    )}
                  </div>
                  {newName && <p className="text-[13px] text-emerald-700">Selected: {newName}</p>}
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Recipient Name</label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g., Kurt Aquino"
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none"
                  />
                </div>
              )}


              <InlineError message={startError} onDismiss={() => setStartError(null)} />

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewMessageOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-full transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newName.trim()}
                  className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-full transition"
                >
                  Open chat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessagesDashboard;

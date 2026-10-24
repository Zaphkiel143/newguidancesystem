"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Search, MessageSquare, User, X } from 'lucide-react';
import { listConversations, startConversation, getMessages, markConversationRead, sendMessage, deleteConversation, listStudentProfiles } from '../../action/counselor';
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
}

type StudentProfile = Awaited<ReturnType<typeof listStudentProfiles>>[number];

export const MessagesDashboard: React.FC = () => {
  const me = useCurrentUser();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [isNewMessageOpen, setIsNewMessageOpen] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<'Student' | 'Faculty' | 'Parent'>('Student');
  const [newContent, setNewContent] = useState('');
  const [isStarting, setIsStarting] = useState(false);
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

  const filteredConversations = conversations.filter((chat) =>
    chat.participantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.participantRole.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedConversation = conversations.find((c) => c.id === selectedId) ?? null;

  const sq = studentQuery.trim().toLowerCase();
  const studentMatches = studentProfiles.filter(
    (s) => !sq || s.name.toLowerCase().includes(sq) || s.studentId.toLowerCase().includes(sq) || s.gradeSection.toLowerCase().includes(sq)
  );

  const handleStartConversation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newContent.trim()) return;

    setIsStarting(true);
    setStartError(null);
    const result = await startConversation({
      participantName: newName.trim(),
      participantRole: newRole,
      content: newContent.trim(),
    });
    setIsStarting(false);

    if (result.success && result.conversation) {
      setIsNewMessageOpen(false);
      setNewName('');
      setStudentQuery('');
      setNewContent('');
      setNewRole('Student');
      await refreshConversations();
      setSelectedId(result.conversation.id);
    } else {
      setStartError(`Couldn't send this message: ${result.error || "unknown error"}.`);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-var(--topbar-h)-var(--footer-h))] bg-paper font-sans antialiased text-slate-800">
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
          </div>

          {/* Conversations Scroll Container */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {filteredConversations.length > 0 ? (
              filteredConversations.map((chat) => {
                const isSelected = chat.id === selectedId;
                return (
                  <button
                    key={chat.id}
                    onClick={() => setSelectedId(chat.id)}
                    className={`w-full text-left p-4 flex items-start gap-3 transition-colors ${
                      isSelected ? 'bg-slate-50' : 'hover:bg-slate-50/60'
                    }`}
                  >
                    {/* Avatar Badge Container */}
                    <div className="relative shrink-0 mt-0.5">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 border border-slate-200">
                        <User className="w-5 h-5" />
                      </div>
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
                No conversations found
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
            onMessageSent={refreshConversations}
            getMessages={getMessages}
            markConversationRead={markConversationRead}
            sendMessage={sendMessage}
            deleteConversation={deleteConversation}
            onDeleted={(deletedId) => {
              setSelectedId(null);
              setConversations((prev) => prev.filter((c) => c.id !== deletedId));
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
                <p className="text-xs text-slate-500">Start a conversation with a student, faculty member, or parent</p>
              </div>
              <button
                onClick={() => setIsNewMessageOpen(false)}
                aria-label="Close" className="w-11 h-11 -m-2 grid place-items-center text-slate-500 hover:text-ink hover:bg-slate-100 rounded-full transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleStartConversation} className="space-y-4">
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

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Message</label>
                <textarea
                  required
                  rows={3}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Write your first message..."
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none resize-none"
                />
              </div>

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
                  disabled={isStarting || !newName.trim()}
                  className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-full transition"
                >
                  {isStarting ? "Sending..." : "Send Message"}
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

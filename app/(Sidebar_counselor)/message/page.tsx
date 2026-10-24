"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Archive, ArchiveRestore, Mail, MailOpen, Search, MessageSquare, X } from 'lucide-react';
import { listConversations, startConversation, getMessages, markConversationRead, markConversationUnread, sendMessage, listStudentProfiles, setConversationArchived } from '../../action/counselor';
import ConversationPanel from '../../../components/ConversationPanel';
import { listAccounts } from '../../action/accounts';
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
type Role = 'Student' | 'Faculty' | 'Parent';
type Recipient = { key: string; name: string; role: Role; detail: string };

// "Jeron Abanes" -> "JA"; the picture for people without a profile photo.
function initialsOf(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "?";
}

const MessagesDashboard: React.FC = () => {
  const me = useCurrentUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationsLoaded, setConversationsLoaded] = useState(false);
  const [deepLinkDone, setDeepLinkDone] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showArchived, setShowArchived] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  // Right-click menu on a conversation in the list.
  const [menu, setMenu] = useState<{ x: number; y: number; id: string } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // New Message: a blank chat whose "To:" box picks the person.
  const [composing, setComposing] = useState(false);
  const [toQuery, setToQuery] = useState('');
  // A chat with someone who has no conversation yet; it's created when the first message is sent.
  const [draft, setDraft] = useState<{ name: string; role: Role } | null>(null);
  const startedId = useRef<string | null>(null);
  const [studentProfiles, setStudentProfiles] = useState<StudentProfile[]>([]);
  const [otherPeople, setOtherPeople] = useState<{ id: string; name: string; role: Role }[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [students, accounts] = await Promise.all([listStudentProfiles(), listAccounts()]);
      if (cancelled) return;
      setStudentProfiles(students);
      setOtherPeople(
        accounts
          .filter((a) => a.status === "ACTIVE" && (a.role === "FACULTY" || a.role === "PARENT"))
          .map((a) => ({ id: a.id, name: a.name, role: a.role === "FACULTY" ? "Faculty" : "Parent" }))
      );
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
    refreshConversations().then(() => setConversationsLoaded(true));
    const interval = setInterval(refreshConversations, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!menu) return;
    menuRef.current?.querySelector('button')?.focus();
    const close = (e: Event) => {
      if (e.type === 'keydown' && (e as KeyboardEvent).key !== 'Escape') return;
      if (e.type === 'mousedown' && menuRef.current?.contains(e.target as Node)) return;
      setMenu(null);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [menu]);

  // Save the read state as soon as a chat opens, so the next refresh agrees.
  useEffect(() => {
    if (selectedId) markConversationRead(selectedId).then(refreshConversations);
  }, [selectedId]);

  const archivedCount = conversations.filter((c) => c.isArchived).length;
  const filteredConversations = conversations.filter((chat) => chat.isArchived === showArchived).filter((chat) =>
    chat.participantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.participantRole.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedConversation = conversations.find((c) => c.id === selectedId) ?? null;

  // Everyone the "To:" box can find: students (by name, ID or section), then faculty and parents.
  const tq = toQuery.trim().toLowerCase();
  const recipients: Recipient[] = [
    ...studentProfiles.map((s) => ({ key: `s-${s.id}`, name: s.name, role: 'Student' as const, detail: `${s.studentId} · ${s.gradeSection}` })),
    ...otherPeople.map((p) => ({ key: `u-${p.id}`, name: p.name, role: p.role, detail: '' })),
  ].filter((r) => !tq || r.name.toLowerCase().includes(tq) || r.detail.toLowerCase().includes(tq) || r.role.toLowerCase().startsWith(tq));

  // Archiving hides it from the inbox (until someone writes again); closes it if open.
  const toggleArchived = async (chat: Conversation) => {
    setMenu(null);
    setArchiveError(null);
    const result = await setConversationArchived(chat.id, !chat.isArchived);
    if (result.success) {
      if (selectedId === chat.id) setSelectedId(null);
      await refreshConversations();
    } else {
      setArchiveError(result.error || "Couldn't update this conversation.");
    }
  };

  const setRead = async (chat: Conversation, read: boolean) => {
    setMenu(null);
    setArchiveError(null);
    // An open chat keeps marking itself read, so marking it unread closes it.
    if (!read && selectedId === chat.id) setSelectedId(null);
    setConversations((prev) => prev.map((c) => (c.id === chat.id ? { ...c, unreadCount: read ? 0 : Math.max(1, c.unreadCount) } : c)));
    const result = read ? await markConversationRead(chat.id) : await markConversationUnread(chat.id);
    if (!result.success) setArchiveError((result as { error?: string }).error || "Couldn't update this conversation.");
    await refreshConversations();
  };

  // Opening a chat reads it: the highlight goes at once, before the next refresh.
  const openConversation = (id: string) => {
    setComposing(false);
    setDraft(null);
    setSelectedId(id);
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c)));
  };

  const menuChat = menu ? conversations.find((c) => c.id === menu.id) ?? null : null;

  const startComposing = () => {
    setSelectedId(null);
    setDraft(null);
    setToQuery('');
    setComposing(true);
  };

  // Opens the chat with this person: their existing conversation (archived or
  // not), or an empty one that is saved once the first message is sent.
  const chooseRecipient = useCallback(
    (r: Recipient) => {
      const existing = conversations.find((c) => c.participantRole === r.role && c.participantName.toLowerCase() === r.name.toLowerCase());
      if (existing) {
        setShowArchived(existing.isArchived);
        openConversation(existing.id);
      } else {
        setComposing(false);
        setShowArchived(false);
        setDraft({ name: r.name, role: r.role });
      }
    },
    [conversations]
  );

  // Arriving from "Message" on a referral/appointment contact card
  // (/message?with=<name>&role=<role>) opens straight to that person's chat.
  // Adjusts state during render (not in an effect) per the project's rule
  // against synchronous setState-in-effect; this runs at most once since
  // deepLinkDone only ever goes false -> true.
  if (conversationsLoaded && !deepLinkDone) {
    setDeepLinkDone(true);
    const withName = searchParams.get('with');
    const withRole = searchParams.get('role');
    if (withName && (withRole === 'Student' || withRole === 'Faculty' || withRole === 'Parent')) {
      chooseRecipient({ key: 'deep-link', name: withName, role: withRole, detail: '' });
    }
  }

  // Drop the query string once handled, so refreshing doesn't retrigger it.
  useEffect(() => {
    if (deepLinkDone) router.replace('/message');
  }, [deepLinkDone, router]);

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
              onClick={startComposing}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-full transition-colors text-sm shadow-sm"
            >
              <MessageSquare className="w-4 h-4 fill-current" />
              <span>New Message</span>
            </button>

            <div role="tablist" aria-label="Conversations" className="flex gap-1">
              {[false, true].map((archived) => (
                <button key={String(archived)} role="tab" aria-selected={showArchived === archived}
                  onClick={() => { setShowArchived(archived); setSelectedId(null); setDraft(null); setComposing(false); }}
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
                const isUnread = chat.unreadCount > 0;
                return (
                  <button
                    key={chat.id}
                    onClick={() => openConversation(chat.id)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      // Keyboard (context-menu key) gives no pointer position; use the row's.
                      const box = e.currentTarget.getBoundingClientRect();
                      const x = e.clientX || box.left + 24;
                      const y = e.clientY || box.top + 24;
                      setMenu({ x: Math.min(x, window.innerWidth - 220), y: Math.min(y, window.innerHeight - 140), id: chat.id });
                    }}
                    aria-label={`${chat.participantName}, ${chat.participantRole}${isUnread ? `, ${chat.unreadCount} unread` : ''}. Right-click for options.`}
                    className={`w-full text-left p-4 flex items-start gap-3 transition-colors ${
                      isSelected ? 'bg-slate-100' : isUnread ? 'bg-blue-100/70 hover:bg-blue-100 shadow-[inset_4px_0_0_var(--color-blue-600)]' : 'hover:bg-slate-50'
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
                          <h4 className={`truncate text-sm leading-tight text-slate-900 ${isUnread ? 'font-bold' : 'font-semibold'}`}>
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

                      <p className={`text-xs mt-1.5 line-clamp-2 leading-relaxed ${isUnread ? 'text-ink font-semibold' : 'text-slate-600'}`}>
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
        ) : composing ? (
          <div className="flex-1 flex flex-col bg-paper h-full min-h-0">
            <div className="px-6 py-3 border-b border-rule shrink-0 flex items-center gap-3">
              <label htmlFor="to-query" className="text-[14px] font-medium text-slate-600 shrink-0">To:</label>
              <input
                id="to-query"
                autoFocus
                type="text"
                value={toQuery}
                onChange={(e) => setToQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && recipients.length > 0) chooseRecipient(recipients[0]); if (e.key === 'Escape') setComposing(false); }}
                placeholder="Name, student ID, or section"
                className="flex-1 min-w-0 bg-transparent py-2 text-[15px] placeholder:text-slate-400 focus:outline-none"
              />
              <button type="button" onClick={() => setComposing(false)} aria-label="Cancel new message"
                className="w-9 h-9 grid place-items-center rounded-full text-slate-500 hover:text-ink hover:bg-slate-100 shrink-0">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0">
              <ul className="max-w-3xl mx-auto py-2">
                {recipients.length === 0 ? (
                  <li className="px-6 py-6 text-center text-sm text-slate-500">No one matches “{toQuery.trim()}”.</li>
                ) : (
                  recipients.slice(0, 60).map((r) => (
                    <li key={r.key}>
                      <button type="button" onClick={() => chooseRecipient(r)}
                        className="w-full text-left px-6 py-2.5 flex items-center gap-3 hover:bg-blue-50 rounded-lg transition-colors">
                        <span aria-hidden className="w-9 h-9 rounded-full bg-blue-100 text-blue-800 grid place-items-center text-xs font-semibold shrink-0">
                          {initialsOf(r.name)}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[14px] font-medium text-ink truncate">{r.name}</span>
                          <span className="block text-[12px] text-slate-500 truncate">{r.role}{r.detail ? ` · ${r.detail}` : ''}</span>
                        </span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
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

      {menu && menuChat && (
        <div ref={menuRef} role="menu" aria-label={`Options for ${menuChat.participantName}`}
          style={{ left: menu.x, top: menu.y }}
          className="fixed z-50 w-52 py-1.5 bg-sheet border border-rule rounded-xl shadow-lg">
          <button role="menuitem" type="button" onClick={() => setRead(menuChat, menuChat.unreadCount > 0)}
            className="w-full flex items-center gap-2.5 px-3.5 min-h-10 text-left text-[14px] text-ink hover:bg-slate-100 focus:bg-slate-100 focus:outline-none">
            {menuChat.unreadCount > 0 ? <MailOpen size={16} className="text-slate-500" /> : <Mail size={16} className="text-slate-500" />}
            {menuChat.unreadCount > 0 ? 'Mark as read' : 'Mark as unread'}
          </button>
          <button role="menuitem" type="button" onClick={() => toggleArchived(menuChat)}
            className="w-full flex items-center gap-2.5 px-3.5 min-h-10 text-left text-[14px] text-ink hover:bg-slate-100 focus:bg-slate-100 focus:outline-none">
            {menuChat.isArchived ? <ArchiveRestore size={16} className="text-slate-500" /> : <Archive size={16} className="text-slate-500" />}
            {menuChat.isArchived ? 'Move to inbox' : 'Archive'}
          </button>
        </div>
      )}
    </div>
  );
};

export default MessagesDashboard;

"use client";

import React, { useEffect, useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { getMyConversation, getMessages, markConversationRead, sendMessage, deleteConversation } from '../../action/student';
import ConversationPanel from '../../../components/ConversationPanel';
import { useCurrentUser } from '../../../components/CurrentUser';


const StudentMessagesDashboard: React.FC = () => {
  const me = useCurrentUser();
  const [conversationId, setConversationId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const conversation = await getMyConversation();
      if (!cancelled) setConversationId(conversation?.id ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Deleting clears all messages; a fresh (empty) conversation is ready right after
  const handleDeleted = async () => {
    setConversationId(null);
    const conversation = await getMyConversation();
    setConversationId(conversation?.id ?? null);
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-var(--topbar-h))] bg-paper font-sans antialiased text-slate-800">
      <header className="px-5 sm:px-8 lg:px-12 pt-8 pb-5 border-b border-rule">
        <h1 className="page-title">Messages</h1>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {conversationId ? (
          <ConversationPanel
            conversationId={conversationId}
            viewerRole={me.roleLabel}
            viewerName={me.name}
            title="Guidance Office"
            subtitle="Guidance Associate"
            getMessages={getMessages}
            markConversationRead={markConversationRead}
            sendMessage={sendMessage}
            deleteConversation={deleteConversation}
            onDeleted={handleDeleted}
          />
        ) : (
          <main className="flex-1 bg-white flex flex-col items-center justify-center p-8 select-none">
            <div className="text-center max-w-sm flex flex-col items-center">
              <div className="text-slate-300 mb-4 transform scale-[2.5]">
                <MessageSquare size={20} strokeWidth={1} />
              </div>
              <p className="text-slate-500 font-medium text-[15px]">
                Loading your conversation...
              </p>
            </div>
          </main>
        )}
      </div>
    </div>
  );
};

export default StudentMessagesDashboard;

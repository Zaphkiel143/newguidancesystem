"use client";

import React, { useEffect, useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { getMyConversation, getMessages, markConversationRead, sendMessage } from '../../action/student';
import ConversationPanel from '../../../components/ConversationPanel';

const VIEWER_ROLE = "Student";
const VIEWER_NAME = "Nhel Belarmino";

export const StudentMessagesDashboard: React.FC = () => {
  const [conversationId, setConversationId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const conversation = await getMyConversation(VIEWER_NAME);
      if (!cancelled) setConversationId(conversation?.id ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-col h-[calc(100dvh-var(--topbar-h))] bg-paper font-sans antialiased text-slate-800">
      {/* Header Section */}
      <header className="px-5 sm:px-8 lg:px-12 pt-8 pb-5 border-b border-rule">
        <h1 className="page-title">Messages</h1>
        <p className="text-sm text-slate-500 mt-1">
          Communicate with your guidance counselor
        </p>
      </header>

      {/* Main Container */}
      <div className="flex flex-1 overflow-hidden">
        {conversationId ? (
          <ConversationPanel
            conversationId={conversationId}
            viewerRole={VIEWER_ROLE}
            viewerName={VIEWER_NAME}
            title="Guidance Counselor"
            subtitle="Ralph Michael"
            getMessages={getMessages}
            markConversationRead={markConversationRead}
            sendMessage={sendMessage}
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

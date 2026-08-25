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
    <div className="flex flex-col h-screen bg-white font-sans antialiased text-slate-800">
      {/* Header Section */}
      <header className="px-8 pt-6 pb-4 border-b border-slate-100">
        <h1 className="text-3xl font-bold text-[#0d2343]">Messages</h1>
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

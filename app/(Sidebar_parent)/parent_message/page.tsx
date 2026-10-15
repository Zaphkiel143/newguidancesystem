"use client";

import React, { useEffect, useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { getMyConversation, getMessages, markConversationRead, sendMessage } from '../../action/parent';
import ConversationPanel from '../../../components/ConversationPanel';

const VIEWER_ROLE = "Parent";
const VIEWER_NAME = "Mrs. Belarmino";

export const ParentMessagesPage: React.FC = () => {
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
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto font-sans antialiased text-slate-800 space-y-6">

      {/* Page Heading Section Header */}
      <div>
        <h1 className="page-title">Messages</h1>
        <p className="text-sm text-slate-500 font-medium mt-1">
          Communicate with the Guidance Office about your child
        </p>
      </div>

      {/* Main Messaging Container */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm h-[600px] flex overflow-hidden">
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
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <div className="text-center space-y-3 max-w-xs animate-fade-in">
              <div className="w-16 h-16 border-2 border-dashed border-slate-200 rounded-full flex items-center justify-center mx-auto opacity-60">
                <MessageSquare size={28} className="text-slate-300 stroke-[1.5]" />
              </div>
              <p className="text-slate-400 font-medium text-sm leading-relaxed">
                Loading your conversation...
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ParentMessagesPage;

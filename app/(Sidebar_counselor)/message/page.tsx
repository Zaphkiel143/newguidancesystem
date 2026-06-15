"use client";

import React, { useState } from 'react';
import { Search, MessageSquare, Plus, User } from 'lucide-react';

// Define the structure for a conversation item
interface Conversation {
  id: string;
  name: string;
  role: 'Student' | 'Faculty' | 'Parent';
  lastMessage: string;
  timestamp: string;
  unreadCount?: number;
}

const initialConversations: Conversation[] = [
  {
    id: '1',
    name: 'Nhel Belarmino',
    role: 'Student',
    lastMessage: 'Thank you for the guidance session today',
    timestamp: '2026-05-14 10:30 AM',
  },
  {
    id: '2',
    name: 'Cho Domingo',
    role: 'Faculty',
    lastMessage: 'I submitted a referral for Dexter Glorioso',
    timestamp: '2026-05-13 03:45 PM',
    unreadCount: 2,
  },
  {
    id: '3',
    name: 'Mrs. Belarmino',
    role: 'Parent',
    lastMessage: 'How is my child progressing?',
    timestamp: '2026-05-12 11:20 AM',
    unreadCount: 1,
  },
];

export const MessagesDashboard: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Filter conversations based on search input
  const filteredConversations = conversations.filter((chat) =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectConversation = (id: string) => {
    setSelectedId(id);
    // Optionally clear unread count when clicked
    setConversations(prev =>
      prev.map(chat => chat.id === id ? { ...chat, unreadCount: undefined } : chat)
    );
  };

  return (
    <div className="flex flex-col h-screen bg-white font-sans antialiased text-slate-800">
      {/* Header Section */}
      <header className="px-8 pt-6 pb-4 border-b border-slate-100">
        <h1 className="text-3xl font-bold text-[#0d2343]">Messages</h1>
        <p className="text-sm text-slate-500 mt-1">
          Communicate with students, faculty, and parents
        </p>
      </header>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Left Sidebar: Conversation List */}
        <aside className="w-[360px] border-r border-slate-200 flex flex-col bg-white shrink-0">
          {/* Action Area: Search & New Message Button */}
          <div className="p-4 space-y-3 border-b border-slate-100">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>

            {/* New Message Button */}
            <button className="w-full flex items-center justify-center gap-2 bg-[#1d63ff] hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors text-sm shadow-sm">
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
                    onClick={() => handleSelectConversation(chat.id)}
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
                            {chat.name}
                          </h4>
                          <span className="text-xs text-slate-400 font-medium">
                            {chat.role}
                          </span>
                        </div>
                        
                        {/* Unread Pill Indicator */}
                        {chat.unreadCount && chat.unreadCount > 0 && (
                          <span className="bg-[#1d63ff] text-white text-xs font-bold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center shrink-0">
                            {chat.unreadCount}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 mt-1.5 line-clamp-2 leading-relaxed">
                        {chat.lastMessage}
                      </p>
                      
                      <span className="text-[10px] text-slate-400 block mt-1 font-mono">
                        {chat.timestamp}
                      </span>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="p-6 text-center text-sm text-slate-400">
                No conversations found
              </div>
            )}
          </div>
        </aside>

        {/* Right Main Panel: Workspace View */}
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

      </div>
    </div>
  );
};

export default MessagesDashboard;
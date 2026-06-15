"use client";

import React, { useState } from 'react';
import { Search, MessageSquare, Plus, User } from 'lucide-react';

interface Conversation {
  id: string;
  name: string;
  role: 'Student' | 'Faculty' | 'Parent';
  lastMessage: string;
  timestamp: string;
  unreadCount?: number;
}

export const MessagesPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  // Conversations mock array matching image_916efd.png parameters exactly
  const conversations: Conversation[] = [
    {
      id: 'conv-1',
      name: 'Nhel Belarmino',
      role: 'Student',
      lastMessage: 'Thank you for the guidance session today',
      timestamp: '2026-05-14 10:30 AM',
    },
    {
      id: 'conv-2',
      name: 'Cho Domingo',
      role: 'Faculty',
      lastMessage: 'I submitted a referral for Dexter Glorioso',
      timestamp: '2026-05-13 03:45 PM',
      unreadCount: 2,
    },
    {
      id: 'conv-3',
      name: 'Mrs. Belarmino',
      role: 'Parent',
      lastMessage: 'How is my child progressing?',
      timestamp: '2026-05-12 11:20 AM',
      unreadCount: 1,
    },
  ];

  // Filter conversations based on search box value
  const filteredConversations = conversations.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto font-sans antialiased text-slate-800 space-y-6">
      
      {/* Page Heading Section Header */}
      <div>
        <h1 className="text-3xl font-bold text-blue-900 tracking-tight">Messages</h1>
        <p className="text-sm text-slate-500 font-medium mt-1">
          Communicate with students, faculty, and parents
        </p>
      </div>

      {/* Main Messaging Container Grid Layout split */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm min-h-[600px] flex overflow-hidden">
        
        {/* LEFT COLUMN: Sidebar Chat List feeds */}
        <div className="w-1/3 border-r border-slate-100 flex flex-col bg-white">
          
          {/* Action Header: Search + Call To Action */}
          <div className="p-4 space-y-3 border-b border-slate-50">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 text-sm rounded-xl placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              />
            </div>

            <button className="w-full bg-[#1d63ff] hover:bg-blue-700 text-white font-semibold text-sm py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm">
              <MessageSquare size={16} />
              <span>New Message</span>
            </button>
          </div>

          {/* Chat List Stack Elements */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
            {filteredConversations.length > 0 ? (
              filteredConversations.map((chat) => {
                const isActive = activeChatId === chat.id;
                return (
                  <button
                    key={chat.id}
                    onClick={() => setActiveChatId(chat.id)}
                    className={`w-full text-left p-4 flex items-start gap-3.5 transition-colors group relative
                      ${isActive ? 'bg-blue-50/50' : 'hover:bg-slate-50/70'}
                    `}
                  >
                    {/* Placeholder Circle Avatar */}
                    <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 shrink-0">
                      <User size={20} />
                    </div>

                    {/* Chat Metas Text Strings */}
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-bold text-slate-800 text-sm truncate group-hover:text-blue-600 transition-colors">
                          {chat.name}
                        </h3>
                        
                        {/* Static / Absolute unread count badges */}
                        {chat.unreadCount && chat.unreadCount > 0 && !isActive && (
                          <span className="bg-[#1d63ff] text-white font-bold text-[10px] px-1.5 py-0.5 rounded-full shrink-0 min-w-[18px] text-center">
                            {chat.unreadCount}
                          </span>
                        )}
                      </div>
                      
                      <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">
                        {chat.role}
                      </p>
                      
                      <p className="text-xs text-slate-500 font-medium truncate max-w-[210px]">
                        {chat.lastMessage}
                      </p>
                      
                      <span className="text-[10px] font-medium font-mono text-slate-400 block pt-1">
                        {chat.timestamp}
                      </span>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="p-8 text-center text-xs font-medium text-slate-400">
                No conversations found
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Chat Display / Empty View Interface */}
        <div className="flex-1 bg-white flex flex-col items-center justify-center p-8">
          {activeChatId ? (
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto">
                <MessageSquare size={24} />
              </div>
              <p className="text-sm font-semibold text-slate-700">
                Conversation window template initialized.
              </p>
              <button 
                onClick={() => setActiveChatId(null)} 
                className="text-xs text-blue-600 font-medium hover:underline"
              >
                Close Chat
              </button>
            </div>
          ) : (
            /* Standby Empty view placeholder matching image_916efd.png perfectly */
            <div className="text-center space-y-3 max-w-xs animate-fade-in">
              <div className="w-16 h-16 border-2 border-dashed border-slate-200 rounded-full flex items-center justify-center mx-auto opacity-60">
                <MessageSquare size={28} className="text-slate-300 stroke-[1.5]" />
              </div>
              <p className="text-slate-400 font-medium text-sm leading-relaxed">
                Select a conversation to start messaging
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default MessagesPage;
"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Send,
  Calendar, 
  MessageSquare, 
  Upload,
  FileText,
  GraduationCap,
  LogOut
} from 'lucide-react';

interface MenuItem {
  name: string;
  icon: React.ReactNode;
  path: string;
  unreadCount?: number;
}

export const FacultySidebar: React.FC = () => {
  const pathname = usePathname();

  // Navigation schema configured exactly from image_8623e4.png order and badge counts
  const menuItems: MenuItem[] = [
    { name: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/faculty_dashboard' },
    { name: 'Submit Referral', icon: <Send size={20} />, path: '/submit_referral' },
    { name: 'My Appointments', icon: <Calendar size={20} />, path: '/faculty_appointment', unreadCount: 1 },
    { name: 'Messages', icon: <MessageSquare size={20} />, path: '/faculty_message', unreadCount: 1 },
    { name: 'Upload Documents', icon: <Upload size={20} />, path: '/upload_documents' },
    { name: 'My Referrals', icon: <FileText size={20} />, path: '/faculty_myreferral', unreadCount: 2 },
  ];

  return (
    <aside className="w-64 h-screen bg-white border-r border-slate-100 flex flex-col fixed left-0 top-0 z-50 font-sans antialiased select-none">
      
      {/* Platform Branding Header Component */}
      <div className="p-6 border-b border-slate-50 flex items-center gap-3">
        <div className="bg-blue-600 p-2 rounded-lg text-white">
          <GraduationCap size={24} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-blue-900 leading-none">E-Gabay</h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Guidance System</p>
        </div>
      </div>

      {/* Nav Link Tree Structure Area */}
      <nav className="flex-1 p-4 space-y-1.5">
        {menuItems.map((item) => {
          const isActive = pathname === item.path;
          const isAppointments = item.name === 'My Appointments';
          
          return (
            <Link 
              key={item.path} 
              href={item.path}
              className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-150 text-sm font-medium border border-transparent group
                ${isActive 
                  ? 'bg-[#f0f6ff] text-[#1d63ff] font-semibold' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }
              `}
            >
              {/* Left Segment: Core Indicator + Row String Content */}
              <div className="flex items-center gap-3.5 min-w-0">
                <span className={`shrink-0 transition-colors ${isActive ? 'text-[#1d63ff]' : 'text-slate-400 group-hover:text-slate-600'}`}>
                  {item.icon}
                </span>
                
                {/* Text Layout Wrapping for Multi-Line Sidebar Labels */}
                <span className={`leading-tight block ${isAppointments ? 'max-w-[110px]' : 'truncate'}`}>
                  {item.name}
                </span>
              </div>

              {/* Right Segment: Notification Alerts Count Pills */}
              {item.unreadCount !== undefined && item.unreadCount > 0 && (
                <span className="bg-[#ff2b3d] text-white text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center tracking-normal shrink-0 shadow-sm ml-2">
                  {item.unreadCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Action Footer: Logout Trigger Area */}
      <div className="p-4 border-t border-slate-50">
        <Link href="/" className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-semibold text-red-500 hover:bg-red-50 rounded-xl transition-colors">
          <LogOut size={20} />
          <span>Logout</span>
        </Link>
      </div>

    </aside>
  );
};

export default FacultySidebar;
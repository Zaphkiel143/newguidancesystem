"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  UserCircle2, 
  Send, 
  FileText, 
  MessageSquare, 
  TrendingUp,
  GraduationCap,
  LogOut
} from 'lucide-react';

interface MenuItem {
  name: string;
  icon: React.ReactNode;
  path: string;
  badgeCount?: number;
}

export const ParentSidebar: React.FC = () => {
  // Set default active path matching the selection in image_853f61.png
  const pathname = usePathname() || '/refer-child';

  // Navigation schema built matching image_853f61.png parameters
  const menuItems: MenuItem[] = [
    { name: "Child's Profile", icon: <UserCircle2 size={20} />,             path: '/child_profile' },
    { name: 'Refer Child', icon: <Send size={19} className="-rotate-45" />, path: '/refer_child' },
    { name: 'My Referrals', icon: <FileText size={20} />,                   path: '/parent_myreferral', badgeCount: 2 },
    { name: 'Messages', icon: <MessageSquare size={20} />,                  path: '/parent_message', badgeCount: 1 },
    { name: 'Progress Report', icon: <TrendingUp size={20} />,              path: '/progress_report' },
  ];

  return (
    <aside className="w-64 h-screen bg-white border-r border-slate-100 flex flex-col fixed left-0 top-0 z-50 font-sans antialiased select-none">
      
      {/* Platform Branding Header */}
      <div className="p-6 border-b border-slate-50 flex items-center gap-3">
        <div className="bg-blue-600 p-2 rounded-lg text-white">
          <GraduationCap size={24} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-blue-900 leading-none">E-Gabay</h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Guidance System</p>
        </div>
      </div>

      {/* Navigation Link Tree Menu Feed */}
      <nav className="flex-1 p-4 space-y-1.5">
        {menuItems.map((item) => {
          const isActive = pathname === item.path;
          
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
              {/* Left Side Icon + Label */}
              <div className="flex items-center gap-3.5 min-w-0">
                <span className={`shrink-0 transition-colors ${isActive ? 'text-[#1d63ff]' : 'text-slate-400 group-hover:text-slate-600'}`}>
                  {item.icon}
                </span>
                <span className="truncate leading-tight block">
                  {item.name}
                </span>
              </div>

              {/* Right Side Red Notification Pills (Verbatim matching image_853f61.png) */}
              {item.badgeCount !== undefined && item.badgeCount > 0 && (
                <span className="bg-[#ff2b3d] text-white text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center tracking-normal shrink-0 shadow-sm ml-2">
                  {item.badgeCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Action Footer: Logout */}
      <div className="p-4 border-t border-slate-50">
        <Link href="/" className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-semibold text-red-500 hover:bg-red-50 rounded-xl transition-colors">
          <LogOut size={20} />
          <span>Logout</span>
        </Link>
      </div>

    </aside>
  );
};

export default ParentSidebar;
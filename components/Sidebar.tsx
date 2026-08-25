"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { navigationConfig, MenuItem } from "../app/config/navigation";; // Adjust this path if your config is located elsewhere
import { logout } from "../app/action/auth";

interface SidebarProps {
  // This explicitly defines the roles your layout files can pass down
  role: 'faculty' | 'counselor' | 'student' | 'parent';
}

export const Sidebar: React.FC<SidebarProps> = ({ role }) => {
  const pathname = usePathname();
  
  // Safely fallback to an empty array if the role isn't found
  const menuItems = navigationConfig[role] || [];

  return (
    <aside className="w-64 h-screen bg-white border-r border-slate-100 flex flex-col fixed left-0 top-0 z-50 font-sans antialiased">
      {/* Platform Branding Header */}
      <div className="p-6 border-b border-slate-50 flex items-center gap-3">
        <span className="font-bold text-lg text-slate-800">E-Gabay STI</span>
      </div>

      {/* Dynamic Menu Items */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {menuItems.map((item: MenuItem) => {
          const Icon = item.icon;
          const isActive = pathname === item.path;

          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                isActive
                  ? 'bg-blue-50 text-blue-600 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon 
                size={20} 
                className={isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'} 
              />
              <span className="text-sm">{item.name}</span>
              
              {item.unreadCount && (
                <span className="ml-auto bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {item.unreadCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Logout Footer */}
      <div className="p-4 border-t border-slate-50">
        <button
          onClick={() => logout()}
          className="w-full flex items-center gap-3 px-4 py-3 text-sm text-rose-600 hover:bg-rose-50 rounded-xl transition-colors group"
        >
          <LogOut size={20} className="text-rose-400 group-hover:text-rose-600" />
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  );
};
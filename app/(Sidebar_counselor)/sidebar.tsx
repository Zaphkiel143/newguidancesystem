"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  CalendarCheck, 
  ClipboardList, 
  TrendingUp, 
  LogOut,
  GraduationCap,
  UserCircle,
  MessageSquare // Swapped Info for MessageSquare
} from 'lucide-react';

const Sidebar = () => {
  const pathname = usePathname();

  const menuItems = [
    { name: 'Dashboard', icon: <LayoutDashboard size={20} />,         path: '/dashboard' },
    { name: 'Student Inventory', icon: <UserCircle size={20} />,       path: '/inventory' },
    { name: 'Appointments', icon: <CalendarCheck size={20} />,          path: '/appointment' },
    { name: 'Referral Management', icon: <ClipboardList size={20} />,   path: '/referral' },
    { name: 'Group Guidance', icon: <Users size={20} />,                path: '/groupguidance' },
    { name: 'Career Guidance', icon: <TrendingUp size={20} />,           path: '/careerguidance' },
    { name: 'Messages', icon: <MessageSquare size={20} />,               path: '/message'},
  ];

  return (
    <aside className="w-64 h-screen bg-white border-r border-slate-200 flex flex-col fixed left-0 top-0 z-50">
      {/* Brand/Logo Section */}
      <div className="p-6 border-b border-slate-50 flex items-center gap-3">
        <div className="bg-blue-600 p-2 rounded-lg text-white">
          <GraduationCap size={24} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-blue-900 leading-none">E-Gabay</h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Guidance System</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-4 space-y-1.5">
        {menuItems.map((item) => {
          const isActive = pathname === item.path;
          
          return (
            <Link 
              key={item.path} 
              href={item.path}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all text-sm font-semibold ${
                isActive 
                  ? 'bg-[#f0f6ff] border-slate-900 text-[#1d63ff]' 
                  : 'text-slate-500 border-transparent hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {/* Left side: Icon and Text */}
              <div className="flex items-center gap-3">
                <span className={`transition-colors ${isActive ? 'text-[#1d63ff]' : 'text-slate-400'}`}>
                  {item.icon}
                </span>
                <span>{item.name}</span>
              </div>

              {/* Right side: Badge (Only renders if it's the Messages tab or has unread count) */}
            </Link>
          );
        })}
      </nav>

      {/* User / Logout Section */}
      <div className="p-4 border-t border-slate-100">
        <Link href="/" className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-semibold text-red-500 hover:bg-red-50 rounded-lg transition-colors">
          <LogOut size={20} />
          Logout
        </Link>
      </div>
    </aside>
  );
};

export default Sidebar;
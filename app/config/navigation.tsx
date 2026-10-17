import {
LayoutDashboard,
Send,
Calendar,
CalendarDays,
MessageSquare,
Upload,
FileText,
Users,
Archive,
User,
Baby,
Compass,
Sparkles,
Megaphone,
NotebookPen,
ClipboardList,
Route,
Inbox,
UserCog,
FileCheck,
Newspaper,
BarChart3,
LucideIcon
} from 'lucide-react';

export interface MenuItem {
    name: string;
    icon: LucideIcon;
    path: string;
    unreadCount?: number;
}

// Maps your route groups/roles to their respective menus
export const navigationConfig: Record<string, MenuItem[]> = {
faculty: [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/faculty_dashboard' },
    { name: 'Submit Referral', icon: Send, path: '/submit_referral' },
    { name: 'My Referrals', icon: FileText, path: '/faculty_myreferral'},
    { name: 'My Appointments', icon: Calendar, path: '/faculty_appointment'},
    { name: 'Messages', icon: MessageSquare, path: '/faculty_message'},
    { name: 'Upload Documents', icon: Upload, path: '/upload_documents' },
    { name: 'Announcements & Events', icon: Megaphone, path: '/faculty_bulletin' },
    { name: 'My Account', icon: UserCog, path: '/faculty_account' },
    ],
counselor: [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { name: 'Appointments', icon: Calendar, path: '/appointment' },
    { name: 'Daily Log', icon: NotebookPen, path: '/daily_log' },
    { name: 'Monthly Report', icon: BarChart3, path: '/reports' },
    { name: 'Referrals', icon: FileText, path: '/referral' },
    { name: 'Individual Inventory', icon: Archive, path: '/inventory' },
    { name: 'Document Review', icon: FileCheck, path: '/documents' },
    { name: 'Career Guidance', icon: Compass, path: '/careerguidance' },
    { name: 'Group Guidance', icon: Users, path: '/groupguidance' },
    { name: 'Information Service', icon: Megaphone, path: '/information' },
    { name: 'Events', icon: CalendarDays, path: '/events' },
    { name: 'Messages', icon: MessageSquare, path: '/message' },
    { name: 'Accounts & Approvals', icon: UserCog, path: '/accounts' },
    { name: 'My Account', icon: User, path: '/my_account' },
],

parent: [
    { name: 'Feed', icon: Newspaper, path: '/parent_bulletin' },
    { name: 'Book Appointment', icon: Calendar, path: '/parent_dashboard' },
    { name: 'Child Profile', icon: User, path: '/child_profile' },
    { name: 'Refer Child', icon: Baby, path: '/refer_child' },
    { name: 'My Referrals', icon: FileText, path: '/parent_myreferral' },
    { name: 'Messages', icon: MessageSquare, path: '/parent_message' },
    { name: 'My Profile', icon: UserCog, path: '/parent_profile' },
],

student: [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/student_dashboard' },
    { name: 'Chat with E-Gabay', icon: Sparkles, path: '/ai_chat' },
    { name: 'My Appointments', icon: Calendar, path: '/my_appointments' },
    { name: 'My Career Plan', icon: Route, path: '/my_career' },
    { name: 'Needs Assessment', icon: ClipboardList, path: '/assessments' },
    { name: 'Refer a Student', icon: Send, path: '/refer_student' },
    { name: 'My Referrals', icon: Inbox, path: '/my_referrals' },
    { name: 'Announcements & Events', icon: Megaphone, path: '/bulletin' },
    { name: 'My Messages', icon: MessageSquare, path: '/my_messages' },
    { name: 'Profile', icon: User, path: '/profile' },
]
};

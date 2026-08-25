import { 
LayoutDashboard, 
Send, 
Calendar, 
MessageSquare, 
Upload, 
FileText, 
Users,          
Archive,        
User,         
Baby,           
Compass,        
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
    { name: 'My Appointments', icon: Calendar, path: '/faculty_appointment'},
    { name: 'Messages', icon: MessageSquare, path: '/faculty_message'},
    { name: 'Upload Documents', icon: Upload, path: '/upload_documents' },
    { name: 'My Referrals', icon: FileText, path: '/faculty_myreferral'},
    ],
counselor: [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { name: 'Appointments', icon: Calendar, path: '/appointment' },
    { name: 'Career Guidance', icon: Compass, path: '/careerguidance' },
    { name: 'Group Guidance', icon: Users, path: '/groupguidance' },
    { name: 'Inventory', icon: Archive, path: '/inventory' },
    { name: 'Messages', icon: MessageSquare, path: '/message' },
    { name: 'Referrals', icon: FileText, path: '/referral' },
],

parent: [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/parent_dashboard' },
    { name: 'Child Profile', icon: User, path: '/child_profile' },
    { name: 'Messages', icon: MessageSquare, path: '/parent_message' },
    { name: 'My Referrals', icon: FileText, path: '/parent_myreferral' },
    { name: 'Refer Child', icon: Baby, path: '/refer_child' },
],

student: [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/student_dashboard' },
    { name: 'My Appointments', icon: Calendar, path: '/my_appointments' },
    { name: 'My Messages', icon: MessageSquare, path: '/my_messages' },
    { name: 'Profile', icon: User, path: '/profile' },
    { name: 'Refer Student', icon: Send, path: '/refer_student' },
]
};
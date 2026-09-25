import type { NavItem } from '@/types'

export const ADMIN_NAV: NavItem[] = [
  { id: 'overview', label: 'Overview', path: '/admin', icon: 'LayoutDashboard', category: 'General' },
  { id: 'users', label: 'Users', path: '/admin/users', icon: 'Users', category: 'Training Management' },
  { id: 'classes', label: 'Classes', path: '/admin/classes', icon: 'BookOpen', category: 'Training Management' },
  { id: 'subjects', label: 'Subjects', path: '/admin/subjects', icon: 'Library', category: 'Training Management' },
  { id: 'exams', label: 'Exams', path: '/admin/exams', icon: 'FileSignature', category: 'Training Management' },
  { id: 'reports', label: 'Reports', path: '/admin/reports', icon: 'BarChart3', category: 'Analytics & Reports' },
  { id: 'audit-logs', label: 'Audit Logs', path: '/admin/audit-logs', icon: 'FileText', category: 'Analytics & Reports' },
  { id: 'notifications', label: 'Notifications', path: '/admin/notifications', icon: 'Bell', category: 'System' },
  { id: 'ai-config', label: 'AI Config', path: '/admin/ai-config', icon: 'Bot', category: 'System' },
  { id: 'profile', label: 'Profile', path: '/admin/profile', icon: 'UserCircle', category: 'System' },
  { id: 'settings', label: 'Settings', path: '/admin/settings', icon: 'Settings', category: 'System' },
]

export const LECTURER_NAV: NavItem[] = [
  { id: 'overview', label: 'Overview', path: '/lecturer', icon: 'LayoutDashboard', category: 'General' },
  { id: 'classes', label: 'Classes', path: '/lecturer/classes', icon: 'BookOpen', category: 'Training' },
  { id: 'subjects', label: 'Subjects', path: '/lecturer/subjects', icon: 'Library', category: 'Training' },
  { id: 'grading-assignments', label: 'Manage Assignments', path: '/lecturer/grading/assignments', icon: 'FileCheck', category: 'Materials' },
  { id: 'prompts', label: 'Manage Prompts', path: '/lecturer/prompts', icon: 'Bot', category: 'Materials' },
  { id: 'notifications', label: 'Notifications', path: '/lecturer/notifications', icon: 'Bell', category: 'System' },
  { id: 'settings', label: 'Settings', path: '/lecturer/profile', icon: 'Settings', category: 'System' },
]

export const STUDENT_NAV: NavItem[] = [
  { id: 'overview', label: 'Dashboard', path: '/student', icon: 'LayoutDashboard', category: 'General' },
  { id: 'courses', label: 'Subjects', path: '/student/courses', icon: 'BookOpen', category: 'Learning' },
  { id: 'classes', label: 'Classes', path: '/student/classes', icon: 'Users', category: 'Learning' },
  { id: 'student-subjects', label: 'Results & Assignments', path: '/student/subjects', icon: 'GraduationCap', category: 'Learning' },
  { id: 'notifications', label: 'Notifications', path: '/student/notifications', icon: 'Bell', category: 'System' },
  { id: 'settings', label: 'Settings', path: '/student/profile', icon: 'Settings', category: 'System' },
]

export const PUBLIC_NAV = [
  { label: 'Home', href: '/' },
  { label: 'About', href: '/about' },
  { label: 'Features', href: '/features' },
]

export const PORTAL_LINKS = [
  { role: 'lecturer' as const, label: 'Lecturer', path: '/login?redirect=/lecturer', description: 'Classes, assignments, and grading' },
  { role: 'student' as const, label: 'Student', path: '/login?redirect=/student', description: 'Learning and AI feedback' },
]

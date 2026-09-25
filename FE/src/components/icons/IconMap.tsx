import {
  BarChart3,
  BookOpen,
  Brain,
  CheckSquare,
  ClipboardList,
  Clock,
  Code2,
  FileText,
  FileCheck,
  FileSignature,
  GraduationCap,
  LayoutDashboard,
  MessageSquare,
  PieChart,
  Route,
  Settings,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Upload,
  Users,
  Zap,
  Library,
  Bot,
  Bell,
  BellRing,
  UserCircle,
  type LucideIcon,
} from 'lucide-react'

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  Users,
  GraduationCap,
  Brain,
  BarChart3,
  Settings,
  BookOpen,
  FileText,
  FileCheck,
  FileSignature,
  Sparkles,
  CheckSquare,
  ShieldCheck,
  PieChart,
  ClipboardList,
  Upload,
  MessageSquare,
  Route,
  TrendingUp,
  Zap,
  Clock,
  Code2,
  Target,
  Library,
  Bot,
  Bell,
  BellRing,
  UserCircle,
}

interface IconProps {
  name: string
  className?: string
  size?: number
}

export function Icon({ name, className, size = 20 }: IconProps) {
  const LucideIcon = ICONS[name]
  if (!LucideIcon) {
    console.warn(`Icon ${name} not found in IconMap`)
    return <div className={`w-[${size}px] h-[${size}px] shrink-0`} /> // fallback to maintain spacing
  }
  return <LucideIcon className={className} size={size} />
}

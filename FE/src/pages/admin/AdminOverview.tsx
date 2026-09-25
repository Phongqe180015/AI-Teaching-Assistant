import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatCard } from '@/components/ui/StatCard'
import { Card } from '@/components/ui/Card'
import { api } from '@/lib/api'
import { type StatMetric } from '@/types'
import { Server, Users, BookOpen, Library, GraduationCap, Loader2, Activity, ArrowRight } from 'lucide-react'
import { APIError } from '@/components/common/ErrorState'

export function AdminOverview() {
  const [stats, setStats] = useState<Record<string, string | number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const loadData = () => {
    setLoading(true)
    setError(null)
    Promise.all([
      api.getStatsOverview().then(setStats)
    ])
      .catch(setError)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadData()
  }, [])

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-brand-600" /></div>
  if (error) return <APIError error={error} onRetry={loadData} />

  const statCards: StatMetric[] = [
    { id: 'users', label: 'Total Users', value: stats.users ?? '—', icon: Users, trend: 'up', trendLabel: 'Active' },
    { id: 'classes', label: 'Classes', value: stats.classes ?? '—', icon: BookOpen, trend: 'up', trendLabel: 'Current Semester' },
    { id: 'subjects', label: 'Subjects', value: stats.subjects ?? '—', icon: Library, trend: 'up', trendLabel: 'Standard Curriculum' },
    { id: 'exams', label: 'Exams', value: stats.exams ?? '—', icon: GraduationCap, trend: 'up', trendLabel: 'System Stable' },
  ]

  const quickActions = [
    { label: 'Users', path: '/admin/users', icon: Users, cls: 'text-blue-700 bg-blue-50 border-blue-100 dark:text-blue-400 dark:bg-blue-500/10 dark:border-blue-500/20' },
    { label: 'Classes', path: '/admin/classes', icon: BookOpen, cls: 'text-emerald-700 bg-emerald-50 border-emerald-100 dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-500/20' },
    { label: 'Subjects', path: '/admin/subjects', icon: Library, cls: 'text-amber-700 bg-amber-50 border-amber-100 dark:text-amber-400 dark:bg-amber-500/10 dark:border-amber-500/20' },
    { label: 'Exams', path: '/admin/exams', icon: GraduationCap, cls: 'text-rose-700 bg-rose-50 border-rose-100 dark:text-rose-400 dark:bg-rose-500/10 dark:border-rose-500/20' },
    { label: 'Settings', path: '/admin/settings', icon: Server, cls: 'text-slate-700 bg-slate-50 border-slate-200 dark:text-slate-400 dark:bg-slate-500/10 dark:border-slate-500/20' },
  ]

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <PageHeader
          title="System Overview"
          description="Monitor users, service status, and AI modules."
          breadcrumbs={[{ label: 'Admin', path: '/admin' }, { label: 'Overview' }]}
        />
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((s, i) => (
          <div key={s.id} className="animate-fade-in-up" style={{ animationDelay: `${i * 60}ms` }}>
            <StatCard {...s} />
          </div>
        ))}
      </div>

      {/* Quick access */}
      <div>
        <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-600">
          Quick Access
        </p>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          {quickActions.map((a) => (
            <Link
              key={a.path} to={a.path}
              className={`group flex items-center gap-3 rounded-2xl border ${a.cls} bg-white dark:bg-[#161b27] p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200`}
            >
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${a.cls}`}>
                <a.icon size={17} />
              </div>
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{a.label}</span>
              <ArrowRight size={13} className="ml-auto shrink-0 text-slate-300 group-hover:text-slate-500 dark:text-slate-700 dark:group-hover:text-slate-400 transition-colors" />
            </Link>
          ))}
        </div>
      </div>

      {/* Charts & Graphs */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* Activity chart */}
        <Card className="col-span-full lg:col-span-2 p-5" padding="none">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-6">
            <div className="flex items-center gap-2">
              <div className="bg-brand-50 dark:bg-brand-500/10 p-1.5 rounded-lg text-brand-600 dark:text-brand-400">
                <Activity size={16} />
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">System Traffic (7 Days)</h3>
            </div>
          </div>
          <div className="h-56 flex items-end justify-between gap-2 px-2 pb-2">
            {[
              { day: 'Mon', value: 45 },
              { day: 'Tue', value: 52 },
              { day: 'Wed', value: 38 },
              { day: 'Thu', value: 65 },
              { day: 'Fri', value: 48 },
              { day: 'Sat', value: 25 },
              { day: 'Sun', value: 12 },
            ].map((d, i, arr) => {
              const maxVal = Math.max(...arr.map(x => x.value));
              return (
                <div key={i} className="flex flex-col items-center gap-3 flex-1 group cursor-pointer">
                  <div className="relative w-full flex justify-center h-44 items-end">
                    <div 
                      className="relative w-full max-w-[48px] bg-slate-100 dark:bg-slate-800/60 rounded-t-xl transition-all duration-500 group-hover:bg-slate-200 dark:group-hover:bg-slate-700/60"
                      style={{ height: `${(d.value / maxVal) * 100}%` }}
                    >
                      <div 
                        className="absolute bottom-0 w-full bg-gradient-to-t from-brand-600 to-brand-400 rounded-t-xl opacity-90 group-hover:opacity-100 transition-opacity"
                        style={{ height: '100%' }}
                      />
                      {/* Tooltip */}
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs font-semibold py-1 px-2.5 rounded-lg opacity-0 group-hover:opacity-100 group-hover:-translate-y-1 transition-all pointer-events-none z-10 dark:bg-white dark:text-slate-900 shadow-xl whitespace-nowrap">
                        {d.value}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">{d.day}</span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Distribution chart */}
        <Card className="p-5" padding="none">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-6">
            <div className="flex items-center gap-2">
              <div className="bg-purple-50 dark:bg-purple-500/10 p-1.5 rounded-lg text-purple-600 dark:text-purple-400">
                <Users size={16} />
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">User Distribution</h3>
            </div>
          </div>
          <div className="flex flex-col justify-center gap-6 h-56">
            {[
              { label: 'Students', val: 78, color: 'bg-emerald-500' },
              { label: 'Lecturers', val: 18, color: 'bg-brand-500' },
              { label: 'Administrators', val: 4, color: 'bg-rose-500' },
            ].map((d, i) => (
              <div key={i} className="space-y-2 group cursor-pointer">
                <div className="flex justify-between text-sm transition-colors group-hover:text-brand-600 dark:group-hover:text-brand-400">
                  <span className="font-medium text-slate-600 dark:text-slate-300 group-hover:text-brand-600 dark:group-hover:text-brand-400">{d.label}</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">{d.val}%</span>
                </div>
                <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className={`h-full ${d.color} rounded-full transition-all duration-500 group-hover:brightness-110`} style={{ width: `${d.val}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Education Analytics */}
      <div className="grid gap-5 lg:grid-cols-2 mt-6">
        {/* Class & Enrollment Stats */}
        <Card padding="none" className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-5 py-4">
            <div className="flex items-center gap-2">
              <div className="bg-brand-50 dark:bg-brand-500/10 p-1.5 rounded-lg text-brand-600 dark:text-brand-400">
                <BookOpen size={16} />
              </div>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">Enrollment & Classes</span>
            </div>
            <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-wider">
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-brand-500 shadow-sm" /> Students (x100)</div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-emerald-400 shadow-sm" /> Opened Classes</div>
            </div>
          </div>
          <div className="p-6 space-y-8">
            <div className="h-56 flex items-end justify-between gap-2 px-2 border-b border-slate-100 dark:border-slate-800/60 pb-4">
              {[
                { term: 'FA23', students: 85, classes: 42 },
                { term: 'SP24', students: 92, classes: 48 },
                { term: 'SU24', students: 65, classes: 30 },
                { term: 'FA24', students: 110, classes: 55 },
                { term: 'SP25', students: 125, classes: 62 },
              ].map((d, i) => (
                <div key={i} className="flex flex-col items-center gap-4 flex-1 group">
                  <div className="flex items-end justify-center gap-1.5 w-full h-44 relative">
                    {/* Tooltip */}
                    <div className="absolute -top-10 bg-slate-800 text-white text-[11px] font-bold py-1.5 px-3 rounded-lg opacity-0 group-hover:opacity-100 group-hover:-translate-y-1 transition-all pointer-events-none z-10 dark:bg-white dark:text-slate-900 shadow-xl whitespace-nowrap">
                      {d.students}00 Students / {d.classes} Classes
                    </div>
                    {/* Students Bar */}
                    <div className="w-1/3 max-w-[20px] bg-brand-500 rounded-t shadow-[0_0_8px_rgba(var(--color-brand-500),0.3)] transition-all duration-300 group-hover:bg-brand-400" style={{ height: `${(d.students / 125) * 100}%` }} />
                    {/* Classes Bar */}
                    <div className="w-1/3 max-w-[20px] bg-emerald-400 rounded-t shadow-[0_0_8px_rgba(52,211,153,0.3)] transition-all duration-300 group-hover:bg-emerald-300" style={{ height: `${(d.classes / 70) * 100}%` }} />
                  </div>
                  <span className="text-xs font-bold text-slate-400 dark:text-slate-500 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors uppercase tracking-widest">{d.term}</span>
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Classes (SP25)</p>
                <div className="flex items-end gap-2 mt-2">
                  <span className="text-3xl font-black text-slate-900 dark:text-white leading-none">62</span>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-md mb-0.5 shadow-sm border border-emerald-100 dark:border-emerald-500/20">+12%</span>
                </div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Fill Rate</p>
                <div className="flex items-end gap-2 mt-2">
                  <span className="text-3xl font-black text-slate-900 dark:text-white leading-none">94<span className="text-xl">%</span></span>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-md mb-0.5 shadow-sm border border-emerald-100 dark:border-emerald-500/20">+2%</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Subject Distribution (Donut Chart) */}
        <Card padding="none" className="overflow-hidden flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-5 py-4">
            <div className="flex items-center gap-2">
              <div className="bg-amber-50 dark:bg-amber-500/10 p-1.5 rounded-lg text-amber-600 dark:text-amber-400">
                <Library size={16} />
              </div>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">Major Distribution</span>
            </div>
          </div>
          
          <div className="p-6 flex-1 flex flex-col justify-center items-center gap-8">
            <div className="relative w-56 h-56 shrink-0">
              <svg className="w-full h-full transform -rotate-90 filter drop-shadow-lg" viewBox="0 0 100 100">
                {/* 45% Software Engineering (SE) - Green */}
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#10b981" strokeWidth="16" strokeDasharray="113 251.2" strokeDashoffset="0" className="hover:stroke-[20px] transition-all duration-300 cursor-pointer" />
                {/* 25% Artificial Intelligence (AI) - Orange */}
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f59e0b" strokeWidth="16" strokeDasharray="63 251.2" strokeDashoffset="-113" className="hover:stroke-[20px] transition-all duration-300 cursor-pointer" />
                {/* 20% Graphic Design (GD) - Blue */}
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#3b82f6" strokeWidth="16" strokeDasharray="50 251.2" strokeDashoffset="-176" className="hover:stroke-[20px] transition-all duration-300 cursor-pointer" />
                {/* 10% Information Assurance (IA) - Rose */}
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f43f5e" strokeWidth="16" strokeDasharray="25 251.2" strokeDashoffset="-226" className="hover:stroke-[20px] transition-all duration-300 cursor-pointer" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-4xl font-black text-slate-900 dark:text-white">4</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Majors</span>
              </div>
            </div>

            <div className="w-full grid grid-cols-2 gap-x-4 gap-y-3">
              {[
                { label: 'Software Engineering', percent: 45, color: 'bg-emerald-500' },
                { label: 'Artificial Intelligence', percent: 25, color: 'bg-amber-500' },
                { label: 'Graphic Design', percent: 20, color: 'bg-blue-500' },
                { label: 'Information Assurance', percent: 10, color: 'bg-rose-500' },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group border border-transparent hover:border-slate-100 dark:hover:border-slate-700/50">
                  <div className="flex items-center gap-3">
                    <span className={`w-3.5 h-3.5 rounded-full ${item.color} shadow-sm group-hover:scale-125 transition-transform`} />
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">{item.label}</span>
                  </div>
                  <span className="text-sm font-black text-slate-900 dark:text-white">{item.percent}%</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

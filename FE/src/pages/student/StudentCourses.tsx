import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { BookOpen, Search, Loader2, ArrowRight, BookMarked, ChevronDown, Check } from 'lucide-react'
import { SemesterSelector, type SemesterOption } from '@/components/ui/SemesterSelector'

import { getCleanSubjectDescription } from '@/utils/subjectHelper'
import { useTranslation } from 'react-i18next'

type ViewMode = 'enrolled' | 'all'

export function StudentCourses() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [allSubjects, setAllSubjects] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [selectedSemester, setSelectedSemester] = useState<SemesterOption>('')
  const [viewMode, setViewMode] = useState<ViewMode>('enrolled')
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const loadData = useCallback(() => {
    setLoading(true)
    Promise.all([
      api.getStudentDashboard().catch(() => null),
      api.getSubjects(1, 1000).catch(() => [])
    ]).then(([dashboard, subjects]) => {
      setDashboardData(dashboard || {})
      setAllSubjects(subjects || [])
    }).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Student's enrolled subjects (filtered by semester)
  const enrolledSubjects = (() => {
    const classes = dashboardData?.enrolledClasses || []
    const seen = new Set<string>()
    return classes
      .filter((c: any) => {
        if (!selectedSemester) return true;
        const label = (c.semester?.season || c.semester?.label || c.semester?.code || '').toUpperCase().replace(/\s+/g, '');
        const id = c.semester?.id;
        return label === selectedSemester || id === selectedSemester;
      })
      .reduce((acc: any[], c: any) => {
        const code = c.subject?.code || c.classCode
        if (code && !seen.has(code)) {
          seen.add(code)
          acc.push({ 
            id: c.subject?.id || c.id, 
            code, 
            name: c.subject?.name || 'Subject',
            description: c.subject?.description || null
          })
        }
        return acc
      }, [])
  })()

  // All subjects in the system
  const allSubjectsList = allSubjects.map((s: any) => ({
    id: s.id,
    code: s.code,
    name: s.name || 'Subject',
    description: s.description || null
  }))

  const activeList = viewMode === 'enrolled' ? enrolledSubjects : allSubjectsList

  const filteredSubjects = activeList.filter((s: any) => {
    if (!search) return true
    const query = search.toLowerCase()
    return s.code?.toLowerCase().includes(query) || s.name?.toLowerCase().includes(query)
  })

  const viewOptions: { value: ViewMode; label: string; desc: string }[] = [
    { value: 'enrolled', label: t('st.courses.my_subjects'), desc: t('st.courses.my_subjects_desc') },
    { value: 'all', label: t('st.courses.all_subjects'), desc: t('st.courses.all_subjects_desc') },
  ]

  return (
    <div className="space-y-6 animate-fade-in-up pb-10 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-white dark:bg-[#151821] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="p-2 rounded-xl bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400">
              <BookOpen size={22} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              {viewMode === 'enrolled' ? t('st.courses.current_subjects') : t('st.courses.all_subjects')}
            </h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            {viewMode === 'enrolled'
              ? `Subjects you are enrolled in for the ${selectedSemester} semester.`
              : t('st.courses.all_available')
            }
          </p>
        </div>
        {viewMode === 'enrolled' && (
          <SemesterSelector
            selectedSemester={selectedSemester}
            onChange={setSelectedSemester}
            className="self-start md:self-auto shrink-0"
          />
        )}
      </div>

      {/* Search Bar + View Mode Filter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full sm:max-w-md">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={t('st.courses.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-11 pl-10 pr-4 bg-white dark:bg-[#151821] border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-slate-800 dark:text-slate-200 placeholder:text-slate-400 text-sm"
          />
        </div>

        {/* Right side: Dropdown + Count */}
        <div className="flex items-center gap-3 shrink-0">
          {/* View Mode Dropdown */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(o => !o)}
              className="flex items-center gap-2 h-11 px-4 bg-white dark:bg-[#151821] border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm hover:border-brand-400 dark:hover:border-brand-600 transition-all text-sm font-semibold text-slate-700 dark:text-slate-200 min-w-[180px]"
            >
              <span className="flex-1 text-left">
                {viewOptions.find(o => o.value === viewMode)?.label}
              </span>
              <ChevronDown
                size={16}
                className={`text-slate-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {dropdownOpen && (
              <>
                {/* Backdrop */}
                <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />

                {/* Dropdown */}
                <div className="absolute right-0 top-full mt-1.5 w-56 bg-white dark:bg-[#1a1d28] border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                  {viewOptions.map(option => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setViewMode(option.value)
                        setSearch('')
                        setDropdownOpen(false)
                      }}
                      className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors ${
                        viewMode === option.value
                          ? 'bg-brand-50 dark:bg-brand-900/20'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-bold ${viewMode === option.value ? 'text-brand-600 dark:text-brand-400' : 'text-slate-800 dark:text-slate-200'}`}>
                          {option.label}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {option.desc}
                        </div>
                      </div>
                      {viewMode === option.value && (
                        <Check size={16} className="text-brand-600 dark:text-brand-400 shrink-0 mt-0.5" />
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Count */}
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-[#151821] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm whitespace-nowrap">
            Total: <span className="text-brand-600 dark:text-brand-400">{filteredSubjects.length}</span> subjects
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
        </div>
      ) : filteredSubjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/50 dark:bg-[#151821]/50 text-center">
          <BookMarked size={40} className="text-slate-400 mb-3" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">{t('st.courses.none_found')}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {search
              ? t('st.courses.try_other')
              : viewMode === 'enrolled'
                ? 'You are not enrolled in any subject this semester.'
                : 'There are no subjects in the system yet.'
            }
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSubjects.map((sub: any, idx: number) => (
            <div
              key={idx}
              onClick={() => navigate(`/student/courses/${sub.code}`)}
              className="group flex flex-col justify-between rounded-xl bg-white dark:bg-[#151821] border border-slate-200 dark:border-slate-800 shadow-sm hover:border-brand-300 dark:hover:border-brand-700 hover:shadow-md transition-all cursor-pointer p-6"
            >
              <div>
                <span className="text-xs font-bold bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400 px-2.5 py-1 rounded-md mb-3 inline-block">
                  {sub.code}
                </span>
                <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors text-base leading-snug">
                  {sub.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                  {getCleanSubjectDescription(sub.code, sub.description)}
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-end">
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform text-brand-600 dark:text-brand-400" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

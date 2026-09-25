import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api, type SubjectRow } from '@/lib/api'
import {
  BookOpen, Search, Loader2, ArrowRight, Library, ChevronDown, Check,
  FileText, GraduationCap, Layers
} from 'lucide-react'

import { getCleanSubjectDescription } from '@/utils/subjectHelper'
import { SemesterSelector } from '@/components/ui/SemesterSelector'

type ViewMode = 'teaching' | 'all'

export function LecturerSubjects() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [allSubjects, setAllSubjects] = useState<SubjectRow[]>([])
  const [teachingClasses, setTeachingClasses] = useState<any[]>([])
  const [selectedSemester, setSelectedSemester] = useState<string>('')
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('teaching')
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [subjects, classes] = await Promise.all([
        api.getSubjects(1, 1000).catch(() => []),
        api.getClasses(1, 1000).catch(() => []),
      ])
      setAllSubjects(subjects || [])
      setTeachingClasses(classes || [])
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Filter teaching classes by selectedSemester
  const filteredTeachingClasses = teachingClasses.filter(c => {
    if (!selectedSemester) return true;
    const seasonStr = (c.semester?.season || (c.semester as any)?.seasonName || '').toUpperCase().replace(/\s+/g, '');
    const codeStr = (c.semester?.code || (c.semester as any)?.label || c.semesterName || '').toUpperCase().replace(/\s+/g, '');
    const semId = c.semesterId || (c.semester as any)?.id;
    return seasonStr === selectedSemester || codeStr === selectedSemester || semId === selectedSemester;
  });

  // Subjects the lecturer is teaching (derived from their classes in selectedSemester)
  const teachingSubjects = (() => {
    const seen = new Set<string>()
    const result: SubjectRow[] = []
    for (const cls of filteredTeachingClasses) {
      const subId = (cls.subject as any)?.id || cls.subjectId;
      if (subId && !seen.has(subId)) {
        seen.add(subId)
        const full = allSubjects.find(s => s.id === subId)
        if (full) {
          result.push(full)
        } else {
          result.push({
            id: subId,
            code: (cls.subject as any)?.code || cls.subjectCode || 'N/A',
            name: (cls.subject as any)?.name || cls.subjectName || t('lc.sub.name_fallback'),
          })
        }
      }
    }
    return result
  })()

  const activeList = viewMode === 'teaching' ? teachingSubjects : allSubjects
  const filteredSubjects = activeList.filter((s) => {
    if (!search) return true
    const q = search.toLowerCase()
    return s.code?.toLowerCase().includes(q) || s.name?.toLowerCase().includes(q)
  })

  // Count classes per subject
  const classCountMap = (() => {
    const map = new Map<string, number>()
    for (const cls of teachingClasses) {
      const subId = (cls.subject as any)?.id
      if (subId) map.set(subId, (map.get(subId) || 0) + 1)
    }
    return map
  })()

  const hasSyllabus = (s: SubjectRow) => {
    if (!s.syllabusData) return false
    try {
      const parsed = typeof s.syllabusData === 'string' ? JSON.parse(s.syllabusData) : s.syllabusData
      return parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0
    } catch {
      return false
    }
  }

  const viewOptions: { value: ViewMode; label: string; desc: string }[] = [
    { value: 'teaching', label: t('lc.sub.opt.teaching'), desc: t('lc.sub.opt.teaching_desc') },
    { value: 'all', label: t('lc.sub.opt.all'), desc: t('lc.sub.opt.all_desc') },
  ]

  return (
    <div className="space-y-6 animate-fade-in-up pb-10 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-white dark:bg-[#151821] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
              <Library size={22} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              {viewMode === 'teaching' ? t('lc.sub.title_teaching') : t('lc.sub.title_all')}
            </h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            {viewMode === 'teaching'
              ? t('lc.sub.desc_teaching')
              : t('lc.sub.desc_all')
            }
          </p>
        </div>
        {/* Stats */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
            <BookOpen size={16} className="text-emerald-600 dark:text-emerald-400" />
            <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
              {teachingSubjects.length} <span className="font-normal text-emerald-600/70 dark:text-emerald-400/70">{t('lc.sub.taught_label')}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:max-w-md">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={t('lc.sub.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-11 pl-10 pr-4 bg-white dark:bg-[#151821] border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-800 dark:text-slate-200 placeholder:text-slate-400 text-sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <SemesterSelector
            selectedSemester={selectedSemester}
            onChange={setSelectedSemester}
          />
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(o => !o)}
              className="flex items-center gap-2 h-11 px-4 bg-white dark:bg-[#151821] border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm hover:border-emerald-400 dark:hover:border-emerald-600 transition-all text-sm font-semibold text-slate-700 dark:text-slate-200 min-w-[180px]"
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
                <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                <div className="absolute right-0 top-full mt-1.5 w-56 bg-white dark:bg-[#1a1d28] border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                  {viewOptions.map(option => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setViewMode(option.value)
                        setSearch('')
                        setDropdownOpen(false)
                      }}
                      className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors ${viewMode === option.value
                          ? 'bg-emerald-50 dark:bg-emerald-900/20'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-bold ${viewMode === option.value ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-200'}`}>
                          {option.label}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {option.desc}
                        </div>
                      </div>
                      {viewMode === option.value && (
                        <Check size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-[#151821] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm whitespace-nowrap">
            {t('lc.sub.total_prefix')} <span className="text-emerald-600 dark:text-emerald-400">{filteredSubjects.length}</span> {t('lc.sub.total_suffix')}
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        </div>
      ) : filteredSubjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/50 dark:bg-[#151821]/50 text-center">
          <Library size={40} className="text-slate-400 mb-3" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">{t('lc.sub.none_found')}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {search
              ? t('lc.sub.try_other')
              : viewMode === 'teaching'
                ? t('lc.sub.none_assigned')
                : t('lc.sub.none_in_system')
            }
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSubjects.map((sub, idx) => {
            const clsCount = classCountMap.get(sub.id) || 0
            const hasSyl = hasSyllabus(sub)

            return (
              <div
                key={sub.id || idx}
                onClick={() => navigate(`/lecturer/subjects/${sub.code}`)}
                className="group flex flex-col justify-between rounded-xl bg-white dark:bg-[#151821] border border-slate-200 dark:border-slate-800 shadow-sm hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-lg transition-all cursor-pointer p-6 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-500/5 to-transparent rounded-bl-[3rem] pointer-events-none" />

                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <span className="text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-2.5 py-1 rounded-md">
                      {sub.code}
                    </span>
                    {hasSyl && (
                      <span className="text-[10px] font-bold bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <FileText size={10} />
                        {t('lc.sub.syllabus')}
                      </span>
                    )}
                    {!hasSyl && (
                      <span className="text-[10px] font-bold bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded-md">
                        {t('lc.sub.no_syllabus')}
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors text-base leading-snug line-clamp-2">
                    {sub.name}
                  </h3>

                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                    {getCleanSubjectDescription(sub.code, sub.description)}
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                    {sub.credit && (
                      <span className="flex items-center gap-1">
                        <GraduationCap size={12} />
                        {t('lc.sub.credits', { n: sub.credit })}
                      </span>
                    )}
                    {clsCount > 0 && (
                      <span className="flex items-center gap-1">
                        <Layers size={12} />
                        {t('lc.sub.classes', { n: clsCount })}
                      </span>
                    )}
                  </div>
                  <ArrowRight size={16} className="text-emerald-500 dark:text-emerald-400 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

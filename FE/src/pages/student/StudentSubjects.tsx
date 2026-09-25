import { useEffect, useState, useCallback, useMemo } from 'react'
import { BookOpen, FileText, Loader2, Calendar, Clock, ChevronDown, ChevronUp, Database, Code, Info, ChevronRight } from 'lucide-react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api, type AssignmentRow } from '@/lib/api'

type LecturerInfo = {
  id: string
  name: string
  avatar?: string | null
}

type SubjectInfo = {
  id: string
  code: string
  name: string
  description?: string
  lecturers?: LecturerInfo[]
  classId?: string
  classCode?: string
}

import { SemesterSelector, type SemesterOption } from '@/components/ui/SemesterSelector'

export function StudentSubjects() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [subjects, setSubjects] = useState<SubjectInfo[]>([])
  const [assignments, setAssignments] = useState<AssignmentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSemester, setSelectedSemester] = useState<SemesterOption>('')
  const location = useLocation()
  const [expandedSubjectId, setExpandedSubjectId] = useState<string | null>(location.state?.expand || null)
  // The chip row filters by the subjects the student is enrolled in for the selected
  // semester (previously it filtered by item type: Assignments / Exams / Graded).
  const [activeSubject, setActiveSubject] = useState('All')

  // Derived from whatever the API returns, so the chips always match the semester on
  // screen. Codes are de-duplicated to keep the chip keys unique.
  const subjectTabs = useMemo(
    () => ['All', ...Array.from(new Set(subjects.map(s => s.code)))],
    [subjects]
  )

  const visibleSubjects = useMemo(
    () => (activeSubject === 'All' ? subjects : subjects.filter(s => s.code === activeSubject)),
    [subjects, activeSubject]
  )

  // Switching semester replaces the subject list; a code picked in the previous semester
  // would otherwise filter the page down to nothing. Fall back to All when it disappears.
  useEffect(() => {
    if (activeSubject !== 'All' && !subjects.some(s => s.code === activeSubject)) {
      setActiveSubject('All')
    }
  }, [subjects, activeSubject])

  const loadData = useCallback((showLoader = false) => {
    let alive = true
    if (showLoader) setLoading(true)

    Promise.all([
      api.getStudentSubjects(selectedSemester).catch(() => []),
      api.getAssignments().catch(() => []),
      api.getSubmissions().catch(() => [])
    ]).then(([subjectsRes, assignmentsRes, submissionsRes]) => {
      if (alive) {
        setSubjects(subjectsRes || [])

        // Filter out deleted assignments & map real submission data into assignments
        const activeAssignmentsRes = (assignmentsRes || []).filter((a: any) => !a.isDeleted && !a.IsDeleted && (a.status || '').toLowerCase() !== 'deleted')
        const submissionsMap = new Map((submissionsRes || []).map((s: any) => [s.assignmentId, s]))
        const mergedAssignments = activeAssignmentsRes.map(a => {
          const sub = submissionsMap.get(a.id)
          if (sub) {
            const isPublished = sub.reviewStatus === 'PUBLISHED' || sub.isPublished === true
            const validScore = isPublished ? (sub.finalScore ?? sub.totalScore ?? sub.score ?? sub.Score) : undefined
            return {
              ...a,
              status: (isPublished && validScore !== undefined && validScore !== null) ? 'Graded' : 'Submitted',
              score: validScore !== null ? validScore : undefined
            }
          }
          return a
        })

        // Sort assignments from newest to oldest by creation date
        mergedAssignments.sort((a, b) => {
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0
          return timeB - timeA
        })

        setAssignments(mergedAssignments)
      }
    }).finally(() => { if (alive && showLoader) setLoading(false) })

    return () => { alive = false }
  }, [selectedSemester])

  useEffect(() => {
    const cleanup = loadData(true)

    let submissionChannel: BroadcastChannel | null = null
    let assignmentChannel: BroadcastChannel | null = null
    try {
      submissionChannel = new BroadcastChannel('aita_submission_events')
      submissionChannel.onmessage = (event) => {
        if (event.data?.type === 'SUBMISSION_PUBLISHED' || event.data?.type === 'ASSIGNMENT_DEADLINE_UPDATED') {
          console.log('[StudentSubjects] Real-time event received:', event.data?.type)
          loadData(false)
        }
      }
    } catch (e) { }

    try {
      assignmentChannel = new BroadcastChannel('aita_assignment_updates')
      assignmentChannel.onmessage = (event) => {
        if (event.data?.type === 'ASSIGNMENT_DEADLINE_UPDATED') {
          console.log('[StudentSubjects] Real-time deadline update received!')
          loadData(false)
        }
      }
    } catch (e) { }

    const handleStorage = (e: StorageEvent) => {
      if ((e.key === 'aita_last_publish_event' || e.key === 'aita_last_assignment_update') && e.newValue) {
        console.log('[StudentSubjects] Storage event received!')
        loadData(false)
      }
    }
    window.addEventListener('storage', handleStorage)

    return () => {
      if (cleanup) cleanup()
      if (submissionChannel) submissionChannel.close()
      if (assignmentChannel) assignmentChannel.close()
      window.removeEventListener('storage', handleStorage)
    }
  }, [loadData])

  // Handle auto-expand and scroll
  useEffect(() => {
    if (location.state?.expand && subjects.length > 0) {
      setExpandedSubjectId(location.state.expand)
      setTimeout(() => {
        const el = document.getElementById(`subject-${location.state.expand}`)
        if (el) {
          const y = el.getBoundingClientRect().top + window.scrollY - 100;
          window.scrollTo({ top: y, behavior: 'smooth' });
        }
      }, 100)
    }
  }, [location.state, subjects])

  // Stats calculation
  const stats = useMemo(() => {
    const total = assignments.length
    const submitted = assignments.filter(a => a.status === 'Submitted' || a.status === 'Graded' || (a as any).score !== undefined).length
    const graded = assignments.filter(a => a.status === 'Graded' || (a as any).score !== undefined).length
    const missing = total - submitted

    let totalScore = 0
    let gradedCountForScore = 0
    assignments.forEach(a => {
      const score = (a as any).score ?? (a as any).aiScore
      if (score !== undefined && score !== null) {
        totalScore += Number(score)
        gradedCountForScore++
      }
    })
    const avgScore = gradedCountForScore > 0 ? (totalScore / gradedCountForScore).toFixed(1) : '0.0'

    const upcoming = assignments
      .filter(a => a.due && new Date(a.due) > new Date() && a.status !== 'Submitted' && a.status !== 'Graded')
      .sort((a, b) => new Date(a.due!).getTime() - new Date(b.due!).getTime())
      .slice(0, 3)

    const upcomingExams = assignments
      .filter(a => a.type === 'Exam' && a.due && new Date(a.due) > new Date())
      .sort((a, b) => new Date(a.due!).getTime() - new Date(b.due!).getTime())
      .slice(0, 3)

    return { total, submitted, missing, graded, avgScore, upcoming, upcomingExams }
  }, [assignments])

  if (loading) return <div className="flex justify-center p-20"><Loader2 className="w-10 h-10 animate-spin text-blue-600" /></div>

  const getSubjectIcon = (code: string) => {
    if (code.startsWith('DB')) return <Database size={24} />
    if (code.startsWith('CS') || code.startsWith('SE')) return <Code size={24} />
    return <BookOpen size={24} />
  }

  const getSubjectColor = (code: string) => {
    if (code.startsWith('DB')) return 'bg-blue-500 text-white'
    if (code.startsWith('SE')) return 'bg-orange-500 text-white'
    return 'bg-blue-500 text-white'
  }

  return (
    <div className="max-w-[1600px] mx-auto animate-in fade-in duration-500">
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6 xl:gap-8">
        {/* Left Column (Header + Main Content) */}
        <div className="space-y-6">
          {/* Header Area */}
          <div className="pt-2 pb-2">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3">
              <div>
                <div className="flex items-center gap-2 text-sm text-slate-400 mb-2">
                  <Link to="/student" className="hover:text-slate-600 cursor-pointer transition-colors">{t('st.subjects.home')}</Link>
                  <ChevronRight size={14} />
                  <span className="font-medium text-slate-700 dark:text-slate-300">{t('st.subjects.results')}</span>
                </div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">{t('st.subjects.title')}</h1>
                <p className="text-slate-600 dark:text-slate-400 max-w-2xl text-base">{t('st.subjects.desc', { semester: selectedSemester })}</p>
              </div>
              <SemesterSelector
                selectedSemester={selectedSemester}
                onChange={setSelectedSemester}
                className="self-start md:self-auto shrink-0"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-6">
              {subjectTabs.map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveSubject(tab)}
                  className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 ${activeSubject === tab ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'bg-white dark:bg-[#151821] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700'}`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            {subjects.length === 0 ? (
              <div className="bg-white dark:bg-[#151821] border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-500 shadow-sm flex flex-col items-center">
                <BookOpen size={48} className="text-slate-300 dark:text-slate-700 mb-4" />
                {t('st.subjects.not_enrolled')}
              </div>
            ) : (
              visibleSubjects.map(sub => {
                const isExpanded = expandedSubjectId === sub.id
                const subjectAssignments = assignments.filter(a => {
                  const matchSubjectId = a.subjectId && (a.subjectId === sub.id)
                  const matchSubjectCode = (a as any).subjectCode && ((a as any).subjectCode.toLowerCase() === sub.code.toLowerCase())
                  const matchSubjectName = a.subjectName && (a.subjectName.toLowerCase().includes(sub.code.toLowerCase()) || a.subjectName.toLowerCase().includes(sub.name.toLowerCase()))
                  const matchClass = (a as any).classes && Array.isArray((a as any).classes) && (a as any).classes.includes(sub.classId)
                  return matchSubjectId || matchSubjectCode || matchSubjectName || matchClass
                })

                const hwCount = subjectAssignments.filter(a => a.type !== 'Exam').length
                const examCount = subjectAssignments.filter(a => a.type === 'Exam').length

                const submittedHw = subjectAssignments.filter(a => a.status === 'Submitted' || a.status === 'Graded' || (a as any).score !== undefined).length
                const completionRate = subjectAssignments.length > 0 ? Math.round((submittedHw / subjectAssignments.length) * 100) : 0

                // Filtering is by subject now, and the card already belongs to one subject,
                // so every item of that subject is shown.
                const displayAssignments = subjectAssignments

                return (
                  <div id={`subject-${sub.id}`} key={sub.id} className="bg-white dark:bg-[#151821] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md">
                    <div
                      className="p-5 flex flex-col lg:flex-row lg:items-center justify-between cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/20 gap-4"
                      onClick={() => setExpandedSubjectId(isExpanded ? null : sub.id)}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${getSubjectColor(sub.code)}`}>
                          {getSubjectIcon(sub.code)}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-1">{sub.code}</div>
                          <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 leading-tight">{sub.name}</h3>
                          {/* Lecturer info */}
                          {sub.lecturers && sub.lecturers.length > 0 && (
                            <div className="flex items-center gap-2 mt-1.5">
                              {sub.lecturers.map((lec, idx) => (
                                <div key={lec.id} className={`flex items-center gap-1.5 ${idx > 0 ? 'ml-1' : ''}`}>
                                  {lec.avatar ? (
                                    <img src={lec.avatar} alt={lec.name} className="w-6 h-6 rounded-full object-cover border border-slate-200 dark:border-slate-700" />
                                  ) : (
                                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-[10px] font-bold text-white border border-slate-200 dark:border-slate-700">
                                      {lec.name?.split(' ').pop()?.[0]?.toUpperCase() || 'G'}
                                    </div>
                                  )}
                                  <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">Lecturer {lec.name}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-sm text-slate-500 mt-1.5 font-medium">
                            <span>{t('st.subjects.n_assignments', { count: hwCount })}</span>
                            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                            <span>{t('st.subjects.n_exams', { count: examCount })}</span>
                            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                            <span>{t('st.subjects.n_complete', { percent: completionRate })}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 lg:ml-auto pr-2 mt-4 lg:mt-0">
                        {/* These three slots used to be fixed: A1 = 8.0, A2 = 8.2, PE =
                          "Not scheduled" for every subject. Show real graded work instead. */}
                        <div className="flex gap-6 items-center">
                          {(() => {
                            const graded = subjectAssignments
                              .map(a => ({ title: a.title, score: (a as any).score ?? (a as any).aiScore }))
                              .filter(x => x.score !== undefined && x.score !== null)
                              .slice(0, 3)

                            if (graded.length === 0) {
                              return <div className="text-sm font-medium text-slate-400">{t('st.subjects.no_graded')}</div>
                            }

                            return graded.map((g, i) => {
                              const val = Number(g.score)
                              return (
                                <div key={i} className="flex items-center gap-6">
                                  {i > 0 && <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 hidden sm:block" />}
                                  <div className="text-center max-w-[110px]">
                                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 truncate" title={g.title}>
                                      {g.title}
                                    </div>
                                    <div className={`text-sm font-bold ${val <= 0 ? 'text-rose-600 dark:text-rose-400 font-extrabold' : val < 5 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                      {Math.round(val * 100) / 100}
                                    </div>
                                  </div>
                                </div>
                              )
                            })
                          })()}
                        </div>
                        <div className="text-slate-400 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 p-2 rounded-full transition-colors ml-4 lg:ml-0">
                          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-[#151821] p-6 animate-in slide-in-from-top-2">
                        {displayAssignments.length === 0 ? (
                          <div className="text-center p-8 text-slate-500 italic flex flex-col items-center bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-700/50">
                            <FileText size={32} className="text-slate-300 mb-3" />
                            {t('st.subjects.no_match')}
                          </div>
                        ) : (
                          <div className="space-y-8">
                            {/* Exercises Section */}
                            {displayAssignments.filter(a => a.type !== 'Exam').length > 0 && (
                              <div>
                                <div className="flex items-center justify-between mb-4 px-1">
                                  <h4 className="font-bold text-slate-900 dark:text-slate-100 text-base">{t('st.subjects.assignments')}</h4>
                                  <button className="text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors">
                                    View all assignments ({displayAssignments.filter(a => a.type !== 'Exam').length})
                                  </button>
                                </div>
                                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                  <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                                      <tr>
                                        <th className="px-5 py-4 font-semibold tracking-wider">{t('st.subjects.col_title')}</th>
                                        <th className="px-5 py-4 font-semibold tracking-wider">{t('st.subjects.col_due')}</th>
                                        <th className="px-5 py-4 font-semibold tracking-wider text-center">{t('st.subjects.col_status')}</th>
                                        <th className="px-5 py-4 font-semibold tracking-wider text-center">{t('st.subjects.col_score')}</th>
                                        <th className="px-5 py-4 font-semibold tracking-wider text-right">{t('st.subjects.col_actions')}</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-[#151821]">
                                      {displayAssignments.filter(a => a.type !== 'Exam').map(a => {
                                        const isSubmitted = a.status === 'Submitted' || a.status === 'Graded' || (a as any).score !== undefined
                                        const score = (a as any).score ?? (a as any).aiScore
                                        const numScore = score !== undefined && score !== null ? Number(score) : null
                                        return (
                                          <tr key={a.id} onClick={() => navigate(`/student/assignments/${a.id}`)} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group cursor-pointer">
                                            <td className="px-5 py-4 font-medium text-slate-900 dark:text-slate-100">
                                              <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500">
                                                  <FileText size={16} />
                                                </div>
                                                <span className="line-clamp-1">{a.title}</span>
                                              </div>
                                            </td>
                                            <td className="px-5 py-4 text-slate-500 font-medium">
                                              {a.due ? new Date(a.due).toLocaleString(undefined, { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'}
                                            </td>
                                            <td className="px-5 py-4">
                                              <div className="flex justify-center">
                                                <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold tracking-wide whitespace-nowrap ${
                                                  a.status === 'Graded' || (a as any).score !== undefined
                                                    ? (numScore !== null && numScore <= 0 ? 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400')
                                                    : isSubmitted
                                                      ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                                                      : 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400'
                                                }`}>
                                                  {a.status === 'Graded' || (a as any).score !== undefined
                                                    ? (numScore !== null && numScore <= 0 ? 'Overdue (0.0)' : 'Graded')
                                                    : (isSubmitted ? 'Submitted' : 'Not submitted')}
                                                </span>
                                              </div>
                                            </td>
                                            <td className="px-5 py-4 text-center font-bold text-slate-700 dark:text-slate-300">
                                              {numScore !== null ? (
                                                <span className={numScore <= 0 ? 'text-rose-600 dark:text-rose-400 font-extrabold' : numScore < 5 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}>
                                                  {Math.round(numScore * 100) / 100}
                                                </span>
                                              ) : (
                                                <span className="text-slate-300 dark:text-slate-600">-</span>
                                              )}
                                            </td>
                                            <td className="px-5 py-4">
                                              <div className="flex items-center justify-end gap-2">
                                                <button
                                                  onClick={(e) => { e.stopPropagation(); navigate(`/student/assignments/${a.id}`) }}
                                                  className={`inline-flex items-center justify-center min-w-[100px] px-3 py-2 rounded-lg text-xs font-bold transition-all shadow-sm hover:shadow ${!isSubmitted ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-emerald-50 border border-emerald-200 text-emerald-600 hover:bg-emerald-100 dark:bg-transparent dark:border-emerald-800 dark:hover:bg-emerald-900/30'}`}
                                                >
                                                  {!isSubmitted ? 'Submit' : ((a as any).score !== undefined ? 'View Result' : 'Submitted')}
                                                </button>
                                              </div>
                                            </td>
                                          </tr>
                                        )
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}

                            {/* Exams Section */}
                            {displayAssignments.filter(a => a.type === 'Exam').length > 0 && (
                              <div>
                                <div className="flex items-center justify-between mb-4 px-1">
                                  <h4 className="font-bold text-slate-900 dark:text-slate-100 text-base">{t('st.subjects.exams')}</h4>
                                  <button className="text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors">
                                    View all exams ({displayAssignments.filter(a => a.type === 'Exam').length})
                                  </button>
                                </div>
                                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                  <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                                      <tr>
                                        <th className="px-5 py-4 font-semibold tracking-wider">{t('st.subjects.col_title')}</th>
                                        <th className="px-5 py-4 font-semibold tracking-wider">{t('st.subjects.col_date')}</th>
                                        <th className="px-5 py-4 font-semibold tracking-wider text-center">{t('st.subjects.col_status')}</th>
                                        <th className="px-5 py-4 font-semibold tracking-wider text-center">{t('st.subjects.col_score')}</th>
                                        <th className="px-5 py-4 font-semibold tracking-wider text-right">{t('st.subjects.col_actions')}</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-[#151821]">
                                      {displayAssignments.filter(a => a.type === 'Exam').map(a => {
                                        const isSubmitted = a.status === 'Submitted' || a.status === 'Graded' || (a as any).score !== undefined
                                        const score = (a as any).score ?? (a as any).aiScore
                                        const numScore = score !== undefined && score !== null ? Number(score) : null
                                        return (
                                          <tr key={a.id} onClick={() => navigate(`/student/assignments/${a.id}`)} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group cursor-pointer">
                                            <td className="px-5 py-4 font-medium text-slate-900 dark:text-slate-100">
                                              <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500">
                                                  <Calendar size={16} />
                                                </div>
                                                <span className="line-clamp-1">{a.title}</span>
                                              </div>
                                            </td>
                                            <td className="px-5 py-4 text-slate-500 font-medium">
                                              {a.due ? new Date(a.due).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'}
                                            </td>
                                            <td className="px-5 py-4">
                                              <div className="flex justify-center">
                                                <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold tracking-wide ${
                                                  a.status === 'Graded' || (a as any).score !== undefined
                                                    ? (numScore !== null && numScore <= 0 ? 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400')
                                                    : isSubmitted
                                                      ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'
                                                      : 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                                                }`}>
                                                  {a.status === 'Graded' || (a as any).score !== undefined
                                                    ? (numScore !== null && numScore <= 0 ? 'Overdue (0.0)' : 'Completed')
                                                    : (isSubmitted ? 'Completed' : 'Upcoming')}
                                                </span>
                                              </div>
                                            </td>
                                            <td className="px-5 py-4 text-center font-bold text-slate-700 dark:text-slate-300">
                                              {numScore !== null ? (
                                                <span className={numScore <= 0 ? 'text-rose-600 dark:text-rose-400 font-extrabold' : numScore < 5 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}>
                                                  {Math.round(numScore * 100) / 100}
                                                </span>
                                              ) : (
                                                <span className="text-slate-300 dark:text-slate-600">-</span>
                                              )}
                                            </td>
                                            <td className="px-5 py-4">
                                              <div className="flex items-center justify-end gap-2">
                                                <button
                                                  onClick={(e) => { e.stopPropagation(); navigate(`/student/assignments/${a.id}`) }}
                                                  className="inline-flex items-center justify-center min-w-[100px] px-3 py-2 rounded-lg text-xs font-bold transition-all shadow-sm hover:shadow bg-white border border-slate-200 text-blue-600 hover:bg-blue-50 dark:bg-transparent dark:border-slate-700 dark:hover:bg-slate-800"
                                                >
                                                  {isSubmitted ? 'View result' : 'View details'}
                                                </button>
                                                <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                                  <span className="leading-none text-lg">...</span>
                                                </button>
                                              </div>
                                            </td>
                                          </tr>
                                        )
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Overview */}
          <div className="bg-white dark:bg-[#151821] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6">
            <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-6">{t('st.subjects.overview')}</h3>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-white dark:bg-[#1a1d27] rounded-xl p-4 border border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="text-3xl font-bold text-blue-600 mb-1">{stats.total}</div>
                <div className="text-sm font-medium text-slate-500">{t('st.subjects.total')}</div>
              </div>
              <div className="bg-white dark:bg-[#1a1d27] rounded-xl p-4 border border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="text-3xl font-bold text-emerald-600 mb-1">{stats.submitted}</div>
                <div className="text-sm font-medium text-slate-500">{t('st.subjects.submitted')}</div>
              </div>
              <div className="bg-white dark:bg-[#1a1d27] rounded-xl p-4 border border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="text-3xl font-bold text-orange-500 mb-1">{stats.missing}</div>
                <div className="text-sm font-medium text-slate-500">{t('st.subjects.not_submitted')}</div>
              </div>
              <div className="bg-white dark:bg-[#1a1d27] rounded-xl p-4 border border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="text-3xl font-bold text-slate-700 dark:text-slate-300 mb-1">{stats.graded}</div>
                <div className="text-sm font-medium text-slate-500">{t('st.subjects.graded')}</div>
              </div>
            </div>

            <div className="mb-6">
              <div className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">{t('st.subjects.avg_score')}</div>
              <div className="flex items-end justify-between">
                <div className="text-[2.5rem] leading-none font-bold text-blue-600">{stats.avgScore}</div>
                <div className="w-28 h-12 relative text-blue-500">
                  <svg viewBox="0 0 100 40" className="w-full h-full overflow-visible drop-shadow-md" preserveAspectRatio="none">
                    <path d="M0 30 Q 15 20, 25 25 T 45 15 T 65 20 T 85 5 T 100 10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="100" cy="10" r="3" fill="currentColor" />
                  </svg>
                </div>
              </div>
            </div>

            {/* "Your ranking: Top 28%" was a fixed string shown to every student.
                There is no ranking endpoint, so state what the average is based on. */}
            <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700/50">
              <span>{t('st.subjects.avg_across', { count: stats.graded })}</span>
              <Info size={16} className="text-slate-400 ml-auto" />
            </div>
          </div>

          {/* Upcoming Assignments */}
          <div className="bg-white dark:bg-[#151821] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <Clock size={20} className="text-slate-400" />
                {t('st.subjects.due_soon')}
              </h3>
              <button className="text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors">{t('st.subjects.view_all')}</button>
            </div>

            <div className="space-y-4">
              {stats.upcoming.length > 0 ? stats.upcoming.map(a => {
                const hours = (new Date(a.due!).getTime() - new Date().getTime()) / (1000 * 3600)
                const days = Math.ceil(hours / 24)
                return (
                  <div key={a.id} className="flex gap-4 p-3 -mx-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer group" onClick={() => navigate(`/student/assignments/${a.id}`)}>
                    <div className="p-2.5 rounded-xl bg-orange-50 dark:bg-orange-900/10 text-orange-500 shrink-0 h-fit mt-0.5 group-hover:bg-orange-100 transition-colors">
                      <FileText size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 line-clamp-1 mb-0.5 group-hover:text-blue-600 transition-colors">{a.title}</h4>
                      <div className="text-xs font-medium text-slate-500 mb-1.5">{a.class || (a as any).subjectCode || 'No Subject'}</div>
                      <div className="text-xs text-red-500 font-semibold flex items-center gap-1">
                        Due: {new Date(a.due!).toLocaleString(undefined, { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </div>
                    </div>
                    <div className={`text-xs font-bold shrink-0 text-right ${hours >= 24 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {days > 0 ? `in ${days} day(s)` : 'Today'}
                    </div>
                  </div>
                )
              }) : (
                <div className="text-sm font-medium text-slate-400 text-center py-6 bg-slate-50 dark:bg-slate-800/20 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                  {t('st.subjects.no_due_soon')}
                </div>
              )}
            </div>
          </div>

          {/* Upcoming Exams */}
          <div className="bg-white dark:bg-[#151821] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar size={20} className="text-slate-400" />
                {t('st.subjects.upcoming_exams')}
              </h3>
              <button className="text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors">{t('st.subjects.view_all')}</button>
            </div>

            <div className="space-y-4">
              {stats.upcomingExams.length > 0 ? stats.upcomingExams.map(a => {
                const days = Math.ceil((new Date(a.due!).getTime() - new Date().getTime()) / (1000 * 3600 * 24))
                return (
                  <div key={a.id} className="flex gap-4 p-3 -mx-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer group" onClick={() => navigate(`/student/assignments/${a.id}`)}>
                    <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-900/10 text-indigo-500 shrink-0 h-fit mt-0.5 group-hover:bg-indigo-100 transition-colors">
                      <FileText size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 line-clamp-1 mb-0.5 group-hover:text-blue-600 transition-colors">{a.title}</h4>
                      <div className="text-xs font-medium text-slate-500 mb-1.5">{a.class || (a as any).subjectCode || 'No Subject'}</div>
                      <div className="text-xs text-slate-500 font-medium flex items-center gap-1">
                        Exam date: {new Date(a.due!).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </div>
                    </div>
                    <div className="text-xs font-bold text-blue-600 shrink-0 text-right">
                      {days > 0 ? `in ${days} day(s)` : 'Today'}
                    </div>
                  </div>
                )
              }) : (
                <div className="text-sm font-medium text-slate-400 text-center py-6 bg-slate-50 dark:bg-slate-800/20 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                  {t('st.subjects.no_upcoming_exams')}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { BookOpen, ArrowRight, Loader2, Clock, CheckCircle2, FileText, Calendar } from 'lucide-react'
import { APIError } from '@/components/common/ErrorState'
import { SemesterSelector, type SemesterOption } from '@/components/ui/SemesterSelector'
import { useTranslation } from 'react-i18next'

export function StudentOverview() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [selectedSemester, setSelectedSemester] = useState<SemesterOption>('')

  const loadData = useCallback(() => {
    let alive = true
    setLoading(true)
    setError(null)
    api.getStudentDashboard()
      .then((data) => {
        if (alive) {
          setDashboardData(data || {})
        }
      })
      .catch(err => { if (alive) setError(err) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  useEffect(() => {
    const cleanup = loadData()
    return () => {
      cleanup()
    }
  }, [loadData])

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-brand-600" /></div>
  if (error) return <APIError error={error} onRetry={loadData} />

  const filteredEnrolledClasses = (dashboardData?.enrolledClasses || []).filter((c: any) => {
    if (!selectedSemester) return true;
    const semLabel = (c.semester?.season || c.semester?.label || c.semester?.code || '').toUpperCase().replace(/\s+/g, '');
    const semId = c.semester?.id;
    return semLabel === selectedSemester || semId === selectedSemester;
  });

  const subjects = filteredEnrolledClasses.map((c: any) => ({
    id: c.id || c.subject?.id,
    code: c.subject?.code || c.classCode,
    name: c.subject?.name || 'Subject',
    teacher: c.lecturers?.[0]?.name || 'Not assigned',
  }));

  const upcomingTasks = (dashboardData?.upcomingAssignments || []).filter((a: any) => {
    if (a.isDeleted || (a.status || '').toLowerCase() === 'deleted' || a.isSubmitted || a.status === 'Submitted' || a.status === 'Graded' || a.submitted) return false;
    if (!selectedSemester) return true;
    const taskSemLabel = (a.semesterLabel || a.semesterSeason || a.semesterCode || '').toUpperCase().replace(/\s+/g, '');
    const taskSemId = a.semesterId;
    if (taskSemLabel || taskSemId) {
      return taskSemLabel === selectedSemester || taskSemId === selectedSemester;
    }
    return filteredEnrolledClasses.some((c: any) => c.subject?.code === a.subjectCode || c.id === a.classId);
  });

  // Find most urgent assignment due in next 48 hours
  const urgentAssignment = upcomingTasks.find((a: any) => {
    if (!a.due) return false
    const diff = new Date(a.due).getTime() - new Date().getTime()
    return diff > 0 && diff <= 48 * 3600 * 1000
  })

  let timeRemainingText = ''
  if (urgentAssignment?.due) {
    const diffMs = new Date(urgentAssignment.due).getTime() - new Date().getTime()
    const hours = Math.floor(diffMs / (1000 * 3600))
    const minutes = Math.floor((diffMs % (1000 * 3600)) / (1000 * 60))
    timeRemainingText = hours > 0 ? `${hours}h ${minutes}m left` : `${minutes}m left`
  }

  return (
    <div className="space-y-6 animate-fade-in-up pb-10">
      {/* Simple Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-white dark:bg-[#151821] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="mb-2 inline-flex items-center rounded-md bg-brand-50 dark:bg-brand-900/30 px-2 py-1">
            <span className="text-xs font-bold text-brand-700 dark:text-brand-400">Student • {selectedSemester} semester</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            Hello, have a great day!
          </h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            You have {upcomingTasks.length} assignment(s) due this semester. Try to finish them early.
          </p>
        </div>
        <SemesterSelector
          selectedSemester={selectedSemester}
          onChange={setSelectedSemester}
          className="self-start md:self-auto shrink-0"
        />
      </div>

      {/* Urgent Deadline Alert Banner */}
      {urgentAssignment && (
        <div
          onClick={() => navigate(`/student/assignments/${urgentAssignment.id}`)}
          className="p-4 bg-gradient-to-r from-red-500/10 via-amber-500/10 to-red-500/10 border-2 border-red-500/40 rounded-2xl flex items-center justify-between gap-4 cursor-pointer hover:border-red-500/70 transition-all shadow-lg shadow-red-500/10 animate-pulse"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 bg-red-500 text-white rounded-xl font-bold flex items-center justify-center shrink-0 shadow-md shadow-red-500/30">
              <Clock size={20} className="animate-spin" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase bg-red-600 text-white rounded-full">{t('st.overview.deadline_approaching')}</span>
                <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate">{urgentAssignment.title}</h4>
              </div>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-semibold">
                Due: {new Date(urgentAssignment.due).toLocaleString()} ({timeRemainingText})
              </p>
            </div>
          </div>
          <button className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all shrink-0 flex items-center gap-1.5 shadow-md shadow-red-600/30">
            Start now <ArrowRight size={14} />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column: Enrolled Subjects */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="text-brand-600" size={20} /> Current subjects
            </h2>
            <Link to="/student/courses" className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 flex items-center gap-1 group">
              View all <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {subjects.map((sub: any, idx: number) => (
              <div
                key={idx}
                onClick={() => navigate(`/student/classes/${sub.id}`)}
                className="group flex flex-col justify-between rounded-xl bg-white dark:bg-[#151821] border border-slate-200 dark:border-slate-800 shadow-sm hover:border-brand-300 dark:hover:border-brand-700 hover:shadow-md transition-all cursor-pointer p-5"
              >
                <div>
                  <span className="text-xs font-bold bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400 px-2 py-1 rounded mb-2 inline-block">
                    {sub.code}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors line-clamp-1">
                    {sub.name}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Lecturer: {sub.teacher}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Upcoming Deadlines */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Clock className="text-amber-500" size={20} /> To do
          </h2>

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#151821] overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 text-sm">
                Due soon
              </h3>
              <span className="bg-white border border-slate-200 text-slate-600 text-xs font-bold px-2 py-0.5 rounded dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300">
                {upcomingTasks.length}
              </span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {upcomingTasks.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm flex flex-col items-center">
                  <CheckCircle2 size={32} className="text-emerald-400 mb-2" />
                  You have completed every assignment!
                </div>
              ) : (
                upcomingTasks.map((item: any) => (
                  <div key={item.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer" onClick={() => navigate(`/student/assignments/${item.id}`)}>
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        {item.type === 'Exam' ? (
                          <Calendar size={16} className="text-indigo-500" />
                        ) : (
                          <FileText size={16} className="text-emerald-500" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium text-sm text-slate-900 dark:text-slate-100 line-clamp-2">
                          {item.title}
                        </h4>
                        {item.due && (
                          <p className="text-xs font-medium text-red-500 mt-1 flex items-center gap-1">
                            <Clock size={12} /> Due: {new Date(item.due).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="p-3 text-center border-t border-slate-100 dark:border-slate-800">
              <Link to="/student/courses" className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
                View all subjects
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

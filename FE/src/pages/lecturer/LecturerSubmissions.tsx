import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { DataTable } from '@/components/ui/DataTable'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { ErrorState } from '@/components/common/ErrorState'
import { api, type AssignmentRow, type SubmissionRow } from '@/lib/api'
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Save,
  X,
  Bell,
  BrainCircuit,
  MessageSquareX,
  FileDown,
  Search,
  Sparkles,
  Award,
  AlertCircle,
  RotateCcw,
  Calendar,
  FileCheck
} from 'lucide-react'
import { Tabs } from '@/components/ui/Tabs'

export function LecturerSubmissions() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [assignment, setAssignment] = useState<AssignmentRow | null>(null)
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([])
  const [classStudents, setClassStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Grading Modal State
  const [gradingSub, setGradingSub] = useState<SubmissionRow | null>(null)
  const [score, setScore] = useState<number | ''>('')
  const [feedback, setFeedback] = useState('')
  const [sendNotification, setSendNotification] = useState(true)
  const [isGrading, setIsGrading] = useState(false)

  // Reopen Modal State
  const [reopenTarget, setReopenTarget] = useState<any | null>(null)
  const [extendedDate, setExtendedDate] = useState<string>('')
  const [penaltyMode, setPenaltyMode] = useState<'SYSTEM_DEFAULT' | 'CUSTOM_RATE' | 'FLAT_AMOUNT' | 'WAIVE' | 'SCORE_CAP'>('WAIVE')
  const [customPenaltyRate, setCustomPenaltyRate] = useState<number | ''>(1.0)
  const [flatPenaltyAmount, setFlatPenaltyAmount] = useState<number | ''>(1.0)
  const [scoreCap, setScoreCap] = useState<number | ''>(7.0)
  const [reopenReason, setReopenReason] = useState<string>('')
  const [isReopening, setIsReopening] = useState(false)

  // Filtering
  const [filter, setFilter] = useState('all')

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const [assigData, subsData] = await Promise.all([
        api.getAssignment(id),
        api.getSubmissions({ assignmentId: id })
      ])
      setAssignment(assigData)
      const submissionList = subsData || []
      setSubmissions(submissionList)

      // Discover target classIds
      let classIds: string[] = (assigData as any)?.classes || []
      if (classIds.length === 0 && (assigData as any)?.classId) {
        classIds = [(assigData as any).classId]
      }

      let studentsList: any[] = []
      if (classIds.length > 0) {
        const studentLists = await Promise.all(
          classIds.map(cid => api.getClassStudents(cid).catch(() => []))
        )
        const map = new Map<string, any>()
        studentLists.flat().forEach((s: any) => {
          if (s && (s.id || s.studentId)) {
            map.set(s.id || s.studentId, s)
          }
        })
        studentsList = Array.from(map.values())
      }

      // Fallback: If no class enrollment is explicitly assigned, gather students from submissions
      if (studentsList.length === 0 && submissionList.length > 0) {
        studentsList = submissionList.map(s => ({
          id: s.studentId || s.id,
          studentId: s.studentId || s.id,
          name: s.student || t('lc.sm.student_fallback'),
          avatar: (s as any).avatar || null,
          email: (s as any).email || '',
        }))
      }

      setClassStudents(studentsList)
    } catch (e: any) {
      setError(e.message || t('lc.sm.load_failed'))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const openGradeModal = (sub: SubmissionRow) => {
    setGradingSub(sub)
    setScore(sub.score ?? '')
    setFeedback(typeof sub.aiFeedback === 'string' ? sub.aiFeedback : '')
  }

  const handleGrade = async () => {
    if (!gradingSub || score === '') return
    setIsGrading(true)
    try {
      await api.gradeSubmission(gradingSub.id, {
        score: Number(score),
        feedback,
      })
      if (sendNotification) {
        console.log(`Notification sent to ${gradingSub.student}`)
      }
      setGradingSub(null)
      load()
    } catch (error: any) {
      alert(error.message || t('lc.sm.grading_failed'))
    } finally {
      setIsGrading(false)
    }
  }

  const handleResolveAppeal = async (accepted: boolean) => {
    if (!gradingSub) return
    setIsGrading(true)
    try {
      await api.gradeSubmission(gradingSub.id, {
        score: accepted && score !== '' ? Number(score) : (gradingSub.score as number),
        feedback: accepted
          ? `${t('lc.sm.appeal_approved_prefix')} ${feedback}`
          : `${t('lc.sm.appeal_rejected_prefix')} ${feedback || t('lc.sm.appeal_default_reason')}`,
      })
      if (sendNotification) {
        console.log(`Notification sent to ${gradingSub.student} regarding appeal`)
      }
      setGradingSub(null)
      load()
    } catch (error: any) {
      alert(error.message || t('lc.sm.appeal_failed'))
    } finally {
      setIsGrading(false)
    }
  }

  const openReopenModal = (row: any) => {
    setReopenTarget(row)
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
    tomorrow.setHours(23, 59, 0, 0)
    setExtendedDate(tomorrow.toISOString().slice(0, 16))
    setPenaltyMode('WAIVE')
    setCustomPenaltyRate(1.0)
    setFlatPenaltyAmount(1.0)
    setScoreCap(7.0)
    setReopenReason(t('lc.sm.reopen_default_reason'))
  }

  const handleReopen = async () => {
    if (!reopenTarget || !id || !extendedDate) return
    setIsReopening(true)
    try {
      await api.reopenSubmission({
        examId: id,
        studentId: reopenTarget.id || reopenTarget.studentId,
        extendedDueDate: new Date(extendedDate).toISOString(),
        penaltyMode,
        customPenaltyRate: customPenaltyRate !== '' ? Number(customPenaltyRate) : undefined,
        flatPenaltyAmount: flatPenaltyAmount !== '' ? Number(flatPenaltyAmount) : undefined,
        scoreCap: scoreCap !== '' ? Number(scoreCap) : undefined,
        reason: reopenReason,
      })
      alert(t('lc.sm.reopen_success'))
      setReopenTarget(null)
      load()
    } catch (e: any) {
      alert(e.message || t('lc.sm.reopen_failed'))
    } finally {
      setIsReopening(false)
    }
  }

  const handleStartSession = async () => {
    if (!id) return
    try {
      await api.startGradingSession(id)
      alert(t('lc.sm.ai_session_started'))
      load()
    } catch (e: any) {
      alert(e.message || t('lc.sm.ai_session_failed'))
    }
  }

  const handleBulkPublish = async () => {
    if (!id || !window.confirm(t('lc.sm.publish_confirm'))) return
    try {
      await api.bulkPublishGrades(id)
      alert(t('lc.sm.publish_success'))
      load()
    } catch (e: any) {
      alert(e.message || t('lc.sm.publish_failed'))
    }
  }

  if (loading) return <LoadingSpinner />
  if (error || !assignment) return <ErrorState message={error || t('lc.sm.not_found')} onRetry={load} />

  // Map class students to their submission and grade
  const rosterRows = classStudents.map(st => {
    const sub = submissions.find(
      s => s.studentId === st.id || s.studentId === st.studentId || s.student === st.name
    )
    const finalScore = sub?.score ?? (sub as any)?.finalScore ?? sub?.aiScore
    const rawScore = (sub as any)?.rawScore ?? finalScore
    const latePenaltyAmount = (sub as any)?.latePenaltyAmount ?? 0
    const isReopened = (sub as any)?.isReopened ?? false

    return {
      id: st.id || st.studentId,
      photo: st.avatar || null,
      name: st.name || t('lc.sm.unknown_student'),
      studentId: st.studentId || st.id || '—',
      email: st.email || '',
      submission: sub || null,
      status: sub ? (sub.status === 'graded' ? 'graded' : 'pending') : 'not_submitted',
      score: finalScore !== undefined && finalScore !== null ? Number(finalScore) : null,
      rawScore: rawScore !== undefined && rawScore !== null ? Number(rawScore) : null,
      latePenaltyAmount: Number(latePenaltyAmount || 0),
      isReopened: Boolean(isReopened),
      hasAppeal: !!sub?.studentFeedback
    }
  })

  // Derived metrics
  const totalStudents = rosterRows.length
  const gradedCount = rosterRows.filter(r => r.status === 'graded').length
  const pendingCount = rosterRows.filter(r => r.status === 'pending').length
  const notSubmittedCount = rosterRows.filter(r => r.status === 'not_submitted').length
  const appealCount = rosterRows.filter(r => r.hasAppeal).length

  // Filtered & searched rows
  const filteredRows = rosterRows.filter(r => {
    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      const matchName = r.name.toLowerCase().includes(q)
      const matchCode = r.studentId.toLowerCase().includes(q)
      const matchEmail = r.email.toLowerCase().includes(q)
      if (!matchName && !matchCode && !matchEmail) return false
    }

    // Category tab filter
    if (filter === 'graded') return r.status === 'graded'
    if (filter === 'pending') return r.status === 'pending'
    if (filter === 'not_submitted') return r.status === 'not_submitted'
    if (filter === 'appeal') return r.hasAppeal
    return true
  })

  return (
    <div className="space-y-8 p-2 sm:p-6 min-h-screen max-w-7xl mx-auto animate-in fade-in duration-300">

      {/* Sleek Modern Header */}
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between bg-white dark:bg-[#12151e] p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(-1)}
            className="shrink-0 p-2.5 rounded-xl border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-600 dark:text-slate-300 transition-all active:scale-95"
          >
            <ArrowLeft size={18} />
          </Button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-brand-50 dark:bg-brand-950/50 border border-brand-200 dark:border-brand-800 text-brand-700 dark:text-brand-400 text-xs font-bold uppercase tracking-wider">
                {t('lc.sm.roster_badge', { type: assignment.type || t('lc.sm.type_assignment') })}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              {assignment.title}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-3">
              <span>{t('lc.sm.class_label')} <strong className="text-slate-700 dark:text-slate-300">{assignment.class || t('lc.sm.all_classes')}</strong></span>
              <span>•</span>
              <span>{t('lc.sm.due_label')} <strong className="text-slate-700 dark:text-slate-300 font-mono">{assignment.due?.slice(0, 10) || t('lc.sm.no_deadline')}</strong></span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {assignment.type === 'Exam' ? (
            <Button
              size="sm"
              onClick={handleStartSession}
              className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold gap-2 shadow-md hover:shadow-lg transition-all active:scale-95 rounded-xl px-4 py-2 text-xs"
            >
              <BrainCircuit size={16} />
              {t('lc.sm.batch_ai')}
            </Button>
          ) : (
            <div className="flex items-center gap-2 px-3.5 py-2 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/60 rounded-xl text-xs font-bold shadow-2xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              {t('lc.sm.ai_active')}
            </div>
          )}
          <Button
            size="sm"
            onClick={handleBulkPublish}
            className="bg-brand-600 hover:bg-brand-700 text-white font-bold gap-2 shadow-sm hover:shadow-md transition-all active:scale-95 rounded-xl px-4 py-2 text-xs"
          >
            <CheckCircle2 size={16} /> {t('lc.sm.publish_all')}
          </Button>
        </div>
      </div>

      {/* Main Gradebook Workspace Card */}
      <Card className="overflow-hidden border border-slate-200/90 dark:border-slate-800/90 shadow-sm rounded-2xl bg-white dark:bg-[#12151e]">

        {/* Workspace Toolbar: Search & Segmented Filter Tabs */}
        <div className="border-b border-slate-100 dark:border-slate-800/80 p-5 bg-slate-50/50 dark:bg-slate-900/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder={t('lc.sm.search')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs border border-slate-200 dark:border-slate-700/80 rounded-xl bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium text-slate-800 dark:text-slate-200 shadow-2xs"
              />
            </div>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {t('lc.sm.showing', { shown: filteredRows.length, total: totalStudents })}
            </span>
          </div>

          <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-900 p-1 border border-slate-200/80 dark:border-slate-800 w-max overflow-x-auto custom-scrollbar">
            <Tabs
              items={[
                { id: 'all', label: t('lc.sm.tab.all', { n: totalStudents }) },
                { id: 'graded', label: t('lc.sm.tab.graded', { n: gradedCount }) },
                { id: 'pending', label: t('lc.sm.tab.pending', { n: pendingCount }) },
                { id: 'not_submitted', label: t('lc.sm.tab.not_submitted', { n: notSubmittedCount }) },
                { id: 'appeal', label: t('lc.sm.tab.appeal', { n: appealCount }) }
              ]}
              activeId={filter}
              onChange={setFilter}
            />
          </div>
        </div>

        {/* High Precision Data Table */}
        <div className="p-3 overflow-x-auto custom-scrollbar">
          <DataTable
            columns={[
              {
                key: 'photo',
                header: t('lc.sm.col.photo'),
                render: (r: any) => {
                  const avatarUrl = r.photo || r.avatar
                  const parts = (r.name || '').trim().split(/\s+/)
                  const initials = parts.length === 1
                    ? parts[0].slice(0, 2).toUpperCase()
                    : ((parts[0]?.[0] || '') + (parts[parts.length - 1]?.[0] || '')).toUpperCase()
                  return (
                    <div className="flex items-center justify-center py-2">
                      <div className="relative w-[111px] h-[146px] rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm shrink-0 bg-[#4f46e5] flex items-center justify-center">
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt={r.name}
                            className="w-full h-full object-cover relative z-10"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                              const fallback = (e.target as HTMLElement).nextElementSibling as HTMLElement;
                              if (fallback) fallback.style.display = 'block';
                            }}
                          />
                        ) : null}
                        <span 
                          style={{ display: avatarUrl ? 'none' : 'block' }}
                          className="font-extrabold text-white text-3xl tracking-wider select-none"
                        >
                          {initials || 'ST'}
                        </span>
                      </div>
                    </div>
                  )
                }
              },
              {
                key: 'name',
                header: t('lc.sm.col.name'),
                render: (r: any) => (
                  <div className="py-1">
                    <p className="font-bold text-slate-900 dark:text-slate-100 text-sm tracking-tight hover:text-brand-600 transition-colors">
                      {r.name}
                    </p>
                    {r.email && <p className="text-xs text-slate-400 dark:text-slate-500 font-mono mt-0.5">{r.email}</p>}
                  </div>
                )
              },
              {
                key: 'studentId',
                header: t('lc.sm.col.code'),
                render: (r: any) => (
                  <div className="py-1">
                    <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200/80 dark:border-slate-700/60 shadow-2xs">
                      {r.studentId}
                    </span>
                  </div>
                )
              },
              {
                key: 'status',
                header: t('lc.sm.col.status'),
                render: (r: any) => (
                  <div className="flex flex-col gap-1 w-max py-1">
                    {r.status === 'graded' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/60 text-xs font-bold">
                        <CheckCircle2 size={13} className="text-emerald-500" /> {t('lc.sm.status.graded')}
                      </span>
                    ) : r.status === 'pending' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200/80 dark:border-amber-800/60 text-xs font-bold">
                        <Clock size={13} className="text-amber-500" /> {t('lc.sm.status.submitted')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-medium border border-slate-200/60 dark:border-slate-700/50">
                        {t('lc.sm.status.not_submitted')}
                      </span>
                    )}
                    {r.isReopened && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 text-[11px] font-bold">
                        <RotateCcw size={12} /> {t('lc.sm.reopened_badge')}
                      </span>
                    )}
                    {r.hasAppeal && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 text-[11px] font-bold">
                        <AlertCircle size={12} /> {t('lc.sm.appeal_badge')}
                      </span>
                    )}
                  </div>
                )
              },
              {
                key: 'score',
                header: t('lc.sm.col.score'),
                render: (r: any) => (
                  <div className="py-1 font-mono">
                    {r.score !== null ? (
                      <div className="flex flex-col gap-0.5">
                        <span className="inline-flex items-center gap-1 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-emerald-600 dark:text-emerald-400 font-black text-sm px-3 py-1 rounded-xl shadow-2xs">
                          <Award size={14} className="text-emerald-500" />
                          {r.score} <span className="text-[10px] text-slate-400 font-normal">/ 10</span>
                        </span>
                        {r.latePenaltyAmount > 0 && (
                          <span className="text-[10px] text-rose-500 font-bold">
                            {t('lc.sm.penalty_note', { raw: r.rawScore ?? r.score, penalty: r.latePenaltyAmount })}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-600 font-bold text-sm italic">
                        —
                      </span>
                    )}
                  </div>
                )
              },
              {
                key: 'actions',
                header: '',
                render: (r: any) => (
                  <div className="flex justify-end gap-2 pr-2 py-1">
                    {r.submission ? (
                      <button
                        onClick={() => openGradeModal(r.submission)}
                        className="bg-white dark:bg-slate-800 hover:bg-brand-50 dark:hover:bg-brand-950/40 text-slate-700 dark:text-slate-200 hover:text-brand-600 dark:hover:text-brand-400 font-bold text-xs border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-1.5 shadow-2xs transition-all active:scale-95 flex items-center gap-1.5"
                      >
                        <FileCheck size={14} />
                        {r.hasAppeal ? t('lc.sm.action.review_appeal') : r.status === 'graded' ? t('lc.sm.action.edit_grade') : t('lc.sm.action.grade')}
                      </button>
                    ) : (
                      <button
                        disabled
                        className="text-slate-400 dark:text-slate-600 text-xs font-medium cursor-not-allowed bg-slate-50 dark:bg-slate-900 px-3.5 py-1.5 rounded-xl border border-slate-100 dark:border-slate-800 opacity-60"
                      >
                        {t('lc.sm.action.no_submission')}
                      </button>
                    )}
                    <button
                      onClick={() => openReopenModal(r)}
                      className="bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-amber-700 dark:text-amber-300 font-bold text-xs border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-1.5 shadow-2xs transition-all active:scale-95 flex items-center gap-1.5"
                      title={t('lc.sm.action.reopen_title')}
                    >
                      <RotateCcw size={14} />
                      {t('lc.sm.action.reopen')}
                    </button>
                  </div>
                )
              }
            ]}
            data={filteredRows}
            keyExtractor={(r: any) => r.id}
          />
        </div>
      </Card>

      {/* Modern Grading Modal */}
      {gradingSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-200">
          <Card className="w-full max-w-2xl bg-white dark:bg-[#12151e] shadow-2xl border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">{t('lc.sm.modal.grading_portal')}</span>
                <h3 className="font-black text-lg text-slate-900 dark:text-white">{gradingSub.student}</h3>
              </div>
              <Button variant="outline" size="sm" className="p-2 border-0 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => setGradingSub(null)}>
                <X size={18} />
              </Button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar">
              <div>
                <h4 className="text-xs font-extrabold text-slate-400 dark:text-slate-500 mb-2 uppercase tracking-wider">{t('lc.sm.modal.submission_content')}</h4>
                <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/80 dark:border-slate-800 font-mono text-xs leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap max-h-60 overflow-y-auto custom-scrollbar">
                  {gradingSub.content || t('lc.sm.modal.no_text')}
                </div>
              </div>

              {gradingSub.zipFileUrl && (
                <div>
                  <h4 className="text-xs font-extrabold text-slate-400 dark:text-slate-500 mb-2 uppercase tracking-wider">{t('lc.sm.modal.attachment')}</h4>
                  <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 rounded-xl border border-blue-100 dark:border-blue-900/40">
                        <FileDown size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-xs text-slate-900 dark:text-white">{t('lc.sm.modal.archive')}</p>
                        <p className="text-[11px] text-slate-400 font-mono truncate max-w-xs">{gradingSub.zipFileUrl}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => window.open(gradingSub.zipFileUrl, '_blank')}
                      className="gap-2 text-xs rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-2xs hover:bg-slate-50"
                    >
                      <FileDown size={14} /> {t('lc.sm.modal.download')}
                    </Button>
                  </div>
                </div>
              )}

              {gradingSub.studentFeedback && (
                <div className="p-4 bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-800/50 rounded-xl space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-bold text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2 uppercase tracking-wider">
                        <MessageSquareX size={16} /> {t('lc.sm.modal.appeal_statement')}
                      </p>
                      <p className="text-xs text-rose-700 dark:text-rose-400 mt-2 whitespace-pre-wrap p-3 bg-white/80 dark:bg-black/40 rounded-xl border border-rose-100 dark:border-rose-900/40 shadow-2xs font-medium">
                        "{gradingSub.studentFeedback}"
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 rounded-xl">
                    <p className="text-[11px] font-extrabold text-indigo-800 dark:text-indigo-300 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                      <BrainCircuit size={14} /> {t('lc.sm.modal.scores_on_record')}
                    </p>
                    <div className="text-xs text-indigo-700 dark:text-indigo-300 space-y-1">
                      <p>
                        {t('lc.sm.modal.ai_prelim')}{' '}
                        <span className="font-mono font-bold">
                          {gradingSub.aiScore != null ? `${gradingSub.aiScore}/100` : t('lc.sm.modal.not_available')}
                        </span>
                      </p>
                      <p>
                        {t('lc.sm.modal.official_score')}{' '}
                        <span className="font-mono font-bold">
                          {gradingSub.score != null ? `${gradingSub.score}/10` : t('lc.sm.modal.not_graded')}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {gradingSub.aiScore != null && (
                <div className="p-4 bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 rounded-xl">
                  <p className="font-bold text-xs text-indigo-800 dark:text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles size={14} /> {t('lc.sm.modal.ai_eval')}
                  </p>
                  <p className="text-xs text-indigo-700 dark:text-indigo-400 mt-1">
                    {t('lc.sm.modal.prelim_grade')} <span className="font-mono font-bold text-sm">{gradingSub.aiScore}/100</span>
                  </p>
                  {!!gradingSub.aiFeedback && (
                    <p className="mt-2 text-xs italic opacity-90 text-indigo-700 dark:text-indigo-300 leading-relaxed">
                      {String(gradingSub.aiFeedback)}
                    </p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-4 gap-4 pt-2">
                <div className="col-span-1">
                  <Input
                    label={t('lc.sm.modal.score_label')}
                    type="number"
                    step="0.5"
                    min="0"
                    max="10"
                    value={score.toString()}
                    onChange={(e) => setScore(e.target.value === '' ? '' : Number(e.target.value))}
                    className="text-base font-bold font-mono"
                  />
                </div>
                <div className="col-span-3">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                    {t('lc.sm.modal.feedback_label')}
                  </label>
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder={t('lc.sm.modal.feedback_placeholder')}
                    className="w-full min-h-[90px] p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-brand-500 outline-none text-xs leading-relaxed font-medium"
                  />
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="notifyStudent"
                      checked={sendNotification}
                      onChange={(e) => setSendNotification(e.target.checked)}
                      className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                    <label htmlFor="notifyStudent" className="text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1.5 cursor-pointer">
                      <Bell size={13} className="text-brand-500" />
                      {t('lc.sm.modal.notify')}
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 flex justify-between bg-slate-50/50 dark:bg-slate-900/40">
              <Button variant="outline" size="sm" onClick={() => setGradingSub(null)} className="rounded-xl border-slate-200 text-xs">
                {t('lc.sm.modal.cancel')}
              </Button>

              {gradingSub.studentFeedback ? (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleResolveAppeal(false)}
                    disabled={isGrading}
                    variant="outline"
                    className="text-rose-600 hover:text-rose-700 border-rose-200 hover:bg-rose-50 text-xs rounded-xl"
                  >
                    <X size={14} className="mr-1" /> {t('lc.sm.modal.reject_appeal')}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleResolveAppeal(true)}
                    disabled={isGrading || score === ''}
                    className="bg-brand-600 hover:bg-brand-700 text-white text-xs rounded-xl font-bold"
                  >
                    <CheckCircle2 size={14} className="mr-1" /> {t('lc.sm.modal.approve_save')}
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  onClick={handleGrade}
                  disabled={isGrading || score === ''}
                  className="bg-brand-600 hover:bg-brand-700 text-white text-xs rounded-xl font-bold"
                >
                  {isGrading ? t('lc.sm.modal.saving') : <><Save size={14} className="mr-1.5" /> {t('lc.sm.modal.save_score')}</>}
                </Button>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Reopen Submission Modal */}
      {reopenTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-200">
          <Card className="w-full max-w-xl bg-white dark:bg-[#12151e] shadow-2xl border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <RotateCcw size={12} /> {t('lc.sm.ro.title')}
                </span>
                <h3 className="font-black text-lg text-slate-900 dark:text-white">
                  {reopenTarget.name} ({reopenTarget.studentId})
                </h3>
              </div>
              <Button variant="outline" size="sm" className="p-2 border-0 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => setReopenTarget(null)}>
                <X size={18} />
              </Button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 custom-scrollbar text-xs">
              {/* Extended Due Date Input */}
              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1.5 flex items-center gap-1.5">
                  <Calendar size={14} className="text-brand-500" />
                  {t('lc.sm.ro.new_due')}
                </label>
                <input
                  type="datetime-local"
                  value={extendedDate}
                  onChange={(e) => setExtendedDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-brand-500 outline-none font-medium text-slate-900 dark:text-white"
                />
              </div>

              {/* Penalty Mode Selection */}
              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-2">
                  {t('lc.sm.ro.policy')}
                </label>
                <div className="space-y-2.5">
                  <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${penaltyMode === 'WAIVE' ? 'bg-emerald-50/80 border-emerald-300 dark:bg-emerald-950/30 dark:border-emerald-800' : 'bg-slate-50/50 border-slate-200 dark:bg-slate-900/40 dark:border-slate-800'}`}>
                    <input
                      type="radio"
                      name="penaltyMode"
                      checked={penaltyMode === 'WAIVE'}
                      onChange={() => setPenaltyMode('WAIVE')}
                      className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <p className="font-bold text-emerald-900 dark:text-emerald-300">{t('lc.sm.ro.waive')}</p>
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-400">{t('lc.sm.ro.waive_desc')}</p>
                    </div>
                  </label>

                  <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${penaltyMode === 'CUSTOM_RATE' ? 'bg-amber-50/80 border-amber-300 dark:bg-amber-950/30 dark:border-amber-800' : 'bg-slate-50/50 border-slate-200 dark:bg-slate-900/40 dark:border-slate-800'}`}>
                    <input
                      type="radio"
                      name="penaltyMode"
                      checked={penaltyMode === 'CUSTOM_RATE'}
                      onChange={() => setPenaltyMode('CUSTOM_RATE')}
                      className="mt-0.5 text-amber-600 focus:ring-amber-500"
                    />
                    <div className="w-full">
                      <p className="font-bold text-amber-900 dark:text-amber-300">{t('lc.sm.ro.custom')}</p>
                      <p className="text-[11px] text-amber-700 dark:text-amber-400 mb-2">{t('lc.sm.ro.custom_desc')}</p>
                      {penaltyMode === 'CUSTOM_RATE' && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="font-medium text-slate-700 dark:text-slate-300">{t('lc.sm.ro.deduct')}</span>
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            value={customPenaltyRate.toString()}
                            onChange={(e) => setCustomPenaltyRate(e.target.value === '' ? '' : Number(e.target.value))}
                            className="w-24 p-1.5 rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-950 font-bold text-center"
                          />
                          <span className="font-medium text-slate-700 dark:text-slate-300">{t('lc.sm.ro.per_24h')}</span>
                        </div>
                      )}
                    </div>
                  </label>

                  <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${penaltyMode === 'FLAT_AMOUNT' ? 'bg-indigo-50/80 border-indigo-300 dark:bg-indigo-950/30 dark:border-indigo-800' : 'bg-slate-50/50 border-slate-200 dark:bg-slate-900/40 dark:border-slate-800'}`}>
                    <input
                      type="radio"
                      name="penaltyMode"
                      checked={penaltyMode === 'FLAT_AMOUNT'}
                      onChange={() => setPenaltyMode('FLAT_AMOUNT')}
                      className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="w-full">
                      <p className="font-bold text-indigo-900 dark:text-indigo-300">{t('lc.sm.ro.flat')}</p>
                      <p className="text-[11px] text-indigo-700 dark:text-indigo-400 mb-2">{t('lc.sm.ro.flat_desc')}</p>
                      {penaltyMode === 'FLAT_AMOUNT' && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="font-medium text-slate-700 dark:text-slate-300">{t('lc.sm.ro.deduct_total')}</span>
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            value={flatPenaltyAmount.toString()}
                            onChange={(e) => setFlatPenaltyAmount(e.target.value === '' ? '' : Number(e.target.value))}
                            className="w-24 p-1.5 rounded-lg border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-950 font-bold text-center"
                          />
                          <span className="font-medium text-slate-700 dark:text-slate-300">{t('lc.sm.ro.points_direct')}</span>
                        </div>
                      )}
                    </div>
                  </label>

                  <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${penaltyMode === 'SCORE_CAP' ? 'bg-purple-50/80 border-purple-300 dark:bg-purple-950/30 dark:border-purple-800' : 'bg-slate-50/50 border-slate-200 dark:bg-slate-900/40 dark:border-slate-800'}`}>
                    <input
                      type="radio"
                      name="penaltyMode"
                      checked={penaltyMode === 'SCORE_CAP'}
                      onChange={() => setPenaltyMode('SCORE_CAP')}
                      className="mt-0.5 text-purple-600 focus:ring-purple-500"
                    />
                    <div className="w-full">
                      <p className="font-bold text-purple-900 dark:text-purple-300">{t('lc.sm.ro.cap')}</p>
                      <p className="text-[11px] text-purple-700 dark:text-purple-400 mb-2">{t('lc.sm.ro.cap_desc')}</p>
                      {penaltyMode === 'SCORE_CAP' && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="font-medium text-slate-700 dark:text-slate-300">{t('lc.sm.ro.max_reach')}</span>
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            max="10"
                            value={scoreCap.toString()}
                            onChange={(e) => setScoreCap(e.target.value === '' ? '' : Number(e.target.value))}
                            className="w-24 p-1.5 rounded-lg border border-purple-300 dark:border-purple-700 bg-white dark:bg-slate-950 font-bold text-center"
                          />
                          <span className="font-medium text-slate-700 dark:text-slate-300">{t('lc.sm.ro.out_of_10')}</span>
                        </div>
                      )}
                    </div>
                  </label>

                  <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${penaltyMode === 'SYSTEM_DEFAULT' ? 'bg-rose-50/80 border-rose-300 dark:bg-rose-950/30 dark:border-rose-800' : 'bg-slate-50/50 border-slate-200 dark:bg-slate-900/40 dark:border-slate-800'}`}>
                    <input
                      type="radio"
                      name="penaltyMode"
                      checked={penaltyMode === 'SYSTEM_DEFAULT'}
                      onChange={() => setPenaltyMode('SYSTEM_DEFAULT')}
                      className="mt-0.5 text-rose-600 focus:ring-rose-500"
                    />
                    <div>
                      <p className="font-bold text-rose-900 dark:text-rose-300">{t('lc.sm.ro.system')}</p>
                      <p className="text-[11px] text-rose-700 dark:text-rose-400">{t('lc.sm.ro.system_desc')}</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Reason textarea */}
              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                  {t('lc.sm.ro.reason_label')}
                </label>
                <textarea
                  value={reopenReason}
                  onChange={(e) => setReopenReason(e.target.value)}
                  placeholder={t('lc.sm.ro.reason_placeholder')}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-brand-500 outline-none text-xs font-medium"
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 flex justify-between bg-slate-50/50 dark:bg-slate-900/40">
              <Button variant="outline" size="sm" onClick={() => setReopenTarget(null)} className="rounded-xl border-slate-200 text-xs">
                {t('lc.sm.ro.cancel')}
              </Button>
              <Button
                size="sm"
                onClick={handleReopen}
                disabled={isReopening || !extendedDate}
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs rounded-xl font-bold gap-1.5"
              >
                <RotateCcw size={14} />
                {isReopening ? t('lc.sm.ro.opening') : t('lc.sm.ro.confirm')}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

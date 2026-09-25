import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api, gradingApi, type ClassRow, type AssignmentRow, type SubmissionRow } from '@/lib/api'
import { formatSemesterCode } from '@/utils/semester'
import { ArrowLeft, Megaphone, Users, GraduationCap, LayoutGrid, Send, Trash2, Clock, Pencil, Download } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { DataTable } from '@/components/ui/DataTable'
import { useAssignmentListener } from '@/lib/events'
import * as XLSX from 'xlsx'

export function LecturerClassDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const [cls, setCls] = useState<ClassRow | null>(null)
  const [students, setStudents] = useState<any[]>([])
  const [assignments, setAssignments] = useState<AssignmentRow[]>([])
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [isPosting, setIsPosting] = useState(false)
  
  // Edit announcement state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [isSavingEdit, setIsSavingEdit] = useState(false)

  // Delete confirmation modal state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('stream')

  // Stream Tab Form
  const [announcement, setAnnouncement] = useState('')

  const loadData = useCallback(async () => {
    if (!id) return
    try {
      const classesData = await api.getClasses()
      const foundClass = classesData?.find(c => c.id === id)
      setCls(foundClass || null)

      const [studentsData, assignmentsData, announcementsData] = await Promise.all([
        api.getClassStudents(id),
        api.getAssignments({ classId: id }),
        api.getClassAnnouncements(id).catch((err) => { console.error('[LecturerClassDetail] Failed to load announcements:', err); return [] as any[] })
      ])

      const assignmentList = (assignmentsData || []).filter((a: any) => {
        const isDel = Boolean(a.isDeleted || a.IsDeleted)
        const statusLower = String(a.status || a.Status || '').toLowerCase()
        return !isDel && statusLower !== 'deleted'
      })
      setAssignments(assignmentList)
      setAnnouncements(Array.isArray(announcementsData) ? announcementsData : [])

      const submissionLists = await Promise.all(
        assignmentList.map(async a => {
          try {
            const list = await api.getSubmissions({ assignmentId: a.id });
            if (list && list.length > 0) return list;
            const history = await gradingApi.getHistory(a.id);
            return (history?.history || []) as any[];
          } catch {
            return [];
          }
        })
      )

      const byAssignment: Record<string, SubmissionRow[]> = {}
      assignmentList.forEach((a, i) => { byAssignment[a.id] = submissionLists[i] || [] })

      const scoreFor = (st: any, assignmentId: string) => {
        const subs = byAssignment[assignmentId] || []
        const found = subs.find((sub: any) => {
          if (!sub) return false
          const subStudentId = sub.studentId || sub.student?.id || sub.userId
          const subStudentCode = sub.studentCode || sub.student?.studentCode || sub.student?.code
          const subStudentName = sub.studentName || sub.student?.name || sub.student?.fullName || sub.student

          const stId = st.id || st.studentId
          const stCode = st.studentId || st.studentCode || st.code
          const stName = st.name || st.fullName

          return (
            (subStudentId && (subStudentId === stId || subStudentId === stCode)) ||
            (subStudentCode && (subStudentCode === stCode || subStudentCode === stId)) ||
            (subStudentName && stName && typeof subStudentName === 'string' && typeof stName === 'string' && subStudentName.trim().toLowerCase() === stName.trim().toLowerCase())
          )
        })

        if (!found) return undefined

        const raw =
          found.score ??
          found.finalScore ??
          found.totalScore ??
          found.aiScore ??
          (found as any).rawScore ??
          (found as any).rawTotalScore ??
          (found as any).rawAiScore ??
          (found as any).rawFinalScore

        if (raw === null || raw === undefined || raw === '') return undefined
        const parsed = Number(raw)
        return isNaN(parsed) ? undefined : parsed
      }

      setStudents((studentsData || []).map((s: any) => ({
        ...s,
        scores: Object.fromEntries(
          assignmentList.map(a => [a.id, scoreFor(s, a.id)])
        ) as Record<string, number | undefined>,
      })))
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [id])

  useAssignmentListener(loadData)

  useEffect(() => {
    loadData()
    const handleFocus = () => loadData()
    window.addEventListener('focus', handleFocus)
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        loadData()
      }
    }, 15000)

    return () => {
      window.removeEventListener('focus', handleFocus)
      clearInterval(interval)
    }
  }, [loadData])

  // Realtime SSE Connection for Lecturer Screen
  useEffect(() => {
    if (!id) return

    const apiUrl = import.meta.env.VITE_API_URL || '/api'
    const sseUrl = `${apiUrl}/classes/${id}/announcements/stream`
    let es: EventSource | null = null

    try {
      es = new EventSource(sseUrl, { withCredentials: true })

      es.onmessage = (event) => {
        try {
          if (!event.data || event.data.startsWith(':')) return
          const payload = JSON.parse(event.data)
          
          if (payload.type === 'NEW_ANNOUNCEMENT' && payload.data) {
            setAnnouncements(prev => {
              if (prev.some(a => a.id === payload.data.id)) return prev
              return [payload.data, ...prev]
            })
          } else if (payload.type === 'UPDATE_ANNOUNCEMENT' && payload.data) {
            setAnnouncements(prev => prev.map(a => a.id === payload.data.id ? { ...a, content: payload.data.content, title: payload.data.title } : a))
          } else if (payload.type === 'DELETE_ANNOUNCEMENT' && payload.data) {
            setAnnouncements(prev => prev.filter(a => a.id !== payload.data.announcementId))
          }
        } catch (e) {
          // ignore keepalive
        }
      }
    } catch (err) {
      console.warn('SSE not connected on lecturer detail', err)
    }

    return () => {
      if (es) es.close()
    }
  }, [id])

  const handleExportExcel = () => {
    if (!students || students.length === 0) return

    const headers = [
      'STT',
      'Mã sinh viên',
      'Họ và tên',
      'Email',
      ...assignments.map(a => {
        const displayTitle = a.title ? a.title.replace(/^[A-Z0-9]{3,8}\s*-\s*/i, '') : 'Assignment'
        const pts = a.maxScore ? ` (${a.maxScore} pts)` : ''
        return `${displayTitle}${pts}`
      }),
      t('lc.cd.col.average') || 'Average'
    ]

    const rows = students.map((st: any, idx: number) => {
      const studentCode = st.studentId || st.code || st.studentCode || ''
      const studentName = st.name || st.fullName || ''
      const studentEmail = st.email || ''

      const marks = assignments.map(a => {
        const score = st.scores?.[a.id]
        if (score === undefined || score === null) return ''
        return Number(score)
      })

      const validMarks = marks.filter((v): v is number => typeof v === 'number' && !isNaN(v))
      const avg = validMarks.length > 0
        ? Number((validMarks.reduce((s, v) => s + v, 0) / validMarks.length).toFixed(1))
        : ''

      return [
        idx + 1,
        studentCode,
        studentName,
        studentEmail,
        ...marks,
        avg
      ]
    })

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
    ws['!cols'] = [
      { wch: 6 },
      { wch: 15 },
      { wch: 25 },
      { wch: 30 },
      ...assignments.map(() => ({ wch: 35 })),
      { wch: 16 }
    ]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'BangDiem')

    const rawClassCode = cls?.code || (cls as any)?.classCode || 'Class'
    const cleanClassCode = rawClassCode.replace(/[^a-zA-Z0-9_-]/g, '_')
    const dateStr = new Date().toISOString().slice(0, 10)
    const fileName = `Bang_Diem_${cleanClassCode}_${dateStr}.xlsx`
    XLSX.writeFile(wb, fileName)
  }

  const handlePostAnnouncement = async () => {
    if (!announcement.trim() || !id || isPosting) return
    setIsPosting(true)
    try {
      // Lấy kết quả từ API, thêm vào list trực tiếp
      // Không để SSE thêm nữa vì SSE sẽ broadcast lại - dùng dedup key
      const newAnn = await api.postClassAnnouncement(id, announcement.trim())
      setAnnouncements(prev => {
        // Chỉ thêm nếu chưa có trong list (tránh duplicate với SSE)
        if (prev.some(a => a.id === newAnn.id)) return prev
        return [newAnn, ...prev]
      })
      setAnnouncement('')
    } catch (err: any) {
      console.error('Failed to post announcement:', err)
      alert(err.message || 'Lỗi khi đăng thông báo')
    } finally {
      setIsPosting(false)
    }
  }

  const handleStartEdit = (a: any) => {
    setEditingId(a.id)
    setEditContent(a.content)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditContent('')
  }

  const handleSaveEdit = async (announcementId: string) => {
    if (!editContent.trim() || !id || isSavingEdit) return
    setIsSavingEdit(true)
    try {
      await api.updateClassAnnouncement(id, announcementId, editContent.trim())
      setAnnouncements(prev => prev.map(a => a.id === announcementId ? { ...a, content: editContent.trim() } : a))
      setEditingId(null)
      setEditContent('')
    } catch (err: any) {
      console.error('Failed to update announcement:', err)
      alert(err.message || 'Lỗi khi cập nhật thông báo')
    } finally {
      setIsSavingEdit(false)
    }
  }

  const handleDeleteAnnouncement = (announcementId: string) => {
    setConfirmDeleteId(announcementId)
  }

  const handleConfirmDelete = async () => {
    if (!id || !confirmDeleteId || isDeleting) return
    const announcementId = confirmDeleteId
    setIsDeleting(true)
    try {
      await api.deleteClassAnnouncement(id, announcementId)
      setAnnouncements(prev => prev.filter(a => a.id !== announcementId))
      setConfirmDeleteId(null)
    } catch (err: any) {
      console.error('Failed to delete announcement:', err)
      alert(err.message || 'Lỗi khi xoá thông báo')
    } finally {
      setIsDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
          <p className="mt-4 text-brand-600 font-bold">{t('lc.cd.loading')}</p>
        </div>
      </div>
    )
  }

  if (!cls) return <div className="p-12 text-center text-red-500 font-bold">{t('lc.cd.not_found')}</div>

  const tabItems = [
    { id: 'stream', label: t('lc.cd.tab.stream'), icon: <Megaphone size={16} /> },
    { id: 'people', label: t('lc.cd.tab.people'), icon: <Users size={16} /> },
    { id: 'grades', label: t('lc.cd.tab.grades'), icon: <GraduationCap size={16} /> },
  ]

  return (
    <>
    <div className="animate-in fade-in duration-500 min-h-screen pb-20">
      
      {/* Simple Header (Class Header) */}
      <div className="w-full bg-white dark:bg-[#151821] border-b border-slate-200 dark:border-slate-800 p-6 sm:px-10 py-8 mb-6">
        <div className="mb-4">
          <Button variant="outline" size="sm" onClick={() => navigate('/lecturer/classes')} className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700">
            <ArrowLeft size={16} className="mr-2" /> {t('lc.cd.back')}
          </Button>
        </div>
        
        <div className="w-full flex justify-between items-end">
          <div>
            <div className="inline-flex items-center rounded-md bg-brand-50 dark:bg-brand-900/30 px-2 py-1 mb-2">
              <span className="text-xs font-bold text-brand-700 dark:text-brand-400">{formatSemesterCode((cls.semester as any)?.code, t('lc.semester_word')) || t('lc.cd.semester_fallback')}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">
              {t('lc.cd.class_title', { code: cls.code })}
            </h1>
            <p className="mt-1 text-slate-500 dark:text-slate-400">
              {t('lc.cd.subject_line', { code: (cls.subject as any)?.code || t('lc.cd.unknown') })}
            </p>
          </div>
          
          <div className="hidden md:flex bg-slate-50 dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 flex-col items-center">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">{students.length}</span>
            <span className="text-xs font-medium text-slate-500">{t('lc.cd.students')}</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-20">
        
        {/* Navigation Tabs */}
        <div className="bg-white dark:bg-[#151821] rounded-t-2xl rounded-b-xl shadow-[0_4px_20px_-5px_rgba(0,0,0,0.1)] border border-slate-200/50 dark:border-slate-800 p-2 mb-8 flex overflow-x-auto custom-scrollbar">
          {tabItems.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap
                ${activeTab === tab.id 
                  ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400 shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
                }
              `}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content Area */}
        <div className="mt-6">
          
          {/* STREAM TAB */}
          {activeTab === 'stream' && (
            <div className="grid md:grid-cols-4 gap-6">
              <div className="md:col-span-1 space-y-6">
                <Card className="p-5 border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-[#151821]">
                  <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
                    <LayoutGrid size={18} className="text-brand-600" /> {t('lc.cd.due_soon')}
                  </h3>
                  <div className="space-y-3">
                    {assignments.slice(0, 2).map(a => (
                      <div key={a.id} className="text-sm">
                        <p className="font-medium text-slate-800 dark:text-slate-300 hover:text-brand-600 cursor-pointer line-clamp-1">{a.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{a.due ? new Date(a.due).toLocaleDateString() : t('lc.cd.no_due_date')}</p>
                      </div>
                    ))}
                    {assignments.length === 0 && <p className="text-sm text-slate-500 italic">{t('lc.cd.nothing_due')}</p>}
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <button onClick={() => navigate('/lecturer/grading/assignments')} className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline">
                      {t('lc.cd.view_all_assignments')}
                    </button>
                  </div>
                </Card>
              </div>
              
              <div className="md:col-span-3 space-y-6">
                <Card className="p-6 border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-[#151821] hover:shadow-md transition-all">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900/50 flex items-center justify-center text-brand-700 dark:text-brand-400 font-bold shrink-0">
                      {t('lc.cd.lecturer_initials')}
                    </div>
                    <div className="flex-1 space-y-3">
                      <textarea 
                        placeholder={t('lc.cd.announce_placeholder')}
                        className="w-full min-h-[60px] p-3 text-sm bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none transition-all"
                        value={announcement}
                        onChange={(e) => setAnnouncement(e.target.value)}
                      />
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => setAnnouncement('')} className="border-slate-200">{t('lc.cd.cancel')}</Button>
                        <Button size="sm" className="bg-brand-600 hover:bg-brand-700 text-white" onClick={handlePostAnnouncement} disabled={!announcement.trim()}>
                          <Send size={14} className="mr-2" /> {t('lc.cd.post')}
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Announcements Feed */}
                {announcements.length === 0 ? (
                  <div className="p-12 text-center bg-white dark:bg-[#151821] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
                    <Megaphone className="mx-auto mb-3 text-slate-300 dark:text-slate-600 animate-bounce" size={36} />
                    <p className="font-bold text-slate-700 dark:text-slate-200 text-base">{t('lc.cd.stream_title')}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-md mx-auto">{t('lc.cd.stream_desc')}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {announcements.map((a) => (
                      <Card key={a.id} className="p-6 border-slate-200/90 dark:border-slate-800 shadow-sm bg-white dark:bg-[#151821] hover:shadow-md transition-all rounded-2xl">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-brand-500 flex items-center justify-center text-white font-bold text-base shadow-sm shrink-0">
                              {a.lecturer?.avatar ? (
                                <img
                                  src={a.lecturer.avatar}
                                  alt={a.lecturer.name || 'Giảng viên'}
                                  className="absolute inset-0 w-full h-full object-cover z-10"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                    const fallback = (e.target as HTMLElement).nextElementSibling as HTMLElement;
                                    if (fallback) fallback.style.display = 'block';
                                  }}
                                />
                              ) : null}
                              <span
                                style={{ display: a.lecturer?.avatar ? 'none' : 'block' }}
                                className="select-none font-bold text-white text-base"
                              >
                                {((a.lecturer?.name || 'GV').trim().split(/\s+/).pop()?.[0] || 'G').toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                                  {a.lecturer?.name || 'Giảng viên'}
                                </h4>
                                <span className="text-[11px] font-semibold bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 px-2 py-0.5 rounded-md border border-brand-200/60 dark:border-brand-800/40">
                                  Giảng viên
                                </span>
                              </div>
                              <div className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                                <Clock size={12} />
                                <span>{a.createdAt ? new Date(a.createdAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Vừa xong'}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleStartEdit(a)}
                              className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/30 rounded-lg transition-colors"
                              title="Chỉnh sửa thông báo"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              onClick={() => handleDeleteAnnouncement(a.id)}
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                              title="Xoá thông báo"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>

                        {editingId === a.id ? (
                          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/60 space-y-3">
                            <textarea
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              className="w-full min-h-[75px] p-3 text-sm bg-slate-50 dark:bg-slate-900 rounded-xl border border-brand-300 dark:border-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none transition-all"
                              placeholder="Nội dung thông báo..."
                              autoFocus
                            />
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="outline" onClick={handleCancelEdit} disabled={isSavingEdit}>
                                Huỷ
                              </Button>
                              <Button size="sm" className="bg-brand-600 hover:bg-brand-700 text-white" onClick={() => handleSaveEdit(a.id)} disabled={!editContent.trim() || isSavingEdit}>
                                {isSavingEdit ? 'Đang lưu...' : 'Lưu thay đổi'}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60">
                            <p className="text-slate-800 dark:text-slate-200 text-sm whitespace-pre-wrap leading-relaxed">
                              {a.content}
                            </p>
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PEOPLE TAB */}
          {activeTab === 'people' && (
            <Card className="bg-white dark:bg-[#151821] overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl">
              <div className="p-6 border-b border-brand-200 dark:border-slate-700 bg-brand-50/50 dark:bg-slate-900/50 flex justify-between items-center">
                <h2 className="text-2xl font-black text-brand-800 dark:text-brand-400">{t('lc.cd.students')}</h2>
                <span className="font-bold text-brand-600 dark:text-brand-300 bg-brand-100 dark:bg-brand-900/50 px-3 py-1 rounded-full">{t('lc.cd.students_count', { n: students.length })}</span>
              </div>
              <div className="p-2">
                <DataTable
                  columns={[
                    {
                      key: 'photo',
                      header: t('lc.cd.col.photo'),
                      render: (r: any) => {
                        const parts = (r.name || '').trim().split(/\s+/)
                        const initials = parts.length === 1 
                          ? parts[0].slice(0, 2).toUpperCase() 
                          : ((parts[0]?.[0] || '') + (parts[parts.length - 1]?.[0] || '')).toUpperCase()
                        return (
                          <div className="py-2 flex items-center justify-center">
                            <div className="relative w-[111px] h-[146px] rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm shrink-0 bg-[#4f46e5] flex items-center justify-center">
                              {r.avatar ? (
                                <img 
                                  src={r.avatar} 
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
                                style={{ display: r.avatar ? 'none' : 'block' }}
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
                      header: t('lc.cd.col.full_name'),
                      render: (r: any) => (
                        <span className="font-bold text-slate-900 dark:text-white text-base">{r.name}</span>
                      ) 
                    },
                    { key: 'studentId', header: t('lc.cd.col.student_id'), render: (r: any) => <span className="font-mono text-xs font-bold bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">{r.studentId || 'N/A'}</span> },
                    { key: 'email', header: t('lc.cd.col.email'), render: (r: any) => <span className="text-slate-600 dark:text-slate-400 font-mono text-sm">{r.email}</span> },
                  ]}
                  data={students}
                  keyExtractor={(r: any) => r.studentId || r.email}
                />
              </div>
            </Card>
          )}

          {/* GRADEBOOK TAB */}
          {activeTab === 'grades' && (
            <Card className="bg-white dark:bg-[#151821] overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl">
              <div className="p-6 border-b border-brand-200 dark:border-slate-700 bg-brand-50/50 dark:bg-slate-900/50 flex justify-between items-center">
                <h2 className="text-2xl font-black text-brand-800 dark:text-brand-400 flex items-center gap-2">
                  <GraduationCap size={24} /> {t('lc.cd.gradebook')}
                </h2>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleExportExcel}
                  className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 cursor-pointer"
                >
                  <Download size={16} />
                  {t('lc.cd.export_excel')}
                </Button>
              </div>
              <div className="p-2 overflow-x-auto">
                {/* Columns come from the class's real assignments. The old fixed
                    A1/A2/PE/FE columns did not correspond to anything in the data. */}
                <DataTable
                  columns={[
                    {
                      key: 'name',
                      header: t('lc.cd.col.student'),
                      render: (r: any) => (
                        <div className="flex flex-col py-1">
                          <span className="font-bold text-slate-900 dark:text-white whitespace-nowrap">{r.name}</span>
                          <span className="text-xs font-mono text-slate-400 font-medium">{r.studentId || r.code || r.studentCode || ''}</span>
                        </div>
                      )
                    },
                    ...assignments.map(a => {
                      const displayTitle = a.title ? a.title.replace(/^[A-Z0-9]{3,8}\s*-\s*/i, '') : 'Assignment';
                      const typeName = a.type ? (a.type.charAt(0).toUpperCase() + a.type.slice(1)) : 'Assignment';

                      return {
                        key: a.id,
                        header: (
                          <div className="flex flex-col gap-1 py-1 min-w-[180px]">
                            <div className="flex items-center gap-1.5">
                              <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase rounded bg-brand-100 dark:bg-brand-900/50 text-brand-700 dark:text-brand-300 tracking-wider">
                                {typeName}
                              </span>
                              {a.maxScore ? (
                                <span className="text-[11px] font-bold text-slate-400">
                                  ({a.maxScore} pts)
                                </span>
                              ) : null}
                            </div>
                            <span className="font-bold text-xs text-slate-800 dark:text-slate-200 line-clamp-2 leading-snug" title={displayTitle}>
                              {displayTitle}
                            </span>
                          </div>
                        ),
                        render: (r: any) => {
                          const score = r.scores?.[a.id];
                          if (score === undefined || score === null) {
                            return (
                              <span className="font-mono text-xs font-semibold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800/60 px-2.5 py-1 rounded-md">
                                —
                              </span>
                            );
                          }

                          const numScore = Number(score);
                          const isHigh = numScore >= 8;
                          const isPass = numScore >= 5;

                          return (
                            <span
                              className={`font-mono text-sm font-bold px-2.5 py-1 rounded-md border ${
                                isHigh
                                  ? 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50'
                                  : isPass
                                  ? 'text-blue-700 bg-blue-50 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/50'
                                  : 'text-rose-700 bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/50'
                              }`}
                            >
                              {numScore.toLocaleString('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                            </span>
                          );
                        },
                      };
                    }),
                    {
                      key: 'total',
                      header: t('lc.cd.col.average'),
                      render: (r: any) => {
                        const marks = assignments
                          .map(a => r.scores?.[a.id])
                          .filter((v): v is number => typeof v === 'number' && !isNaN(v));
                        const avg = marks.length > 0
                          ? (marks.reduce((s, v) => s + v, 0) / marks.length).toFixed(1)
                          : '—';
                        return <span className="font-mono text-base font-black text-brand-700 dark:text-brand-400">{avg}</span>;
                      }
                    },
                  ]}
                  data={students}
                  keyExtractor={(r: any) => r.studentId || r.id || r.email}
                />
              </div>
            </Card>
          )}

        </div>
      </div>
    </div>

      {/* Custom Delete Confirmation Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setConfirmDeleteId(null)}
          />
          {/* Modal */}
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/40 flex items-center justify-center">
                <Trash2 size={18} className="text-red-500" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Xoá thông báo</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Hành động này không thể hoàn tác</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">
              Bạn có chắc muốn xoá thông báo này không?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmDeleteId(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors disabled:opacity-50"
              >
                Huỷ
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {isDeleting ? 'Đang xoá...' : 'Xoá'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

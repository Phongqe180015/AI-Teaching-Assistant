import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { api } from '@/lib/api'
import { 
  BookOpen, 
  Users, 
  ArrowLeft, 
  UserCheck, 
  Mail, 
  Loader2, 
  GraduationCap,
  LayoutGrid,
  List,
  Megaphone,
  Clock,
  Radio,
  Sparkles
} from 'lucide-react'
import classNames from 'classnames'
import { useTranslation } from 'react-i18next'

type Student = {
  id: string
  studentCode: string
  fullName: string
  email: string
  avatar: string | null
  joinedAt: string | null
}

type Lecturer = {
  id: string
  name: string
  email: string
  avatar?: string | null
}

type Announcement = {
  id: string
  title: string
  content: string
  createdAt: string
  lecturer?: {
    id: string
    name: string
    email: string
    avatar?: string | null
  }
}

type ClassDetailData = {
  id: string
  classCode: string
  subject: { id: string; code: string; name: string } | null
  lecturers: Lecturer[]
  students: Student[]
  announcements?: Announcement[]
}

export function StudentClassDetail() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<ClassDetailData | null>(null)
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [activeTab, setActiveTab] = useState<'stream' | 'students'>('stream')
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')
  const [newAnnouncementAlert, setNewAnnouncementAlert] = useState<string | null>(null)

  const sseRef = useRef<EventSource | null>(null)

  const fetchClassDetail = useCallback(async (isBackground = false) => {
    if (!id) return
    try {
      if (!isBackground) setLoading(true)
      const [res, annList] = await Promise.all([
        api.getStudentClassDetail(id),
        api.getClassAnnouncements(id).catch(() => [])
      ])
      
      let classData: ClassDetailData | null = null
      if (res && res.data) {
        classData = res.data
      } else if (res && (res as any).classCode) {
        classData = res as any
      }

      if (classData) {
        setData(classData)
        // Merge announcements from direct endpoint or class payload
        const mergedAnn = (annList && annList.length > 0) ? annList : (classData.announcements || [])
        setAnnouncements(mergedAnn)
      }
    } catch (err) {
      console.error('Failed to load class detail:', err)
    } finally {
      if (!isBackground) setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchClassDetail()
  }, [fetchClassDetail])

  // Realtime SSE Connection for Free Live Announcements
  useEffect(() => {
    if (!id) return

    const apiUrl = import.meta.env.VITE_API_URL || '/api'
    const sseUrl = `${apiUrl}/classes/${id}/announcements/stream`

    try {
      const es = new EventSource(sseUrl, { withCredentials: true })
      sseRef.current = es

      es.onmessage = (event) => {
        try {
          if (!event.data || event.data.startsWith(':')) return
          const payload = JSON.parse(event.data)
          
          if (payload.type === 'NEW_ANNOUNCEMENT' && payload.data) {
            setAnnouncements(prev => {
              // Avoid duplicates
              if (prev.some(a => a.id === payload.data.id)) return prev
              return [payload.data, ...prev]
            })
            // Pop floating realtime alert
            setNewAnnouncementAlert(payload.data.title || 'Giảng viên vừa đăng thông báo mới!')
            setTimeout(() => setNewAnnouncementAlert(null), 6000)
          } else if (payload.type === 'UPDATE_ANNOUNCEMENT' && payload.data) {
            setAnnouncements(prev => prev.map(a => a.id === payload.data.id ? { ...a, content: payload.data.content, title: payload.data.title } : a))
          } else if (payload.type === 'DELETE_ANNOUNCEMENT' && payload.data) {
            setAnnouncements(prev => prev.filter(a => a.id !== payload.data.announcementId))
          }
        } catch (e) {
          // ignore keepalive / json parse
        }
      }

      es.onerror = () => {
        // EventSource will automatically retry in modern browsers
      }
    } catch (err) {
      console.warn('SSE not supported or failed to initialize, relying on smart polling', err)
    }

    // Smart background polling fallback every 8 seconds
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        api.getClassAnnouncements(id)
          .then(list => {
            if (Array.isArray(list)) {
              setAnnouncements(prev => {
                if (JSON.stringify(prev) !== JSON.stringify(list)) {
                  return list
                }
                return prev
              })
            }
          })
          .catch(() => {})
      }
    }, 8000)

    return () => {
      clearInterval(interval)
      if (sseRef.current) {
        sseRef.current.close()
        sseRef.current = null
      }
    }
  }, [id])

  // Filter students
  const filteredStudents = data?.students || []

  const getAvatarUrl = (avatar: string | null, name: string) => {
    if (avatar) {
      if (avatar.startsWith('http://') || avatar.startsWith('https://')) return avatar
      return `${window.location.origin}${avatar.startsWith('/') ? '' : '/'}${avatar}`
    }
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'Student')}&background=4f46e5&color=fff&bold=true`
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-brand-600 dark:text-brand-400" />
        <p className="text-slate-500 dark:text-slate-400 font-medium">{t('st.class.loading')}</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center">
        <div className="bg-white dark:bg-[#151821] rounded-2xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm">
          <GraduationCap className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{t('st.class.not_found')}</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6">This class does not exist, or you have not been assigned to it.</p>
          <button
            onClick={() => navigate('/student/classes')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to class list
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Realtime Pop-up Toast Alert */}
      {newAnnouncementAlert && (
        <div className="fixed top-6 right-6 z-50 animate-in fade-in slide-in-from-top-4 duration-300 flex items-center gap-3 bg-gradient-to-r from-brand-600 to-indigo-600 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-white/20">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center animate-pulse">
            <Megaphone className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-brand-200">Thông báo mới</p>
            <p className="text-sm font-semibold">{newAnnouncementAlert}</p>
          </div>
        </div>
      )}

      {/* Top Header Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/student/classes')}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400 mb-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Class list
          </button>
          <PageHeader
            title={data.subject?.name || data.classCode || t('st.class.details')}
            description={`Class code: ${data.classCode || 'N/A'} • ${data.subject?.code || ''}`}
          />
        </div>
      </div>

      {/* Hero Overview Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 via-brand-700 to-indigo-800 text-white p-6 sm:p-8 shadow-lg">
        <div className="absolute right-0 top-0 -mr-12 -mt-12 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="relative z-10 grid md:grid-cols-3 gap-6 items-center">
          <div className="md:col-span-2 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold tracking-wide">
              <BookOpen className="w-3.5 h-3.5" />
              <span>{data.subject?.code || 'SUBJECT'}</span>
              <span className="opacity-60">•</span>
              <span>Class: {data.classCode}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {data.subject?.name || data.classCode}
            </h1>

            {/* Lecturers */}
            {data.lecturers && data.lecturers.length > 0 && (
              <div className="flex items-center gap-3 pt-2 text-sm text-brand-100">
                <span className="font-semibold text-white/80">Lecturers:</span>
                <div className="flex items-center gap-2 flex-wrap">
                  {data.lecturers.map(lecturer => (
                    <div key={lecturer.id} className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-lg backdrop-blur-sm">
                      <img
                        src={getAvatarUrl(lecturer.avatar || null, lecturer.name)}
                        alt={lecturer.name}
                        className="w-5 h-5 rounded-full object-cover border border-white/30"
                        onError={(e) => {
                          ;(e.target as HTMLElement).setAttribute('src', `https://ui-avatars.com/api/?name=${encodeURIComponent(lecturer.name)}&background=ffffff&color=4f46e5`)
                        }}
                      />
                      <span className="font-medium text-white">{lecturer.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Class size */}
          <div className="flex justify-end border-t md:border-t-0 md:border-l border-white/20 pt-4 md:pt-0 md:pl-6">
            <div className="w-full bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/10 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-white/15">
                <Users className="w-6 h-6 text-brand-200" />
              </div>
              <div>
                <p className="text-xs text-brand-200 font-semibold uppercase tracking-wider">{t('st.class.total_students')}</p>
                <p className="text-2xl font-black">{data.students?.length || 0} Students</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* NAVIGATION TABS: STREAM vs STUDENTS */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('stream')}
            className={classNames(
              'flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all relative',
              activeTab === 'stream'
                ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-400 shadow-2xs border border-brand-200/80 dark:border-brand-800/60'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
            )}
          >
            <Megaphone size={16} />
            <span>Bảng tin thông báo</span>
            {announcements.length > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-extrabold bg-brand-600 text-white">
                {announcements.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('students')}
            className={classNames(
              'flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all relative',
              activeTab === 'students'
                ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-400 shadow-2xs border border-brand-200/80 dark:border-brand-800/60'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
            )}
          >
            <Users size={16} />
            <span>Danh sách thành viên</span>
            <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
              {filteredStudents.length}
            </span>
          </button>
        </div>

        {/* Realtime Live Indicator */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-xs font-semibold border border-emerald-200/80 dark:border-emerald-800/40">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <Radio size={12} />
          <span>Realtime Live</span>
        </div>
      </div>

      {/* TAB 1: STREAM / ANNOUNCEMENTS FEED */}
      {activeTab === 'stream' && (
        <div className="space-y-4 animate-in fade-in duration-300">
          {announcements.length === 0 ? (
            <div className="bg-white dark:bg-[#151821] rounded-2xl p-12 border border-slate-200 dark:border-slate-800 text-center shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-brand-50 dark:bg-brand-950/50 flex items-center justify-center text-brand-500 dark:text-brand-400 mx-auto mb-4 border border-brand-100 dark:border-brand-900">
                <Megaphone size={28} />
              </div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">
                Chưa có thông báo nào từ giảng viên
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 max-w-md mx-auto">
                Khi giảng viên đăng thông báo cho lớp <strong className="text-slate-700 dark:text-slate-300">{data.classCode}</strong>, nội dung sẽ lập tức hiển thị tại đây theo thời gian thực.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {announcements.map((a, idx) => (
                <div
                  key={a.id || idx}
                  className="bg-white dark:bg-[#151821] p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-md transition-all space-y-3"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-brand-600 flex items-center justify-center text-white font-bold text-base shadow-sm shrink-0">
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
                            {a.lecturer?.name || 'Giảng viên phụ trách'}
                          </h4>
                          <span className="text-[11px] font-semibold bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 px-2 py-0.5 rounded-md border border-brand-200/60 dark:border-brand-800/40">
                            Giảng viên
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                          <Clock size={12} />
                          <span>
                            {a.createdAt ? new Date(a.createdAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Vừa xong'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-brand-600 dark:text-brand-400 font-semibold bg-brand-50/70 dark:bg-brand-950/40 px-2.5 py-1 rounded-lg border border-brand-200/50 dark:border-brand-800/30">
                      <Sparkles size={13} />
                      <span>Thông báo lớp</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60">
                    <p className="text-slate-800 dark:text-slate-200 text-sm whitespace-pre-wrap leading-relaxed">
                      {a.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: STUDENTS LIST */}
      {activeTab === 'students' && (
        <div className="space-y-4 animate-in fade-in duration-300">
          {/* Title & Controls Bar: Search & View Mode Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#151821] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-brand-600 dark:text-brand-400" />
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Students in this class ({filteredStudents.length})
              </h3>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg shrink-0">
                <button
                  onClick={() => setViewMode('table')}
                  className={classNames(
                    'p-1.5 rounded-md text-xs font-medium transition-colors',
                    viewMode === 'table' ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                  )}
                  title={t('st.class.table_view')}
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={classNames(
                    'p-1.5 rounded-md text-xs font-medium transition-colors',
                    viewMode === 'grid' ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                  )}
                  title={t('st.class.card_view')}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Students List View */}
          {filteredStudents.length === 0 ? (
            <div className="bg-white dark:bg-[#151821] rounded-2xl p-8 border border-slate-200 dark:border-slate-800 text-center py-12">
              <UserCheck className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-slate-700 dark:text-slate-300 font-semibold">{t('st.class.no_match')}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Try adjusting your search, or check the name / student ID again.</p>
            </div>
          ) : viewMode === 'table' ? (
            /* TABLE VIEW */
            <div className="bg-white dark:bg-[#151821] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      <th className="py-3.5 px-4 w-12 text-center">STT</th>
                      <th className="py-3.5 px-4">{t('st.class.col_photo')}</th>
                      <th className="py-3.5 px-4">{t('st.class.col_name')}</th>
                      <th className="py-3.5 px-4">{t('st.class.col_id')}</th>
                      <th className="py-3.5 px-4">Email</th>
                      <th className="py-3.5 px-4 text-center">{t('st.class.col_status')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {filteredStudents.map((student, idx) => (
                      <tr 
                        key={student.id || idx}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-3.5 px-4 text-center text-slate-400 text-xs font-semibold">
                          {idx + 1}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="relative w-[111px] h-[146px] rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm shrink-0 bg-[#4f46e5] flex items-center justify-center">
                            {student.avatar ? (
                              <img
                                src={student.avatar}
                                alt={student.fullName}
                                className="w-full h-full object-cover relative z-10"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                  const fallback = (e.target as HTMLElement).nextElementSibling as HTMLElement;
                                  if (fallback) fallback.style.display = 'block';
                                }}
                              />
                            ) : null}
                            <span
                              style={{ display: student.avatar ? 'none' : 'block' }}
                              className="font-extrabold text-white text-3xl tracking-wider select-none"
                            >
                              {((student.fullName || 'ST').trim().split(/\s+/).pop()?.[0] || 'S').toUpperCase()}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-slate-900 dark:text-white">
                            {student.fullName}
                          </p>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
                            {student.studentCode}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 text-xs">
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            <span>{student.email || 'N/A'}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900">
                            <UserCheck className="w-3 h-3" /> Enrolled
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* CARD GRID VIEW */
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredStudents.map((student, idx) => (
                <div 
                  key={student.id || idx}
                  className="bg-white dark:bg-[#151821] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs hover:border-brand-300 dark:hover:border-brand-700 hover:shadow-md transition-all flex flex-col items-center text-center relative group"
                >
                  <img
                    src={getAvatarUrl(student.avatar, student.fullName)}
                    alt={student.fullName}
                    className="w-[111px] h-[146px] object-cover shadow-sm mb-3 group-hover:scale-105 transition-transform"
                    onError={(e) => {
                      ;(e.target as HTMLElement).setAttribute('src', `https://ui-avatars.com/api/?name=${encodeURIComponent(student.fullName || 'Student')}&background=4f46e5&color=fff&bold=true`)
                    }}
                  />
                  <h4 className="font-bold text-slate-900 dark:text-white line-clamp-1">
                    {student.fullName}
                  </h4>
                  <span className="inline-block my-2 px-2.5 py-0.5 rounded-md text-xs font-bold bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
                    MSSV: {student.studentCode}
                  </span>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate w-full flex items-center justify-center gap-1">
                    <Mail className="w-3 h-3 shrink-0" />
                    <span className="truncate">{student.email}</span>
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

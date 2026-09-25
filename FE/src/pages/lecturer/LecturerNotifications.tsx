import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { Bell, Check, Clock, MessageSquare, Loader2, ExternalLink, Trash2, ShieldAlert, User, GraduationCap } from 'lucide-react'
import { api } from '@/lib/api'
import { emitNotificationEvent, subscribeNotificationEvents } from '@/lib/notifications'

type Notification = {
  id: string
  title: string
  message: string
  type: string
  read: boolean
  createdAt: string
  referenceId?: string
  referenceType?: string
}

import { useTranslation } from 'react-i18next'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

export function LecturerNotifications() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'feedback' | 'system'>('all')
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false)
  const [deletingNotifId, setDeletingNotifId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const loadData = useCallback((showLoading = true) => {
    if (showLoading) setLoading(true)
    api.getNotifications(1, 50)
      .then(res => {
        const raw = Array.isArray(res) ? res : (res?.data || [])
        const sorted = [...raw].sort((a, b) => {
          const timeA = new Date(a.createdAt || a.CreatedAt || 0).getTime()
          const timeB = new Date(b.createdAt || b.CreatedAt || 0).getTime()
          return timeB - timeA
        })
        setNotifications(sorted)
      })
      .catch(err => console.error('Failed to load notifications:', err))
      .finally(() => { if (showLoading) setLoading(false) })
  }, [])

  useEffect(() => {
    loadData(true)
    const unsubscribe = subscribeNotificationEvents(() => loadData(false))
    return unsubscribe
  }, [loadData])

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    try {
      await api.markNotificationAsRead(id)
      emitNotificationEvent()
    } catch (err) {
      console.error(err)
    }
  }

  const handleConfirmDeleteOne = async () => {
    if (!deletingNotifId) return
    const id = deletingNotifId
    setIsDeleting(true)
    setNotifications(prev => prev.filter(n => n.id !== id))
    try {
      await api.deleteNotification(id)
      emitNotificationEvent()
    } catch (err) {
      console.error(err)
    } finally {
      setIsDeleting(false)
      setDeletingNotifId(null)
    }
  }

  const handleConfirmDeleteAll = async () => {
    setIsDeleting(true)
    setNotifications([])
    try {
      await api.deleteAllNotifications()
      emitNotificationEvent()
    } catch (err) {
      console.error(err)
    } finally {
      setIsDeleting(false)
      setShowDeleteAllModal(false)
    }
  }

  const handleNotificationClick = async (n: any) => {
    if (!n.read) {
      setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, read: true } : item))
      api.markNotificationAsRead(n.id).catch(console.error)
      emitNotificationEvent()
    }
    const targetId = n.referenceId || n.ReferenceId
    const targetType = (n.referenceType || n.ReferenceType || n.type || '').toUpperCase()
    const nType = (n.type || '').toUpperCase()
    const title = (n.title || n.Title || '').toLowerCase()
    const message = (n.message || n.Message || '').toLowerCase()

    if (targetId) {
      if (
        title.includes('nộp lại') ||
        title.includes('resubmit') ||
        nType === 'RESUBMISSION' ||
        targetType === 'RESUBMISSION' ||
        targetType === 'ASSIGNMENT_GRADING' ||
        message.includes('nộp lại')
      ) {
        navigate(`/lecturer/grading/assignments/${targetId}`)
      } else if (targetType === 'SUBMISSION' || n.type === 'FEEDBACK') {
        navigate(`/lecturer/grading/result/${targetId}`)
      } else {
        navigate(`/lecturer/grading/assignments/${targetId}`)
      }
    }
  }

  const handleMarkAllAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    try {
      await api.markAllNotificationsAsRead()
      emitNotificationEvent()
    } catch (e) {
      console.error(e)
    }
  }

  if (loading) return <div className="flex justify-center p-20"><Loader2 className="w-10 h-10 animate-spin text-brand-600" /></div>

  const unreadCount = notifications.filter(n => !n.read).length
  const feedbackCount = notifications.filter(n => n.type === 'FEEDBACK' || n.title.toLowerCase().includes('feedback') || n.title.toLowerCase().includes('inquiry') || n.title.toLowerCase().includes('phản hồi')).length
  const systemCount = notifications.filter(n => n.type === 'SYSTEM' || n.type === 'BROADCAST' || n.title.toLowerCase().includes('system') || n.title.toLowerCase().includes('admin') || n.title.toLowerCase().includes('hệ thống')).length

  const filteredNotifications = notifications.filter(n => {
    if (activeTab === 'unread') return !n.read
    if (activeTab === 'feedback') return n.type === 'FEEDBACK' || n.title.toLowerCase().includes('feedback') || n.title.toLowerCase().includes('inquiry') || n.title.toLowerCase().includes('phản hồi')
    if (activeTab === 'system') return n.type === 'SYSTEM' || n.type === 'BROADCAST' || n.title.toLowerCase().includes('system') || n.title.toLowerCase().includes('admin') || n.title.toLowerCase().includes('hệ thống')
    return true
  })

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Lecturer Notifications"
          description="View all notifications from Administrators and student grade inquiries"
          breadcrumbs={[{ label: 'Lecturer', path: '/lecturer' }, { label: 'Notifications' }]}
        />
        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-[#151821] border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm font-medium text-slate-700 dark:text-slate-200 shadow-sm cursor-pointer"
            >
              <Check size={16} className="text-brand-500" />
              Mark all as read
            </button>
          )}
          {notifications.length > 0 && (
            <button
              type="button"
              onClick={() => setShowDeleteAllModal(true)}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors text-sm font-medium text-red-600 dark:text-red-400 shadow-sm cursor-pointer"
            >
              <Trash2 size={16} />
              {t('notif.clear_all', 'Delete all')}
            </button>
          )}
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${activeTab === 'all'
              ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20'
              : 'bg-white dark:bg-[#151821] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
            }`}
        >
          All
          <span className={`px-2 py-0.5 text-xs rounded-full ${activeTab === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
            {notifications.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('unread')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${activeTab === 'unread'
              ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20'
              : 'bg-white dark:bg-[#151821] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
            }`}
        >
          Unread
          <span className={`px-2 py-0.5 text-xs rounded-full ${activeTab === 'unread' ? 'bg-white/20 text-white' : 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-300 font-extrabold'}`}>
            {unreadCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('feedback')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${activeTab === 'feedback'
              ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20'
              : 'bg-white dark:bg-[#151821] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
            }`}
        >
          Student Feedback
          <span className={`px-2 py-0.5 text-xs rounded-full ${activeTab === 'feedback' ? 'bg-white/20 text-white' : 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-300'}`}>
            {feedbackCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('system')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${activeTab === 'system'
              ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20'
              : 'bg-white dark:bg-[#151821] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
            }`}
        >
          System & Admin
          <span className={`px-2 py-0.5 text-xs rounded-full ${activeTab === 'system' ? 'bg-white/20 text-white' : 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300'}`}>
            {systemCount}
          </span>
        </button>
      </div>

      <div className="bg-white dark:bg-[#151821] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        {filteredNotifications.length === 0 ? (
          <div className="p-16 text-center text-slate-500 flex flex-col items-center">
            <Bell size={48} className="text-slate-200 dark:text-slate-700 mb-4" />
            <p>No notifications in this category.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredNotifications.map(n => {
              const isFeedback = n.type === 'FEEDBACK' || n.title.toLowerCase().includes('feedback') || n.title.toLowerCase().includes('inquiry') || n.title.toLowerCase().includes('phản hồi')
              const isSystem = n.type === 'SYSTEM' || n.type === 'BROADCAST' || n.title.toLowerCase().includes('system') || n.title.toLowerCase().includes('admin') || n.title.toLowerCase().includes('hệ thống')
              const targetId = n.referenceId || (n as any).ReferenceId

              return (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`flex flex-col sm:flex-row justify-between p-5 transition-colors cursor-pointer group ${!n.read ? 'bg-brand-50/50 dark:bg-brand-900/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`mt-1 w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isFeedback ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-500' :
                      isSystem ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' :
                        'bg-brand-100 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400'
                      }`}>
                      {isFeedback ? <MessageSquare size={20} /> : isSystem ? <ShieldAlert size={20} /> : <Bell size={20} />}
                    </div>
                    <div>
                      <div className="flex items-center flex-wrap gap-2">
                        <h4 className={`font-bold text-base ${!n.read ? 'text-slate-900 dark:text-slate-100' : 'text-slate-700 dark:text-slate-300'}`}>
                          {n.title}
                        </h4>
                        {isSystem ? (
                          <span className="text-xs px-2 py-0.5 rounded-md bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 font-semibold inline-flex items-center gap-1">
                            <ShieldAlert size={12} /> Admin
                          </span>
                        ) : isFeedback ? (
                          <span className="text-xs px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 font-semibold inline-flex items-center gap-1">
                            <User size={12} /> Student
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 font-semibold inline-flex items-center gap-1">
                            <GraduationCap size={12} /> Lecturer
                          </span>
                        )}
                        {targetId && (
                          <span className="text-xs px-2 py-0.5 rounded-md bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-300 flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity font-semibold">
                            <ExternalLink size={12} /> View details
                          </span>
                        )}
                      </div>
                      <p className={`text-sm leading-relaxed mt-1 ${!n.read ? 'text-slate-700 dark:text-slate-300' : 'text-slate-500 dark:text-slate-400'}`}>
                        {n.message}
                      </p>
                      <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mt-2">
                        <Clock size={12} />
                        {new Date(n.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 sm:mt-0 flex shrink-0 items-center gap-2">
                    {!n.read && (
                      <button onClick={(e) => handleMarkAsRead(n.id, e)} title="Mark as read" className="p-2 text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/30 rounded-lg cursor-pointer">
                        <Check size={18} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setDeletingNotifId(n.id)
                      }}
                      title={t('st.notif.delete', 'Delete notification')}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg cursor-pointer"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Centered Modal Confirm Delete All Notifications */}
      <ConfirmDialog
        isOpen={showDeleteAllModal}
        title={t('notif.clear_all_title', 'Delete All Notifications')}
        subtitle={t('notif.clear_all_subtitle', 'Clear all notifications in your inbox')}
        message={t('notif.clear_all_confirm', 'Are you sure you want to delete all notifications? This action cannot be undone.')}
        confirmText={t('notif.confirm_delete_all', 'Confirm delete all')}
        cancelText={t('notif.cancel', 'Cancel')}
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleConfirmDeleteAll}
        onCancel={() => {
          if (!isDeleting) setShowDeleteAllModal(false)
        }}
      />

      {/* Centered Modal Confirm Delete Single Notification */}
      <ConfirmDialog
        isOpen={!!deletingNotifId}
        title={t('notif.delete_one_title', 'Delete Notification')}
        subtitle={t('notif.delete_one_subtitle', 'Delete the selected notification')}
        message={t('notif.delete_one_confirm', 'Are you sure you want to delete this notification?')}
        confirmText={t('notif.confirm_delete', 'Delete notification')}
        cancelText={t('notif.cancel', 'Cancel')}
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleConfirmDeleteOne}
        onCancel={() => {
          if (!isDeleting) setDeletingNotifId(null)
        }}
      />
    </div>
  )
}

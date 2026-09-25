import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Check, Loader2, Trash2 } from 'lucide-react'
import { api } from '@/lib/api'
import { emitNotificationEvent, subscribeNotificationEvents } from '@/lib/notifications'

import { useTranslation } from 'react-i18next'
import { ConfirmDialog } from './ConfirmDialog'

export function NotificationsDropdown() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false)
  const [deletingNotifId, setDeletingNotifId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchNotifications = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true)
    try {
      const data = await api.getNotifications(1, 50)
      const raw = Array.isArray(data) ? data : (data?.data || [])
      // Sort strictly by timestamp descending (newest notifications always first on top)
      const sorted = [...raw].sort((a, b) => {
        const timeA = new Date(a.createdAt || a.CreatedAt || 0).getTime()
        const timeB = new Date(b.createdAt || b.CreatedAt || 0).getTime()
        return timeB - timeA
      })
      setNotifications(sorted)
    } catch (e) {
      console.error('Lỗi tải thông báo', e)
    } finally {
      if (isInitial) setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotifications(true)
    const unsubscribe = subscribeNotificationEvents(() => fetchNotifications(false))
    return unsubscribe
  }, [fetchNotifications])

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true, read: true } : n))
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
    } catch (e) {
      console.error(e)
    } finally {
      setIsDeleting(false)
      setShowDeleteAllModal(false)
    }
  }

  const handleNotificationClick = async (n: any) => {
    if (!n.isRead && !n.read) {
      setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, isRead: true, read: true } : item))
      api.markNotificationAsRead(n.id).catch(console.error)
      emitNotificationEvent()
    }
    setOpen(false)
    const refId = n.referenceId || n.ReferenceId
    const refType = (n.referenceType || n.ReferenceType || n.type || '').toUpperCase()
    const nType = (n.type || '').toUpperCase()
    const title = (n.title || n.Title || '').toLowerCase()
    const message = (n.message || n.Message || '').toLowerCase()

    if (refId) {
      const isStudent = window.location.pathname.startsWith('/student')
      if (refType === 'CLASS' || refType === 'CLASS_ANNOUNCEMENT' || nType === 'CLASS_ANNOUNCEMENT' || nType === 'CLASS' || title.includes('thông báo lớp')) {
        navigate(isStudent ? `/student/classes/${refId}` : `/lecturer/classes/${refId}`)
      } else if (
        title.includes('nộp lại') ||
        title.includes('resubmit') ||
        nType === 'RESUBMISSION' ||
        refType === 'RESUBMISSION' ||
        refType === 'ASSIGNMENT_GRADING' ||
        message.includes('nộp lại')
      ) {
        // Điều hướng trực tiếp sang trang chấm điểm của bài tập đó
        navigate(isStudent ? `/student/assignments/${refId}` : `/lecturer/grading/assignments/${refId}`)
      } else if (refType === 'SUBMISSION' || nType === 'FEEDBACK') {
        navigate(isStudent ? `/student/grading/result/${refId}` : `/lecturer/grading/result/${refId}`)
      } else if (nType === 'GRADE_PUBLISHED' || title.includes('công bố') || title.includes('điểm số')) {
        navigate(isStudent ? `/student/assignments/${refId}` : `/lecturer/grading/assignments/${refId}`)
      } else {
        navigate(isStudent ? `/student/assignments/${refId}` : `/lecturer/grading/assignments/${refId}`)
      }
    }
  }

  const handleMarkAllAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true, read: true })))
    try {
      await api.markAllNotificationsAsRead()
      emitNotificationEvent()
    } catch (e) {
      console.error(e)
    }
  }

  const displayUnread = notifications.length ? notifications.filter(n => !n.isRead && !n.read).length : 0

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="
          relative h-9 w-9 flex items-center justify-center rounded-xl
          text-slate-500 hover:bg-slate-100 hover:text-slate-700
          dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200
          transition-all duration-150
        "
      >
        <Bell size={17} />
        {displayUnread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-extrabold shadow-sm ring-2 ring-white dark:ring-[#0f1117] animate-pulse">
            {displayUnread > 99 ? '99+' : displayUnread}
          </span>
        )}
      </button>

      {open && (
        <div className="
          absolute right-0 top-full mt-2 z-50 w-84
          rounded-2xl border border-slate-200 bg-white
          shadow-xl shadow-slate-200/60
          dark:border-slate-800 dark:bg-[#161b27]
          dark:shadow-black/40
          overflow-hidden animate-fade-in-up
        ">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Notifications</h3>
              {notifications.length > 0 && (
                <span className="px-2 py-0.5 text-[11px] font-bold bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300 rounded-full">
                  {notifications.length} {displayUnread > 0 ? `(${displayUnread} new)` : ''}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {displayUnread > 0 && (
                <button onClick={handleMarkAllAsRead} className="text-xs text-brand-600 dark:text-brand-400 hover:underline cursor-pointer">Mark all read</button>
              )}
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowDeleteAllModal(true)}
                  className="text-xs text-red-500 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 size={12} /> {t('notif.clear_all', 'Clear all')}
                </button>
              )}
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto p-2">
            {loading ? (
              <div className="flex justify-center p-6 text-brand-500"><Loader2 className="animate-spin" size={24} /></div>
            ) : notifications.length === 0 ? (
              <div className="text-center p-6 text-sm text-slate-500">
                {t('notif.no_notifications', 'No notifications yet.')}
              </div>
            ) : (
              <div className="space-y-1">
                {notifications.map(n => {
                  const isRead = n.isRead || n.read
                  return (
                    <div
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className={`p-3 rounded-xl transition-colors cursor-pointer group relative ${isRead ? 'opacity-70 hover:bg-slate-50 dark:hover:bg-slate-800' : 'bg-brand-50/50 dark:bg-brand-900/10 hover:bg-brand-50 dark:hover:bg-brand-900/20'}`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 min-w-0 pr-4">
                          <p className={`text-sm ${isRead ? 'text-slate-700 dark:text-slate-300' : 'font-bold text-slate-900 dark:text-slate-100'}`}>{n.title}</p>
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2">{n.message}</p>
                          <p className="text-[10px] text-slate-400 mt-2">{n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {!isRead && (
                            <button onClick={(e) => handleMarkAsRead(n.id, e)} title={t('st.notif.mark_read', 'Mark as read')} className="text-brand-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-brand-100 dark:hover:bg-brand-900 rounded-lg">
                              <Check size={14} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setDeletingNotifId(n.id)
                            }}
                            title={t('st.notif.delete', 'Delete notification')}
                            className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

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

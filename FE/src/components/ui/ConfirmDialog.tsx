import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, Trash2, Info, X, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export interface ConfirmDialogProps {
  isOpen: boolean
  title?: string
  subtitle?: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
  isLoading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  isOpen,
  title,
  subtitle,
  message,
  confirmText,
  cancelText,
  variant = 'danger',
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { t } = useTranslation()

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onCancel()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isLoading, onCancel])

  if (!isOpen) return null

  const getIcon = () => {
    switch (variant) {
      case 'warning':
        return <AlertTriangle size={20} className="text-amber-500" />
      case 'info':
        return <Info size={20} className="text-blue-500" />
      case 'danger':
      default:
        return <Trash2 size={20} className="text-red-500" />
    }
  }

  const getIconBg = () => {
    switch (variant) {
      case 'warning':
        return 'bg-amber-100 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60'
      case 'info':
        return 'bg-blue-100 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/60'
      case 'danger':
      default:
        return 'bg-red-100 dark:bg-red-950/40 border-red-200 dark:border-red-900/60'
    }
  }

  const getConfirmBtnClass = () => {
    switch (variant) {
      case 'warning':
        return 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20'
      case 'info':
        return 'bg-brand-600 hover:bg-brand-700 text-white shadow-brand-600/20'
      case 'danger':
      default:
        return 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/20'
    }
  }

  const resolvedTitle = title || (variant === 'danger' ? t('notif.delete_one_title', 'Xác nhận xóa') : t('common.confirm', 'Xác nhận'))
  const resolvedConfirmText = confirmText || (variant === 'danger' ? t('notif.confirm_delete', 'Xóa') : t('common.confirm', 'Xác nhận'))
  const resolvedCancelText = cancelText || t('notif.cancel', 'Hủy bỏ')

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      onClick={() => {
        if (!isLoading) onCancel()
      }}
    >
      <div
        className="bg-white dark:bg-[#161b27] w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/40">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${getIconBg()}`}>
              {getIcon()}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {resolvedTitle}
              </h3>
              {subtitle && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-3">
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            {message}
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
          >
            {resolvedCancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${getConfirmBtnClass()}`}
          >
            {isLoading && <Loader2 size={13} className="animate-spin" />}
            {resolvedConfirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

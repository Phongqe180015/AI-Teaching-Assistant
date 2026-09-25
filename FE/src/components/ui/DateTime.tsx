import { useEffect, useState } from 'react'
import { Calendar, Clock } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function DateTime() {
  const { t, i18n } = useTranslation()
  const [dateTime, setDateTime] = useState(new Date())
  const locale = i18n.language?.toLowerCase().startsWith('vi') ? 'vi-VN' : 'en-GB'

  useEffect(() => {
    const timer = setInterval(() => setDateTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const formatDate = () => {
    return dateTime.toLocaleDateString(locale, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatTime = () => {
    return dateTime.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  return (
    <div className="flex flex-col sm:flex-row gap-4 p-4 rounded-2xl bg-gradient-to-r from-brand-50 to-brand-100/50 dark:from-brand-500/10 dark:to-brand-600/10 border border-brand-100 dark:border-brand-500/20">
      {/* Date */}
      <div className="flex items-center gap-3 min-w-fit">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white dark:bg-slate-800 shadow-sm">
          <Calendar size={18} className="text-brand-600 dark:text-brand-400" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
            {t('ui.date')}
          </p>
          <p className="text-sm font-bold text-slate-900 dark:text-white">
            {formatDate()}
          </p>
        </div>
      </div>

      {/* Time */}
      <div className="flex items-center gap-3 min-w-fit">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white dark:bg-slate-800 shadow-sm">
          <Clock size={18} className="text-brand-600 dark:text-brand-400" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
            {t('ui.time')}
          </p>
          <p className="font-mono text-sm font-bold text-slate-900 dark:text-white">
            {formatTime()}
          </p>
        </div>
      </div>
    </div>
  )
}

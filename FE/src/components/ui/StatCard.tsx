import type { StatMetric } from '@/types'
import { TrendingDown, TrendingUp } from 'lucide-react'

export function StatCard({ label, value, hint, trend, trendLabel, icon: Icon }: StatMetric) {
  const isLoading = value === '—' || value === undefined

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : null
  const trendCls =
    trend === 'up'
      ? 'text-emerald-700 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-500/15'
      : trend === 'down'
      ? 'text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-500/15'
      : 'text-slate-600 bg-slate-100 dark:text-slate-400 dark:bg-slate-800'

  return (
    <div className="
      group relative overflow-hidden rounded-2xl border border-amber-100/80 bg-white p-5
      shadow-sm transition-all duration-300
      hover:-translate-y-1 hover:shadow-lg hover:shadow-brand-500/10 hover:border-brand-200
      dark:bg-[#161b27] dark:border-slate-800
      dark:hover:border-brand-700/50 dark:hover:shadow-brand-600/10
    ">
      {/* Decorative blob */}
      <div className="pointer-events-none absolute -right-5 -top-5 h-20 w-20 rounded-full bg-brand-50 opacity-70 transition-transform duration-500 group-hover:scale-[2] dark:bg-brand-600/10" />

      <div className="relative space-y-3">
        {/* Top row */}
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">
            {label}
          </p>
          {Icon && (
            <div className="rounded-xl bg-slate-50 p-2 text-slate-400 transition-all duration-200 group-hover:bg-brand-50 group-hover:text-brand-600 dark:bg-slate-800 dark:text-slate-600 dark:group-hover:bg-brand-600/15 dark:group-hover:text-brand-400">
              <Icon size={16} />
            </div>
          )}
        </div>

        {/* Value */}
        {isLoading ? (
          <div className="h-9 w-24 skeleton" />
        ) : (
          <p className="text-3xl font-bold tracking-tight text-slate-900 transition-colors group-hover:text-brand-600 dark:text-white dark:group-hover:text-brand-400">
            {value}
          </p>
        )}

        {/* Trend / hint */}
        {(hint || trendLabel) && (
          <div className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${trendCls}`}>
            {TrendIcon && <TrendIcon size={11} />}
            <span>{trendLabel ?? hint}</span>
          </div>
        )}
      </div>
    </div>
  )
}

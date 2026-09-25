import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import type { BreadcrumbItem } from '@/types'
import type { ReactNode } from 'react'

interface Props {
  title: string
  description?: string
  breadcrumbs?: BreadcrumbItem[]
  actions?: ReactNode
}

export function PageHeader({ title, description, breadcrumbs, actions }: Props) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 space-y-1">

        {/* Breadcrumb */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="mb-1 flex flex-wrap items-center gap-1 text-xs text-slate-400 dark:text-slate-600">
            {breadcrumbs.map((item, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <ChevronRight size={11} className="text-slate-300 dark:text-slate-700" />}
                {item.path ? (
                  <Link to={item.path} className="font-medium hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
                    {item.label}
                  </Link>
                ) : item.onClick ? (
                  // Drill-down levels live in page state, not the router, so they
                  // navigate through a callback instead of a link.
                  <button
                    type="button"
                    onClick={item.onClick}
                    className="font-medium hover:text-brand-600 dark:hover:text-brand-400 transition-colors cursor-pointer"
                  >
                    {item.label}
                  </button>
                ) : (
                  <span className="font-medium text-slate-600 dark:text-slate-400">{item.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}

        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          {title}
        </h1>

        {description && (
          <p className="max-w-2xl text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      )}
    </div>
  )
}

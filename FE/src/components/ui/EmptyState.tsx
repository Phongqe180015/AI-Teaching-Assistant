import type { ReactNode } from 'react'
import { Inbox } from 'lucide-react'
import { Button } from './Button'

interface EmptyStateProps {
  title: string
  description: string
  icon?: ReactNode
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({ title, description, icon, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 px-6 py-16 text-center dark:border-slate-600 dark:bg-slate-800/30">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500">
        {icon ?? <Inbox size={28} />}
      </div>
      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">{description}</p>
      {actionLabel && onAction && (
        <Button className="mt-6" variant="primary" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  )
}

import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { EmptyState } from './EmptyState'

export interface Column<T> {
  key: string
  header: ReactNode | string
  render?: (row: T) => ReactNode
  className?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyExtractor: (row: T) => string
  emptyTitle?: string
  emptyDescription?: string
  onRowClick?: (row: T) => void
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  emptyTitle,
  emptyDescription,
  onRowClick
}: DataTableProps<T>) {
  const { t } = useTranslation()
  if (data.length === 0) {
    return (
      <EmptyState
        title={emptyTitle ?? t('ui.no_data')}
        description={emptyDescription ?? t('ui.no_data_desc')}
      />
    )
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
      <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
        <thead className="bg-slate-50 dark:bg-slate-800/80">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300 ${col.className ?? ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-700/50 dark:bg-slate-800">
          {data.map((row) => (
            <tr 
              key={keyExtractor(row)} 
              className={`hover:bg-slate-50/80 dark:hover:bg-slate-700/40 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
              onClick={() => onRowClick && onRowClick(row)}
            >
              {columns.map((col) => (
                <td key={col.key} className={`px-4 py-3 text-slate-700 dark:text-slate-300 ${col.className ?? ''}`}>
                  {col.render
                    ? col.render(row)
                    : String((row as Record<string, unknown>)[col.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

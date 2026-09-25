import type { TabItem } from '@/types'

interface Props {
  items: TabItem[]
  activeId: string
  onChange: (id: string) => void
  fullWidth?: boolean
}

export function Tabs({ items, activeId, onChange, fullWidth }: Props) {
  return (
    <div className={`flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800/80 ${fullWidth ? 'w-full' : 'w-fit'}`}>
      {items.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`
            flex-1 sm:flex-none rounded-lg px-3.5 py-2 text-sm font-medium
            transition-all duration-200 whitespace-nowrap
            ${activeId === tab.id
              ? 'bg-white text-brand-700 shadow-sm dark:bg-[#1e2535] dark:text-brand-400 dark:shadow-black/30'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-500 dark:hover:text-slate-300'
            }
          `}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

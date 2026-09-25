import { type ReactNode, forwardRef } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  padding?: 'none' | 'sm' | 'md' | 'lg'
  onClick?: () => void
}

const padMap = { none: '', sm: 'p-4', md: 'p-5', lg: 'p-6' }

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ children, className = '', padding = 'md', onClick }, ref) => {
    return (
      <div
        ref={ref}
        onClick={onClick}
        className={`
          rounded-2xl border border-amber-100/80 bg-white
          shadow-sm transition-colors duration-200
          dark:bg-[#161b27] dark:border-slate-800
          ${padMap[padding]} ${className}
        `}
      >
        {children}
      </div>
    )
  }
)
Card.displayName = 'Card'

interface CardHeaderProps {
  title: string
  description?: string
  action?: ReactNode
}

export function CardHeader({ title, description, action }: CardHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
        {description && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{description}</p>}
      </div>
      {action}
    </div>
  )
}

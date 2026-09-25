import React from 'react'

type Variant = 'success' | 'danger' | 'warning' | 'info' | 'neutral' | 'default' | 'outline'
type Size = 'sm' | 'md'

interface Props {
  children: React.ReactNode
  variant?: Variant
  size?: Size
  dot?: boolean
  className?: string
}

const styles: Record<Variant, string> = {
  default:  'bg-brand-50  text-brand-700  ring-brand-200  dark:bg-brand-500/15 dark:text-brand-300  dark:ring-brand-500/20',
  success:  'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/20',
  warning:  'bg-amber-50  text-amber-700  ring-amber-200  dark:bg-amber-500/15  dark:text-amber-300  dark:ring-amber-500/20',
  danger:   'bg-red-50    text-red-700    ring-red-200    dark:bg-red-500/15    dark:text-red-300    dark:ring-red-500/20',
  info:     'bg-sky-50    text-sky-700    ring-sky-200    dark:bg-sky-500/15    dark:text-sky-300    dark:ring-sky-500/20',
  neutral:  'bg-slate-100 text-slate-600  ring-slate-200  dark:bg-slate-800     dark:text-slate-400  dark:ring-slate-700',
  outline:  'bg-white text-slate-700 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700',
}

const dots: Record<Variant, string> = {
  default:  'bg-brand-500',
  success:  'bg-emerald-500',
  warning:  'bg-amber-500',
  danger:   'bg-red-500',
  info:     'bg-sky-500',
  neutral:  'bg-slate-400',
  outline:  'bg-slate-400',
}

const sizes: Record<Size, string> = {
  sm: 'px-1.5 py-0.5 text-[10px]',
  md: 'px-2.5  py-0.5 text-xs',
}

export function Badge({ children, variant = 'default', size = 'md', dot = false, className = '' }: Props) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium ring-1 ${styles[variant]} ${sizes[size]} ${className}`}>
      {dot && <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dots[variant]}`} />}
      {children}
    </span>
  )
}

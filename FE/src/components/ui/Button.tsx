import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'accent'
type Size = 'sm' | 'md' | 'lg' | 'icon'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  children: ReactNode
  fullWidth?: boolean
  type?: 'button' | 'submit' | 'reset'
  className?: string
  disabled?: boolean
  loading?: boolean
}

const variants: Record<Variant, string> = {
  primary:
    'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 shadow-sm shadow-brand-600/25 dark:bg-brand-600 dark:hover:bg-brand-500',
  secondary:
    'bg-slate-100 text-slate-800 hover:bg-slate-200 active:bg-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700',
  outline:
    'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400 active:bg-slate-100 dark:border-slate-700 dark:bg-transparent dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:border-slate-600',
  ghost:
    'text-slate-600 hover:bg-slate-100 hover:text-slate-900 active:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100',
  danger:
    'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 shadow-sm shadow-red-600/20 dark:bg-red-600 dark:hover:bg-red-500',
  accent:
    'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 shadow-sm shadow-brand-600/25',
}

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs rounded-lg gap-1.5',
  md: 'h-9 px-4 text-sm rounded-xl gap-2',
  lg: 'h-11 px-6 text-sm rounded-xl gap-2',
  icon: 'h-9 w-9 rounded-xl flex items-center justify-center p-0',
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth,
  className = '',
  children,
  loading,
  disabled,
  ...props
}: ButtonProps) {
  const { t } = useTranslation()
  return (
    <button
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center font-semibold
        transition-all duration-150
        disabled:opacity-50 disabled:pointer-events-none
        focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:ring-offset-1
        dark:focus:ring-brand-400/30 dark:focus:ring-offset-[#0f1117]
        ${variants[variant]} ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      {...props}
    >
      {loading ? (
        <>
          <svg className="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span>{t('ui.processing')}</span>
        </>
      ) : children}
    </button>
  )
}

import React, { useState, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const baseInput = `
  w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm
  text-slate-900 placeholder:text-slate-400
  transition-all duration-150
  focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500
  disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed
  dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100
  dark:placeholder:text-slate-500
  dark:focus:ring-brand-400/20 dark:focus:border-brand-400
  dark:disabled:bg-slate-800
`

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string; hint?: string; error?: string; leftIcon?: React.ReactNode
}

export function Input({ label, hint, error, leftIcon, className = '', id, type, ...props }: InputProps) {
  const [showPassword, setShowPassword] = useState(false)
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
  const isPassword = type === 'password'
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type

  return (
    <div className="space-y-1.5">
      {label && <label htmlFor={inputId} className="block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>}
      <div className="relative">
        {leftIcon && <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 dark:text-slate-500">{leftIcon}</div>}
        <input
          id={inputId}
          type={inputType}
          className={`${baseInput} ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-400/20' : 'border-slate-300'} ${leftIcon ? 'pl-10' : ''} ${isPassword ? 'pr-10' : ''} ${className}`}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
      {hint && !error && <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string; hint?: string; error?: string
}

export function Textarea({ label, hint, error, className = '', id, ...props }: TextareaProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="space-y-1.5">
      {label && <label htmlFor={inputId} className="block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>}
      <textarea
        id={inputId}
        className={`min-h-[96px] resize-y ${baseInput} border-slate-300 ${error ? 'border-red-400' : ''} ${className}`}
        {...props}
      />
      {hint && !error && <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string; hint?: string; options: { value: string; label: string }[]
}

export function Select({ label, hint, options, className = '', id, ...props }: SelectProps) {
  const { t } = useTranslation()
  const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="space-y-1.5">
      {label && <label htmlFor={selectId} className="block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>}
      <select
        id={selectId}
        className={`${baseInput} border-slate-300 cursor-pointer ${className}`}
        {...props}
      >
        <option value="">{t('ui.select')}</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {hint && <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
    </div>
  )
}

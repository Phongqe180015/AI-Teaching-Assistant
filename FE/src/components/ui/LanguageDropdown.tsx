import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { useLanguage, LANGUAGES, type Language } from '@/store/LanguageContext'

interface Props {
  /** 'full' shows flag + label + chevron; 'compact' shows only flag + code */
  variant?: 'full' | 'compact'
}

export function LanguageDropdown({ variant = 'compact' }: Props) {
  const { language, setLanguage, t } = useLanguage()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const current = LANGUAGES.find(l => l.code === language) ?? LANGUAGES[0]

  /* close on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelect = (code: Language) => {
    setLanguage(code)
    setOpen(false)
  }

  return (
    <div className="relative" ref={ref}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`
          flex items-center justify-center gap-1.5 rounded-xl border transition-all duration-150
          text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200
          border-slate-200 hover:border-slate-300 bg-white/60 hover:bg-white
          dark:border-slate-700/60 dark:hover:border-slate-600 dark:bg-slate-800/50 dark:hover:bg-slate-800
          ${variant === 'full' ? 'h-9 px-4 text-sm min-w-[160px]' : 'h-9 px-2.5 min-w-[50px]'}
        `}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={current.label}
      >
        {variant === 'full' ? (
          <>
            <span className="text-base leading-none">{current.flag}</span>
            <span className="font-semibold tracking-wide">{current.label}</span>
            <ChevronDown
              size={13}
              className={`text-slate-400 transition-transform duration-200 ml-auto ${open ? 'rotate-180' : ''}`}
            />
          </>
        ) : (
          <>
            <span className="text-base leading-none">{current.flag}</span>
            <span className="font-bold text-xs leading-none">{current.code.toUpperCase()}</span>
          </>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          role="listbox"
          aria-label={t('ui.select_language')}
          className="
            absolute right-0 top-full mt-2 z-[60] w-44
            rounded-2xl border border-slate-200 bg-white
            shadow-xl shadow-slate-200/60
            dark:border-slate-700 dark:bg-[#1e2535]
            dark:shadow-black/40
            overflow-hidden animate-fade-in-up
          "
        >
          {/* Header */}
          <div className="px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-700/60">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              {t('ui.language')}
            </p>
          </div>

          {/* Options */}
          <div className="p-1.5 space-y-0.5">
            {LANGUAGES.map((lang) => {
              const isActive = lang.code === language
              return (
                <button
                  key={lang.code}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  onClick={() => handleSelect(lang.code)}
                  className={`
                    w-full flex items-center gap-3 rounded-xl px-3 py-2.5
                    text-sm font-medium text-left
                    transition-colors duration-150
                    ${isActive
                      ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-400'
                      : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700/50'
                    }
                  `}
                >
                  {/* Flag */}
                  <span className="text-lg leading-none w-6 text-center shrink-0">
                    {lang.flag}
                  </span>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <p className="leading-none truncate">{lang.name}</p>
                    <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      {lang.label}
                    </p>
                  </div>

                  {/* Active checkmark */}
                  {isActive && (
                    <Check size={14} className="shrink-0 text-brand-600 dark:text-brand-400" />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

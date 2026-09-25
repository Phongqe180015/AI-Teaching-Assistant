import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check, X } from 'lucide-react'
import { api } from '@/lib/api'
import { getSeasonTheme } from '@/utils/seasonThemeHelper'

export type SemesterOption = string

export interface SemesterItem {
  value: string
  label: string
  isCurrent?: boolean
}

export interface SemesterSelectorProps {
  selectedSemester: string
  onChange: (semester: string) => void
  className?: string
  showLabel?: boolean
}

export const INITIAL_SEMESTERS: SemesterItem[] = [
  { value: 'SUMMER2026', label: 'SUMMER2026', isCurrent: true }
]

export function SemesterSelector({ 
  selectedSemester, 
  onChange, 
  className = '',
  showLabel = false
}: SemesterSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [semesters, setSemesters] = useState<SemesterItem[]>(INITIAL_SEMESTERS)
  const ref = useRef<HTMLDivElement>(null)

  // Load unique Seasons from Admin-created semesters (group by Season, ignore Code)
  useEffect(() => {
    let alive = true
    
    api.getSemesters()
      .then((semestersRes) => {
        if (!alive) return

        const foundSeasons = new Map<string, SemesterItem>()
        
        if (Array.isArray(semestersRes) && semestersRes.length > 0) {
          semestersRes.forEach((s: any) => {
            const season = String(s?.season || '').trim()
            
            if (season) {
              const label = season.toUpperCase().replace(/\s+/g, '')
              
              if (!foundSeasons.has(label)) {
                foundSeasons.set(label, {
                  value: label,
                  label: label,
                  isCurrent: s.isActive ?? false
                })
              } else {
                const existing = foundSeasons.get(label)!
                if (s.isActive) {
                  existing.isCurrent = true
                }
              }
            }
          })
        }

        if (foundSeasons.size === 0) {
          foundSeasons.set('SUMMER2026', { value: 'SUMMER2026', label: 'SUMMER2026', isCurrent: true })
        }

        const list = Array.from(foundSeasons.values())
        setSemesters(list)

        const activeSem = list.find(s => s.isCurrent) || list[0]
        if (activeSem && (!selectedSemester || !list.some(s => s.value === selectedSemester))) {
          onChange(activeSem.value)
        }
      })
      .catch(() => {
        setSemesters([{ value: 'SUMMER2026', label: 'SUMMER2026', isCurrent: true }])
        if (!selectedSemester) {
          onChange('SUMMER2026')
        }
      })

    return () => { alive = false }
  }, [selectedSemester, onChange])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const currentSem = semesters.find(s => s.isCurrent) || semesters[0]
  const selectedOpt = semesters.find(o => o.value === selectedSemester) || currentSem
  const seasonTheme = getSeasonTheme(selectedOpt.label)
  const SeasonIcon = seasonTheme.seasonIcon

  return (
    <div className={`relative inline-block text-left ${className}`} ref={ref}>
      {showLabel && (
        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1 pl-1">
          Semester
        </label>
      )}

      {/* Selector Box */}
      <div className="relative inline-flex items-center">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center justify-between gap-3 px-3.5 h-11 rounded-xl border ${seasonTheme.selectorBtnBorder} ${seasonTheme.selectorBtnBg} ${seasonTheme.selectorBtnText} font-extrabold text-xs sm:text-sm tracking-wide shadow-xs transition-all focus:outline-none ring-2 ring-slate-400/10 min-w-[170px]`}
        >
          <div className="flex items-center gap-2">
            <SeasonIcon className={`w-4 h-4 ${seasonTheme.seasonIconColor}`} />
            <span className="truncate uppercase font-black tracking-wider">
              {selectedOpt.label}
            </span>
          </div>

          <div className="flex items-center gap-1.5 opacity-80">
            {selectedSemester !== currentSem.value && (
              <X 
                size={14} 
                className="hover:text-rose-600 transition-colors p-0.5 rounded-full hover:bg-rose-100 dark:hover:bg-rose-950/60" 
                onClick={(e) => {
                  e.stopPropagation()
                  onChange(currentSem.value)
                }}
              />
            )}
            <ChevronDown size={16} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </button>

        {/* Dropdown Menu - ONLY shows real active seasons in DB */}
        {isOpen && (
          <div className="absolute top-full right-0 mt-1 w-56 rounded-2xl bg-white dark:bg-[#1a1d28] border border-slate-200 dark:border-slate-800 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 p-1.5">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span>Semester list</span>
              <span className="text-[9px] font-semibold text-brand-500">Auto-synced</span>
            </div>
            <div className="py-1 max-h-60 overflow-y-auto space-y-0.5">
              {semesters.map((opt) => {
                const isSelected = selectedSemester === opt.value
                const optTheme = getSeasonTheme(opt.label)
                const OptIcon = optTheme.seasonIcon

                return (
                  <button
                    key={opt.value}
                    onClick={() => {
                      onChange(opt.value)
                      setIsOpen(false)
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-black transition-all text-left uppercase tracking-wider ${
                      isSelected
                        ? `${optTheme.selectorBtnBg} ${optTheme.selectorBtnText} font-black shadow-2xs`
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <OptIcon className={`w-3.5 h-3.5 ${optTheme.seasonIconColor}`} />
                      {opt.label}
                      {opt.isCurrent && (
                        <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                          Current
                        </span>
                      )}
                    </span>
                    {isSelected && <Check size={14} className={optTheme.seasonIconColor} />}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

import { Link, useLocation } from 'react-router-dom'
import { GraduationCap, Home, ChevronLeft, ChevronRight } from 'lucide-react'
import type { NavItem, UserRole } from '@/types'
import { Icon } from '@/components/icons/IconMap'
import { useTranslation } from 'react-i18next'

interface Props {
  navItems: NavItem[]
  role: UserRole
  roleLabel: string
  collapsed: boolean
  onToggleCollapse: () => void
}

/* ── Per-role sidebar themes ─────────────────────────────────── */
const sidebarTheme: Record<UserRole, {
  bg: string
  borderRight: string
  logoRing: string
  activeBg: string
  activeBar: string
  hoverBg: string
  textActive: string
  textInactive: string
  categoryText: string
  divider: string
}> = {
  admin: {
    bg:           'bg-[#faf8f5] dark:bg-[#121620]',
    borderRight:  'border-r border-amber-200/50 dark:border-slate-800/80',
    logoRing:     'bg-gradient-to-br from-brand-500 to-brand-600 shadow-md shadow-brand-500/30 text-white',
    activeBg:     'bg-brand-50/90 dark:bg-brand-500/15 border border-brand-200/80 dark:border-brand-500/30 shadow-2xs',
    activeBar:    'bg-brand-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]',
    hoverBg:      'hover:bg-amber-50/60 dark:hover:bg-slate-800/60',
    textActive:   'text-brand-700 dark:text-brand-400 font-extrabold',
    textInactive: 'text-slate-600 dark:text-slate-400',
    categoryText: 'text-brand-600 dark:text-brand-400 font-black',
    divider:      'border-slate-200/60 dark:border-slate-800/80',
  },
  lecturer: {
    bg:           'bg-[#faf8f5] dark:bg-[#121620]',
    borderRight:  'border-r border-amber-200/50 dark:border-slate-800/80',
    logoRing:     'bg-gradient-to-br from-brand-500 to-brand-600 shadow-md shadow-brand-500/30 text-white',
    activeBg:     'bg-brand-50/90 dark:bg-brand-500/15 border border-brand-200/80 dark:border-brand-500/30 shadow-2xs',
    activeBar:    'bg-brand-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]',
    hoverBg:      'hover:bg-amber-50/60 dark:hover:bg-slate-800/60',
    textActive:   'text-brand-700 dark:text-brand-400 font-extrabold',
    textInactive: 'text-slate-600 dark:text-slate-400',
    categoryText: 'text-brand-600 dark:text-brand-400 font-black',
    divider:      'border-slate-200/60 dark:border-slate-800/80',
  },
  student: {
    bg:           'bg-[#faf8f5] dark:bg-[#121620]',
    borderRight:  'border-r border-amber-200/50 dark:border-slate-800/80',
    logoRing:     'bg-gradient-to-br from-brand-500 to-brand-600 shadow-md shadow-brand-500/30 text-white',
    activeBg:     'bg-brand-50/90 dark:bg-brand-500/15 border border-brand-200/80 dark:border-brand-500/30 shadow-2xs',
    activeBar:    'bg-brand-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]',
    hoverBg:      'hover:bg-amber-50/60 dark:hover:bg-slate-800/60',
    textActive:   'text-brand-700 dark:text-brand-400 font-extrabold',
    textInactive: 'text-slate-600 dark:text-slate-400',
    categoryText: 'text-brand-600 dark:text-brand-400 font-black',
    divider:      'border-slate-200/60 dark:border-slate-800/80',
  },
}

export function DashboardSidebar({ navItems, role, roleLabel, collapsed, onToggleCollapse }: Props) {
  const { t } = useTranslation()
  const location = useLocation()
  const theme = sidebarTheme[role]

  return (
    <aside
      className={`
        fixed left-0 top-0 z-40 flex h-screen flex-col
        ${theme.bg} ${theme.borderRight}
        transition-all duration-300 ease-in-out
        shadow-sm
        ${collapsed ? 'w-[68px]' : 'w-64'}
      `}
    >
      {/* ── Logo ─────────────────────────────────── */}
      <div className={`flex h-16 shrink-0 items-center ${theme.divider} border-b px-4 ${collapsed ? 'justify-center' : 'gap-3'}`}>
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-sm ${theme.logoRing}`}>
          <GraduationCap size={18} className="text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-[15px] font-black text-slate-900 dark:text-white leading-none tracking-tight">AITA</p>
            <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-500 dark:text-slate-400 leading-none">{t(`role.${String(role).toLowerCase()}`, roleLabel)}</p>
          </div>
        )}
      </div>

      {/* ── Nav ──────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3 space-y-0.5">
        {navItems.map((item, index) => {
          const prevItem = index > 0 ? navItems[index - 1] : null;
          const showCategory = item.category && (!prevItem || prevItem.category !== item.category);

          const isActive =
            location.pathname === item.path ||
            (item.path !== `/${role}` && location.pathname.startsWith(item.path))

          return (
            <div key={item.id} className={showCategory && index > 0 ? `mt-2 pt-5 border-t ${theme.divider} flex flex-col` : "flex flex-col"}>
              {showCategory && !collapsed && (
                <div className={`px-3 pb-2 text-[11px] font-extrabold uppercase tracking-widest ${theme.categoryText} mb-1 flex items-center gap-2`}>
                  {t(`nav.cat.${String(item.category).toLowerCase().replace(/[^a-z]+/g, '_')}`, String(item.category))}
                </div>
              )}
              {showCategory && collapsed && index > 0 && (
                <div className={`mx-3 my-3 h-px ${theme.divider}`} />
              )}
              <Link
                to={item.path}
                className={`
                  group relative flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium
                  outline-none select-none transition-colors duration-150
                  focus-visible:ring-2 focus-visible:ring-brand-500/30
                  ${isActive
                    ? `${theme.activeBg} ${theme.textActive}`
                    : `${theme.textInactive} ${theme.hoverBg} hover:text-slate-900 dark:hover:text-slate-100`
                  }
                  ${collapsed ? 'justify-center px-3' : ''}
                `}
              >
                {/* Active bar */}
                <span 
                  className={`absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full ${theme.activeBar} transition-opacity duration-150 ${isActive ? 'opacity-100' : 'opacity-0'}`} 
                />

                <Icon
                  name={item.icon}
                  size={19}
                  className={`shrink-0 transition-transform duration-150 group-hover:scale-105 ${isActive ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-200'}`}
                />

                {!collapsed && (
                  <span className="truncate leading-tight">{t(`nav.item.${item.id}`, item.label)}</span>
                )}

                {!collapsed && item.badge && (
                  <span className="ml-auto rounded-full bg-brand-500 px-1.5 py-0.5 text-[10px] font-bold text-white leading-none">
                    {item.badge}
                  </span>
                )}

                {/* Tooltip when collapsed */}
                {collapsed && (
                  <div className="
                    pointer-events-none absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 z-50
                    whitespace-nowrap rounded-lg bg-slate-900 dark:bg-slate-800 px-2.5 py-1.5
                    text-xs font-medium text-white shadow-xl
                    border border-white/10
                    opacity-0 scale-95 origin-left
                    group-hover:opacity-100 group-hover:scale-100
                    transition-all duration-150
                  ">
                    {t(`nav.item.${item.id}`, item.label)}
                    <span className="absolute -left-1 top-1/2 -translate-y-1/2 w-0 h-0 border-y-4 border-y-transparent border-r-4 border-r-slate-900 dark:border-r-slate-800" />
                  </div>
                )}
              </Link>
            </div>
          )
        })}
      </nav>

      {/* ── Footer ───────────────────────────────── */}
      <div className={`shrink-0 border-t ${theme.divider} px-2 py-3 space-y-0.5`}>
        <Link
          to="/"
          className={`
            group relative flex items-center gap-3 rounded-xl px-4 py-3 text-sm
            ${theme.textInactive} ${theme.hoverBg} hover:text-slate-900 dark:hover:text-slate-100
            transition-all duration-150
            ${collapsed ? 'justify-center px-3' : ''}
          `}
        >
          <Home size={18} className="shrink-0 text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-transform group-hover:scale-105" />
          {!collapsed && <span>{t('ui.home')}</span>}
          {collapsed && (
            <div className="pointer-events-none absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 z-50 whitespace-nowrap rounded-lg bg-slate-900 dark:bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-white shadow-xl border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
              {t('ui.home')}
              <span className="absolute -left-1 top-1/2 -translate-y-1/2 w-0 h-0 border-y-4 border-y-transparent border-r-4 border-r-slate-900 dark:border-r-slate-800" />
            </div>
          )}
        </Link>

        <button
          type="button"
          onClick={onToggleCollapse}
          className={`
            flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm
            ${theme.textInactive} ${theme.hoverBg} hover:text-slate-900 dark:hover:text-slate-100
            transition-all duration-150
            ${collapsed ? 'justify-center px-3' : ''}
          `}
        >
          {collapsed ? <ChevronRight size={18} /> : <><ChevronLeft size={18} /><span>{t('ui.collapse')}</span></>}
        </button>
      </div>
    </aside>
  )
}

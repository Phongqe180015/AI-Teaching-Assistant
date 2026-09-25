import { useState, useRef, useEffect } from 'react'
import { Search, LogOut, Sun, Moon, ChevronDown, LayoutDashboard } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/store/AuthContext'
import { useTheme } from '@/store/ThemeContext'
import { useTranslation } from 'react-i18next'
import { LanguageDropdown } from '@/components/ui/LanguageDropdown'
import { LiveClock } from '@/components/ui/LiveClock'
import { NotificationsDropdown } from '@/components/ui/NotificationsDropdown'

interface Props { title?: string; sidebarCollapsed: boolean }

function initials(name?: string) {
  if (!name) return 'U'
  const p = name.trim().split(/\s+/)
  return p.length === 1 ? p[0][0].toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase()
}

const roleLabel: Record<string, string> = {
  admin: 'Administrator',
  lecturer: 'Lecturer',
  student: 'Student',
}

/* avatar gradient per role */
const roleAvatar: Record<string, string> = {
  admin:    'from-brand-600 to-brand-800',
  lecturer: 'from-brand-500 to-brand-700',
  student:  'from-brand-400 to-brand-600',
}

export function DashboardTopbar(_props: Props) {
  const { t } = useTranslation()
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const handleLogout = () => { logout(); navigate('/login') }
  const avatarGradient = roleAvatar[user?.role ?? ''] ?? roleAvatar.admin

  return (
    <header
      className={`
        sticky top-0 z-30 flex h-16 items-center gap-3
        border-b border-slate-200/80 bg-[#fcfcfd]/95 backdrop-blur-xl
        px-4 sm:px-6
        dark:border-slate-800 dark:bg-[#0f1117]/95
        shadow-sm shadow-slate-200/40 dark:shadow-black/20
        transition-colors duration-300
      `}
    >
      {/* Search */}
      <div className="relative flex-1 max-w-xs">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          placeholder={t('ui.search')}
          className="
            h-9 w-full rounded-xl border border-slate-200 bg-white/80 pl-9 pr-4 text-sm
            text-slate-800 placeholder:text-slate-400
            transition-all duration-150
            focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-400/20
            dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:placeholder:text-slate-500
            dark:focus:border-brand-500 dark:focus:bg-slate-800 dark:focus:ring-brand-500/20
          "
        />
      </div>

      {/* Right Navbar Actions */}
      <div className="flex items-center gap-2 ml-auto">
        {/* Live Date and Time Widget */}
        <div className="mr-2">
          <LiveClock />
        </div>

        {/* Language dropdown */}
        <LanguageDropdown />

        {/* Theme */}
        <button
          type="button"
          onClick={toggleTheme}
          title={theme === 'light' ? t('ui.dark_mode') : t('ui.light_mode')}
          className="
            h-9 w-9 flex items-center justify-center rounded-xl
            text-slate-500 hover:bg-slate-100 hover:text-slate-700
            dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200
            transition-all duration-150
          "
        >
          {theme === 'light'
            ? <Moon size={17} />
            : <Sun size={17} className="text-amber-400" />
          }
        </button>

        <NotificationsDropdown />

        {/* Divider */}
        <div className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-800" />

        {/* User menu */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen(o => !o)}
            className="
              flex items-center gap-2 rounded-xl pl-1.5 pr-2.5 py-1.5
              hover:bg-slate-100 dark:hover:bg-slate-800
              transition-colors duration-150
            "
          >
            {/* Avatar */}
            <div className={`relative flex h-9 w-9 shrink-0 overflow-hidden items-center justify-center rounded-md bg-gradient-to-br ${avatarGradient} text-[12px] font-bold text-white shadow-sm border border-slate-200/50 dark:border-slate-700`}>
              {user?.avatar ? (
                <img 
                  src={user.avatar} 
                  alt="Avatar" 
                  className="w-full h-full object-cover relative z-10" 
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                    const fallback = (e.target as HTMLElement).nextElementSibling as HTMLElement;
                    if (fallback) fallback.style.display = 'block';
                  }}
                />
              ) : null}
              <span style={{ display: user?.avatar ? 'none' : 'block' }}>
                {initials(user?.fullName)}
              </span>
            </div>
            <div className="hidden sm:block text-left min-w-0">
              <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-200 leading-none truncate max-w-[110px]">
                {user?.fullName ?? t('ui.account')}
              </p>
              <p className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500 leading-none">
                {user?.role ? t(`role.${user.role}`, roleLabel[user.role] ?? user.role) : '—'}
              </p>
            </div>
            <ChevronDown
              size={13}
              className={`hidden sm:block text-slate-400 transition-transform duration-200 ${menuOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {/* Dropdown */}
          {menuOpen && (
            <div className="
              absolute right-0 top-full mt-2 z-50 w-52
              rounded-2xl border border-slate-200 bg-white
              shadow-xl shadow-slate-200/60
              dark:border-slate-800 dark:bg-[#161b27]
              dark:shadow-black/40
              overflow-hidden animate-fade-in-up
            ">
              {/* User info */}
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 dark:border-slate-800">
                <div className={`relative flex h-11 w-11 shrink-0 overflow-hidden items-center justify-center rounded-md bg-gradient-to-br ${avatarGradient} text-[14px] font-bold text-white shadow-sm border border-slate-200/50 dark:border-slate-700`}>
                  {user?.avatar ? (
                    <img 
                      src={user.avatar} 
                      alt="Avatar" 
                      className="w-full h-full object-cover relative z-10" 
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                        const fallback = (e.target as HTMLElement).nextElementSibling as HTMLElement;
                        if (fallback) fallback.style.display = 'block';
                      }}
                    />
                  ) : null}
                  <span style={{ display: user?.avatar ? 'none' : 'block' }}>
                    {initials(user?.fullName)}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-slate-900 dark:text-slate-100 truncate">{user?.fullName}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-500 truncate">{user?.email}</p>
                </div>
              </div>

              {/* Links */}
              <div className="p-1.5 space-y-0.5">
                <Link
                  to={`/${user?.role}`}
                  onClick={() => setMenuOpen(false)}
                  className="
                    flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium
                    text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800
                    transition-colors
                  "
                >
                  <LayoutDashboard size={15} className="text-slate-400" />
                  {t('nav.item.dashboard')}
                </Link>
              </div>

              {/* Logout */}
              <div className="p-1.5 pt-0">
                <div className="h-px bg-slate-100 dark:bg-slate-800 mb-1.5" />
                <button
                  type="button"
                  onClick={handleLogout}
                  className="
                    flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium
                    text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10
                    transition-colors
                  "
                >
                  <LogOut size={15} />
                  {t('ui.log_out')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

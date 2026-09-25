import { Link } from 'react-router-dom'
import { GraduationCap } from 'lucide-react'
import { PORTAL_LINKS } from '@/constants/navigation'
import { useLanguage } from '@/store/LanguageContext'

export function PublicFooter() {
  const { t } = useLanguage()
  return (
    <footer className="border-t border-slate-200 bg-slate-900 text-slate-300 dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-2 font-bold text-white">
              <GraduationCap className="text-accent-500" />
              AITA
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              {t('footer.desc')}
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-white">{t('footer.portal')}</h4>
            <ul className="mt-3 space-y-2 text-sm">
              {PORTAL_LINKS.map((p) => (
                <li key={p.path}>
                  <Link to={p.path} className="hover:text-white transition-colors">
                    {t(`nav.${p.role}` as any)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white">{t('footer.contact')}</h4>
            <p className="mt-3 text-sm text-slate-400">
              {t('footer.contact_info')}
              <br />
              {t('footer.contact_email')}
            </p>
          </div>
        </div>
        <p className="mt-10 border-t border-slate-800 pt-6 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} AITA. {t('ui.rights_reserved')}
        </p>
      </div>
    </footer>
  )
}

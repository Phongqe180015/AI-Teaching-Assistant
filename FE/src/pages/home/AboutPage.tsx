import {
  AlertTriangle,
  Clock,
  Code2,
  Users,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/Card'

// Text lives in the translation catalogue, not here, so the page follows the language switch.
const CHALLENGES = [
  { icon: Clock, key: 'grading' },
  { icon: Code2, key: 'code' },
  { icon: Users, key: 'team' },
  { icon: AlertTriangle, key: 'feedback' },
]

export function AboutPage() {
  const { t } = useTranslation()

  return (
    <div className="bg-bg-light-orange dark:bg-[#07090e] text-slate-900 dark:text-white overflow-x-hidden antialiased">

      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden py-16 lg:py-20">
        {/* Dynamic Ambient Light System */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Main Orange Glow - moved closer */}
          <div className="absolute top-10 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-[#F37021]/30 dark:from-[#F37021]/15 via-orange-400/15 dark:via-orange-500/10 to-transparent rounded-full blur-[100px] mix-blend-multiply dark:mix-blend-screen opacity-80 dark:opacity-100" />
          
          {/* Secondary Light Center Glow */}
          <div className="absolute top-1/2 left-1/3 w-[400px] h-[400px] bg-gradient-to-r from-amber-300/15 dark:from-orange-500/10 to-transparent rounded-full blur-[80px] mix-blend-multiply dark:mix-blend-screen opacity-60 dark:opacity-80" />
        </div>

        <div className="relative mx-auto max-w-7xl px-6 sm:px-8 z-10">
          <div className="max-w-3xl space-y-6">
            <span className="text-[10px] font-mono font-bold tracking-[0.2em] text-[#F37021] uppercase border border-orange-500/20 bg-orange-500/5 px-3 py-1 rounded">
              {t('about.badge')}
            </span>
            <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white sm:text-5xl lg:text-6xl leading-[1.1]">
              {t('about.title')}{' '}
              <span className="bg-gradient-to-r from-[#F37021] to-orange-400 bg-clip-text text-transparent">
                {t('about.title_accent')}
              </span>
            </h1>
            <p className="text-base sm:text-lg leading-relaxed text-slate-600 dark:text-slate-400 font-light max-w-2xl">
              {t('about.desc')}
            </p>
          </div>
        </div>
      </section>

      {/* ============ CHALLENGES ============ */}
      <section className="py-16 border-t border-slate-200/50 dark:border-slate-800/50">
        <div className="mx-auto max-w-7xl px-6 sm:px-8">
          <div className="grid gap-12 lg:grid-cols-12 items-start">
            <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-24">
              <span className="text-[10px] font-mono font-bold tracking-[0.2em] text-[#F37021] uppercase border border-orange-500/20 bg-orange-500/5 px-3 py-1 rounded">
                {t('about.challenges.badge')}
              </span>
              <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl leading-none">
                {t('about.challenges.title')}
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed font-light">
                {t('about.challenges.desc')}
              </p>
            </div>

            <div className="lg:col-span-8 grid gap-4 sm:grid-cols-2">
              {CHALLENGES.map((item) => (
                <Card
                  key={item.key}
                  className="border border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 p-6 rounded-2xl transition-all duration-500 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-white dark:hover:bg-slate-900 hover:shadow-[0_20px_40px_rgba(0,0,0,0.03)] group"
                >
                  <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl w-fit shadow-sm border border-slate-100 dark:border-slate-700 group-hover:border-orange-500/20 group-hover:bg-orange-500/5 transition-colors duration-500">
                    <item.icon className="text-[#F37021]" size={18} />
                  </div>
                  <h3 className="mt-4 text-sm font-bold text-slate-900 dark:text-white">
                    {t(`about.challenge.${item.key}.title`)}
                  </h3>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-light">
                    {t(`about.challenge.${item.key}.desc`)}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}

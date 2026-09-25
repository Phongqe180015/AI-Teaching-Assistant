import {
  Upload,
  Bot,
  LayoutDashboard,
  TrendingUp,
  BookOpen,
  Bell,
  ClipboardList,
  Sparkles,
  BarChart3,
  Megaphone,
  Users,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/Card'

// Only features that actually exist in the product are listed. Discussion Forum, Teamwork
// Assessment and Adaptive Practice were removed: a codebase scan found no implementation for
// any of them, so advertising them here was inaccurate.
const STUDENT_FEATURES = [
  { id: 'FE-S-01', icon: Upload, key: 'features.s.submission' },
  { id: 'FE-S-02', icon: Bot, key: 'features.s.ai_feedback' },
  { id: 'FE-S-03', icon: LayoutDashboard, key: 'features.s.dashboard' },
  { id: 'FE-S-04', icon: TrendingUp, key: 'features.s.progress' },
  { id: 'FE-S-05', icon: BookOpen, key: 'features.s.history' },
  { id: 'FE-S-06', icon: Bell, key: 'features.s.notify' },
]

const LECTURER_FEATURES = [
  { id: 'FE-L-01', icon: ClipboardList, key: 'features.l.classes' },
  { id: 'FE-L-02', icon: Sparkles, key: 'features.l.ai_gen' },
  { id: 'FE-L-03', icon: BarChart3, key: 'features.l.grading' },
  { id: 'FE-L-04', icon: Megaphone, key: 'features.l.notify' },
]

function FeatureGrid({ features, color }: { features: typeof STUDENT_FEATURES; color: string }) {
  const { t } = useTranslation()
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {features.map((f) => (
        <Card
          key={f.id}
          className="group border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 rounded-xl transition-all duration-500 hover:-translate-y-1 hover:border-slate-900 dark:hover:border-white hover:shadow-md"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-2 rounded-lg ${
              color === 'orange' ? 'bg-orange-50 dark:bg-orange-900/10' :
              color === 'blue' ? 'bg-blue-50 dark:bg-blue-900/10' : 'bg-slate-50 dark:bg-slate-800'
            }`}>
              <f.icon size={16} className={color === 'orange' ? 'text-[#F37021]' : color === 'blue' ? 'text-blue-500' : 'text-slate-600'} />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
              {t(`${f.key}.title`)}
            </h3>
          </div>
          <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400 font-light">
            {t(`${f.key}.desc`)}
          </p>
        </Card>
      ))}
    </div>
  )
}

export function FeaturesPage() {
  const { t } = useTranslation()
  return (
    <div className="bg-bg-light-orange dark:bg-[#07090e] text-slate-900 dark:text-white overflow-x-hidden antialiased">
      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden py-16 lg:py-20">
        {/* Dynamic Ambient Light System */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Bottom Left Orange/Blue Glow - moved inward */}
          <div className="absolute top-1/2 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-[#F37021]/20 dark:from-[#F37021]/15 via-orange-400/15 dark:via-orange-500/10 to-transparent rounded-full blur-[100px] mix-blend-multiply dark:mix-blend-screen opacity-80 dark:opacity-100" />
          
          {/* Top Right Subtle Accent */}
          <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-gradient-to-bl from-amber-400/15 dark:from-orange-500/10 to-transparent rounded-full blur-[100px] mix-blend-multiply dark:mix-blend-screen opacity-60 dark:opacity-80" />
        </div>

        <div className="relative mx-auto max-w-7xl px-6 sm:px-8 z-10">
          <div className="max-w-3xl space-y-4">
            <span className="text-[10px] font-mono font-bold tracking-[0.2em] text-[#F37021] uppercase border border-orange-500/20 bg-orange-500/5 px-3 py-1 rounded">
              {t('features.badge')}
            </span>
            <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white sm:text-5xl lg:text-6xl leading-[1.1]">
              {t('features.title')}{' '}
              <span className="bg-gradient-to-r from-[#F37021] to-orange-400 bg-clip-text text-transparent">
                {t('features.title_accent')}
              </span>
            </h1>
            <p className="text-base leading-relaxed text-slate-600 dark:text-slate-400 font-light max-w-xl">
              {t('features.desc')}
            </p>
          </div>
        </div>
      </section>

      {/* ============ SECTIONS ============ */}
      <section className="py-16 border-t border-slate-200/50 dark:border-slate-800/50">
        <div className="mx-auto max-w-7xl px-6 sm:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div className="space-y-2">
              <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
                <Users className="text-[#F37021]" size={24} />
                {t('features.student.title')}
              </h2>
            </div>
            <span className="text-xs font-mono text-slate-400">{t('features.count', { count: STUDENT_FEATURES.length })}</span>
          </div>
          <FeatureGrid features={STUDENT_FEATURES} color="orange" />
        </div>
      </section>

      <section className="py-16 border-t border-slate-200/50 dark:border-slate-800/50">
        <div className="mx-auto max-w-7xl px-6 sm:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div className="space-y-2">
              <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
                <ClipboardList className="text-blue-500" size={24} />
                {t('features.lecturer.title')}
              </h2>
            </div>
            <span className="text-xs font-mono text-slate-400">{t('features.count', { count: LECTURER_FEATURES.length })}</span>
          </div>
          <FeatureGrid features={LECTURER_FEATURES} color="blue" />
        </div>
      </section>

    </div>
  )
}

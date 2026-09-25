import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Bot,
  Sparkles,
  BrainCircuit,
  CheckCircle2,
  LineChart,
  ShieldCheck,
} from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { PORTAL_LINKS } from '@/constants/navigation'
import { useLanguage } from '@/store/LanguageContext'

export function HomePage() {
  const { t } = useLanguage()
  return (
    <div className="bg-bg-light-orange dark:bg-[#07090e] text-slate-900 dark:text-white overflow-x-hidden antialiased selection:bg-brand-500 selection:text-white">

      {/* ================= HERO SECTION (DEEP TECH ARCHITECTURE) ================= */}
      <section className="relative overflow-hidden bg-bg-light-orange dark:bg-[#07090e] text-slate-900 dark:text-white min-h-[90vh] flex flex-col justify-between transition-colors duration-300">

        {/* Advanced Dynamic Ambient Light System */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-[800px] h-[400px] bg-gradient-to-r from-orange-400/30 dark:from-orange-500/10 to-transparent blur-[160px] rounded-full mix-blend-multiply dark:mix-blend-screen animate-pulse duration-[10s]" />
          <div className="absolute bottom-10 right-1/4 w-[600px] h-[500px] bg-gradient-to-r from-blue-200/40 dark:from-blue-600/10 to-amber-300/30 dark:to-amber-500/5 blur-[140px] rounded-full mix-blend-multiply dark:mix-blend-screen animate-pulse duration-[7s]" />
        </div>

        {/* Cyber Dots Grid Layer */}
        <div className="absolute inset-0 opacity-[0.05] dark:opacity-[0.15] pointer-events-none" style={{ backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)', backgroundSize: '24px_24px' }} />

        {/* Top Floating Glass Header */}
        <div className="relative border-b border-orange-200/50 dark:border-white/[0.06] bg-white/60 dark:bg-[#07090e]/60 backdrop-blur-xl z-20 transition-colors duration-300">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 text-[11px] font-mono tracking-[0.15em] text-slate-400 sm:px-8">
            <span className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#F37021] shadow-[0_0_15px_#F37021] animate-pulse" />
              <span className="font-medium text-slate-900 dark:text-yellow-400 dark:drop-shadow-[0_0_8px_rgba(250,204,21,0.6)] transition-all duration-300">
                FPT UNIVERSITY
              </span>
            </span>
            <span className="hidden md:flex items-center gap-2 font-semibold tracking-wide text-slate-900 dark:text-yellow-400 dark:drop-shadow-[0_0_10px_rgba(250,204,21,0.7)] transition-all duration-300 cursor-default">
              <Bot size={14} className="text-slate-900 dark:text-yellow-400 dark:drop-shadow-[0_0_12px_rgba(250,204,21,0.9)]" />
              AI TEACHING ASSISTANT
            </span>
          </div>
        </div>

        {/* Hero Content Wrapper */}
        <div className="relative mx-auto max-w-7xl px-6 pt-10 pb-16 sm:px-8 lg:pt-16 z-10 w-full mb-auto">
          <div className="grid items-center gap-16 lg:grid-cols-12">

            {/* Left Column: Typography Statement */}
            <div className="max-w-3xl lg:col-span-7 space-y-8 text-center lg:text-left mt-4 lg:mt-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/20 dark:border-white/[0.08] bg-orange-50 dark:bg-white/[0.03] p-1 pr-3 text-[11px] font-mono tracking-wider text-orange-600 dark:text-orange-400 backdrop-blur-md shadow-sm dark:shadow-[0_4px_20px_rgba(0,0,0,0.5)] transition-colors">
                <span className="bg-gradient-to-r from-[#F37021] to-orange-600 text-white font-bold px-2.5 py-1 rounded-full text-[10px]">{t('home.hero.badge')}</span>
                <span className="flex items-center gap-1.5">
                  <Sparkles size={12} className="animate-spin duration-10000" /> {t('home.hero.adaptive')}
                </span>
              </div>

              <h1 className="text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl lg:text-7xl text-slate-900 dark:text-white">
                {t('home.hero.title1')} <br />
                <span className="bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 dark:from-white dark:via-slate-200 dark:to-orange-500 bg-clip-text text-transparent">
                  AI Teaching Assistant
                </span>
                <span className="text-[#F37021] inline-block ml-1 animate-pulse"></span>
              </h1>

              <p className="max-w-xl text-sm sm:text-base leading-relaxed text-slate-600 dark:text-slate-400 mx-auto lg:mx-0 font-normal tracking-wide">
                {t('home.hero.desc')}
              </p>

              <div className="flex flex-wrap gap-4 justify-center lg:justify-start pt-4">
                <Link to="/lecturer">
                  <Button
                    size="lg"
                    className="bg-slate-900 border border-transparent dark:bg-white font-bold text-white dark:text-black shadow-lg shadow-orange-500/10 dark:shadow-[0_20px_40px_rgba(255,255,255,0.05)] hover:bg-orange-500 dark:hover:bg-orange-500 hover:text-white dark:hover:text-white rounded-lg px-8 gap-2 transition-all duration-300 hover:shadow-[0_0_30px_rgba(243,112,33,0.3)] hover:-translate-y-0.5"
                  >
                    {t('home.hero.btn_lecturer')}
                    <ArrowRight size={16} className="stroke-[3]" />
                  </Button>
                </Link>

                <Link to="/student">
                  <Button
                    size="lg"
                    className="bg-slate-900 border border-transparent dark:bg-white font-bold text-white dark:text-black shadow-lg shadow-orange-500/10 dark:shadow-[0_20px_40px_rgba(255,255,255,0.05)] hover:bg-orange-500 dark:hover:bg-orange-500 hover:text-white dark:hover:text-white rounded-lg px-8 gap-2 transition-all duration-300 hover:shadow-[0_0_30px_rgba(243,112,33,0.3)] hover:-translate-y-0.5"
                  >
                    {t('home.hero.btn_student')}
                  </Button>
                </Link>
              </div>

              {/* Stats Cyber Layout */}
              <div className="grid grid-cols-3 gap-6 pt-10 border-t border-orange-500/10 dark:border-white/[0.05] max-w-lg mx-auto lg:mx-0">
                {[
                  { value: t('home.stat.roles.value'), label: t('home.stat.roles.label') },
                  { value: t('home.stat.ai.value'), label: t('home.stat.ai.label') },
                  { value: t('home.stat.review.value'), label: t('home.stat.review.label') },
                ].map((item) => (
                  <div key={item.label} className="group">
                    <p className="text-3xl font-black font-mono tracking-tight text-slate-900 dark:text-white group-hover:text-[#F37021] transition-colors">
                      {item.value}
                    </p>
                    <p className="mt-1 text-[9px] font-mono font-bold tracking-[0.2em] text-slate-500 dark:text-slate-500">
                      {item.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Premium Dashboard Preview HUD */}
            <div className="lg:col-span-5 relative w-full max-w-md mx-auto lg:max-w-none">
              <div className="absolute -inset-1 bg-gradient-to-tr from-[#F37021] to-blue-600 rounded-[24px] opacity-20 blur-xl animate-pulse" />
              <div className="relative rounded-[20px] border border-white/[0.08] bg-[#0c1017]/80 p-4 shadow-2xl backdrop-blur-2xl">
                <div className="rounded-[14px] bg-[#07090e] p-6 text-white border border-white/[0.03]">

                  {/* Glass Header HUD */}
                  <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-red-500/50" />
                        <span className="w-2 h-2 rounded-full bg-yellow-500/50" />
                        <span className="w-2 h-2 rounded-full bg-green-500/50" />
                      </div>
                      <p className="text-xs font-mono font-bold text-slate-400">LECTURER_CONTROL_PANEL</p>
                    </div>
                    <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                  </div>

                  {/* Internal Analytics Matrix */}
                  <div className="mt-6 grid grid-cols-2 gap-3">
                    {[
                      { icon: BrainCircuit, title: t('home.hud.generate.title'), value: t('home.hud.generate.value') },
                      { icon: CheckCircle2, title: t('home.hud.grading.title'), value: t('home.hud.grading.value') },
                      { icon: LineChart, title: t('home.hud.progress.title'), value: t('home.hud.progress.value') },
                      { icon: ShieldCheck, title: t('home.hud.review.title'), value: t('home.hud.review.value') },
                    ].map((item) => (
                      <div
                        key={item.title}
                        className="rounded-xl border border-white/[0.03] bg-white/[0.01] p-4 transition-all duration-300 hover:bg-white/[0.03] hover:border-white/[0.08]"
                      >
                        <item.icon className="text-[#F37021]" size={16} />
                        <p className="mt-3 text-[10px] font-mono tracking-wider text-slate-500 uppercase">
                          {item.title}
                        </p>
                        <p className="mt-0.5 text-xs font-bold text-slate-200">
                          {item.value}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Progress Matrix Line */}
                  <div className="mt-5 rounded-xl border border-white/[0.03] bg-white/[0.01] p-4 font-mono">
                    <div className="flex items-center justify-between text-[11px]">
                      <p className="text-slate-400"> {t('home.hud.progress_label')}</p>
                      <p className="text-emerald-400 font-bold">{t('home.hud.progress_state')}</p>
                    </div>
                    <div className="mt-3 h-1 rounded-full bg-slate-900 overflow-hidden">
                      <div className="h-full w-[78%] rounded-full bg-gradient-to-r from-[#F37021] to-amber-500" />
                    </div>
                  </div>

                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ================= SYSTEM PORTALS SECTION (PREMIUM BORDERS) ================= */}
      <section className="bg-bg-light-orange dark:bg-[#07090e] py-32">
        <div className="mx-auto max-w-7xl px-6 sm:px-8">

          <div className="max-w-2xl space-y-4 mb-20">
            <span className="text-[10px] font-mono font-bold tracking-[0.2em] text-[#F37021] uppercase border border-orange-500/20 bg-orange-500/5 px-3 py-1 rounded">
              SYSTEM PORTALS
            </span>
            <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-5xl">
              {t('home.portal.title')}
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2 max-w-2xl mx-auto">
            {PORTAL_LINKS.map((p, index) => {
              const hoverBorders = [
                'hover:border-orange-500',
                'hover:border-blue-500',
                'hover:border-slate-900 dark:hover:border-white'
              ];

              return (
                <Link key={p.path} to={p.path} className="group block h-full">
                  <Card
                    className={`h-full border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 rounded-xl transition-all duration-500 hover:shadow-[0_30px_50px_rgba(0,0,0,0.04)] flex flex-col justify-between ${hoverBorders[index] || 'hover:border-orange-500'}`}
                  >
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-orange-600 transition-colors duration-300">
                        {t(`nav.${p.role}` as any)}
                      </h3>
                      <p className="mt-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400 font-light">
                        {t(`nav.${p.role}_desc` as any)}
                      </p>
                    </div>

                    <div className="mt-10 flex items-center gap-2 text-[10px] font-mono font-bold tracking-wider uppercase text-slate-400 group-hover:text-slate-950 dark:group-hover:text-white transition-colors pt-4 border-t border-slate-100 dark:border-slate-800">
                      <span>ENTER_PORTAL</span>
                      <ArrowRight size={12} className="transform group-hover:translate-x-1.5 transition-transform duration-300" />
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>

        </div>
      </section>
    </div>
  )
}
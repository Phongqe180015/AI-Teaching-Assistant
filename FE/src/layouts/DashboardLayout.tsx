import { useState, useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import type { NavItem, UserRole } from '@/types'
import { DashboardSidebar } from './DashboardSidebar'
import { DashboardTopbar } from './DashboardTopbar'
import { DashboardFooter } from './DashboardFooter'
import { aiGenerationStore, type AiGenerationState } from '@/services/aiGenerationStore'
import { promptGenerationStore, type PromptGenerationState } from '@/services/promptGenerationStore'
import { Sparkles, ArrowRight, Loader2, CheckCircle2, X } from 'lucide-react'

interface Props {
  navItems: NavItem[]
  role: UserRole
  roleLabel: string
  portalTitle: string
}

export function DashboardLayout({ navItems, role, roleLabel, portalTitle }: Props) {
  const [collapsed, setCollapsed] = useState(false)
  const [aiState, setAiState] = useState<AiGenerationState>(aiGenerationStore.getState())
  const [promptState, setPromptState] = useState<PromptGenerationState>(promptGenerationStore.getState())
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const unsubAi = aiGenerationStore.subscribe(setAiState)
    const unsubPrompt = promptGenerationStore.subscribe(setPromptState)
    return () => {
      unsubAi()
      unsubPrompt()
    }
  }, [])

  const isAssignmentUploadPage = location.pathname.includes('/grading/assignments/upload')
  const isPromptPage = location.pathname.includes('/prompts')

  const showAssignmentBanner = (aiState.isGenerating || aiState.isCompleted) && !isAssignmentUploadPage
  const showPromptBanner = (promptState.isGenerating || promptState.isCompleted) && !isPromptPage

  return (
    <div className="min-h-screen bg-[#fefefe] dark:bg-[#0f1117] transition-colors duration-300 relative">
      {/* Floating Background AI Assignment Generation Status Banner */}
      {showAssignmentBanner && (
        <div className="fixed top-4 right-6 z-[9999] animate-in slide-in-from-top-4 duration-300">
          <div className="bg-gradient-to-r from-slate-900 via-brand-950 to-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-brand-500/30 flex items-center gap-4 max-w-md backdrop-blur-md">
            <div className="w-10 h-10 rounded-xl bg-brand-500/20 text-brand-400 flex items-center justify-center shrink-0 border border-brand-500/30">
              {aiState.isGenerating ? (
                <Loader2 size={20} className="animate-spin text-brand-400" />
              ) : (
                <CheckCircle2 size={20} className="text-emerald-400" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-amber-400 animate-pulse" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  {aiState.isGenerating ? 'Gemini is generating the assignment in the background' : 'AI assignment generation complete!'}
                </h4>
              </div>
              <p className="text-xs text-slate-300 font-medium truncate mt-0.5">
                {aiState.isGenerating
                  ? aiState.loadingMsg || 'Please wait while AI processes your request...'
                  : 'Click here to view results and save the assignment.'}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  aiGenerationStore.clearCompleted();
                  navigate('/lecturer/grading/assignments/upload');
                }}
                className="px-3.5 py-1.5 bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
              >
                <span>View</span>
                <ArrowRight size={14} />
              </button>
              <button
                onClick={() => aiGenerationStore.clearCompleted()}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
                title="Close notification"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Background AI Prompt Generation Status Banner */}
      {showPromptBanner && (
        <div className="fixed top-4 right-6 z-[9999] animate-in slide-in-from-top-4 duration-300">
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-indigo-500/30 flex items-center gap-4 max-w-md backdrop-blur-md">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/30">
              {promptState.isGenerating ? (
                <Loader2 size={20} className="animate-spin text-indigo-400" />
              ) : (
                <CheckCircle2 size={20} className="text-emerald-400" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-amber-400 animate-pulse" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  {promptState.isGenerating ? 'AI is initializing the system prompt in the background' : 'AI prompt generation complete!'}
                </h4>
              </div>
              <p className="text-xs text-slate-300 font-medium truncate mt-0.5">
                {promptState.isGenerating
                  ? promptState.loadingMsg || 'Please wait while AI initializes the system prompt...'
                  : 'Click here to view and save the system prompt.'}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  promptGenerationStore.clearCompleted();
                  if (promptState.subjectId) {
                    const targetPath = promptState.promptId
                      ? `/lecturer/prompts/${promptState.subjectId}/${promptState.promptId}`
                      : `/lecturer/prompts/${promptState.subjectId}/create`;
                    navigate(targetPath);
                  }
                }}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
              >
                <span>View</span>
                <ArrowRight size={14} />
              </button>
              <button
                onClick={() => promptGenerationStore.clearCompleted()}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
                title="Close notification"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      <DashboardSidebar
        navItems={navItems}
        role={role}
        roleLabel={roleLabel}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(c => !c)}
      />
      <div className={`flex flex-col min-h-screen transition-[margin] duration-300 ease-in-out ${collapsed ? 'ml-[68px]' : 'ml-64'}`}>
        <DashboardTopbar title={portalTitle} sidebarCollapsed={collapsed} />
        <main className="flex-1 min-h-[calc(100vh-130px)] px-4 sm:px-6 lg:px-8 pt-6 pb-8 animate-fade-in-up">
          <Outlet />
        </main>
        <DashboardFooter />
      </div>
    </div>
  )
}

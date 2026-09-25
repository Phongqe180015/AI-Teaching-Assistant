import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { api } from '@/lib/api';
import { promptGenerationStore } from '@/services/promptGenerationStore';
import { 
  ArrowLeft, Save, AlertCircle, Sparkles, Wand2, Bot, CheckCircle2, 
  FileText, Edit3, Terminal, ChevronRight, X, FileCode, CheckSquare,
  Globe, Hash, Sliders, AlignLeft, ArrowRight, Loader2
} from 'lucide-react';

function generateConfiguredPrompt(params: {
  templateType: 'quiz' | 'essay';
  questionCount: number;
  language: 'vi' | 'en';
  difficulty: string;
  topic: string;
  description: string;
  subjectCode: string;
}) {
  const langText = params.language === 'vi' ? 'Tiếng Việt' : 'Tiếng Anh';
  const typeText = params.templateType === 'quiz' ? 'Trắc nghiệm' : 'Tự luận / Lập trình';
  const code = params.subjectCode || 'SUBJECT';
  const topicText = params.topic.trim() || 'Tổng hợp kiến thức môn học';

  if (params.templateType === 'quiz') {
    return `Bạn là một giảng viên/chuyên gia hàng đầu về môn học ${code}.
Nhiệm vụ của bạn là tạo đề thi/bài tập dựa trên cấu hình chi tiết sau:

- Dạng đề: ${typeText}
- Chủ đề: ${topicText}
- Số lượng câu: ${params.questionCount} câu
- Mức độ khó: ${params.difficulty}
- Ngôn ngữ: ${langText}
${params.description.trim() ? `- Mô tả / Yêu cầu chi tiết: ${params.description.trim()}\n` : ''}
Yêu cầu đầu ra:
1. Tạo đúng ${params.questionCount} câu hỏi trắc nghiệm thuộc chủ đề "${topicText}".
2. Mỗi câu hỏi gồm 4 lựa chọn (A, B, C, D), có chỉ rõ đáp án đúng và giải thích chi tiết.
3. Nội dung câu hỏi tuân thủ đúng mức độ khó (${params.difficulty}) và trình bày hoàn toàn bằng ${langText}.
4. Định dạng phản hồi: Markdown sạch sẽ, chuyên nghiệp.`;
  }

  return `Bạn là một giảng viên/chuyên gia hàng đầu về môn học ${code}.
Nhiệm vụ của bạn là tạo bài tập tự luận/thực hành coding dựa trên cấu hình chi tiết sau:

- Dạng đề: ${typeText}
- Chủ đề: ${topicText}
- Số lượng: ${params.questionCount} câu/bài
- Mức độ khó: ${params.difficulty}
- Ngôn ngữ: ${langText}
${params.description.trim() ? `- Mô tả / Yêu cầu chi tiết: ${params.description.trim()}\n` : ''}
Yêu cầu đầu ra:
1. Tạo đúng ${params.questionCount} bài tập tự luận/lập trình thuộc chủ đề "${topicText}".
2. Cung cấp bài toán thực tế, các yêu cầu kỹ thuật chi tiết, bộ Test Cases I/O mẫu và Code Skeleton.
3. Nội dung bài tập tuân thủ đúng mức độ khó (${params.difficulty}) và trình bày hoàn toàn bằng ${langText}.
4. Định dạng phản hồi: Markdown sạch sẽ, chuyên nghiệp.`;
}

export function PromptCreateEdit() {
  const { subjectId, promptId } = useParams<{ subjectId: string; promptId?: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const isEditing = Boolean(promptId);

  const [formData, setFormData] = useState({
    name: '',
    category: 'Chung',
    templateContent: '',
    temperature: 0.7,
    isActive: true,
  });

  const [subject, setSubject] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiSuccessMessage, setAiSuccessMessage] = useState<string | null>(null);

  // Template Selection Config States
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateType, setTemplateType] = useState<'quiz' | 'essay'>('quiz');
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [language, setLanguage] = useState<'vi' | 'en'>('vi');
  const [difficulty, setDifficulty] = useState<string>('Trung bình');
  const [topicInput, setTopicInput] = useState<string>('');
  const [descriptionInput, setDescriptionInput] = useState<string>('');

  useEffect(() => {
    if (!subjectId) return;

    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [promptsData, subjectsData] = await Promise.all([
          api.getPromptTemplates(subjectId),
          api.getSubjects(1, 1000)
        ]);

        const subList = Array.isArray(subjectsData) ? subjectsData : (subjectsData as any)?.data || [];
        const currentSub = subList.find((s: any) => s.id === subjectId || s.code === subjectId);
        const subObj = currentSub || { id: subjectId, name: subjectId, code: subjectId };
        setSubject(subObj);

        if (isEditing && promptId) {
          const target = promptsData?.find((p: any) => p.id === promptId);
          if (target) {
            setFormData({
              name: target.name || target.title || subObj.code || '',
              category: target.category || 'Chung',
              templateContent: target.templateContent || target.content || '',
              temperature: target.temperature ?? 0.7,
              isActive: target.isActive !== false,
            });
          }
        } else {
          setFormData(prev => ({ ...prev, name: prev.name || subObj.code || '' }));
        }
      } catch (err) {
        console.error('Failed to fetch prompt details:', err);
        setError(t('lc.pe.load_failed'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [subjectId, promptId, isEditing]);

  // Synchronize with background Prompt Generation store
  useEffect(() => {
    const unsubscribe = promptGenerationStore.subscribe((storeState) => {
      setIsAiGenerating(storeState.isGenerating);
      if (storeState.error) setError(storeState.error);
      if (storeState.successMsg) {
        setAiSuccessMessage(storeState.successMsg);
        setTimeout(() => setAiSuccessMessage(null), 3500);
      }
      if (storeState.generatedContent) {
        setFormData(prev => ({ ...prev, templateContent: storeState.generatedContent! }));
      }
    });
    return unsubscribe;
  }, []);

  const handleExecuteGenerate = async () => {
    setShowTemplateModal(false);
    setError(null);
    const code = subject?.code || subjectId || 'SUBJECT';
    const fallbackPrompt = generateConfiguredPrompt({
      templateType,
      questionCount,
      language,
      difficulty,
      topic: topicInput,
      description: descriptionInput,
      subjectCode: code,
    });

    promptGenerationStore.startExecuteGenerate({
      templateType,
      questionCount,
      language,
      difficulty,
      topic: topicInput,
      description: descriptionInput,
      subjectCode: code,
      subjectId: subjectId || '',
      promptId,
      name: formData.name || code || 'Prompt Template',
      fallbackPrompt,
    });
  };

  const handleAiRefine = async () => {
    if (!formData.templateContent.trim()) {
      setError(t('lc.pe.need_content'));
      return;
    }
    setError(null);
    const code = subject?.code || subjectId || 'CNTT';
    promptGenerationStore.startAiRefine({
      content: formData.templateContent,
      subjectCode: code,
      subjectId: subjectId || '',
      promptId,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.templateContent.trim()) {
      setError(t('lc.pe.need_name_content'));
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      const payload = {
        ...formData,
        subjectId,
      };

      if (isEditing && promptId) {
        await api.updatePromptTemplate(promptId, payload);
      } else {
        await api.createPromptTemplate(payload);
      }

      promptGenerationStore.reset();
      navigate(`/lecturer/prompts/${subjectId}`);
    } catch (err: any) {
      console.error('Failed to save prompt:', err);
      setError(err?.response?.data?.error || err?.message || t('lc.pe.save_failed'));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-3 border-brand-600 border-t-transparent mb-4"></div>
        <p className="text-slate-500 font-medium">{t('lc.pe.loading')}</p>
      </div>
    );
  }

  const codeLabel = subject?.code || subjectId || t('lc.pe.subject_fallback');

  return (
    <div className="p-4 sm:p-6 w-full max-w-[1500px] mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Top Header matching Image 2 */}
      <div className="space-y-2">
        <button
          onClick={() => { promptGenerationStore.reset(); navigate(`/lecturer/prompts/${subjectId}`); }}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-brand-600 transition-colors font-medium"
        >
          <ArrowLeft size={16} /> {t('lc.pe.back')}
        </button>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>{t('lc.pe.crumb_lecturer')}</span>
          <ChevronRight size={12} />
          <span>{t('lc.pe.crumb_prompts')}</span>
          <ChevronRight size={12} />
          <span className="font-semibold text-slate-600">{codeLabel}</span>
          <ChevronRight size={12} />
          <span>{isEditing ? t('lc.pe.crumb_edit') : t('lc.pe.crumb_create')}</span>
        </div>

        <h1 className="text-2xl font-bold text-slate-900 dark:text-white pt-1">
          {t('lc.pe.page_title', { code: codeLabel })}
        </h1>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-sm font-semibold flex items-center gap-2">
          <AlertCircle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {aiSuccessMessage && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-700 dark:text-emerald-300 text-sm font-semibold flex items-center gap-2">
          <CheckCircle2 size={18} className="shrink-0 text-emerald-500" />
          <span>{aiSuccessMessage}</span>
        </div>
      )}

      {/* Main Card matching Image 2 */}
      <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-8">
        
        {/* Banner Box Inside Card matching Image 2 */}
        <div className="flex items-center gap-4 p-4 sm:p-5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100/80 dark:border-indigo-900/40">
          <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Bot size={24} />
          </div>
          <div>
            <h2 className="font-bold text-slate-900 dark:text-white text-base">
              {isEditing ? t('lc.pe.banner_edit', { code: codeLabel }) : t('lc.pe.banner_create', { code: codeLabel })}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
              {t('lc.pe.banner_desc')}
            </p>
          </div>
        </div>

        {/* Form Body matching Image 2 */}
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* PROMPT NAME */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              <FileText size={14} className="text-indigo-600 dark:text-indigo-400" />
              {t('lc.pe.name_label')} <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Edit3 size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={codeLabel}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition-all text-slate-800 dark:text-slate-200"
                required
              />
            </div>
          </div>

          {/* NỘI DUNG PROMPT SYSTEM */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                <Terminal size={14} className="text-indigo-600 dark:text-indigo-400" />
                {t('lc.pe.content_label')} <span className="text-rose-500">*</span>
              </label>

              {/* Two AI Buttons matching Image 2 */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowTemplateModal(true)}
                  disabled={isAiGenerating}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 rounded-xl font-bold text-xs border border-indigo-200/80 dark:border-indigo-800/80 transition-all shadow-xs"
                >
                  <Wand2 size={14} className={isAiGenerating ? 'animate-spin' : ''} />
                  {isAiGenerating ? t('lc.pe.generating') : t('lc.pe.generate_ai')}
                </button>

                <button
                  type="button"
                  onClick={handleAiRefine}
                  disabled={isAiGenerating}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 rounded-xl font-bold text-xs border border-amber-200/80 dark:border-amber-800/80 transition-all shadow-xs"
                >
                  <Sparkles size={14} />
                  {t('lc.pe.ai_refine')}
                </button>
              </div>
            </div>

            {/* Window Titlebar Editor Box matching Image 2 */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
              {/* Terminal Window Header (Red, Yellow, Green dots + filename) */}
              <div className="px-4 py-3 bg-slate-100/90 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700/80 flex items-center gap-3 text-xs font-mono text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-rose-500 block"></span>
                  <span className="w-3 h-3 rounded-full bg-amber-500 block"></span>
                  <span className="w-3 h-3 rounded-full bg-emerald-500 block"></span>
                </div>
                <span className="ml-2 font-medium">system_prompt.txt</span>
              </div>

              {/* Code Editor Textarea */}
              <textarea
                rows={12}
                placeholder={t('lc.pe.content_placeholder')}
                value={formData.templateContent}
                onChange={(e) => setFormData({ ...formData, templateContent: e.target.value })}
                className="w-full p-5 bg-slate-50/70 dark:bg-slate-950/80 text-slate-800 dark:text-slate-200 text-xs font-mono outline-none resize-y leading-relaxed"
                required
              />
            </div>
          </div>

          {/* Form Footer Buttons matching Image 2 */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => navigate(`/lecturer/prompts/${subjectId}`)}
              className="px-6 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-bold border border-slate-200 dark:border-slate-700 transition-all shadow-xs"
            >
              {t('lc.pe.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-indigo-500/20 active:scale-[0.98] transition-all"
            >
              <Save size={16} />
              {isSaving ? t('lc.pe.saving') : t('lc.pe.save')}
            </button>
          </div>

        </form>
      </div>

      {/* Senior AI Config Template Modal */}
      {showTemplateModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto min-h-full">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-xl w-full flex flex-col overflow-hidden animate-scale-up my-auto shrink-0">
            
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Wand2 size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    {t('lc.pe.modal_title')}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {t('lc.pe.modal_subject')} <strong className="text-indigo-600 dark:text-indigo-400">{codeLabel}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowTemplateModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              
              {/* 1. Select template format (quiz or essay/coding) */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <FileCode size={14} className="text-indigo-600 dark:text-indigo-400" />
                  {t('lc.pe.choose_format')} <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div
                    onClick={() => setTemplateType('quiz')}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${
                      templateType === 'quiz'
                        ? 'bg-indigo-50/90 dark:bg-indigo-950/60 border-indigo-500 shadow-sm text-indigo-900 dark:text-indigo-200 font-bold'
                        : 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-indigo-300 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      templateType === 'quiz' ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}>
                      <CheckSquare size={16} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold">{t('lc.pe.quiz')}</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">{t('lc.pe.quiz_desc')}</p>
                    </div>
                  </div>

                  <div
                    onClick={() => setTemplateType('essay')}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${
                      templateType === 'essay'
                        ? 'bg-indigo-50/90 dark:bg-indigo-950/60 border-indigo-500 shadow-sm text-indigo-900 dark:text-indigo-200 font-bold'
                        : 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-indigo-300 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      templateType === 'essay' ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}>
                      <FileCode size={16} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold">{t('lc.pe.essay')}</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">{t('lc.pe.essay_desc')}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Grid parameters: count - difficulty - language */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Question count */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <Hash size={13} className="text-indigo-600" /> {t('lc.pe.question_count')}
                  </label>
                  <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-800/80">
                    <button
                      type="button"
                      onClick={() => setQuestionCount(prev => Math.max(1, prev - 1))}
                      className="px-3 py-2.5 bg-slate-200/60 dark:bg-slate-700/60 hover:bg-slate-300/80 text-slate-700 dark:text-slate-200 font-bold transition-all text-sm shrink-0"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={questionCount}
                      onChange={(e) => setQuestionCount(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
                      className="w-full text-center bg-transparent text-sm font-bold outline-none text-slate-800 dark:text-slate-200"
                    />
                    <button
                      type="button"
                      onClick={() => setQuestionCount(prev => Math.min(100, prev + 1))}
                      className="px-3 py-2.5 bg-slate-200/60 dark:bg-slate-700/60 hover:bg-slate-300/80 text-slate-700 dark:text-slate-200 font-bold transition-all text-sm shrink-0"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Difficulty */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <Sliders size={13} className="text-amber-500" /> {t('lc.pe.difficulty')}
                  </label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-200"
                  >
                    {/* Values stay Vietnamese: they are interpolated into the prompt sent to the AI. */}
                    <option value="Dễ">{t('lc.pe.easy')}</option>
                    <option value="Trung bình">{t('lc.pe.medium')}</option>
                    <option value="Khó">{t('lc.pe.hard')}</option>
                  </select>
                </div>

                {/* Language */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <Globe size={13} className="text-emerald-500" /> {t('lc.pe.language')}
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as 'vi' | 'en')}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-200"
                  >
                    <option value="vi">{t('lc.pe.lang_vi')}</option>
                    <option value="en">{t('lc.pe.lang_en')}</option>
                  </select>
                </div>
              </div>

              {/* 3. Topic */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <AlignLeft size={13} className="text-indigo-600" /> {t('lc.pe.topic')} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder={t('lc.pe.topic_placeholder')}
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:border-indigo-500 transition-all text-slate-800 dark:text-slate-200"
                />
              </div>

              {/* 4. Detailed description */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {t('lc.pe.description')}
                </label>
                <textarea
                  rows={3}
                  placeholder={t('lc.pe.description_placeholder')}
                  value={descriptionInput}
                  onChange={(e) => setDescriptionInput(e.target.value)}
                  className="w-full p-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium outline-none focus:border-indigo-500 transition-all text-slate-800 dark:text-slate-200 leading-relaxed resize-y"
                />
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowTemplateModal(false)}
                className="px-5 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-800 text-xs font-bold"
              >
                {t('lc.pe.close')}
              </button>
              <button
                type="button"
                onClick={handleExecuteGenerate}
                disabled={isAiGenerating}
                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-500/20 active:scale-[0.98] transition-all"
              >
                {isAiGenerating ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> {t('lc.pe.generating_prompt')}
                  </>
                ) : (
                  <>
                    <Sparkles size={16} /> {t('lc.pe.generate_prompt')} <ArrowRight size={14} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

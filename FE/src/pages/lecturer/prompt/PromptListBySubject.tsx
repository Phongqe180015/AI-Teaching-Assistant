import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { api } from '@/lib/api';
import {
  ArrowLeft, Plus, Search, Edit3, Trash2, Bot, Tag, CheckCircle2,
  Copy, Check, Eye, Terminal, Sparkles, Zap, Sliders, X, Code2, BookOpen, AlertTriangle
} from 'lucide-react';

export function PromptListBySubject() {
  const { subjectId } = useParams<{ subjectId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [prompts, setPrompts] = useState<any[]>([]);
  const [subject, setSubject] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeletePrompt, setConfirmDeletePrompt] = useState<{ id: string; name: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedPrompt, setSelectedPrompt] = useState<any | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  useEffect(() => {
    if (!subjectId) return;

    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [promptsData, subjectsData] = await Promise.all([
          api.getPromptTemplates(subjectId),
          api.getSubjects(1, 1000)
        ]);

        setPrompts(Array.isArray(promptsData) ? promptsData : []);

        const subList = Array.isArray(subjectsData) ? subjectsData : (subjectsData as any)?.data || [];
        const currentSub = subList.find((s: any) => s.id === subjectId || s.code === subjectId);
        setSubject(currentSub || { id: subjectId, name: subjectId, code: subjectId });
      } catch (err) {
        console.error('Failed to load prompts for subject:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [subjectId]);

  const handleConfirmDelete = async () => {
    if (!confirmDeletePrompt) return;
    const { id, name } = confirmDeletePrompt;
    try {
      setDeletingId(id);
      await api.deletePromptTemplate(id);
      setPrompts((prev) => prev.filter((p) => p.id !== id));
      if (selectedPrompt?.id === id) setSelectedPrompt(null);
      setToastMessage(t('lc.pl.deleted_toast', { name }));
      setConfirmDeletePrompt(null);
    } catch (err) {
      console.error('Failed to delete prompt:', err);
      setToastMessage(t('lc.pl.delete_failed'));
    } finally {
      setDeletingId(null);
    }
  };

  const handleCopyContent = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setToastMessage(t('lc.pl.copied_toast'));
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredPrompts = useMemo(() => {
    return prompts.filter((p) =>
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.templateContent?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [prompts, searchQuery]);

  const extractVariables = (content: string) => {
    if (!content) return [];
    const matches = content.match(/\{[a-zA-Z0-9_]+\}/g);
    if (!matches) return [];
    return Array.from(new Set(matches));
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {toastMessage && (
        <div className="fixed top-20 right-6 z-[100] animate-toast-in">
          <div className="bg-slate-900 text-white dark:bg-slate-800 dark:text-slate-100 px-4 py-3 rounded-xl shadow-xl border border-slate-700 flex items-center gap-3 text-sm font-medium">
            <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/lecturer/prompts')}
            className="p-2.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
            title={t('lc.pl.back_title')}
          >
            <ArrowLeft size={20} />
          </button>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-brand-50 dark:bg-brand-950/50 text-brand-700 dark:text-brand-300 font-bold text-xs rounded-lg border border-brand-200 dark:border-brand-800 flex items-center gap-1.5">
                <BookOpen size={12} />
                {subject?.code || t('lc.pl.subject_fallback')}
              </span>
              <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
                {t('lc.pl.count', { n: prompts.length })}
              </span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {subject?.name || t('lc.pl.title_fallback')}
            </h1>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder={t('lc.pl.search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-brand-500 focus:bg-white dark:focus:bg-slate-900 transition-all text-slate-800 dark:text-slate-200"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={16} />
              </button>
            )}
          </div>
          <button
            onClick={() => navigate(`/lecturer/prompts/${subjectId}/create`)}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-md shadow-brand-500/15 active:scale-[0.98] transition-all whitespace-nowrap"
          >
            <Plus size={18} /> {t('lc.pl.new_prompt')}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="animate-spin rounded-full h-10 w-10 border-3 border-brand-600 border-t-transparent mb-4"></div>
          <p className="text-slate-500 dark:text-slate-400 font-medium">{t('lc.pl.loading')}</p>
        </div>
      ) : filteredPrompts.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-4">
            <Bot size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
            {searchQuery ? t('lc.pl.none_found') : t('lc.pl.none_yet')}
          </h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mt-1.5 mb-6">
            {searchQuery
              ? t('lc.pl.no_match')
              : t('lc.pl.create_first_desc')}
          </p>
          {!searchQuery && (
            <button
              onClick={() => navigate(`/lecturer/prompts/${subjectId}/create`)}
              className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-all"
            >
              <Plus size={18} /> {t('lc.pl.create_first')}
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredPrompts.map((prompt) => {
            const vars = extractVariables(prompt.templateContent);
            const isCopying = copiedId === prompt.id;

            return (
              <div
                key={prompt.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-brand-300 dark:hover:border-brand-700 transition-all duration-200 flex flex-col justify-between overflow-hidden group"
              >
                <div className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0 border border-brand-100 dark:border-brand-800/60 group-hover:scale-105 transition-transform">
                        <Sparkles size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white text-base group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors line-clamp-1">
                          {prompt.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                            <Tag size={12} className="text-brand-500" />
                            {prompt.category || t('lc.pl.category_general')}
                          </span>
                          {prompt.temperature != null && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md border border-slate-200/60 dark:border-slate-700/60">
                              <Sliders size={11} />
                              {t('lc.pl.temp', { value: prompt.temperature })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {prompt.isActive !== false ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800/80">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                          {t('lc.pl.enabled')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">
                          <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                          {t('lc.pl.disabled')}
                        </span>
                      )}
                    </div>
                  </div>

                  {vars.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{t('lc.pl.variables')}</span>
                      {vars.slice(0, 4).map((v, i) => (
                        <span key={i} className="text-[11px] font-mono font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-900/50">
                          {v}
                        </span>
                      ))}
                      {vars.length > 4 && (
                        <span className="text-[11px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                          +{vars.length - 4}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="relative group/box">
                    <div className="flex items-center justify-between px-3 py-1.5 bg-slate-200/70 dark:bg-slate-800 rounded-t-xl text-[11px] font-mono text-slate-600 dark:text-slate-400 border-t border-x border-slate-200 dark:border-slate-700/80">
                      <span className="flex items-center gap-1.5 font-semibold">
                        <Terminal size={12} className="text-brand-500" /> {t('lc.pl.system_template')}
                      </span>
                      <button
                        onClick={() => handleCopyContent(prompt.templateContent, prompt.id)}
                        className="flex items-center gap-1 hover:text-brand-600 dark:hover:text-brand-400 transition-colors font-sans font-medium"
                      >
                        {isCopying ? (
                          <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <Check size={12} /> {t('lc.pl.copied')}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Copy size={12} /> {t('lc.pl.copy')}
                          </span>
                        )}
                      </button>
                    </div>
                    <div className="p-3.5 bg-slate-50/90 dark:bg-slate-950/80 border-x border-b border-slate-200 dark:border-slate-800 rounded-b-xl text-slate-700 dark:text-slate-300 text-xs font-mono whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto custom-scrollbar">
                      {prompt.templateContent}
                    </div>
                  </div>
                </div>

                <div className="px-5 py-3 bg-slate-50/60 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-medium">
                    <Zap size={14} className="text-amber-500" />
                    <span>{t('lc.pl.uses')} <strong className="text-slate-700 dark:text-slate-200">{prompt.usageCount || 0}</strong></span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setSelectedPrompt(prompt)}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-slate-600 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/50 rounded-lg transition-all font-medium text-xs border border-transparent hover:border-brand-200 dark:hover:border-brand-800"
                      title={t('lc.pl.view_title')}
                    >
                      <Eye size={14} /> {t('lc.pl.view')}
                    </button>
                    <button
                      onClick={() => navigate(`/lecturer/prompts/${subjectId}/edit/${prompt.id}`)}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-slate-600 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/50 rounded-lg transition-all font-medium text-xs border border-transparent hover:border-brand-200 dark:hover:border-brand-800"
                      title={t('lc.pl.edit_title')}
                    >
                      <Edit3 size={14} /> {t('lc.pl.edit')}
                    </button>
                    <button
                      onClick={() => setConfirmDeletePrompt({ id: prompt.id, name: prompt.name })}
                      disabled={deletingId === prompt.id}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-all font-medium text-xs border border-transparent hover:border-rose-200 dark:hover:border-rose-800"
                      title={t('lc.pl.delete_title')}
                    >
                      <Trash2 size={14} /> {t('lc.pl.delete')}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedPrompt && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto min-h-full">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-scale-up my-auto shrink-0">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    {selectedPrompt.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    <span>{subject?.code}</span>
                    <span>•</span>
                    <span>{t('lc.pl.category_label', { value: selectedPrompt.category || t('lc.pl.category_general') })}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedPrompt(null)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1 text-sm">
              {extractVariables(selectedPrompt.templateContent).length > 0 && (
                <div className="space-y-1.5 bg-indigo-50/50 dark:bg-indigo-950/30 p-3.5 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
                  <p className="text-xs font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                    <Code2 size={14} /> {t('lc.pl.vars_used')}
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {extractVariables(selectedPrompt.templateContent).map((v, i) => (
                      <span key={i} className="text-xs font-mono font-bold text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-md border border-indigo-200 dark:border-indigo-800 shadow-xs">
                        {v}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                  <span>{t('lc.pl.full_content')}</span>
                  <span>{t('lc.pl.temp', { value: selectedPrompt.temperature ?? 0.7 })}</span>
                </div>
                <div className="bg-slate-900 text-slate-100 dark:bg-slate-950 p-4 rounded-xl font-mono text-xs leading-relaxed whitespace-pre-wrap border border-slate-800 max-h-72 overflow-y-auto custom-scrollbar select-all">
                  {selectedPrompt.templateContent}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {t('lc.pl.uses')} <strong className="text-slate-700 dark:text-slate-200">{selectedPrompt.usageCount || 0}</strong>
              </span>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleCopyContent(selectedPrompt.templateContent, selectedPrompt.id)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-sm transition-all"
                >
                  <Copy size={16} /> {t('lc.pl.copy')}
                </button>
                <button
                  onClick={() => {
                    const pid = selectedPrompt.id;
                    setSelectedPrompt(null);
                    navigate(`/lecturer/prompts/${subjectId}/edit/${pid}`);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold text-sm shadow-sm transition-all"
                >
                  <Edit3 size={16} /> {t('lc.pl.edit')}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeletePrompt && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setConfirmDeletePrompt(null)}
        >
          <div 
            className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-100 dark:border-rose-900/60 shrink-0">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    {t('lc.pl.del.title')}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t('lc.pl.del.subtitle')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setConfirmDeletePrompt(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-3">
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {t('lc.pl.del.body')}{' '}
                <strong className="text-slate-900 dark:text-white font-semibold">
                  "{confirmDeletePrompt.name}"
                </strong>
                ?
              </p>
              <div className="bg-rose-50/60 dark:bg-rose-950/30 p-3.5 rounded-xl border border-rose-100 dark:border-rose-900/40 text-xs text-rose-700 dark:text-rose-400 flex items-start gap-2.5">
                <Trash2 size={16} className="shrink-0 mt-0.5 text-rose-500" />
                <span>{t('lc.pl.del.warning')}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmDeletePrompt(null)}
                disabled={deletingId !== null}
                className="px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-all disabled:opacity-50"
              >
                {t('lc.pl.del.cancel')}
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deletingId !== null}
                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-[0.98] rounded-xl shadow-md shadow-rose-500/20 transition-all disabled:opacity-50"
              >
                {deletingId === confirmDeletePrompt.id ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{t('lc.pl.del.deleting')}</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    <span>{t('lc.pl.del.confirm')}</span>
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

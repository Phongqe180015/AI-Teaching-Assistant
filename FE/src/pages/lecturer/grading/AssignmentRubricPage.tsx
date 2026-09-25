import { useState, useEffect } from 'react';
import { gradingApi as api } from '@/lib/api';
import type { PublishedAssignment, RubricRule } from '@/types';
import { FormattedText } from '@/components/ui/FormattedText';
import { BookOpen, ArrowLeft } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import classNames from 'classnames';

import { cleanAssignmentHtml } from '@/utils/htmlCleaner';

export default function AssignmentRubricPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [assignment, setAssignment] = useState<PublishedAssignment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await api.getAssignment(id || 'student-management-system');
        setAssignment(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin"></div>
      </div>
    );
  }

  if (!assignment) {
    return <div className="p-8 text-center text-slate-500">{t('lc.gr.not_found')}</div>;
  }

  const htmlContent = (assignment.metadata as any)?.content || assignment.metadata?.description || '';
  const cleanedHtml = cleanAssignmentHtml(htmlContent);

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pb-12 animate-in fade-in duration-300">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 mb-6 transition-colors font-medium"
      >
        <ArrowLeft size={16} /> {t('lc.gr.back')}
      </button>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden mb-8">
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400 flex items-center justify-center shrink-0">
            <BookOpen size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold dark:text-white text-slate-900">{assignment.metadata?.title || t('lc.gr.title_fallback')}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">{t('lc.gr.pass_threshold', { value: assignment.rubric?.passThreshold ? assignment.rubric.passThreshold * 100 : 70 })}</p>
            </div>
        </div>

        {cleanedHtml ? (
          <div className="p-8 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4">{t('lc.gr.details')}</h2>
            <div 
                className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-6 border border-slate-200 dark:border-slate-700/50 text-slate-700 dark:text-slate-300 leading-relaxed text-sm prose prose-sm prose-slate dark:prose-invert max-w-none [&_h1]:!w-full [&_h1]:!max-w-full"
                dangerouslySetInnerHTML={{ __html: cleanedHtml }}
            />
          </div>
        ) : null}

        <div className="px-8 py-5 border-b border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-800/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-brand-600 dark:bg-brand-400 rounded-full"></div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-wide">
              {t('lc.gr.rules')}
            </h2>
          </div>
          <span className="text-xs font-bold text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-900/30 px-3 py-1.5 rounded-lg border border-brand-200 dark:border-brand-800">
            {t('lc.gr.total_score', { value: (assignment.rubric as any)?.totalWeight || 10 })}
          </span>
        </div>
        
        <div className="p-0 overflow-x-auto">
            <table className="w-full text-left">
            <thead>
                <tr className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-xs uppercase tracking-wider">
                <th className="px-8 py-4 font-bold dark:text-slate-400 text-slate-500">{t('lc.gr.col.requirement')}</th>
                <th className="px-6 py-4 font-bold dark:text-slate-400 text-slate-500 text-center whitespace-nowrap">{t('lc.gr.col.method')}</th>
                <th className="px-8 py-4 font-bold dark:text-slate-400 text-slate-500 text-right whitespace-nowrap">{t('lc.gr.col.points')}</th>
                </tr>
            </thead>
            <tbody className="divide-y dark:divide-slate-700/30 divide-slate-200/50">
                {assignment.rubric?.rules?.map((rule: RubricRule, idx: number) => {
                  const filteredTags = (rule.tags || []).filter((tag: any) => {
                    if (typeof tag === 'string') {
                      // Renamed from `t` so it does not shadow the translation function.
                      const lower = tag.toLowerCase();
                      if (lower === 'api' || lower === 'ui' || lower === 'frontend' || lower === 'backend') return false;
                    }
                    return true;
                  });

                  return (
                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-8 py-4 dark:text-slate-200 text-slate-700">
                    <p className="font-semibold dark:text-brand-300 text-brand-600 mb-2">{typeof (rule.name || rule.title) === 'string' ? (rule.name || rule.title) : JSON.stringify(rule.name || rule.title || t('lc.gr.rule_fallback'))}</p>
                    <FormattedText className="text-sm dark:text-slate-400 text-slate-500 leading-relaxed" text={typeof rule.description === 'string' ? rule.description : JSON.stringify(rule.description)} />
                    {filteredTags && Array.isArray(filteredTags) && filteredTags.length > 0 && (
                        <div className="flex flex-col gap-2 mt-4">
                        {filteredTags.map((rawTag: any, i: number) => {
                            let tag = rawTag;
                            if (typeof rawTag === 'string' && rawTag.startsWith('{') && rawTag.endsWith('}')) {
                                try {
                                    tag = JSON.parse(rawTag);
                                } catch (e) {
                                    // ignore parse error
                                }
                            }
                            if (typeof tag === 'object' && tag !== null && tag.method && tag.path) {
                                return (
                                    <div key={i} className="flex items-center gap-2 flex-wrap border dark:border-slate-700 border-slate-200 rounded-md px-2 py-1.5 bg-slate-50 dark:bg-slate-800 w-fit">
                                      <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">{tag.method}</span>
                                      <span className="font-mono text-xs text-brand-600 dark:text-brand-400">{tag.path}</span>
                                      {tag.description && <span className="text-slate-500 dark:text-slate-400 text-xs ml-1">- {tag.description}</span>}
                                    </div>
                                );
                            }
                            return (
                            <span key={i} className="px-2 py-0.5 rounded text-xs font-medium dark:bg-slate-800 bg-slate-100 dark:text-slate-300 text-slate-600 border dark:border-slate-700 border-slate-200 w-fit">
                            #{typeof tag === 'string' ? tag : JSON.stringify(tag)}
                            </span>
                        )})}
                        </div>
                    )}
                    {rule.scoringStrategy === 'StdInOutProbe' && rule.requiredEvidence?.[0]?.stdInOutProbe?.testCases && (
                        <div className="mt-4 pt-4 border-t dark:border-slate-700/50 border-slate-200/50">
                        <p className="text-xs font-semibold dark:text-slate-400 text-slate-500 uppercase tracking-wider mb-2">{t('lc.gr.io_cases')}</p>
                        <div className="flex flex-col gap-2">
                            {rule.requiredEvidence[0].stdInOutProbe.testCases.map((tc: any, i: number) => (
                            <div key={i} className="dark:bg-slate-900/50 bg-slate-50 rounded border dark:border-slate-700/50 border-slate-200/50 p-2 text-xs font-mono grid grid-cols-2 gap-2">
                                <div>
                                <span className="dark:text-slate-500 text-slate-400">{t('lc.gr.in_label')}</span> <span className="dark:text-slate-300 text-slate-700 whitespace-pre-wrap">{tc.input}</span>
                                </div>
                                <div>
                                <span className="dark:text-slate-500 text-slate-400">{t('lc.gr.out_label')}</span> <span className="dark:text-emerald-400/80 text-emerald-600 whitespace-pre-wrap">{tc.expectedOutput}</span>
                                </div>
                            </div>
                            ))}
                        </div>
                        </div>
                    )}
                    {rule.criteria && rule.criteria.length > 0 && (
                        <div className="mt-4 p-4 dark:bg-slate-900 bg-slate-50 rounded-lg border dark:border-slate-800 border-slate-200">
                        <p className="text-xs font-semibold dark:text-slate-400 text-slate-500 uppercase tracking-wider mb-2">{t('lc.gr.criteria')}</p>
                        <ul className="space-y-1">
                            {rule.criteria.map((c: any, i: number) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                                <div className="mt-1 w-1.5 h-1.5 rounded-full bg-brand-400 shrink-0"></div>
                                <div className="dark:text-slate-300 text-slate-600">
                                    {typeof c === 'string' ? c : (
                                      c.method && c.path ? (
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700">{typeof c.method === 'string' ? c.method : t('lc.gr.unknown')}</span>
                                          <span className="font-mono text-xs text-brand-600 dark:text-brand-400">{typeof c.path === 'string' ? c.path : t('lc.gr.unknown')}</span>
                                          <span className="text-slate-500 dark:text-slate-400">{c.description && typeof c.description === 'string' ? `- ${c.description}` : ''}</span>
                                        </div>
                                      ) : (typeof c.description === 'string' ? c.description : (typeof c.title === 'string' ? c.title : JSON.stringify(c)))
                                    )}
                                </div>
                            </li>
                            ))}
                        </ul>
                        </div>
                    )}
                    </td>
                    <td className="px-6 py-4 text-center align-middle">
                    {(() => {
                        let text = t('lc.gr.m.automated');
                        let colorClass = 'text-slate-700 bg-slate-100 border-slate-200 dark:text-slate-300 dark:bg-slate-800 dark:border-slate-700';

                        switch (rule.scoringStrategy) {
                            case 'SqlExecutionProbe':
                                text = t('lc.gr.m.db');
                                colorClass = 'text-sky-700 bg-sky-50 border-sky-200 dark:text-sky-300 dark:bg-sky-500/10 dark:border-sky-500/20';
                                break;
                            case 'HTTPProbe':
                                text = t('lc.gr.m.api');
                                colorClass = 'text-sky-700 bg-sky-50 border-sky-200 dark:text-sky-300 dark:bg-sky-500/10 dark:border-sky-500/20';
                                break;
                            case 'StdInOutProbe':
                                text = t('lc.gr.m.io');
                                colorClass = 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-500/10 dark:border-emerald-500/20';
                                break;
                            case 'AIVision':
                                text = t('lc.gr.m.visual');
                                colorClass = 'text-purple-700 bg-purple-50 border-purple-200 dark:text-purple-300 dark:bg-purple-500/10 dark:border-purple-500/20';
                                break;
                            case 'AICodeReview':
                                text = t('lc.gr.m.code_review');
                                colorClass = 'text-indigo-700 bg-indigo-50 border-indigo-200 dark:text-indigo-300 dark:bg-indigo-500/10 dark:border-indigo-500/20';
                                break;
                            case 'AiTextAnalysis':
                                text = t('lc.gr.m.text');
                                colorClass = 'text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-300 dark:bg-blue-500/10 dark:border-blue-500/20';
                                break;
                            case 'HybridVisionAndCode':
                                text = t('lc.gr.m.hybrid');
                                colorClass = 'text-purple-700 bg-purple-50 border-purple-200 dark:text-purple-300 dark:bg-purple-500/10 dark:border-purple-500/20';
                                break;
                            case 'Manual':
                                text = t('lc.gr.m.manual');
                                colorClass = 'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-500/10 dark:border-amber-500/20';
                                break;
                        }
                        
                        return (
                            <div className={classNames("inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-bold border whitespace-nowrap shadow-sm", colorClass)}>
                                {text}
                            </div>
                        );
                    })()}
                    </td>
                    <td className="px-8 py-4 text-right font-bold dark:text-emerald-400 text-emerald-600 align-middle text-base">{typeof (rule as any).weight === 'number' ? (rule as any).weight.toString() : (rule as any).weight}</td>
                </tr>
                )})}
                <tr className="dark:bg-slate-900/30 bg-slate-100">
                <td colSpan={2} className="px-8 py-4 font-bold dark:text-slate-300 text-slate-700 text-right">{t('lc.gr.total_possible')}</td>
                <td className="px-8 py-4 text-right font-bold dark:text-white text-slate-900 text-xl">{(assignment.rubric as any)?.totalWeight || 0}</td>
                </tr>
            </tbody>
            </table>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import type { ScoreRule } from '@/types';
import StatusBadge from './StatusBadge';
import { AlertCircle, Lightbulb, ChevronDown, ChevronUp, Image as ImageIcon, Pencil, Check, X } from 'lucide-react';
import classNames from 'classnames';
import CodeSnippetViewer from './evidence/CodeSnippetViewer';
import HttpTimelineViewer from './evidence/HttpTimelineViewer';
import IoTestCaseViewer from './evidence/IoTestCaseViewer';
import SqlTestCaseViewer from './evidence/SqlTestCaseViewer';
import { FormattedText } from '@/components/ui/FormattedText';
import { formatLatexMath } from '@/utils/mathHelper';

interface RuleListProps {
  title: string;
  rules: ScoreRule[];
  isStudent?: boolean;
  onUpdateRule?: (ruleIndex: number, newScore: number, newDetails: string) => void;
}

const renderFormattedText = (text?: string) => {
  if (!text) return null;
  const processed = formatLatexMath(text);
  // Split by **text** to extract bold parts
  const parts = processed.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index} className="font-bold text-slate-800 dark:text-slate-100">{part.slice(2, -2)}</strong>;
    }
    return <span key={index}>{part}</span>;
  });
};

export default function RuleList({ title, rules, isStudent = false, onUpdateRule }: RuleListProps) {
  const [expandedRules, setExpandedRules] = useState<Record<number, boolean>>({});

  const [editingScoreIndex, setEditingScoreIndex] = useState<number | null>(null);
  const [tempScore, setTempScore] = useState<string>('');

  const [editingReasoningIndex, setEditingReasoningIndex] = useState<number | null>(null);
  const [tempReasoning, setTempReasoning] = useState<string>('');

  const toggleRule = (idx: number) => {
    setExpandedRules(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const startEditScore = (idx: number, e: React.MouseEvent, currentScore: number) => {
    e.stopPropagation();
    setEditingScoreIndex(idx);
    setTempScore(String(currentScore));
  };

  const saveScore = (idx: number, rule: ScoreRule, e: React.MouseEvent) => {
    e.stopPropagation();
    const val = parseFloat(tempScore);
    if (isNaN(val) || val < 0) return;
    const clamped = Math.min(val, rule.maxScore);
    onUpdateRule?.(idx, clamped, rule.details || '');
    setEditingScoreIndex(null);
  };

  const cancelEditScore = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingScoreIndex(null);
  };

  const startEditReasoning = (idx: number, e: React.MouseEvent, currentDetails: string) => {
    e.stopPropagation();
    setEditingReasoningIndex(idx);
    setTempReasoning(currentDetails || '');
    if (!expandedRules[idx]) {
      setExpandedRules(prev => ({ ...prev, [idx]: true }));
    }
  };

  const saveReasoning = (idx: number, rule: ScoreRule, e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdateRule?.(idx, rule.score, tempReasoning);
    setEditingReasoningIndex(null);
  };

  const cancelEditReasoning = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingReasoningIndex(null);
  };

  const renderAiReasoningBox = (idx: number, rule: ScoreRule) => {
    const isEditing = editingReasoningIndex === idx;
    return (
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex gap-2 items-center">
            <AlertCircle size={14} className="text-brand-500" />
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">AI Reasoning</span>
          </div>
          {!isStudent && onUpdateRule && !isEditing && (
            <button
              type="button"
              onClick={e => startEditReasoning(idx, e, rule.details || '')}
              className="p-1 text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 rounded transition-colors bg-transparent border-none cursor-pointer flex items-center gap-1 text-xs font-semibold"
              title="Chỉnh sửa nhận xét AI"
            >
              <Pencil size={12} />
              <span>Sửa nhận xét</span>
            </button>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-2" onClick={e => e.stopPropagation()}>
            <textarea
              rows={4}
              value={tempReasoning}
              onChange={e => setTempReasoning(e.target.value)}
              placeholder="Nhập nhận xét / giải thích điểm số..."
              className="w-full p-2.5 text-sm font-sans rounded-lg border border-brand-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-brand-500 leading-relaxed"
            />
            <div className="flex items-center gap-2 justify-end">
              <button
                type="button"
                onClick={cancelEditReasoning}
                className="px-2.5 py-1 text-xs font-bold text-slate-600 hover:text-slate-800 dark:text-slate-300 bg-slate-200 dark:bg-slate-800 rounded cursor-pointer border-none flex items-center gap-1"
              >
                <X size={12} />
                Hủy
              </button>
              <button
                type="button"
                onClick={e => saveReasoning(idx, rule, e)}
                className="px-3 py-1 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded cursor-pointer border-none flex items-center gap-1 shadow-sm"
              >
                <Check size={12} />
                Lưu nhận xét
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-700 dark:text-slate-300 font-sans leading-relaxed whitespace-pre-wrap">{renderFormattedText(rule.details)}</p>
        )}
      </div>
    );
  };

  if (rules.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-6 px-2">{title}</h3>

      <div className="flex flex-col gap-4">
        {rules.map((rule, idx) => {
          const borderColor = rule.passed ? 'border-emerald-500' : (rule.score > 0 ? 'border-amber-500' : 'border-red-500');
          const isEditingScore = editingScoreIndex === idx;

          return (
            <div key={idx} className={`bg-white dark:bg-slate-900 rounded-xl shadow-sm hover:shadow-md border border-slate-200 dark:border-slate-800 p-4 md:p-5 transition-all border-l-[4px] ${borderColor}`}>
              {/* Basic Rule Info */}
              <div
                className="flex items-start justify-between gap-4 mb-1 cursor-pointer group"
                onClick={() => toggleRule(idx)}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h4 className="text-base font-bold text-slate-800 dark:text-slate-200 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">{typeof rule.name === 'string' ? rule.name : JSON.stringify(rule.name)}</h4>
                    {(rule.evidence || rule.details) && (
                      <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded flex items-center gap-1 font-bold">
                        {expandedRules[idx] ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        Details
                      </span>
                    )}
                  </div>
                  {rule.description && (
                    <FormattedText className="text-sm text-slate-500 mt-1 leading-relaxed" text={typeof rule.description === 'string' ? rule.description : JSON.stringify(rule.description)} />
                  )}
                  {rule.category && (
                    <span className="text-[9px] font-extrabold text-slate-600 bg-slate-100 px-2 py-0.5 rounded uppercase tracking-wider mt-2 inline-block border border-slate-200">{typeof rule.category === 'string' ? rule.category : JSON.stringify(rule.category)}</span>
                  )}
                </div>

                {isEditingScore ? (
                  <div className="flex items-center gap-1.5 shrink-0 bg-slate-50 dark:bg-slate-800/80 p-1.5 rounded-lg border border-brand-300 dark:border-brand-700" onClick={e => e.stopPropagation()}>
                    <input
                      type="number"
                      step="0.25"
                      min="0"
                      max={rule.maxScore}
                      value={tempScore}
                      onChange={e => setTempScore(e.target.value)}
                      className="w-16 px-2 py-1 text-sm font-bold border border-brand-500 rounded bg-white dark:bg-slate-900 text-slate-800 dark:text-white outline-none"
                    />
                    <span className="text-sm font-extrabold text-slate-500">/ {rule.maxScore}</span>
                    <button
                      type="button"
                      onClick={e => saveScore(idx, rule, e)}
                      className="p-1 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 rounded cursor-pointer border-none"
                      title="Lưu điểm"
                    >
                      <Check size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={cancelEditScore}
                      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded cursor-pointer border-none"
                      title="Hủy"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <StatusBadge passed={rule.passed} isPartial={!rule.passed && rule.score > 0} />
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-extrabold text-slate-800 dark:text-slate-300">+{rule.score} / {rule.maxScore}</span>
                      {!isStudent && onUpdateRule && (
                        <button
                          type="button"
                          onClick={e => startEditScore(idx, e, rule.score)}
                          className="p-1.5 text-slate-500 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-md transition-colors cursor-pointer border-none flex items-center justify-center ml-1"
                          title="Sửa điểm số"
                        >
                          <Pencil size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Expanded Content */}
              {expandedRules[idx] && (
                <div className="mt-3 space-y-3 animate-in slide-in-from-top-2 opacity-100 duration-200">

                  {/* General Rule Reasoning / Details */}
                  {rule.evidence?.hybridBreakdown ? (
                    <div className="p-3 bg-slate-50 dark:bg-slate-900/80 rounded-lg border border-slate-100 dark:border-slate-800 shadow-sm ml-0 md:ml-2 border-l-2 border-l-slate-200 dark:border-l-slate-700">
                      <div className="flex flex-col sm:flex-row gap-3 mb-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                        <div className="flex-1">
                          <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Code Review Score</span>
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full bg-brand-500" style={{ width: `${Math.round((rule.evidence.hybridBreakdown.codePct ?? 0) * 100)}%` }}></div>
                            </div>
                            <span className="text-sm font-bold text-brand-600 dark:text-brand-400">{Math.round((rule.evidence.hybridBreakdown.codePct ?? 0) * 100)}%</span>
                          </div>
                        </div>
                        <div className="flex-1">
                          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">
                            {rule.evidence.hybridBreakdown.textPct !== undefined ? 'Theory / Report Score' : 'UI / Func Score'}
                          </span>
                          <div className="flex items-center gap-3">
                            <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-500" style={{ width: `${Math.round((rule.evidence.hybridBreakdown.visionPct ?? rule.evidence.hybridBreakdown.textPct ?? rule.evidence.hybridBreakdown.probePct ?? 0) * 100)}%` }}></div>
                            </div>
                            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{Math.round((rule.evidence.hybridBreakdown.visionPct ?? rule.evidence.hybridBreakdown.textPct ?? rule.evidence.hybridBreakdown.probePct ?? 0) * 100)}%</span>
                          </div>
                        </div>
                      </div>
                      {renderAiReasoningBox(idx, rule)}
                    </div>
                  ) : (
                    (rule.details !== undefined || !isStudent) && (
                      <div className="p-3 bg-slate-50 dark:bg-slate-900/80 rounded-lg border border-slate-100 dark:border-slate-800 shadow-sm ml-0 md:ml-2 border-l-2 border-l-slate-200 dark:border-l-slate-700">
                        {renderAiReasoningBox(idx, rule)}
                      </div>
                    )
                  )}

                  {/* Rich Evidence Section */}
                  {rule.evidence && (
                    <div className={classNames(
                      "p-1 rounded-xl bg-gradient-to-br",
                      rule.passed ? "from-emerald-500/20 to-emerald-900/5 dark:to-emerald-900/20" : (!rule.passed && rule.score > 0 ? "from-amber-500/20 to-amber-900/5 dark:to-amber-900/20" : "from-rose-500/20 to-rose-900/5 dark:to-rose-900/20")
                    )}>
                      <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3 md:p-4 space-y-4 shadow-inner">

                        {/* 1. Code Snippet Evidence (Support Multiple) */}
                        {rule.evidence.snippets && rule.evidence.snippets.length > 0 ? (
                          <div className="space-y-4">
                            {rule.evidence.snippets.map((snippet, sIdx) => (
                              <CodeSnippetViewer
                                key={sIdx}
                                codeSnippet={snippet.codeSnippet}
                                filePath={snippet.filePath || rule.evidence?.filePath}
                                startLine={snippet.startLine}
                                endLine={snippet.endLine}
                                explanation={snippet.explanation || (sIdx === 0 && !rule.passed ? rule.details : undefined)}
                              />
                            ))}
                          </div>
                        ) : (
                          rule.evidence.codeSnippet && (
                            <CodeSnippetViewer
                              codeSnippet={rule.evidence.codeSnippet}
                              filePath={rule.evidence.filePath}
                              startLine={rule.evidence.startLine}
                              endLine={rule.evidence.endLine}
                              explanation={rule.evidence.explanation || (rule.passed ? undefined : rule.details)}
                            />
                          )
                        )}

                        {/* 2. HTTP Probe Timeline Evidence */}
                        {rule.evidence.httpSteps && rule.evidence.httpSteps.length > 0 && (
                          <HttpTimelineViewer steps={rule.evidence.httpSteps} />
                        )}

                        {/* 3. AI Vision Evidence */}
                        {(rule.evidence.screenshotBase64 || (rule.evidence.extractedImages && rule.evidence.extractedImages.length > 0)) && (
                          <div className="space-y-3">
                            <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-300">
                              <ImageIcon size={16} className="text-purple-400" />
                              Visual Verification
                            </h4>

                            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
                              {rule.evidence.extractedImages && rule.evidence.extractedImages.length > 0 ? (
                                rule.evidence.extractedImages.map((img: any, idx: number) => (
                                  <div key={idx} className="rounded border border-slate-700/80 overflow-hidden shadow-lg bg-slate-950 flex flex-col items-center justify-center p-2 relative group">
                                    <img src={`data:${img.contentType || 'image/png'};base64,${img.base64}`} alt={`Evidence ${idx + 1}`} className="max-h-64 w-auto object-contain rounded" />
                                    <div className="absolute bottom-0 w-full bg-black/60 text-center py-1 text-xs text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">
                                      {img.label || `Image ${idx + 1}`}
                                    </div>
                                  </div>
                                ))
                              ) : (
                                rule.evidence.screenshotBase64 && (
                                  <div className="rounded border border-slate-700/80 overflow-hidden shadow-lg bg-slate-950 flex justify-center p-2 col-span-full">
                                    <img src={rule.evidence.screenshotBase64.startsWith('data:') ? rule.evidence.screenshotBase64 : `data:image/png;base64,${rule.evidence.screenshotBase64}`} alt="Verification Screenshot" className="max-h-80 w-auto object-contain rounded" />
                                  </div>
                                )
                              )}
                            </div>

                            {rule.evidence.explanation && (
                              <p className="text-sm text-slate-300 italic">{rule.evidence.explanation}</p>
                            )}
                          </div>
                        )}

                        {/* 4. IO Test Cases Evidence */}
                        {rule.evidence.ioTestCases && rule.evidence.ioTestCases.length > 0 && (
                          <IoTestCaseViewer testCases={rule.evidence.ioTestCases} />
                        )}

                        {/* 5. SQL Test Cases Evidence */}
                        {rule.evidence.sqlTestCases && rule.evidence.sqlTestCases.length > 0 && (
                          <SqlTestCaseViewer testCases={rule.evidence.sqlTestCases} />
                        )}

                        {/* Fallback general explanation if no specific viewer triggered */}
                        {(!rule.evidence.codeSnippet && !rule.evidence.httpSteps && !rule.evidence.screenshotBase64 && !rule.evidence.ioTestCases && !rule.evidence.sqlTestCases && rule.evidence.explanation) && (
                          <div className="space-y-3">
                            <div className="p-3 bg-white dark:bg-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                              <p className="text-sm text-slate-700 dark:text-slate-300 font-sans whitespace-pre-wrap">{rule.evidence.explanation}</p>
                            </div>

                            {rule.evidence.studentText && (
                              <div className="mt-3">
                                <h4 className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Student Answer Extracted</h4>
                                <div className="p-3 bg-slate-100 dark:bg-slate-950/50 rounded-lg border border-slate-200 dark:border-slate-800 shadow-inner">
                                  <p className="text-sm text-slate-600 dark:text-slate-300 font-mono whitespace-pre-wrap break-words">{rule.evidence.studentText}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {rule.recommendation && !rule.passed && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded flex gap-3 items-start mt-4">
                      <Lightbulb size={16} className="text-amber-400 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-amber-200">{rule.recommendation}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}



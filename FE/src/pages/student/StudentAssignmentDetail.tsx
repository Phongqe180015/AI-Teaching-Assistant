import { useEffect, useState, useCallback, memo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { api, gradingApi, type AssignmentRow, type SubmissionRow, getStoredItem, AUTH_STORAGE_KEYS } from '@/lib/api'
import { FileText, UploadCloud, CheckCircle2, AlertCircle, Send, Loader2, Download, ChevronRight, Clock, Calendar, Check, Minus, Paperclip, Award, Sparkles, RotateCcw, Copy, Terminal, Database, Code } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { FormattedText } from '@/components/ui/FormattedText'
import { formatLatexMath } from '@/utils/mathHelper'
import { RubricRuleSpecViewer } from '@/components/modules/grading/evidence/RubricRuleSpecViewer'
import { useTranslation } from 'react-i18next'

const CodeBlockViewer = memo(function CodeBlockViewer({ code, language = 'code', onCopy, isCopied }: { code: string; language?: string; onCopy: () => void; isCopied: boolean }) {
  const { t } = useTranslation()
  const codeLines = code.split('\n');

  return (
    <div className="my-5 rounded-2xl overflow-hidden border border-slate-800 bg-[#0d1117] shadow-xl">
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#161b22] border-b border-slate-800 text-xs font-mono text-slate-400">
        <span className="flex items-center gap-2 text-emerald-400 font-bold uppercase tracking-wider">
          <Terminal size={14} /> {language}
        </span>
        <button
          onClick={onCopy}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors text-[11px] font-semibold border border-slate-700 shadow-sm"
        >
          {isCopied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
          <span>{isCopied ? 'Copied' : t('st.asg.copy_code')}</span>
        </button>
      </div>

      <div className="p-4 max-h-[420px] overflow-y-auto overflow-x-auto text-xs sm:text-sm font-mono text-slate-100 leading-relaxed scrollbar-thin scrollbar-thumb-slate-700">
        <table className="w-full border-collapse">
          <tbody>
            {codeLines.map((line, lIdx) => (
              <tr key={lIdx} className="hover:bg-slate-800/40 transition-colors">
                <td className="select-none text-slate-600 text-right pr-4 py-0.5 w-10 text-[11px] font-mono border-r border-slate-800/80 shrink-0">
                  {lIdx + 1}
                </td>
                <td className="pl-4 py-0.5 whitespace-pre font-mono text-slate-200">
                  {line}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});

function stripCodeSkeleton(rawContent: string): string {
  if (!rawContent) return '';
  return rawContent
    .replace(/(?:\r?\n|^)(?:#{1,6}\s*|\*\*|__)?\s*Code\s+Skeleton:?\s*(?:\*\*|__)?[\s\S]*?(?=(?:\r?\n#{1,6}\s)|(?:\r?\n\s*(?:#{1,6}|\*\*|__)?\s*(?:Constraints|Question|Rubric|Note|Problem|Example|Output|Input))|$)/gi, '')
    .trim();
}

import { cleanAssignmentHtml } from '@/utils/htmlCleaner'

const SmartAssignmentContent = memo(function SmartAssignmentContent({ content }: { content: string }) {
  const [copiedIdx, setCopiedIdx] = useState<string | number | null>(null);
  const sanitizedContent = stripCodeSkeleton(content);

  if (!sanitizedContent || !sanitizedContent.trim()) {
    return (
      <div className="p-8 text-center bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
        <FileText className="w-10 h-10 mx-auto text-slate-400 mb-2" />
        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">The lecturer has not provided a detailed description for this assignment.</p>
      </div>
    );
  }

  const handleCopy = (codeText: string, id: string | number) => {
    navigator.clipboard.writeText(codeText);
    setCopiedIdx(id);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const isHtml = /<[a-z][\s\S]*>/i.test(sanitizedContent);
  if (isHtml) {
    const cleanedHtml = cleanAssignmentHtml(sanitizedContent);
    return (
      <div className="w-full max-w-full overflow-x-auto min-w-0">
        <div
          className="bg-slate-50/60 dark:bg-slate-900/40 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-200 leading-relaxed text-sm prose prose-slate dark:prose-invert max-w-none break-words min-w-0 [&_table]:max-w-full [&_table]:w-full [&_table]:table-auto [&_table]:block [&_table]:overflow-x-auto [&_img]:max-w-full [&_img]:h-auto [&_pre]:text-slate-900 dark:[&_pre]:text-slate-100 [&_pre]:p-5 [&_pre]:rounded-2xl [&_pre]:border [&_pre]:border-slate-300 dark:[&_pre]:border-slate-700 [&_pre]:max-h-[400px] [&_pre]:overflow-y-auto [&_code]:font-mono [&_code]:text-xs [&_h1]:text-xl [&_h1]:font-extrabold [&_h1]:!w-full [&_h1]:!max-w-full [&_h2]:text-lg [&_h2]:font-bold [&_h2]:!w-full [&_h3]:text-base [&_h3]:font-bold"
          dangerouslySetInnerHTML={{ __html: cleanedHtml }}
        />
      </div>
    );
  }

  if (sanitizedContent.includes('```')) {
    return (
      <div className="prose prose-slate dark:prose-invert max-w-none break-words text-sm leading-relaxed">
        <ReactMarkdown
          components={{
            code({ node, inline, className, children, ...props }: any) {
              const match = /language-(\w+)/.exec(className || '');
              const codeString = String(children).replace(/\n$/, '');
              const codeId = Math.random().toString();
              const lang = match ? match[1] : 'code';
              if (!inline) {
                return (
                  <CodeBlockViewer
                    code={codeString}
                    language={lang}
                    onCopy={() => handleCopy(codeString, codeId)}
                    isCopied={copiedIdx === codeId}
                  />
                );
              }
              return (
                <code className="bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-md font-mono text-xs font-bold border border-slate-200 dark:border-slate-700" {...props}>
                  {children}
                </code>
              );
            },
            h1: ({ children }) => <h1 className="text-xl font-extrabold text-slate-900 dark:text-white mt-6 mb-3 border-b border-slate-200 dark:border-slate-800 pb-2 flex items-center gap-2">{children}</h1>,
            h2: ({ children }) => <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mt-5 mb-2 flex items-center gap-2">{children}</h2>,
            h3: ({ children }) => <h3 className="text-base font-bold text-slate-700 dark:text-slate-200 mt-4 mb-2">{children}</h3>,
            p: ({ children }) => <p className="mb-3 leading-relaxed text-slate-700 dark:text-slate-300">{children}</p>,
            ul: ({ children }) => <ul className="list-disc list-inside space-y-1.5 mb-4 text-slate-700 dark:text-slate-300">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal list-inside space-y-1.5 mb-4 text-slate-700 dark:text-slate-300">{children}</ol>,
          }}
        >
          {sanitizedContent}
        </ReactMarkdown>
      </div>
    );
  }

  const lines = sanitizedContent.split('\n');
  const blocks: { type: 'text' | 'code' | 'heading'; content: string }[] = [];

  let currentCodeLines: string[] = [];
  let currentTextLines: string[] = [];

  const flushText = () => {
    if (currentTextLines.length > 0) {
      const text = currentTextLines.join('\n').trim();
      if (text) blocks.push({ type: 'text', content: text });
      currentTextLines = [];
    }
  };

  const flushCode = () => {
    if (currentCodeLines.length > 0) {
      const code = currentCodeLines.join('\n').trim();
      if (code) blocks.push({ type: 'code', content: code });
      currentCodeLines = [];
    }
  };

  lines.forEach(line => {
    const trimmed = line.trim();

    const isHeadingLine =
      /^(Expected Behavior|Test Cases|Example usage|Test Case \d+|Constraints|Problem Statement|Input:|Output:)/i.test(trimmed);

    const isCodeLine =
      !isHeadingLine &&
      (trimmed.startsWith('//') ||
        trimmed.startsWith('#include') ||
        trimmed.startsWith('using namespace') ||
        trimmed.startsWith('class ') ||
        trimmed.startsWith('struct ') ||
        trimmed.startsWith('public:') ||
        trimmed.startsWith('private:') ||
        trimmed.startsWith('TreeNode*') ||
        trimmed.startsWith('ListNode*') ||
        trimmed.startsWith('int main()') ||
        trimmed.startsWith('return ') ||
        trimmed.startsWith('std::') ||
        trimmed.includes('->') ||
        trimmed.startsWith('import ') ||
        trimmed.startsWith('def ') ||
        (currentCodeLines.length > 0 && (trimmed.startsWith('}') || trimmed.startsWith('{') || trimmed.endsWith(';') || trimmed === '')));

    if (isHeadingLine) {
      flushText();
      flushCode();
      blocks.push({ type: 'heading', content: trimmed });
    } else if (isCodeLine) {
      flushText();
      currentCodeLines.push(line);
    } else {
      flushCode();
      currentTextLines.push(line);
    }
  });

  flushText();
  flushCode();

  return (
    <div className="space-y-4 text-slate-800 dark:text-slate-200">
      {blocks.map((block, idx) => {
        if (block.type === 'heading') {
          return (
            <div key={idx} className="mt-6 mb-2 pt-2 flex items-center gap-2 text-base font-extrabold text-blue-600 dark:text-blue-400 border-b border-slate-100 dark:border-slate-800 pb-2">
              <Sparkles size={16} className="text-blue-500 shrink-0" />
              <span>{block.content}</span>
            </div>
          );
        }

        if (block.type === 'code') {
          return (
            <CodeBlockViewer
              key={idx}
              code={block.content}
              language="Sample Code / Harness"
              onCopy={() => handleCopy(block.content, idx)}
              isCopied={copiedIdx === idx}
            />
          );
        }

        return (
          <div key={idx} className="whitespace-pre-wrap leading-relaxed text-slate-700 dark:text-slate-300 text-sm">
            {block.content}
          </div>
        );
      })}
    </div>
  );
});

const CountdownDisplay = memo(function CountdownDisplay({ dueDate }: { dueDate: string | Date }) {
  const { t } = useTranslation()
  const [countdownText, setCountdownText] = useState<string>('');

  useEffect(() => {
    if (!dueDate) return;
    const updateCountdown = () => {
      const now = new Date().getTime();
      const dueTime = new Date(dueDate).getTime();
      const diff = dueTime - now;

      if (diff <= 0) {
        setCountdownText(t('st.asg.deadline_passed'));
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      const parts = [];
      if (days > 0) parts.push(`${days}d`);
      parts.push(`${hours.toString().padStart(2, '0')}h`);
      parts.push(`${minutes.toString().padStart(2, '0')}m`);
      parts.push(`${seconds.toString().padStart(2, '0')}s`);

      setCountdownText(parts.join(' '));
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [dueDate]);

  return <span>{countdownText || t('st.asg.calculating')}</span>;
});

export function StudentAssignmentDetail() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const [assignment, setAssignment] = useState<AssignmentRow | null>(null)
  const [submission, setSubmission] = useState<SubmissionRow | null>(null)

  const [file, setFile] = useState<File | null>(null)
  const [content] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isResubmitting, setIsResubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  const [appealText, setAppealText] = useState('')
  const [showAppeal, setShowAppeal] = useState(false)
  const [showSqlPreview, setShowSqlPreview] = useState(false)
  const [copiedSql, setCopiedSql] = useState(false)

  const dueDate = assignment?.due || (assignment as any)?.stats?.dueDate || (assignment as any)?.metadata?.dueDate || (assignment as any)?.dueDate || (assignment as any)?.DueDate || (assignment as any)?.ExamClass?.[0]?.DueDate

  const getSqlSetupScript = (ass: any): string | null => {
    if (!ass) return null;
    if (ass.sqlSetupScript && typeof ass.sqlSetupScript === 'string' && ass.sqlSetupScript.trim().length > 0) {
      return ass.sqlSetupScript.trim();
    }
    if (ass.setupScript && typeof ass.setupScript === 'string' && ass.setupScript.trim().length > 0) {
      return ass.setupScript.trim();
    }

    const rules = ass.rubric?.rules || ass.rubrics || ass.aiRubrics || [];
    if (Array.isArray(rules)) {
      for (const rule of rules) {
        if (rule.requiredEvidence && Array.isArray(rule.requiredEvidence)) {
          for (const ev of rule.requiredEvidence) {
            if (ev?.sqlProbe?.setupScript && typeof ev.sqlProbe.setupScript === 'string' && ev.sqlProbe.setupScript.trim().length > 0) {
              return ev.sqlProbe.setupScript.trim();
            }
          }
        }
      }
    }
    return null;
  }

  const sqlSetupScript = getSqlSetupScript(assignment)

  const handleDownloadSqlSetupScript = () => {
    if (!sqlSetupScript || !assignment) return
    const titleStr = assignment.title || (assignment as any)?.metadata?.title || 'DBI_Assignment'
    const safeTitle = titleStr.replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1E00-\u1EFF]/g, '_')
    const fileName = `${safeTitle}_Setup_Script.sql`

    const blob = new Blob(['\ufeff', sqlSetupScript], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const loadData = useCallback((showLoader = false) => {
    if (!id) return
    let alive = true
    if (showLoader) setLoading(true)

    Promise.all([
      gradingApi.getAssignment(id).catch(() => api.getAssignment(id)),
      api.getSubmissions({ assignmentId: id }).then(res => res?.[0] || null),
      api.getStudentDashboard().catch(() => null)
    ])
      .then(([a, s, dash]) => {
        if (alive) {
          const ass = { ...(a || {}) } as any
          if ((!ass.lecturer || ass.lecturer === 'Not assigned') && dash?.enrolledClasses && dash.enrolledClasses.length > 0) {
            const code = (ass.subjectCode || (ass.subjectName?.split('-')?.[0]?.trim()) || ass.title?.split('-')?.[0]?.trim() || '').toUpperCase()

            let matchClass = dash.enrolledClasses.find((c: any) => {
              const cSubCode = (c.subject?.code || c.subjectCode || c.code || '').toUpperCase()
              const cSubId = c.subject?.id || c.subjectId || c.id
              return (code && cSubCode && cSubCode === code) || (ass.subjectId && cSubId === ass.subjectId)
            })

            if (!matchClass) {
              matchClass = dash.enrolledClasses.find((c: any) => c.lecturers && c.lecturers.length > 0)
            }

            if (matchClass && matchClass.lecturers && matchClass.lecturers.length > 0) {
              const mainLec = matchClass.lecturers[0]
              ass.lecturer = mainLec.name || mainLec.fullName
              ass.lecturerAvatar = mainLec.avatar || mainLec.Avatar
            }
          }
          setAssignment(ass)
          setSubmission(s as SubmissionRow)
        }
      })
      .finally(() => { if (alive && showLoader) setLoading(false) })

    return () => { alive = false }
  }, [id])

  useEffect(() => {
    const cleanup = loadData(true)

    // 1. BroadcastChannel Listener (Cross-tab/window instant real-time sync)
    let channel: BroadcastChannel | null = null
    let submissionChannel: BroadcastChannel | null = null
    try {
      channel = new BroadcastChannel('aita_assignment_updates')
      channel.onmessage = (event) => {
        if (event.data?.id === id && event.data?.dueDate) {
          console.log('[StudentAssignmentDetail] Real-time deadline update received:', event.data.dueDate)
          setAssignment(prev => prev ? { ...prev, due: event.data.dueDate, stats: { ...(prev as any).stats, dueDate: event.data.dueDate } } as any : prev)
          loadData(false)
        }
      }

      submissionChannel = new BroadcastChannel('aita_submission_events')
      submissionChannel.onmessage = (event) => {
        if (event.data?.type === 'SUBMISSION_PUBLISHED') {
          console.log('[StudentAssignmentDetail] Real-time publish event received!')
          loadData(false)
        }
      }
    } catch (e) { }

    // 2. Storage event listener (cross-tab fallback)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'aita_last_assignment_update' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue)
          if (parsed.id === id && parsed.dueDate) {
            console.log('[StudentAssignmentDetail] Storage deadline update received:', parsed.dueDate)
            setAssignment(prev => prev ? { ...prev, due: parsed.dueDate, stats: { ...(prev as any).stats, dueDate: parsed.dueDate } } as any : prev)
            loadData(false)
          }
        } catch (err) { }
      }
      if (e.key === 'aita_last_publish_event' && e.newValue) {
        console.log('[StudentAssignmentDetail] Storage publish event received!')
        loadData(false)
      }
    }

    // 3. Custom window event listener
    const handleCustomEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail?.id === id && detail?.dueDate) {
        setAssignment(prev => prev ? { ...prev, due: detail.dueDate, stats: { ...(prev as any).stats, dueDate: detail.dueDate } } as any : prev)
        loadData(false)
      }
    }

    window.addEventListener('storage', handleStorage)
    window.addEventListener('aita_assignment_updated', handleCustomEvent)

    // 4. Pure Real-Time Evaluation Listener (Zero idle polling)
    let pollInterval: ReturnType<typeof setInterval> | null = null
    const isEvaluating = submission?.reviewStatus === 'pending' || submission?.reviewStatus === 'processing'
    if (isEvaluating) {
      pollInterval = setInterval(() => {
        if (document.visibilityState === 'visible') {
          api.getSubmissions({ assignmentId: id! }).then(res => {
            const s = res?.[0]
            if (s) {
              setSubmission(prev => {
                if (!prev || prev.reviewStatus !== s.reviewStatus || (prev as any).isPublished !== (s as any).isPublished || prev.score !== s.score) {
                  return s as SubmissionRow
                }
                return prev
              })
            }
          }).catch(() => { })
        }
      }, 5000)
    }

    return () => {
      if (cleanup) cleanup()
      if (channel) channel.close()
      if (submissionChannel) submissionChannel.close()
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('aita_assignment_updated', handleCustomEvent)
      if (pollInterval) clearInterval(pollInterval)
    }
  }, [id, loadData, submission?.reviewStatus])

  const handleSubmit = async () => {
    if (!id || (!file && !content)) return
    const wasAlreadySubmitted = !!submission
    setIsSubmitting(true)
    try {
      await api.submitAssignment(file, content, id)
      try {
        const evtChannel = new BroadcastChannel('aita_submission_events');
        evtChannel.postMessage({ type: 'SUBMISSION_CREATED', assignmentId: id });
        evtChannel.close();
      } catch (e) { }
      localStorage.setItem('aita_submission_event', JSON.stringify({ type: 'SUBMISSION_CREATED', assignmentId: id, timestamp: Date.now() }));
      setToast({
        message: wasAlreadySubmitted
          ? 'Resubmitted successfully. Your work is now waiting to be re-graded by the lecturer.'
          : t('st.asg.submit_ok'),
        type: 'success'
      })
      setFile(null)
      setIsResubmitting(false)
      loadData()
    } catch (e: any) {
      setToast({ message: e.message || t('st.asg.submit_fail'), type: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSendAppeal = async () => {
    if (!appealText.trim() || !submission) return
    setIsSubmitting(true)
    try {
      await api.submitFeedback(submission.id, appealText)
      setToast({ message: t('st.asg.feedback_sent'), type: 'success' })
      setShowAppeal(false)
      setAppealText('')
      // Optionally reload the submission to show the updated feedback state if the backend returns it
    } catch (e: any) {
      setToast({ message: e.message || t('st.asg.feedback_fail'), type: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) return <div className="flex p-20 justify-center text-brand-600">{t('st.asg.loading')}</div>
  if (!assignment) return <div className="p-20 text-center text-red-500 font-bold">{t('st.asg.not_found')}</div>

  const timeRemaining = dueDate ? new Date(dueDate).getTime() - new Date().getTime() : 0;
  const isPastDue = timeRemaining < 0;
  const isNearDeadline = !isPastDue && timeRemaining < 24 * 60 * 60 * 1000;
  const isAutoZeroSub = !!submission && (
    (submission as any)?.isAutoZero === true ||
    (typeof (submission as any)?.reportData === 'string' && (submission as any).reportData.includes('"isAutoZero":true')) ||
    (typeof (submission as any)?.reportData === 'object' && (submission as any)?.reportData?.isAutoZero === true) ||
    (!submission.zipFileUrl && (submission as any)?.reviewStatus === 'PUBLISHED' && (submission.score === 0 || (submission as any).totalScore === 0))
  );
  const isSubmitted = !!submission && !isAutoZeroSub && !!submission.zipFileUrl;
  const isPublished = submission && !isAutoZeroSub && ((submission as any).reviewStatus === 'PUBLISHED' || (submission as any).isPublished === true);
  const displayScore = (submission && isPublished && !isAutoZeroSub) ? ((submission as any).finalScore ?? submission.score ?? (submission as any).totalScore) : null;
  const isGraded = submission && !isAutoZeroSub && (submission.status === 'Graded' || (submission as any).gradingStatus === 'Graded' || (submission as any).score != null);
  const gradedDate = submission ? ((submission as any).gradedAt || (submission as any).reviewedAt) : null;

  const allowLateSubmission = (assignment as any)?.allowLateSubmission ?? (assignment as any)?.metadata?.allowLateSubmission ?? true;
  const rawPenaltyType = (assignment as any)?.latePenaltyType || (assignment as any)?.metadata?.latePenaltyType || (assignment as any)?.ExamClass?.[0]?.LatePenaltyType;
  const penaltyType = rawPenaltyType ? String(rawPenaltyType).toUpperCase() : (allowLateSubmission ? 'DAILY_POINTS' : 'NONE');
  const penaltyVal = (assignment as any)?.latePenaltyValue ?? (assignment as any)?.metadata?.latePenaltyValue ?? (assignment as any)?.ExamClass?.[0]?.LatePenaltyValue ?? 2;
  const isLateAllowed = allowLateSubmission && penaltyType !== 'NONE';
  const canSubmitOrResubmit = !isPastDue || isLateAllowed;
  const isLocked = isPastDue && !isLateAllowed;

  let latePolicyText = t('st.asg.no_late_penalty') || 'No late penalty';
  if (!allowLateSubmission || penaltyType === 'NONE') {
    latePolicyText = !allowLateSubmission ? (t('st.asg.late_blocked') || 'Không cho phép nộp trễ') : (t('st.asg.no_late_penalty') || 'Không trừ điểm');
  } else if (penaltyType === 'DAILY_POINTS') {
    latePolicyText = `-${penaltyVal} pts / 24h late`;
  } else if (penaltyType === 'FLAT_POINTS') {
    latePolicyText = `-${penaltyVal} pts flat deduction`;
  } else if (penaltyType === 'DAILY_PERCENT') {
    latePolicyText = `-${penaltyVal}% / 24h late`;
  }
  const fullContent = (assignment as any)?.metadata?.content || (assignment as any)?.content || (assignment as any)?.blueprint?.assignment?.description || (assignment as any)?.details;
  const rubricsList = assignment?.rubrics || (assignment as any)?.rubric?.rules || [];

  const handleDownloadFormattedDoc = () => {
    if (!assignment) return
    const title = assignment.title || (assignment as any)?.metadata?.title || 'Bai_Tap'
    const subjectName = assignment.subjectName || (assignment as any)?.subjectCode || (assignment as any)?.class || 'AITA LMS'
    const dueStr = dueDate ? new Date(dueDate).toLocaleString(undefined, { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : t('st.asg.no_due')
    const lecturerName = assignment.lecturer || t('st.asg.subject_lecturer')

    let formattedBodyHtml = ''
    if (fullContent) {
      formattedBodyHtml = fullContent
    } else {
      const rawText = assignment.description || (assignment as any)?.metadata?.description || ''
      formattedBodyHtml = rawText
        .split('\n')
        .map((line: string) => line.trim())
        .filter(Boolean)
        .map((line: string) => {
          if (line.toLowerCase().startsWith('assignment:') || line.toLowerCase().startsWith('project description') || line.toLowerCase().startsWith('technical requirements') || line.toLowerCase().startsWith('constraints:') || line.toLowerCase().startsWith('expected behavior')) {
            return `<h3 style="color:#1e3a8a; border-bottom:1px solid #cbd5e1; padding-bottom:4px; margin-top:18px; margin-bottom:8px; font-size:12pt; text-transform:uppercase;">${line}</h3>`
          }
          if (line.toLowerCase().startsWith('test case')) {
            return `<div style="background-color:#f1f5f9; border-left:4px solid #2563eb; padding:8px 12px; margin-top:12px; margin-bottom:6px; font-weight:bold; font-size:10.5pt;">${line}</div>`
          }
          return `<p style="margin-bottom:8px; line-height:1.6; font-size:11pt;">${line}</p>`
        })
        .join('')
    }

    const docHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>${title}</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          @page {
            size: 21cm 29.7cm;
            margin: 2.5cm 2cm 2.5cm 2cm;
          }
          body {
            font-family: 'Calibri', 'Segoe UI', Arial, sans-serif;
            font-size: 11pt;
            color: #0f172a;
            line-height: 1.6;
          }
          .header-banner {
            border-bottom: 3px double #2563eb;
            padding-bottom: 12px;
            margin-bottom: 20px;
          }
          .brand-title {
            font-size: 9.5pt;
            font-weight: bold;
            color: #2563eb;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .doc-main-title {
            font-size: 18pt;
            font-weight: bold;
            color: #1e3a8a;
            margin-top: 6px;
            margin-bottom: 4px;
          }
          .meta-table {
            width: 100%;
            border-collapse: collapse;
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            margin-bottom: 24px;
          }
          .meta-table td {
            padding: 10px 14px;
            font-size: 10pt;
            border: 1px solid #e2e8f0;
          }
          .section-heading {
            font-size: 12pt;
            font-weight: bold;
            color: #1e3a8a;
            border-bottom: 1.5pt solid #2563eb;
            padding-bottom: 4px;
            margin-top: 22px;
            margin-bottom: 12px;
            text-transform: uppercase;
          }
          .content-box {
            font-size: 11pt;
            line-height: 1.75;
          }
          table.rubric-grid {
            width: 100%;
            border-collapse: collapse;
            margin-top: 12px;
            margin-bottom: 20px;
          }
          table.rubric-grid th {
            background-color: #1e3a8a;
            color: #ffffff;
            font-weight: bold;
            text-align: left;
            padding: 9px 12px;
            font-size: 10pt;
            border: 1px solid #1e3a8a;
          }
          table.rubric-grid td {
            padding: 9px 12px;
            border: 1px solid #cbd5e1;
            font-size: 10pt;
          }
          table.rubric-grid tr:nth-child(even) {
            background-color: #f8fafc;
          }
          .footer-sign {
            margin-top: 40px;
            border-top: 1px solid #cbd5e1;
            padding-top: 12px;
            font-size: 9pt;
            color: #64748b;
            text-align: center;
            font-style: italic;
          }
        </style>
      </head>
      <body>
        <div class="header-banner">
          <div class="brand-title">AITA LMS LEARNING MANAGEMENT SYSTEM</div>
          <div class="doc-main-title">${title}</div>
          <div style="font-size: 10.5pt; color: #475569;">Subject: <strong>${subjectName}</strong></div>
        </div>

        <table class="meta-table">
          <tr>
            <td width="50%"><strong>👤 Lecturer:</strong> ${lecturerName}</td>
            <td width="50%"><strong>⏰ Due:</strong> <span style="color: #dc2626; font-weight: bold;">${dueStr}</span></td>
          </tr>
        </table>

        <div class="section-heading">I. ASSIGNMENT CONTENT & REQUIREMENTS</div>
        <div class="content-box">
          ${formattedBodyHtml}
        </div>

        ${rubricsList && rubricsList.length > 0 ? `
          <div class="section-heading">II. GRADING RUBRIC</div>
          <table class="rubric-grid">
            <thead>
              <tr>
                <th width="8%" align="center">STT</th>
                <th width="72%">Criteria</th>
                <th width="20%" align="center">Max score</th>
              </tr>
            </thead>
            <tbody>
              ${rubricsList.map((r: any, idx: number) => {
      const rPoints = r.weight ?? r.maxPoints ?? r.maxScore ?? r.points ?? r.score ?? 0;
      return `
                <tr>
                  <td align="center"><strong>${idx + 1}</strong></td>
                  <td>${r.description || r.title || 'Criterion'}</td>
                  <td align="center"><strong style="color:#2563eb;">${rPoints} pts</strong></td>
                </tr>
              `}).join('')}
            </tbody>
          </table>
        ` : ''}

        <div class="footer-sign">
          Assignment sheet exported automatically from AITA LMS &bull; Downloaded on: ${new Date().toLocaleDateString(undefined)}
        </div>
      </body>
      </html>
    `

    const blob = new Blob(['\ufeff', docHtml], {
      type: 'application/msword;charset=utf-8'
    })

    const safeTitle = title.replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1E00-\u1EFF]/g, '_')
    const fileName = `De_Bai_${safeTitle}.doc`
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }
  void handleDownloadFormattedDoc;

  const handleDownloadFormattedPdf = () => {
    if (!assignment) return
    const title = assignment.title || (assignment as any)?.metadata?.title || 'Assignment_Sheet'
    const subjectName = assignment.subjectName || (assignment as any)?.subjectCode || (assignment as any)?.class || 'AITA LMS'
    const courseCode = (assignment as any)?.subjectCode || (assignment as any)?.code || (assignment.subjectName ? assignment.subjectName.split(' ')[0] : '')
    const dueStr = dueDate ? new Date(dueDate).toLocaleString(undefined, { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : t('st.asg.no_due')
    const lecturerName = assignment.lecturer || t('st.asg.subject_lecturer')
    const totalMarks = (assignment as any)?.totalMarks || (assignment as any)?.maxScore || (assignment as any)?.points || '10.0'

    // Extract exact rendered DOM HTML from page (preserves Markdown tables, code blocks, inline badges, etc.)
    const domElement = document.getElementById('printable-assignment-container')
    let formattedBodyHtml = ''

    if (domElement) {
      const clone = domElement.cloneNode(true) as HTMLElement
      // Remove interactive buttons or SVGs inside code viewers before printing
      clone.querySelectorAll('button, .copy-button, svg').forEach(el => {
        if (el.tagName.toLowerCase() === 'button') el.remove()
      })
      formattedBodyHtml = clone.innerHTML
    } else if (fullContent) {
      formattedBodyHtml = fullContent
    } else {
      const rawText = assignment.description || (assignment as any)?.metadata?.description || ''
      formattedBodyHtml = rawText
        .split('\n')
        .map((line: string) => line.trim())
        .filter(Boolean)
        .map((line: string) => `<p style="margin-bottom:8px;">${line}</p>`)
        .join('')
    }

    const pdfHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset='utf-8'>
        <title>${title}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 0; /* Margin 0 disables browser default headers & footers (URL, timestamp) */
          }
          @media print {
            @page {
              margin: 0;
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            font-size: 10.5pt;
            color: #0f172a;
            line-height: 1.6;
            background: #ffffff;
            margin: 0;
            padding: 14mm 16mm 14mm 16mm;
            box-sizing: border-box;
          }

          /* Header Banner matching AITA LMS theme */
          .header-banner {
            border-bottom: 2px solid #2563eb;
            padding-bottom: 10px;
            margin-bottom: 16px;
          }
          .brand-title {
            font-size: 8.5pt;
            font-weight: 700;
            color: #2563eb;
            text-transform: uppercase;
            letter-spacing: 1.2px;
            margin-bottom: 4px;
          }
          .doc-main-title {
            font-size: 16.5pt;
            font-weight: 800;
            color: #0f172a;
            line-height: 1.3;
            margin-top: 4px;
            margin-bottom: 6px;
          }
          
          /* Metadata Table Bar */
          .meta-table {
            width: 100%;
            border-collapse: collapse;
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            margin-bottom: 20px;
          }
          .meta-table td {
            padding: 8px 12px;
            font-size: 9.5pt;
            border: 1px solid #e2e8f0;
            color: #334155;
          }

          /* Section Headings */
          .section-heading {
            font-size: 11pt;
            font-weight: 700;
            color: #1e3a8a;
            border-bottom: 1.5pt solid #2563eb;
            padding-bottom: 4px;
            margin-top: 20px;
            margin-bottom: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          /* Content box styling matching Image 2 */
          .content-box {
            font-size: 10.5pt;
            line-height: 1.65;
            color: #1e293b;
          }
          .content-box h1 {
            font-size: 14pt;
            font-weight: 800;
            color: #0f172a;
            margin-top: 18px;
            margin-bottom: 10px;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 6px;
          }
          .content-box h2 {
            font-size: 12.5pt;
            font-weight: 700;
            color: #0f172a;
            margin-top: 16px;
            margin-bottom: 8px;
          }
          .content-box h3 {
            font-size: 11pt;
            font-weight: 700;
            color: #1e293b;
            margin-top: 14px;
            margin-bottom: 6px;
          }
          .content-box p {
            margin-bottom: 10px;
          }
          .content-box ul, .content-box ol {
            margin-top: 4px;
            margin-bottom: 12px;
            padding-left: 22px;
          }
          .content-box li {
            margin-bottom: 4px;
          }

          /* Code & Pill Badges (matches Image 2) */
          .content-box code, code {
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            font-size: 9pt;
            font-weight: 600;
            background-color: #f1f5f9 !important;
            color: #0f172a !important;
            padding: 2px 6px;
            border-radius: 4px;
            border: 1px solid #cbd5e1 !important;
            display: inline-block;
          }

          /* Code blocks */
          .content-box pre, pre {
            background-color: #0f172a !important;
            color: #f8fafc !important;
            padding: 12px 14px;
            border-radius: 6px;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            font-size: 9pt;
            line-height: 1.5;
            overflow-x: auto;
            margin-top: 10px;
            margin-bottom: 14px;
            white-space: pre-wrap;
            word-break: break-all;
          }
          .content-box pre code {
            background-color: transparent !important;
            border: none !important;
            color: inherit !important;
            padding: 0;
            font-size: inherit;
          }

          /* Markdown Tables (matches Image 2) */
          .content-box table, table {
            width: 100% !important;
            border-collapse: collapse !important;
            margin-top: 12px;
            margin-bottom: 18px;
            page-break-inside: avoid;
          }
          .content-box th, table th {
            background-color: #f8fafc !important;
            color: #0f172a !important;
            font-weight: 700 !important;
            text-align: left;
            padding: 8px 12px !important;
            font-size: 9.5pt !important;
            border: 1px solid #cbd5e1 !important;
            border-bottom: 2px solid #94a3b8 !important;
          }
          .content-box td, table td {
            padding: 8px 12px !important;
            border: 1px solid #cbd5e1 !important;
            font-size: 9.5pt !important;
            color: #334155 !important;
          }
          .content-box tr:nth-child(even), table tr:nth-child(even) {
            background-color: #fcfcfd !important;
          }

          /* Rubric Grid Table */
          table.rubric-grid {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
            margin-bottom: 18px;
            page-break-inside: avoid;
          }
          table.rubric-grid th {
            background-color: #1e3a8a !important;
            color: #ffffff !important;
            font-weight: bold;
            text-align: left;
            padding: 8px 12px !important;
            font-size: 9.5pt !important;
            border: 1px solid #1e3a8a !important;
          }
          table.rubric-grid td {
            padding: 8px 12px !important;
            border: 1px solid #cbd5e1 !important;
            font-size: 9.5pt !important;
          }

          /* Footer Sign */
          .footer-sign {
            margin-top: 30px;
            border-top: 1px solid #e2e8f0;
            padding-top: 10px;
            font-size: 8.5pt;
            color: #64748b;
            text-align: center;
            font-style: italic;
          }
        </style>
      </head>
      <body>
        <div class="header-banner">
          <div class="brand-title">AITA LMS LEARNING MANAGEMENT SYSTEM</div>
          <div class="doc-main-title">${title}</div>
          <div style="font-size: 10pt; color: #475569;">
            ${courseCode ? `Course Code: <strong>${courseCode}</strong> &bull; ` : ''}Subject: <strong>${subjectName}</strong> &bull; Total Marks: <strong>${totalMarks}</strong>
          </div>
        </div>

        <table class="meta-table">
          <tr>
            <td width="50%"><strong>👤 Lecturer:</strong> ${lecturerName}</td>
            <td width="50%"><strong>⏰ Due:</strong> <span style="color: #dc2626; font-weight: bold;">${dueStr}</span></td>
          </tr>
        </table>

        <div class="section-heading">ASSIGNMENT CONTENT & REQUIREMENTS</div>
        <div class="content-box">
          ${formattedBodyHtml}
        </div>

        ${rubricsList && rubricsList.length > 0 ? `
          <div class="section-heading">GRADING RUBRIC</div>
          <table class="rubric-grid">
            <thead>
              <tr>
                <th width="8%" align="center">No</th>
                <th width="72%">Criteria</th>
                <th width="20%" align="center">Max score</th>
              </tr>
            </thead>
            <tbody>
              ${rubricsList.map((r: any, idx: number) => {
      const rPoints = r.weight ?? r.maxPoints ?? r.maxScore ?? r.points ?? r.score ?? 0;
      return `
                <tr>
                  <td align="center"><strong>${idx + 1}</strong></td>
                  <td>${r.description || r.title || 'Criterion'}</td>
                  <td align="center"><strong style="color:#2563eb;">${rPoints} pts</strong></td>
                </tr>
              `}).join('')}
            </tbody>
          </table>
        ` : ''}

        <div class="footer-sign">
          Assignment sheet exported automatically from AITA LMS &bull; Downloaded on: ${new Date().toLocaleDateString(undefined)}
        </div>
      </body>
      </html>
    `

    const iframe = document.createElement('iframe')
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = '0'
    document.body.appendChild(iframe)

    const frameDoc = iframe.contentWindow?.document
    if (frameDoc) {
      frameDoc.open()
      frameDoc.write(pdfHtml)
      frameDoc.close()
      iframe.contentWindow?.focus()
      setTimeout(() => {
        iframe.contentWindow?.print()
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe)
          }
        }, 1000)
      }, 300)
    }
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto animate-in fade-in duration-500 relative">
      {toast && (
        <div className="fixed top-24 right-8 z-[100] animate-toast-in">
          <div className={`rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border p-4 flex items-center gap-3 min-w-[320px] bg-white dark:bg-slate-800 ${toast.type === 'error' ? 'border-red-100 dark:border-red-900' : 'border-emerald-100 dark:border-emerald-900'}`}>
            <div className={`shrink-0 p-1.5 rounded-full ${toast.type === 'error' ? 'text-red-500 bg-red-50 dark:bg-red-500/10' : 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10'}`}>
              {toast.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
            </div>
            <p className={`font-semibold text-sm ${toast.type === 'error' ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{toast.message}</p>
            <button onClick={() => setToast(null)} className="ml-auto text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <span className="sr-only">Close</span>
              &times;
            </button>
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 max-w-[1600px] mx-auto min-w-0">

        {/* Left Column: Assignment Context (Like EduNext) */}
        <div className="lg:col-span-8 space-y-4 min-w-0 w-full">

          <div className="mb-6">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-slate-400 mb-3">
              <Link to="/student" className="hover:text-slate-600 cursor-pointer transition-colors">Home</Link>
              <ChevronRight size={14} />
              <Link to="/student/subjects" className="hover:text-slate-600 cursor-pointer transition-colors">Subject</Link>
              <ChevronRight size={14} />
              <Link to="/student/subjects" state={{ expand: assignment.subjectId }} className="hover:text-slate-600 cursor-pointer transition-colors">
                {assignment.subjectName ? assignment.subjectName.split(' - ')[0] : ((assignment as any).subjectCode || (assignment as any).subject || (assignment.title?.split(':')?.[0]?.trim()) || 'Subject')}
              </Link>
              <ChevronRight size={14} />
              <span className="font-medium text-slate-700 dark:text-slate-300">{assignment.title}</span>
            </div>

            {/* Header Section */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-2">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{assignment.title}</h1>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-md font-medium text-sm border border-blue-100 dark:border-blue-800">
                  <FileText size={14} />
                  {assignment.type === 'Exam' ? 'Exam' : 'Assignment'}
                </div>

                {assignment.due && isNearDeadline && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 rounded-md font-medium text-sm border border-amber-100 dark:border-amber-800">
                    <Clock size={14} />
                    Due soon
                  </div>
                )}


                {assignment.due && (
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium text-sm border ${isPastDue || isNearDeadline
                    ? 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400 border-red-100 dark:border-red-800'
                    : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800'
                    }`}>
                    <Calendar size={14} />
                    Due: {new Date(assignment.due).toLocaleString(undefined, { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Card: SQL Answer Key & Setup Script (Specifically for DBI / SQL Assignments when lecturer attached key) */}
          {sqlSetupScript && (
            <Card className="bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-teal-500/10 border border-emerald-300 dark:border-emerald-700/60 shadow-sm overflow-hidden animate-in fade-in duration-300 mb-4">
              <div className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
                      <Database size={24} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                          {t('st.asg.sql_title')}
                        </h3>
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-600 text-white shadow-xs">
                          {t('st.asg.sql_badge')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 font-medium">
                        {t('st.asg.sql_desc')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setShowSqlPreview(!showSqlPreview)}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl border border-emerald-300 dark:border-emerald-700 shadow-xs transition-all cursor-pointer"
                    >
                      <Code size={15} className="text-emerald-600 dark:text-emerald-400" />
                      <span>{showSqlPreview ? t('st.asg.sql_hide') : t('st.asg.sql_view')}</span>
                    </button>

                    <button
                      onClick={handleDownloadSqlSetupScript}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer"
                    >
                      <Download size={15} />
                      <span>{t('st.asg.sql_download')}</span>
                    </button>
                  </div>
                </div>

                {showSqlPreview && (
                  <div className="mt-4 pt-4 border-t border-emerald-200/80 dark:border-emerald-800/60 animate-in fade-in slide-in-from-top-2 duration-200">
                    <CodeBlockViewer
                      code={sqlSetupScript}
                      language="SQL Answer Key & Setup Script (.sql)"
                      onCopy={() => {
                        navigator.clipboard.writeText(sqlSetupScript);
                        setCopiedSql(true);
                        setTimeout(() => setCopiedSql(false), 2000);
                      }}
                      isCopied={copiedSql}
                    />
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Reopen Notification Banner */}
          {submission?.isReopened && (
            <div className="p-4 rounded-2xl border flex items-center gap-3.5 bg-blue-50/90 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 text-blue-900 dark:text-blue-200 mb-4 shadow-sm">
              <div className="p-2.5 bg-blue-600 text-white rounded-xl shrink-0 shadow-xs">
                <RotateCcw size={20} />
              </div>
              <div>
                <p className="font-extrabold text-sm text-blue-900 dark:text-blue-200 flex items-center gap-2">
                  <span>Giảng viên đã cho phép bạn nộp lại bài!</span>
                  <span className="px-2 py-0.5 text-[10px] uppercase font-bold bg-blue-600 text-white rounded-full">{t('st.asg.reopened')}</span>
                </p>
                <p className="text-xs mt-0.5 opacity-90">
                  {submission.reopenReason ? `Lý do: "${submission.reopenReason}". ` : ''}Hãy tải file bài làm mới lên và ấn "Nộp bài" trước khi hết hạn gia hạn.
                </p>
              </div>
            </div>
          )}

          {/* Deadline & Live Countdown Banner */}
          {dueDate && (
            isSubmitted ? (
              <div className="p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm mb-4 transition-all bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-emerald-500/10 border-emerald-300 dark:border-emerald-700/50 text-emerald-900 dark:text-emerald-200">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl font-bold flex items-center justify-center shrink-0 shadow-sm bg-emerald-600 text-white">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase rounded-full bg-emerald-600 text-white">
                        SUBMITTED WORK
                      </span>
                      <span className="text-xs font-semibold">
                        Due: {new Date(dueDate).toLocaleString(undefined, { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </span>
                    </div>
                    <p className="text-xs mt-1 font-bold">
                      You have submitted your work{submission?.submittedAt ? ` at ${new Date(submission.submittedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} ${new Date(submission.submittedAt).toLocaleDateString(undefined)}` : ''}. {canSubmitOrResubmit ? 'You can resubmit if you need to make changes.' : 'Resubmission is now locked.'}
                    </p>
                  </div>
                </div>
                <div className="px-4 py-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-xl border border-emerald-200 dark:border-emerald-800 shrink-0 flex items-center gap-2 text-xs font-bold">
                  <Check size={16} />
                  <span>{t('st.asg.submission_complete')}</span>
                </div>
              </div>
            ) : (
              <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm mb-4 transition-all ${
                isPastDue
                  ? (canSubmitOrResubmit 
                      ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/40 text-amber-900 dark:text-amber-300'
                      : 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/40 text-rose-800 dark:text-rose-300'
                    )
                  : isNearDeadline
                    ? 'bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-amber-500/10 border-amber-300 dark:border-amber-700/50 text-amber-900 dark:text-amber-200 animate-pulse'
                    : 'bg-gradient-to-r from-blue-500/10 via-brand-500/5 to-blue-500/10 border-blue-200 dark:border-blue-800/50 text-blue-900 dark:text-blue-200'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl font-bold flex items-center justify-center shrink-0 shadow-sm ${
                    isPastDue 
                      ? (canSubmitOrResubmit ? 'bg-amber-500 text-white' : 'bg-rose-500 text-white')
                      : (isNearDeadline ? 'bg-amber-500 text-white' : 'bg-blue-600 text-white')
                  }`}>
                    <Clock size={20} className={!isPastDue ? 'animate-spin' : ''} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 text-[10px] font-extrabold uppercase rounded-full ${
                        isPastDue 
                          ? (canSubmitOrResubmit ? 'bg-amber-600 text-white' : 'bg-rose-600 text-white')
                          : (isNearDeadline ? 'bg-amber-600 text-white' : 'bg-blue-600 text-white')
                      }`}>
                        {isPastDue ? (canSubmitOrResubmit ? 'LATE SUBMISSION ACTIVE' : 'CLOSED') : isNearDeadline ? 'DEADLINE WARNING' : 'TIME REMAINING'}
                      </span>
                      <span className="text-xs font-semibold">
                        Due: {dueDate ? new Date(dueDate).toLocaleString(undefined, { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : 'No deadline'}
                      </span>
                    </div>
                    <p className="text-xs mt-1 font-bold flex items-center gap-1">
                      {isPastDue 
                        ? (canSubmitOrResubmit ? `Quá hạn nộp bài — Đang chấp nhận nộp trễ (${latePolicyText})` : (t('st.asg.closed_official') || 'Bài tập đã đóng không nhận thêm bài nộp.'))
                        : <>Time remaining: <CountdownDisplay dueDate={dueDate} /></>
                      }
                    </p>
                  </div>
                </div>

                {!isPastDue && (
                  <div className="px-4 py-2 bg-white dark:bg-[#151821] rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-sm shrink-0 flex items-center gap-2 text-xs font-mono font-bold text-slate-800 dark:text-slate-100">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                    <CountdownDisplay dueDate={dueDate} />
                  </div>
                )}
              </div>
            )
          )}

          {/* Card: Assignment details */}
          <Card className="bg-white dark:bg-[#151821] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center">
              <h2 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <FileText size={18} className="text-blue-600" /> Assignment details
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadFormattedPdf}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-all shadow-sm cursor-pointer"
                  title={t('st.asg.download_pdf')}
                >
                  <Download size={14} /> Download (.pdf)
                </button>
                {/* Tạm thời ẩn nút Download (.docx). Bỏ comment dưới đây nếu muốn khôi phục lại tùy chọn tải file Word:
                <button
                  onClick={handleDownloadFormattedDoc}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 text-xs font-medium rounded-lg transition-all border border-slate-200 dark:border-slate-700 cursor-pointer"
                  title={t('st.asg.download_docx')}
                >
                  <FileText size={14} /> Download (.docx)
                </button>
                */}
              </div>
            </div>
            <div id="printable-assignment-container" className="p-5 text-[15px] text-slate-700 dark:text-slate-300 min-w-0 max-w-full overflow-x-auto">
              <SmartAssignmentContent content={fullContent || assignment.description || (assignment as any)?.metadata?.description || ''} />
            </div>
          </Card>

          {/* Card: Attachments */}
          {assignment.attachments && assignment.attachments.length > 0 && (
            <Card className="bg-white dark:bg-[#151821] border border-slate-100 dark:border-slate-800 shadow-sm">
              <div className="px-5 py-2 flex justify-between items-center">
                <h2 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Paperclip size={18} className="text-blue-600" /> Attachments
                </h2>
              </div>
              <div className="px-5 py-2">
                <div className="flex flex-col gap-2">
                  {assignment.attachments.map(att => {
                    const isPreviewable = att.fileName.toLowerCase().match(/\.(pdf|png|jpg|jpeg|gif)$/);
                    const fileUrl = `${(import.meta as any).env.VITE_API_URL || '/api'}/assignments/attachments/${att.id}/download?token=${getStoredItem(AUTH_STORAGE_KEYS.token)}`;

                    return (
                      <div key={att.id} className="flex flex-col gap-2">
                        <a
                          href={fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-brand-50 dark:bg-slate-900 dark:hover:bg-slate-800 transition-colors group"
                        >
                          <div className="flex items-center gap-3">
                            <FileText size={18} className="text-blue-500" />
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-brand-600 transition-colors flex-1">{att.fileName}</span>
                          </div>
                          <div className="w-7 h-7 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 group-hover:text-brand-600 group-hover:border-brand-200 shadow-sm transition-all">
                            <Download size={14} />
                          </div>
                        </a>

                        {isPreviewable && (
                          <div className="w-full rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white shadow-sm mt-1 mb-4">
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-2 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Xem trước tài liệu</span>
                              <a href={`${fileUrl}&inline=true`} target="_blank" rel="noreferrer" className="text-xs text-brand-600 hover:underline">Mở tab mới</a>
                            </div>
                            {att.fileName.toLowerCase().endsWith('.pdf') ? (
                              <iframe src={`${fileUrl}&inline=true`} className="w-full h-[800px] bg-slate-100" title={att.fileName} />
                            ) : (
                              <div className="p-4 flex justify-center bg-slate-100 dark:bg-slate-900/50">
                                <img src={`${fileUrl}&inline=true`} alt={att.fileName} className="max-w-full h-auto object-contain max-h-[800px] rounded" />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>
          )}

          {/* Card: Rubric Section */}
          {rubricsList && rubricsList.length > 0 && (
            <Card className="bg-white dark:bg-[#151821] border border-slate-100 dark:border-slate-800 shadow-sm">
              <div className="px-5 py-2 flex justify-between items-center">
                <h2 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Award size={18} className="text-blue-600" /> Grading criteria (rubric)
                </h2>
              </div>
              <div className="px-5 py-2">
                <div className="space-y-4">
                  {rubricsList.map((rule: any, index: number) => {
                    const rulePoints = rule.weight ?? rule.maxPoints ?? rule.maxScore ?? rule.points ?? rule.score;
                    const hasValidPoints = rulePoints != null && !isNaN(Number(rulePoints)) && Number(rulePoints) > 0;
                    const displayPoints = hasValidPoints
                      ? `${Number(rulePoints)} pts`
                      : (rule.criteria?.length ? `${rule.criteria.reduce((s: number, c: any) => s + (Number(c.weight ?? c.maxPoints ?? c.maxScore ?? 0) || 0), 0)} pts` : 'Criterion');

                    return (
                      <div key={rule.id || index} className="rounded-lg border border-blue-50 dark:border-blue-900/30 overflow-hidden bg-blue-50/50 dark:bg-blue-900/10">
                        <div className="p-4 flex justify-between items-start gap-4">
                          <div className="flex gap-3 flex-1 min-w-0">
                            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-sm border border-blue-200 dark:border-blue-800">
                              {index + 1}
                            </div>
                            <div className="text-sm text-slate-800 dark:text-slate-200 block leading-relaxed mt-1 min-w-0 flex-1 break-words">
                              {rule.title && (
                                <span className="font-bold text-slate-900 dark:text-white block mb-1 break-words">{rule.title}</span>
                              )}
                              <FormattedText text={rule.description || rule.title || 'Criterion'} />
                            </div>
                          </div>
                          <span className="text-xs font-extrabold text-blue-700 dark:text-blue-300 bg-blue-100/80 dark:bg-blue-900/60 px-3 py-1.5 rounded-lg shrink-0 mt-0.5 border border-blue-200 dark:border-blue-700 shadow-sm whitespace-nowrap">
                            {displayPoints}
                          </span>
                        </div>
                        <RubricRuleSpecViewer rule={rule} isStudentView={true} />

                        {rule.criteria && rule.criteria.length > 0 && (
                          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                            {rule.criteria.map((c: any, cIdx: number) => {
                              const cPoints = c.weight ?? c.maxPoints ?? c.maxScore ?? c.points ?? c.score;
                              const cDisplay = cPoints != null && !isNaN(Number(cPoints)) && Number(cPoints) > 0 ? `${Number(cPoints)} pts` : '';
                              return (
                                <li key={c.id || cIdx} className="p-3 flex justify-between items-start gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                                  <FormattedText className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed" text={typeof c.description === 'string' ? c.description : JSON.stringify(c.description)} />
                                  {cDisplay && (
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap pt-0.5 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700">{cDisplay}</span>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>
          )}

          {/* Grading & Feedback Result */}
          {isGraded && displayScore != null && (
            <Card className="bg-white dark:bg-[#151821] border border-slate-200 dark:border-slate-800 shadow-sm animate-in slide-in-from-bottom-4 duration-500 overflow-hidden">
              {!((submission as any)?.reviewStatus === 'PUBLISHED' || (submission as any)?.isPublished) ? (
                <div className="p-6 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-amber-500/10 text-amber-900 dark:text-amber-200 flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                    <Clock size={24} className="animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-amber-900 dark:text-amber-100 mb-1">
                      ⌛ Your submission is being graded and reviewed by the lecturer
                    </h3>
                    <p className="text-xs text-amber-800/80 dark:text-amber-300/80 leading-relaxed">
                      Your submission has been analysed by the AI and the result saved.
                      The lecturer is reviewing the score and detailed assessment. The official result appears as soon as the lecturer approves it and presses <strong>{t('st.asg.publish_result')}</strong>.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-5 space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                    <h2 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <CheckCircle2 size={18} className="text-emerald-500" /> AI result and feedback
                    </h2>
                  </div>

                  {/* Late Submission Audit Card (Thẻ giải trình trừ điểm nộp trễ) */}
                  {((submission as any)?.latePenaltyAmount > 0 || (submission as any)?.isLate) && (
                    <div className="bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-2xl p-5 mb-6 shadow-xs transition-all">
                      <div className="flex items-center justify-between pb-3 border-b border-amber-200/60 dark:border-amber-800/40">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-xl bg-amber-500 text-white font-bold shrink-0 shadow-xs">
                            <Clock size={16} />
                          </div>
                          <div>
                            <h4 className="font-bold text-xs uppercase tracking-wider text-amber-900 dark:text-amber-200">
                              Giải trình điểm nộp trễ (Late Penalty Audit)
                            </h4>
                            <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                              Bài nộp của bạn đã quá hạn deadline chính thức
                            </p>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 text-xs font-black bg-rose-600 text-white rounded-lg shadow-2xs font-mono">
                          -{(submission as any)?.latePenaltyAmount || 0} điểm
                        </span>
                      </div>

                      <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/60 border border-amber-200/50 dark:border-amber-900/40">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Hạn nộp chính thức</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {dueDate ? new Date(dueDate).toLocaleString(undefined, { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/60 border border-amber-200/50 dark:border-amber-900/40">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Thời gian nộp thực tế</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {submission?.submittedAt ? new Date(submission.submittedAt).toLocaleString(undefined, { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/60 border border-amber-200/50 dark:border-amber-900/40">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Thời gian nộp trễ</span>
                          <span className="font-extrabold text-amber-700 dark:text-amber-400">
                            {(submission as any)?.daysLate ? `Trễ ${(submission as any).daysLate} ngày` : 'Nộp sau deadline'}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 p-3 rounded-xl bg-white dark:bg-slate-900 border border-amber-200/60 dark:border-amber-800/40 flex items-center justify-between flex-wrap gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                        <span>
                          📊 Công thức tính điểm: <strong className="text-slate-900 dark:text-white">{((submission as any)?.rawScore ?? (submission as any)?.score ?? displayScore)} điểm gốc</strong> - <strong className="text-rose-600 dark:text-rose-400">{(submission as any)?.latePenaltyAmount || 0} đ phạt trễ</strong> = <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{displayScore} điểm chốt</strong>
                        </span>
                      </div>
                    </div>
                  )}

                  {submission.aiFeedback ? (
                    <div className="bg-gradient-to-br from-indigo-50/50 to-blue-50/50 dark:from-indigo-900/10 dark:to-blue-900/10 border border-indigo-100/50 dark:border-indigo-500/20 rounded-2xl p-6 shadow-sm mb-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center border border-indigo-200/50 dark:border-indigo-700/30">
                          <Sparkles className="text-indigo-600 dark:text-indigo-400" size={20} />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-slate-900 dark:text-white">{t('st.asg.ai_mentor')}</h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{t('st.asg.ai_mentor_desc')}</p>
                        </div>
                      </div>
                      <div className="prose prose-indigo dark:prose-invert max-w-none prose-p:leading-relaxed prose-li:my-1 text-sm text-slate-700 dark:text-slate-300">
                        <ReactMarkdown>{formatLatexMath(submission.aiFeedback as string)}</ReactMarkdown>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-6">
                      <p className="text-sm text-slate-600 dark:text-slate-400 p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 text-center italic">
                        No automated feedback.
                      </p>
                    </div>
                  )}

                  <div className="mt-6 border-t border-slate-100 dark:border-slate-800 pt-6">
                    {!showAppeal ? (
                      <button onClick={() => setShowAppeal(true)} className="text-sm font-bold text-brand-600 dark:text-brand-400 hover:underline">
                        Have a question about your score?
                      </button>
                    ) : (
                      <div className="text-left bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 mt-2">
                        <h4 className="font-bold text-sm mb-2 text-slate-700 dark:text-slate-300">{t('st.asg.appeal_title')}</h4>
                        <div className="flex items-end gap-2">
                          <div className="flex-1">
                            <Input
                              placeholder={t('st.asg.appeal_placeholder')}
                              value={appealText}
                              onChange={(e) => setAppealText(e.target.value)}
                            />
                          </div>
                          <Button onClick={handleSendAppeal} className="bg-brand-600 hover:bg-brand-700 text-white mb-1">
                            <Send size={16} className="mr-2" /> Send
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Card>
          )}

        </div>

        {/* Right Column: Submission Form & Info */}
        <div className="lg:col-span-4 space-y-6 lg:pt-[88px] min-w-0 w-full">
          <Card className="bg-slate-50 dark:bg-[#1a1d27] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="px-5 py-2">
              <h3 className="font-bold text-slate-800 dark:text-slate-200">
                Your submission
              </h3>
            </div>
            <div className="px-5 py-2 space-y-4">
              {isSubmitted ? (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-emerald-200 rounded-xl p-5 text-center dark:border-emerald-900/30 bg-emerald-50/50 dark:bg-emerald-900/10">
                    <CheckCircle2 size={32} className="text-emerald-500 mx-auto mb-2" />
                    <p className="font-bold text-emerald-800 dark:text-emerald-500">Submitted successfully</p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-600/80 mt-1 mb-3">
                      At: {submission.submittedAt ? new Date(submission.submittedAt).toLocaleString(undefined, { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : ''}
                      {(submission as any).attemptNumber && (submission as any).attemptNumber > 1 && (
                        <span className="ml-2 px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded font-semibold text-[11px]">
                          Attempt #{(submission as any).attemptNumber}
                        </span>
                      )}
                    </p>

                    {submission?.zipFileUrl && (
                      <a
                        href={`${(import.meta as any).env.VITE_API_URL || '/api'}/submissions/${submission.id}/download?token=${getStoredItem(AUTH_STORAGE_KEYS.token)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-white hover:bg-emerald-50 dark:bg-emerald-900/40 dark:hover:bg-emerald-800/50 transition-colors group text-left"
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <FileText size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300 group-hover:text-emerald-800 dark:group-hover:text-emerald-200 truncate">
                            {submission.zipFileUrl.includes('?filename=') ? decodeURIComponent(submission.zipFileUrl.split('?filename=')[1]) : (submission.zipFileUrl.split('/').pop()?.split('?')[0] || t('st.asg.submission_file'))}
                          </span>
                        </div>
                        <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-300 group-hover:bg-emerald-200 dark:group-hover:bg-emerald-700 transition-all shrink-0 ml-2">
                          <Download size={14} />
                        </div>
                      </a>
                    )}
                  </div>

                  {/* Resubmission Section */}
                  {canSubmitOrResubmit ? (
                    !isResubmitting ? (
                      <Button
                        variant="outline"
                        onClick={() => setIsResubmitting(true)}
                        className="w-full border-2 border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400 bg-blue-50/50 hover:bg-blue-100/80 dark:bg-blue-950/30 dark:hover:bg-blue-900/50 font-bold py-2.5 h-auto rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
                      >
                        <RotateCcw size={16} className="text-blue-600 dark:text-blue-400" />
                        <span>{t('st.asg.resubmit') || 'Nộp lại bài'}</span>
                      </Button>
                    ) : (
                      <div className="border border-blue-200 dark:border-blue-800/50 rounded-xl p-4 bg-blue-50/50 dark:bg-slate-900/50 space-y-3 animate-in fade-in duration-300">
                        {isPastDue && allowLateSubmission && penaltyType !== 'NONE' && (
                          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-lg text-xs text-amber-900 dark:text-amber-300 leading-relaxed font-medium">
                            <strong>⚠️ Cảnh báo nộp trễ:</strong> Nộp lại bài sau thời hạn sẽ tự động áp dụng mức trừ điểm: {penaltyType === 'DAILY_POINTS' ? `-${penaltyVal} điểm / 24 giờ` : penaltyType === 'DAILY_PERCENT' ? `-${penaltyVal}% / 24 giờ` : `-${penaltyVal} điểm cố định`}.
                          </div>
                        )}
                        <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 rounded-lg text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
                          <strong>ℹ️ Lưu ý:</strong> Nộp lại bài sẽ thay thế file bài nộp cũ và chuyển bài tập về trạng thái <strong>{t('st.asg.awaiting_regrade') || 'Chờ giảng viên chấm lại'}</strong>.
                        </div>

                        <div className="border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-lg p-4 flex flex-col items-center justify-center text-slate-500 bg-white dark:bg-slate-900 relative cursor-pointer group">
                          <input
                            type="file"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                          />
                          <UploadCloud size={24} className="mb-1 text-blue-500 group-hover:text-blue-600 transition-colors" />
                          <p className="text-xs font-medium text-slate-700 dark:text-slate-300">{t('st.asg.choose_new_file') || 'Chọn tệp bài làm mới'}</p>
                          <p className="text-[11px] text-slate-400">PDF, DOCX, ZIP (max 10MB)</p>
                        </div>

                        {file && (
                          <div className="bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                            <span className="text-xs font-medium truncate pr-2 text-slate-700 dark:text-slate-300">{file.name}</span>
                            <button onClick={() => setFile(null)} className="text-red-500 text-xs font-bold hover:underline shrink-0">Remove</button>
                          </div>
                        )}

                        <div className="flex gap-2 pt-1">
                          <Button
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs py-2 h-auto rounded-lg"
                            onClick={handleSubmit}
                            disabled={isSubmitting || !file}
                          >
                            {isSubmitting ? <Loader2 className="animate-spin w-3.5 h-3.5 mr-1" /> : <Send size={14} className="mr-1" />}
                            Xác nhận nộp lại
                          </Button>
                          <Button
                            variant="outline"
                            className="text-xs py-2 h-auto rounded-lg text-slate-600 dark:text-slate-400"
                            onClick={() => { setIsResubmitting(false); setFile(null); }}
                            disabled={isSubmitting}
                          >
                            Hủy
                          </Button>
                        </div>
                      </div>
                    )
                  ) : (
                    <div className="p-2.5 bg-slate-100 dark:bg-slate-800/60 rounded-lg text-center text-xs text-slate-500 dark:text-slate-400 font-medium">
                      🔒 Hạn nộp đã hết - bài tập đã khoá không thể nộp lại.
                    </div>
                  )}
                </div>
              ) : isLocked ? (
                <div className="bg-red-50 border border-red-100 rounded-xl p-6 text-center dark:bg-red-900/10 dark:border-red-900/30">
                  <AlertCircle size={32} className="text-red-500 mx-auto mb-2" />
                  <p className="font-bold text-red-800 dark:text-red-500">The submission deadline has passed</p>
                  <p className="text-sm text-red-600 dark:text-red-600/80 mt-1">Submission has been locked by the system.</p>
                </div>
              ) : (
                <>
                  {isPastDue && allowLateSubmission && penaltyType !== 'NONE' && (
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-xl text-xs text-amber-900 dark:text-amber-300 font-medium flex items-center gap-2 mb-3">
                      <AlertCircle size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
                      <span>
                        <strong>Overdue warning:</strong> Submitting late will automatically deduct {penaltyType === 'DAILY_POINTS' ? `${penaltyVal} pts per 24 hours` : penaltyType === 'DAILY_PERCENT' ? `${penaltyVal}% per 24 hours` : `${penaltyVal} pts flat`}.
                      </span>
                    </div>
                  )}
                  <div className="border-2 border-dashed border-blue-200 dark:border-blue-800/50 rounded-xl p-5 flex flex-col items-center justify-center text-slate-500 bg-white hover:bg-blue-50/50 dark:bg-slate-900/50 transition-colors relative cursor-pointer group">
                    <input
                      type="file"
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                    />
                    <UploadCloud size={28} className="mb-2 text-blue-500 group-hover:text-blue-600 transition-colors" />
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Drag and drop your file here</p>
                    <p className="text-xs text-slate-400 mt-0.5 mb-3">or choose a file from your computer</p>
                    <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Supported: PDF, DOCX, ZIP (max 10MB)</p>
                  </div>

                  {file && (
                    <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-lg flex items-center justify-between mb-4 mt-4">
                      <span className="text-sm font-medium truncate pr-4 text-slate-700 dark:text-slate-300">{file.name}</span>
                      <button onClick={() => setFile(null)} className="text-red-500 text-sm font-bold hover:underline shrink-0">Remove</button>
                    </div>
                  )}

                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-sm font-medium mt-2 rounded-lg py-2.5 h-auto"
                    onClick={handleSubmit}
                    disabled={isSubmitting || !file}
                  >
                    {isSubmitting ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Send size={16} className="mr-2" />}
                    Submit
                  </Button>
                </>
              )}
            </div>
          </Card>

          {/* Assignment information Card */}
          <Card className="bg-slate-50 dark:bg-[#1a1d27] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="px-5 py-2">
              <h3 className="font-bold text-slate-800 dark:text-slate-200">
                Assignment information
              </h3>
            </div>
            <div className="px-5 py-2 space-y-4 text-sm">
              <div className="flex justify-between items-start gap-4">
                <span className="text-slate-500 shrink-0 mt-0.5">Subject</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 text-right">
                  {(() => {
                    const subName = assignment.subjectName || (assignment as any).subjectCode || (assignment as any).subject || (assignment.title?.split(':')?.[0]?.trim());
                    const typeName = assignment.type || (assignment as any).category || (assignment as any).metadata?.assignmentType || (assignment as any).metadata?.category || (assignment as any).examType || (assignment as any).ExamType || 'Assignment';
                    return subName ? `${subName} - ${typeName}` : typeName;
                  })()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Lecturer</span>
                {/* Show only the lecturer's own photo. When none is stored, fall back to their
                    initials — never a stock face. This previously loaded a random portrait from
                    an external avatar service, presenting a stranger as the class lecturer. */}
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
                    {assignment.lecturerAvatar ? (
                      <img src={assignment.lecturerAvatar} alt={assignment.lecturer || 'Lecturer'} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">
                        {(assignment.lecturer || '?').trim().split(/\s+/).slice(-2).map(w => w[0]).join('').toUpperCase()}
                      </span>
                    )}
                  </div>
                  <span className="font-medium text-slate-700 dark:text-slate-300">{assignment.lecturer || 'Not assigned'}</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Due date</span>
                <span className="font-medium text-red-600">{dueDate ? new Date(dueDate).toLocaleString(undefined, { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Late policy</span>
                <span className={`font-bold text-xs ${!allowLateSubmission ? 'text-rose-600 dark:text-rose-400' : penaltyType !== 'NONE' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-600 dark:text-slate-400'}`}>
                  {latePolicyText}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Status</span>
                <span className={`font-medium ${isSubmitted ? 'text-emerald-500' : 'text-amber-500'}`}>{isSubmitted ? 'Submitted' : 'Not submitted'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Score</span>
                {displayScore != null && isPublished ? (
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold ${Number(displayScore) >= 8 ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : Number(displayScore) >= 5 ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}>
                    {Number(displayScore).toLocaleString(undefined)}
                  </span>
                ) : (
                  <span className="font-medium text-slate-500 dark:text-slate-400 text-xs">
                    {isSubmitted ? (submission.gradingStatus === 'Pending' || submission.reviewStatus === 'pending' || !isPublished ? 'Pending evaluation' : '—') : '—'}
                  </span>
                )}
              </div>
            </div>
          </Card>

          {/* Progress Card */}
          <Card className="bg-slate-50 dark:bg-[#1a1d27] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="px-5 py-2">
              <h3 className="font-bold text-slate-800 dark:text-slate-200">
                Progress
              </h3>
            </div>
            <div className="px-5 py-2 relative">
              <div className="absolute left-[30px] top-8 bottom-8 w-0.5 bg-slate-200 dark:bg-slate-700 -ml-px z-0"></div>

              <div className="space-y-6 relative z-10">
                <div className="flex items-start gap-4">
                  <div className="w-5 h-5 rounded-full bg-emerald-500 border-[3px] border-white dark:border-[#151821] flex items-center justify-center shrink-0 mt-0.5">
                    <Check size={12} className="text-white" />
                  </div>
                  <div className="flex-1 flex justify-between">
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200">Assigned</span>
                    <span className="text-xs text-slate-400">{assignment.createdAt ? new Date(assignment.createdAt).toLocaleString(undefined, { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}</span>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className={`w-5 h-5 rounded-full border-[3px] border-white dark:border-[#151821] flex items-center justify-center shrink-0 mt-0.5 ${isSubmitted ? 'bg-emerald-500' : 'bg-amber-500'}`}>
                    {isSubmitted ? <Check size={12} className="text-white" /> : <Minus size={12} className="text-white" />}
                  </div>
                  <div className="flex-1 flex justify-between">
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{isSubmitted ? 'Submitted' : 'Not submitted'}</span>
                    <span className="text-xs text-slate-400">{isSubmitted && submission?.submittedAt ? new Date(submission.submittedAt).toLocaleString(undefined, { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}</span>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className={`w-5 h-5 rounded-full border-[3px] border-white dark:border-[#151821] flex items-center justify-center shrink-0 mt-0.5 ${isGraded ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`}>
                    {isGraded && <Check size={12} className="text-white" />}
                  </div>
                  <div className="flex-1 flex justify-between">
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{isGraded ? 'Graded' : 'Not graded'}</span>
                    <span className="text-xs text-slate-400">{isGraded && gradedDate ? new Date(gradedDate).toLocaleString(undefined, { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {isGraded && submission && (
            <Button
              onClick={() => navigate(`/student/grading/result/${submission.id}`)}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white shadow-sm font-medium rounded-lg py-3 h-auto transition-all"
            >
              <Award size={18} className="mr-2" />
              View rubric grading details
            </Button>
          )}

        </div>
      </div>
    </div>
  )
}

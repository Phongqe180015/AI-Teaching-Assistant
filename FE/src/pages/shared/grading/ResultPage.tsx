import { useEffect, useState } from 'react';
import { useLocation, useParams, Link, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import type { SubmissionResponse } from '@/types';
import ScoreCard from '@/components/modules/grading/ScoreCard';
import RuleList from '@/components/modules/grading/RuleList';
import { ArrowLeft, Sparkles, CheckCircle2, Clock, Send, RotateCcw, MessageSquare, Pencil, Check, X, AlertTriangle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { formatLatexMath } from '@/utils/mathHelper';
import { gradingApi as api } from '@/lib/api';
import { useAuth } from '@/store/AuthContext';

export default function ResultPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const isStudent = user?.role === 'student' || location.pathname.startsWith('/student');

  const [result, setResult] = useState<SubmissionResponse | null>((location.state?.result as SubmissionResponse) || null);
  const [loading, setLoading] = useState(!result);
  const [error, setError] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [showPublishWarningModal, setShowPublishWarningModal] = useState(false);
  const [publishSuccessMsg, setPublishSuccessMsg] = useState<string | null>(null);

  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackSuccessMsg, setFeedbackSuccessMsg] = useState<string | null>(null);

  const [isEditingOverallFeedback, setIsEditingOverallFeedback] = useState(false);
  const [tempOverallFeedback, setTempOverallFeedback] = useState('');

  const handleSaveOverallFeedback = () => {
    if (!result) return;
    const updatedResult: SubmissionResponse = {
      ...result,
      overallFeedback: tempOverallFeedback,
    };
    setResult(updatedResult);
    setIsEditingOverallFeedback(false);

    if (id) {
      try {
        localStorage.setItem(`aita_override_result_${id}`, JSON.stringify(updatedResult));
        api.updateSubmissionResult(id, {
          score: result.score,
          rules: result.rules,
          failedRules: result.failedRules,
          overallFeedback: tempOverallFeedback,
        }).catch(() => { });
      } catch (e) { }
    }
  };

  const gradingTime = location.state?.gradingTime as number | undefined;

  const handleGoBack = () => {
    const targetAssignmentId = (result as any)?.assignmentId || (result as any)?.examId || (result as any)?.ExamId;
    if (targetAssignmentId) {
      navigate(isStudent ? `/student/assignments/${targetAssignmentId}` : `/lecturer/grading/assignments/${targetAssignmentId}`);
    } else if (window.history.length > 1 && window.history.state?.idx > 0) {
      navigate(-1);
    } else {
      navigate(isStudent ? '/student/courses' : '/lecturer/grading/assignments');
    }
  };

  const doPublish = async () => {
    if (!id || !result) return;
    try {
      setIsPublishing(true);
      const isCurrentlyPublished = !!(result as any).isPublished;
      if (isCurrentlyPublished) {
        await api.unpublishSubmission(id);
        setResult(prev => prev ? { ...prev, isPublished: false } as any : prev);
      } else {
        await api.publishSubmission(id, {
          score: result.score,
          rules: result.rules,
          failedRules: result.failedRules,
          overallFeedback: result.overallFeedback,
        });
        setResult(prev => prev ? { ...prev, isPublished: true } as any : prev);
      }

      // Broadcast real-time publish event to all open student tabs/windows
      try {
        const pubChannel = new BroadcastChannel('aita_submission_events');
        pubChannel.postMessage({ type: 'SUBMISSION_PUBLISHED', submissionId: id, isPublished: !isCurrentlyPublished });
        pubChannel.close();
      } catch (e) { }
      localStorage.setItem('aita_last_publish_event', JSON.stringify({ type: 'SUBMISSION_PUBLISHED', submissionId: id, isPublished: !isCurrentlyPublished, timestamp: Date.now() }));

      const successText = !isCurrentlyPublished
        ? '🚀 Scores successfully published to student! Student can now view detailed results.'
        : 'Reverted submission to draft mode (Pending Publication).';
      setPublishSuccessMsg(successText);
      setTimeout(() => setPublishSuccessMsg(null), 5000);
    } catch (e: any) {
      alert(e.message || 'Error updating publish status');
    } finally {
      setIsPublishing(false);
      setShowPublishWarningModal(false);
    }
  };

  const handleTogglePublish = async () => {
    if (!id || !result) return;
    const isCurrentlyPublished = !!(result as any).isPublished;

    // If lecturer is publishing (not unpublishing), check deadline
    if (!isCurrentlyPublished) {
      const dueDateStr = (result as any).dueDate || (result as any).due;
      if (dueDateStr && new Date() < new Date(dueDateStr)) {
        setShowPublishWarningModal(true);
        return;
      }
    }

    await doPublish();
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !feedbackText.trim()) return;
    try {
      setIsSubmittingFeedback(true);
      await api.submitFeedback(id, feedbackText.trim());
      setResult(prev => prev ? { ...prev, studentFeedback: feedbackText.trim() } as any : prev);
      setFeedbackSuccessMsg('Feedback successfully sent to instructor!');
      setTimeout(() => setFeedbackSuccessMsg(null), 5000);
    } catch (err: any) {
      alert(err.message || 'Failed to submit feedback');
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const handleUpdateRule = (ruleIndex: number, newScore: number, newDetails: string) => {
    if (!result) return;

    const updatedAllRules = [...allRules];
    const target = updatedAllRules[ruleIndex];
    if (!target) return;

    const isPassed = newScore >= target.maxScore;
    const updatedItem = {
      ...target,
      score: newScore,
      earnedScore: newScore,
      details: newDetails,
      reason: newDetails,
      passed: isPassed,
    };

    updatedAllRules[ruleIndex] = updatedItem;

    const newTotalScore = updatedAllRules.reduce((sum, r) => sum + r.score, 0);

    const newPassedRules: any[] = [];
    const newFailedRules: any[] = [];
    updatedAllRules.forEach(r => {
      const raw = (r as any).originalRule || r;
      const updatedRaw = {
        ...raw,
        score: r.score,
        earnedScore: r.score,
        details: r.details,
        reason: r.details,
        passed: r.passed,
      };
      if (r.passed) {
        newPassedRules.push(updatedRaw);
      } else {
        newFailedRules.push(updatedRaw);
      }
    });

    const updatedResult: SubmissionResponse = {
      ...result,
      score: newTotalScore,
      rules: newPassedRules,
      failedRules: newFailedRules,
    };

    setResult(updatedResult);

    if (id) {
      try {
        localStorage.setItem(`aita_override_result_${id}`, JSON.stringify(updatedResult));
        api.updateSubmissionResult(id, {
          score: newTotalScore,
          rules: newPassedRules,
          failedRules: newFailedRules,
          overallFeedback: result.overallFeedback,
        }).catch(() => { });
      } catch (e) { }
    }
  };

  useEffect(() => {
    if (id) {
      setLoading(true);
      api.getSubmissionResult(id)
        .then(res => {
          setResult(res);
          if (res.studentFeedback) {
            setFeedbackText(res.studentFeedback);
          }
          setLoading(false);
        })
        .catch(err => {
          // Fallback to local storage if API fails
          try {
            const cachedStr = localStorage.getItem(`aita_override_result_${id}`);
            if (cachedStr) {
              const cached = JSON.parse(cachedStr);
              if (cached && typeof cached === 'object') {
                setResult(cached);
                if (cached.studentFeedback) {
                  setFeedbackText(cached.studentFeedback);
                }
                setLoading(false);
                return;
              }
            }
          } catch (e) { }
          setError(err.message || err.response?.data?.Message || "Failed to load result");
          setLoading(false);
        });
    } else if (result?.studentFeedback) {
      setFeedbackText(result.studentFeedback);
    }
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto py-12 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="max-w-5xl mx-auto py-12 text-center text-red-500">
        <p>{error || "Result not found"}</p>
        <Link to="/" className="mt-4 inline-block text-emerald-500 hover:underline">Go back home</Link>
      </div>
    );
  }

  const extractQuestionNum = (title: string): number => {
    if (!title) return 999;
    const match = title.match(/(?:Question|Câu)\s*(\d+)/i) || title.match(/Q(\d+)/i);
    return match ? parseInt(match[1], 10) : 999;
  };

  const passedRules = result.rules || [];
  const failedRules = result.failedRules || [];
  const allRules = [...passedRules, ...failedRules]
    .map((r: any) => ({
      originalRule: r,
      name: r.title || r.ruleId || r.name,
      description: r.description,
      passed: r.passed,
      score: r.earnedScore ?? r.score ?? 0,
      maxScore: r.weight ?? r.maxScore ?? 0,
      details: r.details || r.reason || '',
      evidence: r.evidence,
    }))
    .sort((a, b) => extractQuestionNum(a.name) - extractQuestionNum(b.name));

  return (
    <div className="max-w-5xl mx-auto pb-8 -mt-2 sm:-mt-4">
      <button type="button" onClick={handleGoBack} className="inline-flex items-center gap-2 text-slate-400 hover:text-emerald-400 transition-colors mb-8 cursor-pointer bg-transparent border-none p-0 outline-none">
        <ArrowLeft size={18} />
        <span>Go back</span>
      </button>

      {publishSuccessMsg && (
        <div className="mb-6 flex items-center justify-between gap-2 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300 rounded-xl text-sm font-semibold animate-in fade-in slide-in-from-top-2 shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{publishSuccessMsg}</span>
          </div>
          <button type="button" onClick={() => setPublishSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-200 cursor-pointer">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Top Banner: Publish Status & Action (Lecturer only) */}
      {!isStudent && (
        <div className="mb-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${(result as any).isPublished
              ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-800'
              : 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-800'
              }`}>
              {(result as any).isPublished ? <CheckCircle2 size={20} /> : <Clock size={20} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase ${(result as any).isPublished
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  }`}>
                  {(result as any).isPublished ? 'Results Published' : 'Draft Mode (Pending Publication)'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                {(result as any).isPublished
                  ? 'Students can now view their scores and detailed review.'
                  : 'Review the results and click "Publish" to release grades to students.'}
              </p>
            </div>
          </div>

          <button
            onClick={handleTogglePublish}
            disabled={isPublishing}
            className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all whitespace-nowrap cursor-pointer ${(result as any).isPublished
              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
              : 'bg-brand-600 hover:bg-brand-700 text-white shadow-brand-600/25'
              }`}
          >
            {isPublishing ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
            ) : (result as any).isPublished ? (
              <RotateCcw size={16} />
            ) : (
              <Send size={16} />
            )}
            <span>
              {isPublishing
                ? 'Processing...'
                : (result as any).isPublished
                  ? 'Unpublish (Revert to Draft)'
                  : '🚀 Publish Results to Students'}
            </span>
          </button>
        </div>
      )}

      {/* Lecturer view: Student feedback callout */}
      {!isStudent && result.studentFeedback && (
        <div className="mb-6 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/60 flex items-center justify-center text-amber-700 dark:text-amber-300">
              <MessageSquare size={18} />
            </div>
            <h4 className="font-bold text-amber-900 dark:text-amber-200 text-sm">Student Grade Inquiry & Feedback</h4>
          </div>
          <p className="text-sm text-slate-800 dark:text-slate-200 pl-11 font-medium bg-white/70 dark:bg-slate-900/70 p-3 rounded-xl border border-amber-100 dark:border-amber-900/30">
            "{result.studentFeedback}"
          </p>
        </div>
      )}

      <div className="space-y-8">
        <ScoreCard
          score={result.score}
          maxScore={result.maxScore}
          assessedAt={result.assessedAt || new Date().toISOString()}
          gradingTime={gradingTime}
        />

        {(result.overallFeedback || !isStudent) && (
          <div className="bg-gradient-to-br from-indigo-50/50 to-blue-50/50 dark:from-indigo-900/10 dark:to-blue-900/10 border border-indigo-100/50 dark:border-indigo-500/20 rounded-2xl p-8 shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center border border-indigo-200/50 dark:border-indigo-700/30">
                  <Sparkles className="text-indigo-600 dark:text-indigo-400" size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">AI Mentor Feedback</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Evaluation summary & learning path strategy</p>
                </div>
              </div>

              {!isStudent && !isEditingOverallFeedback && (
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingOverallFeedback(true);
                    setTempOverallFeedback(result.overallFeedback || '');
                  }}
                  className="px-3 py-1.5 text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/40 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-bold shadow-sm"
                  title="Chỉnh sửa AI Mentor Feedback"
                >
                  <Pencil size={13} />
                  <span>Sửa nhận xét</span>
                </button>
              )}
            </div>

            {isEditingOverallFeedback ? (
              <div className="space-y-3">
                <textarea
                  rows={6}
                  value={tempOverallFeedback}
                  onChange={e => setTempOverallFeedback(e.target.value)}
                  placeholder="Nhập nội dung AI Mentor Feedback..."
                  className="w-full p-3.5 text-sm font-sans rounded-xl border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20 leading-relaxed"
                />
                <div className="flex items-center gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setIsEditingOverallFeedback(false)}
                    className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-800 dark:text-slate-300 bg-slate-200 dark:bg-slate-800 rounded-lg cursor-pointer border-none flex items-center gap-1"
                  >
                    <X size={13} />
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveOverallFeedback}
                    className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer border-none flex items-center gap-1 shadow-sm"
                  >
                    <Check size={13} />
                    Lưu nhận xét
                  </button>
                </div>
              </div>
            ) : (
              <div className="prose prose-indigo dark:prose-invert max-w-none prose-p:leading-relaxed prose-li:my-1 text-[15px] text-slate-700 dark:text-slate-300">
                <ReactMarkdown>{formatLatexMath(result.overallFeedback || '')}</ReactMarkdown>
              </div>
            )}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-8 md:col-span-2">
            <RuleList
              title="Rubric evaluation results"
              rules={allRules}
              isStudent={isStudent}
              onUpdateRule={handleUpdateRule}
            />
          </div>
        </div>

        {/* Student Feedback Submission Form */}
        {isStudent && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400 flex items-center justify-center border border-brand-200/60 dark:border-brand-800/40">
                <MessageSquare size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Submit Grade Inquiry / Feedback</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Your inquiry will be sent directly with a notification to the assigned instructor.</p>
              </div>
            </div>

            <form onSubmit={handleSubmitFeedback} className="space-y-3">
              <textarea
                rows={3}
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="Enter your questions or feedback regarding your submission results..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
              {feedbackSuccessMsg && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  <span>{feedbackSuccessMsg}</span>
                </div>
              )}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmittingFeedback || !feedbackText.trim()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold text-sm shadow-md transition-all cursor-pointer"
                >
                  {isSubmittingFeedback ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Send size={16} />
                  )}
                  <span>{result?.studentFeedback ? 'Update Feedback' : 'Submit Feedback to Instructor'}</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Deadline Warning Modal for Single Submission Publish */}
      {showPublishWarningModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/50 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">Warning: Deadline Not Passed!</h3>
                <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">The submission deadline is still active</p>
              </div>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950/40 p-4 rounded-xl border border-amber-200/80 dark:border-amber-900/30 text-sm text-slate-700 dark:text-slate-300 space-y-2 leading-relaxed">
              <p>
                If you publish the score right now, the student will be able to <strong>view full answers and detailed feedback</strong>.
              </p>
              <p className="text-amber-800 dark:text-amber-300 font-medium">
                ⚠️ Since the deadline has not passed yet, the student may use the published answers to <strong>revise and resubmit their work</strong>.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowPublishWarningModal(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={doPublish}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-bold shadow-md shadow-amber-600/20 transition-all cursor-pointer flex items-center gap-2"
              >
                <Send size={16} />
                <span>Publish Score Anyway</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}






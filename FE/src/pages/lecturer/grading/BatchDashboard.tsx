import { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MultiFileUpload from '@/components/modules/grading/MultiFileUpload';
import { gradingApi as api } from '@/lib/api';
import { CheckCircle2, Clock, Loader2, ArrowRight, ArrowLeft, Search, AlertCircle, StopCircle, ChevronRight, ChevronDown, Wand2 } from 'lucide-react';
import classNames from 'classnames';

interface JobStatus {
    id: string;
    studentName: string;
    fileName: string;
    state: 'queued' | 'processing' | 'completed' | 'failed';
    progressPercent: number;
    currentTask: string;
    error?: string;
    score?: number;
    maxScore?: number;
}

export default function BatchDashboard() {
    const [error, setError] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);
    const [showCancelDialog, setShowCancelDialog] = useState(false);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);

    const [filterState, setFilterState] = useState<'all' | 'processing' | 'completed' | 'failed'>('all');
    const [searchQuery, setSearchQuery] = useState('');

    const navigate = useNavigate();
    const { t } = useTranslation();
    const [assignmentTitle, setAssignmentTitle] = useState<string>(t('lc.bd.assignment_fallback'));
    const { id: assignmentId } = useParams<{ id: string }>();

    const [jobs, setJobs] = useState<JobStatus[]>(() => {
        const jobsKey = assignmentId ? `batchJobs_${assignmentId}` : 'batchJobs';
        const savedJobs = localStorage.getItem(jobsKey);
        if (savedJobs) {
            try {
                return JSON.parse(savedJobs);
            } catch (e) { }
        }
        return [];
    });

    const [batchStartTime, setBatchStartTime] = useState<number | null>(() => {
        const startKey = assignmentId ? `batchStartTime_${assignmentId}` : 'batchStartTime';
        const savedStartTime = localStorage.getItem(startKey);
        if (savedStartTime) {
            return parseInt(savedStartTime, 10);
        }
        return null;
    });

    useEffect(() => {
        if (assignmentId) {
            api.getAssignment(assignmentId)
                .then(res => setAssignmentTitle(res.metadata?.title || t('lc.bd.assignment_fallback')))
                .catch(err => console.error("Failed to fetch assignment details:", err));
        }
    }, [assignmentId]);

    useEffect(() => {
        const jobsKey = assignmentId ? `batchJobs_${assignmentId}` : 'batchJobs';
        if (jobs.length > 0) {
            localStorage.setItem(jobsKey, JSON.stringify(jobs));
        } else {
            localStorage.removeItem(jobsKey);
        }
    }, [jobs, assignmentId]);

    // Timer for total elapsed time
    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;
        if (batchStartTime) {
            const activeJobs = jobs.filter(j => j.state === 'queued' || j.state === 'processing');
            if (activeJobs.length > 0) {
                interval = setInterval(() => {
                    setElapsedSeconds(Math.floor((Date.now() - batchStartTime) / 1000));
                }, 1000);
            } else if (jobs.length > 0) {
                // Recalculate one last time if everything just finished
                setElapsedSeconds(Math.floor((Date.now() - batchStartTime) / 1000));
            }
        }
        return () => clearInterval(interval);
    }, [batchStartTime, jobs]);

    // Polling for batch status + BroadcastChannel listener
    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;
        let channel: BroadcastChannel | null = null;

        const activeJobs = jobs.filter(j => j.state === 'queued' || j.state === 'processing');

        const pollStatus = async () => {
            if (activeJobs.length === 0) return;
            try {
                const ids = activeJobs.map(j => j.id);
                const res = await api.getBatchStatus(ids);

                setJobs(prevJobs => {
                    const newJobs = [...prevJobs];
                    let changed = false;

                    for (let i = 0; i < newJobs.length; i++) {
                        const updatedData = res.statuses[newJobs[i].id];
                        if (updatedData) {
                            if (newJobs[i].state !== updatedData.state ||
                                newJobs[i].progressPercent !== updatedData.progressPercent ||
                                newJobs[i].currentTask !== updatedData.currentTask) {

                                newJobs[i] = {
                                    ...newJobs[i],
                                    ...updatedData
                                };
                                changed = true;
                            }
                        }
                    }

                    return changed ? newJobs : prevJobs;
                });
            } catch (err) {
                console.error("Failed to poll batch status:", err);
            }
        };

        if (activeJobs.length > 0) {
            interval = setInterval(pollStatus, 4000);
            try {
                channel = new BroadcastChannel('aita_submission_events');
                channel.onmessage = () => pollStatus();
            } catch (e) {}
        }

        return () => {
            if (interval) clearInterval(interval);
            if (channel) channel.close();
        };
    }, [jobs]);

    const handleUpload = async (files: File[]) => {
        setError(null);
        setIsUploading(true);

        try {
            const result = await api.submitBatchProject(files, assignmentId);

            const newJobs: JobStatus[] = result.jobs.map((job: any) => ({
                id: job.submissionId,
                studentName: job.studentName,
                fileName: job.fileName,
                state: 'queued' as const,
                progressPercent: 0,
                currentTask: t('lc.bd.waiting_queue')
            }));

            const now = Date.now();
            setBatchStartTime(now);
            const startKey = assignmentId ? `batchStartTime_${assignmentId}` : 'batchStartTime';
            localStorage.setItem(startKey, now.toString());
            setJobs(newJobs);
            setIsUploading(false);

        } catch (err: any) {
            setError(err.response?.data?.error || err.message || t('lc.bd.submit_failed'));
            setIsUploading(false);
        }
    };

    const handleClearBatch = () => {
        const jobsKey = assignmentId ? `batchJobs_${assignmentId}` : 'batchJobs';
        const startKey = assignmentId ? `batchStartTime_${assignmentId}` : 'batchStartTime';
        localStorage.removeItem(jobsKey);
        localStorage.removeItem(startKey);
        setJobs([]);
        setBatchStartTime(null);
        setElapsedSeconds(0);
        navigate(`/lecturer/grading/assignments/${assignmentId}`);
    };

    const handleCancelAll = async () => {
        const pendingJobs = jobs.filter(j => j.state === 'queued' || j.state === 'processing');
        if (pendingJobs.length === 0) return;

        setIsCancelling(true);
        try {
            const ids = pendingJobs.map(j => j.id);
            await api.cancelBatch(ids);
            
            // Optimistically update UI
            setJobs(prevJobs => prevJobs.map(job => {
                if (ids.includes(job.id)) {
                    return { ...job, state: 'failed', error: t('lc.bd.cancelled_by_user'), currentTask: t('lc.bd.cancelled_by_user') };
                }
                return job;
            }));
        } catch (err: any) {
            console.error("Failed to cancel batch:", err);
            setError("Failed to cancel all jobs: " + (err.response?.data?.error || err.message));
        } finally {
            setIsCancelling(false);
        }
    };

    const completedCount = jobs.filter(j => j.state === 'completed').length;
    const failedCount = jobs.filter(j => j.state === 'failed').length;
    const inProgressCount = jobs.filter(j => j.state === 'processing').length;
    const queuedCount = jobs.filter(j => j.state === 'queued').length;
    const totalCount = jobs.length;

    const isAllDone = totalCount > 0 && (completedCount + failedCount === totalCount);
    const overallProgress = totalCount > 0 ? ((completedCount + failedCount) / totalCount) * 100 : 0;

    const processedSoFar = completedCount + failedCount;
    // Use a min elapsed of 0.1 to avoid infinity speed


    const formatTime = (seconds: number) => {
        if (!isFinite(seconds) || seconds < 0) return "--:--";
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const currentProcessingJob = useMemo(() => {
        return jobs.find(j => j.state === 'processing') || jobs.find(j => j.state === 'queued');
    }, [jobs]);



    const avgScore = completedCount > 0
        ? jobs.filter(j => j.state === 'completed').reduce((sum, j) => sum + (j.score || 0), 0) / completedCount
        : 0;

    if (totalCount === 0) {
        return (
            <div className="max-w-6xl mx-auto pb-12 -mt-2 sm:-mt-4">
                <div className="mb-1 animate-fade-in">
                    <button onClick={() => navigate(`/lecturer/grading/assignments/${assignmentId}`)} className="text-slate-400 hover:text-brand-500 transition-colors p-2 -ml-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 font-medium">
                        <ArrowLeft size={20} />
                        Back to assignments
                    </button>
                </div>

                <div className="mb-6 animate-fade-in">
                    <h1 className="text-[28px] font-black text-slate-900 dark:text-white mb-2 tracking-tight">
                        Upload student submissions for grading
                    </h1>
                    <p className="text-[15px] text-slate-500 dark:text-slate-400 mb-5">
                        Upload student submissions as a .zip file. The AI grades them in the background.
                    </p>
                    {assignmentId && (
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 rounded-lg font-bold text-[14px] border border-emerald-100 dark:border-emerald-500/20 shadow-sm">
                            <CheckCircle2 size={18} /> Validating against: {assignmentTitle}
                        </div>
                    )}
                </div>
                <MultiFileUpload onUpload={handleUpload} isUploading={isUploading} />
                {error && (
                    <div className="mt-8 p-4 dark:bg-red-500/10 bg-red-50 border dark:border-red-500/30 border-red-200 rounded-lg dark:text-red-400 text-red-600 text-center max-w-3xl mx-auto">
                        <p className="font-semibold">{t('lc.bd.upload_failed')}</p>
                        <p className="text-sm mt-1">{error}</p>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="max-w-[1400px] mx-auto pb-8 px-4 -mt-2 sm:-mt-4">
            {/* Header */}
            <div className="mb-8 flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <button onClick={() => navigate(`/lecturer/grading/assignments/${assignmentId}`)} className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold dark:text-white text-slate-900">{t('lc.bd.title')}</h1>
                        <p className="text-sm dark:text-slate-400 text-slate-500">{t('lc.bd.subtitle')}</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowCancelDialog(true)}
                    disabled={isCancelling || (inProgressCount === 0 && queuedCount === 0)}
                    className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400 rounded-lg text-sm font-medium hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors flex items-center gap-2 disabled:opacity-50 shadow-sm"
                >
                    {isCancelling ? <Loader2 size={16} className="animate-spin" /> : <StopCircle size={16} />}
                    {t('lc.bd.cancel_all')}
                </button>
            </div>

            {/* Hero Section / All Submissions Completed Banner */}
            {isAllDone ? (
                <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-8 mb-8 text-center flex flex-col items-center animate-fade-in-up">
                    <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4">
                        <CheckCircle2 size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-emerald-800 dark:text-emerald-300 mb-2">{t('lc.bd.all_done')}</h2>
                    <p className="text-emerald-600 dark:text-emerald-400 mb-6 font-medium text-lg">{t('lc.bd.graded_count', { done: completedCount, total: totalCount })}</p>

                    <div className="flex items-center gap-8 mb-8 text-emerald-700 dark:text-emerald-300">
                        <div className="text-center">
                            <div className="text-sm opacity-80 uppercase tracking-wider mb-1">{t('lc.bd.avg_score')}</div>
                            <div className="text-3xl font-bold">{parseFloat(avgScore.toFixed(2))}</div>
                        </div>
                        <div className="w-px h-10 bg-emerald-200 dark:bg-emerald-800"></div>
                        <div className="text-center">
                            <div className="text-sm opacity-80 uppercase tracking-wider mb-1">{t('lc.bd.duration')}</div>
                            <div className="text-3xl font-bold font-mono">{formatTime(elapsedSeconds)}</div>
                        </div>
                    </div>

                    <button
                        onClick={handleClearBatch}
                        className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
                    >
                        <ArrowRight size={20} /> {t('lc.bd.view_results')}
                    </button>
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 mb-8 shadow-sm">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                        {/* Left: Circular Progress */}
                        <div className="flex flex-col items-center justify-center shrink-0 w-40">
                            <div className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-6 w-full px-2 whitespace-nowrap">
                                <Loader2 size={18} className="animate-spin text-brand-500" />
                                AI Grading Progress
                            </div>
                            <div className="relative w-28 h-28 flex items-center justify-center mb-4">
                                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                    <circle className="text-slate-100 dark:text-slate-800" strokeWidth="8" stroke="currentColor" fill="transparent" r="40" cx="50" cy="50" />
                                    <circle className="text-brand-600 dark:text-brand-400" strokeWidth="8" strokeLinecap="round" stroke="currentColor" fill="transparent" r="40" cx="50" cy="50" style={{ strokeDasharray: `${2 * Math.PI * 40}`, strokeDashoffset: `${2 * Math.PI * 40 * (1 - overallProgress / 100)}`, transition: 'stroke-dashoffset 0.5s ease' }} />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-3xl font-bold text-slate-900 dark:text-white">{overallProgress.toFixed(0)}%</span>
                                </div>
                            </div>
                            <div className="text-xs font-bold text-slate-600 dark:text-slate-400 text-center uppercase tracking-wide">
                                Overall progress
                            </div>
                        </div>

                        {/* Right: Detailed Progress */}
                        <div className="flex-1 w-full md:border-l md:pl-8 border-slate-100 dark:border-slate-800">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                                <div className="h-1.5 flex-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-brand-500 rounded-full transition-all duration-500 relative" style={{ width: `${overallProgress}%` }}>
                                        <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                                    </div>
                                </div>
                                <div className="text-sm font-medium text-slate-500 dark:text-slate-400 shrink-0 text-right w-full md:w-auto">
                                    <span className="mr-6">Elapsed: <span className="text-slate-800 dark:text-slate-200">{formatTime(elapsedSeconds)}</span></span>
                                    <span className="text-slate-800 dark:text-slate-200">{processedSoFar} / {totalCount} submissions</span>
                                </div>
                            </div>

                            {/* Current Student Card */}
                            {currentProcessingJob ? (
                                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-100 dark:border-slate-800/60">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-500/20 text-brand-700 dark:text-brand-300 flex items-center justify-center font-bold text-sm">
                                                {currentProcessingJob.studentName.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <span className="text-xs font-bold text-brand-600 dark:text-brand-400 uppercase">{t('lc.bd.currently_grading')}</span>
                                                    <span className="text-xs bg-brand-100 dark:bg-brand-900 text-brand-600 dark:text-brand-400 px-2 py-0.5 rounded-full font-medium">{t('lc.bd.current_student')}</span>
                                                </div>
                                                <div className="font-bold text-slate-900 dark:text-white">{currentProcessingJob.studentName}</div>
                                            </div>
                                        </div>
                                        {currentProcessingJob.state === 'processing' && (
                                            <button
                                                onClick={() => navigate(`/lecturer/grading/live/${currentProcessingJob.id}?assignmentId=${assignmentId || ''}`)}
                                                className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 text-slate-700 dark:text-slate-300 shadow-sm"
                                            >
                                                <ChevronRight size={16} /> View console
                                            </button>
                                        )}
                                    </div>
                                    
                                    <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-3 gap-2">
                                        <div className="flex items-center gap-1">
                                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mr-2">{t('lc.bd.current_step')}</span>
                                            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{currentProcessingJob.currentTask}</span>
                                        </div>
                                        <div className="text-sm font-bold text-slate-900 dark:text-white mr-1">{currentProcessingJob.progressPercent}%</div>
                                    </div>
                                    
                                    <div className="relative h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-visible flex items-center">
                                        <div className="absolute left-0 h-full bg-brand-500 rounded-full transition-all duration-300" style={{ width: `${currentProcessingJob.progressPercent}%` }}></div>
                                        <div className="absolute w-2.5 h-2.5 rounded-full bg-brand-500 shadow-[0_0_0_2px_#f8fafc] dark:shadow-[0_0_0_2px_#0f172a] z-10 transition-all duration-300" style={{left: `calc(${currentProcessingJob.progressPercent}% - 5px)`}}></div>
                                        <div className="absolute left-[33%] w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600"></div>
                                        <div className="absolute left-[66%] w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600"></div>
                                        <div className="absolute right-0 w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600"></div>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-8 border border-slate-100 dark:border-slate-800 text-center flex items-center justify-center min-h-[140px]">
                                    <Loader2 className="animate-spin text-slate-400 mr-2" size={20} />
                                    <p className="text-sm font-medium text-slate-500">{t('lc.bd.preparing_next')}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Segmented Control & Search */}
            <div className="flex flex-col md:flex-row justify-between items-end mb-6 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-6 w-full md:w-auto overflow-x-auto overflow-y-hidden pt-2">
                    <button
                        onClick={() => setFilterState('all')}
                        className={classNames("pb-3 px-1 text-sm font-semibold whitespace-nowrap transition-colors border-b-2 -mb-[2px]", filterState === 'all' ? 'border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300')}
                    >
                        {t('lc.bd.tab_all', { n: totalCount })}
                    </button>
                    <button
                        onClick={() => setFilterState('processing')}
                        className={classNames("pb-3 px-1 text-sm font-semibold whitespace-nowrap transition-colors border-b-2 -mb-[2px]", filterState === 'processing' ? 'border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300')}
                    >
                        {t('lc.bd.tab_processing', { n: inProgressCount })}
                    </button>
                    <button
                        onClick={() => setFilterState('completed')}
                        className={classNames("pb-3 px-1 text-sm font-semibold whitespace-nowrap transition-colors border-b-2 -mb-[2px]", filterState === 'completed' ? 'border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300')}
                    >
                        {t('lc.bd.tab_completed', { n: completedCount + failedCount })}
                    </button>
                </div>

                <div className="relative w-full md:w-64 mt-4 md:mt-0 mb-3 md:mb-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder={t('lc.bd.search')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 focus:ring-2 focus:ring-brand-500 outline-none text-sm dark:text-white transition-all hover:bg-white dark:hover:bg-slate-900 focus:bg-white dark:focus:bg-slate-900"
                    />
                </div>
            </div>

            {/* Lists - 3 Columns Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {/* Queue Column */}
                <div className={classNames((filterState === 'all' || filterState === 'processing') ? 'block' : 'hidden lg:block opacity-50 pointer-events-none')}>
                    <div className="flex items-center gap-2 mb-4">
                        <Clock className="text-orange-500 w-4 h-4" />
                        <h3 className="text-sm font-bold text-slate-800 dark:text-white">Queue ({queuedCount})</h3>
                    </div>
                    <div className="flex flex-col gap-3">
                        {jobs.filter(j => j.state === 'queued' && (filterState === 'all' || filterState === 'processing')).map((job, idx) => (
                            <div key={job.id} className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-orange-400 shrink-0"></div>
                                    <div className="w-8 h-8 rounded-full bg-orange-50 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400 flex items-center justify-center font-bold text-xs shrink-0">
                                        {job.studentName.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="font-bold text-slate-900 dark:text-white text-sm truncate">{job.studentName}</div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{t('lc.bd.waiting_queue')}</div>
                                    </div>
                                </div>
                                <div className="shrink-0 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded text-xs font-semibold text-slate-500 dark:text-slate-400">
                                    Position #{idx + 1}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Processing Column */}
                <div className={classNames((filterState === 'all' || filterState === 'processing') ? 'block' : 'hidden lg:block opacity-50 pointer-events-none')}>
                    <div className="flex items-center gap-2 mb-4">
                        <Wand2 className="text-brand-500 w-4 h-4" />
                        <h3 className="text-sm font-bold text-slate-800 dark:text-white">Processing ({inProgressCount})</h3>
                    </div>
                    <div className="flex flex-col gap-3">
                        {jobs.filter(j => j.state === 'processing' && (filterState === 'all' || filterState === 'processing')).map((job) => (
                            <div 
                                key={job.id} 
                                onClick={() => navigate(`/lecturer/grading/live/${job.id}?assignmentId=${assignmentId || ''}`)}
                                className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-brand-100 dark:border-brand-900 shadow-sm flex flex-col gap-3 cursor-pointer hover:border-brand-300 dark:hover:border-brand-700 transition-colors text-left"
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-8 h-8 rounded-full bg-brand-50 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400 flex items-center justify-center font-bold text-xs shrink-0">
                                            {job.studentName.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="font-bold text-slate-900 dark:text-white text-sm truncate">{job.studentName}</div>
                                            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{t('lc.bd.analysing')}</div>
                                        </div>
                                    </div>
                                    <div className="font-bold text-brand-600 dark:text-brand-400 text-sm shrink-0">{job.progressPercent}%</div>
                                </div>
                                <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-brand-500 rounded-full transition-all duration-300" style={{ width: `${job.progressPercent}%` }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Completed Column */}
                <div className={classNames((filterState === 'all' || filterState === 'completed' || filterState === 'failed') ? 'block' : 'hidden lg:block opacity-50 pointer-events-none')}>
                    <div className="flex items-center gap-2 mb-4">
                        <CheckCircle2 className="text-emerald-500 w-4 h-4" />
                        <h3 className="text-sm font-bold text-slate-800 dark:text-white">Completed ({completedCount + failedCount})</h3>
                    </div>
                    <div className="flex flex-col gap-3">
                        {jobs.filter(j => (j.state === 'completed' || j.state === 'failed') && (filterState === 'all' || filterState === 'completed' || filterState === 'failed')).map((job) => (
                            <div key={job.id} className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className={classNames("w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0", job.state === 'completed' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-red-50 text-red-600 dark:bg-red-500/20 dark:text-red-400')}>
                                        {job.studentName.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="font-bold text-slate-900 dark:text-white text-sm truncate">{job.studentName}</div>
                                        <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">
                                            {job.state === 'completed' ? t('lc.bd.completed') : t('lc.bd.failed_to_grade')}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-1.5 shrink-0">
                                    {job.state === 'completed' ? (
                                        <div className="flex items-center gap-1 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                            {job.score !== undefined ? Number(job.score.toFixed(2)) : 0} <span className="text-xs text-slate-400 font-normal">/ {job.maxScore}</span>
                                            <ChevronDown size={14} />
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1 text-sm font-bold text-red-500">
                                            {t('lc.bd.failed')}
                                        </div>
                                    )}
                                    <button
                                        onClick={() => navigate(`/lecturer/grading/result/${job.id}`)}
                                        className="text-xs font-semibold px-3 py-1 rounded border border-slate-200 dark:border-slate-700 text-brand-600 dark:text-brand-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                    >
                                        {t('lc.bd.view_result')}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>

            {/* Cancel Confirmation Modal */}
            {showCancelDialog && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md p-6 border border-slate-200 dark:border-slate-800 animate-fade-in-up">
                        <div className="flex items-center gap-3 mb-4 text-red-600 dark:text-red-400">
                            <AlertCircle size={28} />
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">{t('lc.bd.modal_title')}</h3>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 mb-8 text-sm">
                            {t('lc.bd.modal_desc')}
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowCancelDialog(false)}
                                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            >
                                {t('lc.bd.go_back')}
                            </button>
                            <button
                                onClick={() => {
                                    setShowCancelDialog(false);
                                    handleCancelAll();
                                }}
                                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-red-500/20"
                            >
                                {t('lc.bd.confirm_cancel_all')}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}

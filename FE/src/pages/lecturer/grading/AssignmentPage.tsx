import React, { useState, useEffect, useRef } from 'react';
import { gradingApi as api, getStoredItem, AUTH_STORAGE_KEYS } from '@/lib/api';
import type { PublishedAssignment } from '@/types';
import { BookOpen, ListChecks, Upload, Layers, Clock, AlertCircle, Users, CheckCircle2, Hourglass, Star, Eye, ArrowLeft, Save, X, Calendar, ChevronDown, ChevronLeft, ChevronRight, Settings, Zap, Loader2, Database, HelpCircle, Check, Send, AlertTriangle, RotateCcw, Download, Copy, Flame, ShieldAlert, Info } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import classNames from 'classnames';

function CustomSelect({ value, onChange, options, className, label }: { value: string, onChange: (v: string) => void, options: { value: string, label: string }[], className?: string, label?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(o => o.value === value) || options[0];

  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-sm font-medium text-slate-500 dark:text-slate-400 shrink-0">{label}</span>}
      <div className="relative inline-block" ref={ref}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={classNames(
            "flex items-center justify-between gap-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm px-3 py-2 bg-white dark:bg-slate-800 dark:text-slate-200 focus:outline-none hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-colors shadow-sm min-w-[140px]",
            className
          )}
        >
          <span className="truncate">{selectedOption?.label}</span>
          <ChevronDown size={16} className={classNames("text-slate-400 transition-transform duration-200", isOpen && "rotate-180")} />
        </button>

        {isOpen && (
          <div className="absolute top-full mt-1 left-0 w-full min-w-max bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-[0_4px_20px_rgb(0,0,0,0.1)] z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            <div className="py-1 max-h-60 overflow-y-auto">
              {options.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={classNames(
                    "w-full text-left px-3 py-2 text-sm transition-colors block whitespace-nowrap",
                    value === opt.value
                      ? "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400 font-medium"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AssignmentPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [assignment, setAssignment] = useState<PublishedAssignment | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [hasActiveBatch, setHasActiveBatch] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteModalId, setDeleteModalId] = useState<string | null>(null);
  const [regradingId, setRegradingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const [isDeadlineModalOpen, setIsDeadlineModalOpen] = useState(false);
  const [newDueDate, setNewDueDate] = useState('');
  const [savingDeadline, setSavingDeadline] = useState(false);
  const [deadlineModalError, setDeadlineModalError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [isGradingSettingsModalOpen, setIsGradingSettingsModalOpen] = useState(false);
  const [selectedGradingStrategy, setSelectedGradingStrategy] = useState<'CONTINUOUS_QUEUE' | 'BATCH_POST_DEADLINE'>('CONTINUOUS_QUEUE');
  const [pendingGradingStrategy, setPendingGradingStrategy] = useState<'CONTINUOUS_QUEUE' | 'BATCH_POST_DEADLINE' | null>(null);
  const [savingStrategy, setSavingStrategy] = useState(false);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const limit = 10;

  const [isUploadingAnswerKey, setIsUploadingAnswerKey] = useState(false);
  const [uploadAnswerKeySuccess, setUploadAnswerKeySuccess] = useState<string | null>(null);
  const [publishSuccessMsg, setPublishSuccessMsg] = useState<string | null>(null);
  const [isPublishingAll, setIsPublishingAll] = useState(false);
  const [showPublishAllWarningModal, setShowPublishAllWarningModal] = useState(false);

  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);
  const [duplicateReport, setDuplicateReport] = useState<Awaited<ReturnType<typeof api.detectDuplicateSubmissions>> | null>(null);
  const [duplicateError, setDuplicateError] = useState<boolean>(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateThreshold] = useState(80);
  const [duplicatePenaltyType, setDuplicatePenaltyType] = useState<'FLAT_POINTS' | 'ZERO_SCORE'>('FLAT_POINTS');
  const [duplicatePenaltyValue, setDuplicatePenaltyValue] = useState<number>(5);
  const [isApplyingPenalty, setIsApplyingPenalty] = useState<boolean>(false);
  const [penaltySuccessMsg, setPenaltySuccessMsg] = useState<string | null>(null);
  const [appliedDuplicateIds, setAppliedDuplicateIds] = useState<string[]>([]);
  const [showConfirmPenaltyModal, setShowConfirmPenaltyModal] = useState(false);

  const [statusFilter, setStatusFilter] = useState('ALL');
  const [scoreRangeFilter, setScoreRangeFilter] = useState('ALL');
  const [sortOrder, setSortOrder] = useState('score_desc');
  const [classFilter, setClassFilter] = useState('ALL');
  const [classList, setClassList] = useState<{ id: string, className: string, classCode: string }[]>([]);

  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);



  const fetchAssignmentData = React.useCallback(async () => {
    try {
      const data = await api.getAssignment(id || 'student-management-system');
      setAssignment(data);
    } catch (err) {
      console.error(err);
    }
  }, [id]);

  const handleAnswerKeyUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;

    setIsUploadingAnswerKey(true);
    setError(null);
    setUploadAnswerKeySuccess(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await api.updateAnswerKey(id, formData);
      setUploadAnswerKeySuccess(`Updated ${response.testCaseCount} test cases successfully!`);
      
      // Reload assignment to get updated rubric
      await fetchAssignmentData();
      
      // Clear success message after 5 seconds
      setTimeout(() => setUploadAnswerKeySuccess(null), 5000);
    } catch (err: any) {
      console.error("Failed to update Answer Key:", err);
      setError(err.response?.data?.error || err.message || t('lc.ap.answer_key_failed'));
    } finally {
      setIsUploadingAnswerKey(false);
      // Reset file input
      e.target.value = '';
    }
  };

  const fetchHistoryData = React.useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      const res: any = await api.getHistory(id || 'student-management-system', page, limit, debouncedSearch, statusFilter, scoreRangeFilter, sortOrder, classFilter);
      setHistory(res.history || []);
      if (res.classes && Array.isArray(res.classes)) {
        setClassList(res.classes);
      }
      if (res.meta) {
        setTotalPages(res.meta.totalPages || 1);
        setTotalItems(res.meta.total || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [id, page, limit, debouncedSearch, statusFilter, scoreRangeFilter, sortOrder, classFilter]);

  useEffect(() => {
    fetchAssignmentData();
  }, [fetchAssignmentData]);

  useEffect(() => {
    fetchHistoryData(true);
  }, [fetchHistoryData]);

  // Pure Event-Driven SSE Push & Real-Time Event Listener (0 Polling / $0 Cost / Standard Web Architecture)
  useEffect(() => {
    if (!id) return;

    let eventSource: EventSource | null = null;
    try {
      const token = getStoredItem(AUTH_STORAGE_KEYS.token);
      const sseUrl = `/api/grading/assignments/${id}/events?token=${token}`;
      eventSource = new EventSource(sseUrl);

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'SUBMISSION_CREATED' || data.type === 'SUBMISSION_GRADED') {
            console.log('[AssignmentPage] Server Pushed Assignment Event:', data);
            fetchAssignmentData();
            fetchHistoryData(false);
          }
        } catch (err) {}
      };
    } catch (e) {
      console.warn('Failed to initialize SSE assignment event stream:', e);
    }

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('aita_submission_events');
      channel.onmessage = (event) => {
        if (event.data?.type === 'SUBMISSION_CREATED' || event.data?.type === 'SUBMISSION_PUBLISHED' || event.data?.assignmentId === id) {
          fetchAssignmentData();
          fetchHistoryData(false);
        }
      };
    } catch (e) { }

    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === 'aita_submission_event' || e.key === 'aita_last_publish_event') {
        fetchAssignmentData();
        fetchHistoryData(false);
      }
    };
    window.addEventListener('storage', handleStorageEvent);

    return () => {
      if (eventSource) eventSource.close();
      if (channel) channel.close();
      window.removeEventListener('storage', handleStorageEvent);
    };
  }, [id, fetchAssignmentData, fetchHistoryData]);

  useEffect(() => {
    const checkBatch = () => {
      const jobsKey = id ? `batchJobs_${id}` : 'batchJobs';
      const savedJobs = localStorage.getItem(jobsKey);
      if (savedJobs) {
        try {
          const parsed = JSON.parse(savedJobs);
          setHasActiveBatch(parsed && parsed.length > 0);
        } catch (e) {
          setHasActiveBatch(false);
        }
      } else {
        setHasActiveBatch(false);
      }
    };

    checkBatch();
    window.addEventListener('storage', checkBatch);

    return () => {
      window.removeEventListener('storage', checkBatch);
    };
  }, [id]);

  const confirmDelete = async () => {
    if (!deleteModalId) return;
    try {
      if (deleteModalId === 'BULK') {
        const ids = Array.from(selectedIds);
        await Promise.all(ids.map(subId => api.deleteHistory(subId)));
        setSelectedIds(new Set());
      } else {
        await api.deleteHistory(deleteModalId);
      }
      setDeleteModalId(null);
      const res: any = await api.getHistory(id || 'student-management-system', page, limit, debouncedSearch, statusFilter, scoreRangeFilter, sortOrder, classFilter);
      setHistory(res.history || []);
      if (res.meta) {
        setTotalPages(res.meta.totalPages || 1);
        setTotalItems(res.meta.total || 0);
      }
    } catch (err: any) {
      console.error('Failed to delete history', err);
      setError(t('lc.ap.delete_result_failed'));
    }
  };

  const handleGradeSubmission = async (e: React.MouseEvent, submissionId: string) => {
    e.stopPropagation();
    try {
      setRegradingId(submissionId);
      const res = await api.gradeExistingSubmission(submissionId);
      // Immediately navigate to live grading page
      navigate(`/lecturer/grading/live/${res.submissionId}?assignmentId=${id || ''}`);
    } catch (err) {
      console.error("Failed to grade submission", err);
      setError(t('lc.ap.start_grading_failed'));
    } finally {
      setRegradingId(null);
    }
  };

  const handleDownloadSubmission = async (e: React.MouseEvent, submissionId: string, studentName?: string) => {
    e.stopPropagation();
    try {
      setDownloadingId(submissionId);
      await api.downloadSubmission(submissionId, studentName);
    } catch (err: any) {
      console.error("Failed to download submission", err);
      setError(err.message || t('lc.ap.download_failed', { defaultValue: 'Failed to download student submission' }));
      setTimeout(() => setError(null), 4000);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleGradeAll = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.gradeExistingBatch(id);
      if (res.jobs && res.jobs.length > 0) {
        // Format jobs and save to localStorage for BatchDashboard
        const newJobs = res.jobs.map((job: any) => ({
          id: job.submissionId,
          studentName: job.studentName,
          fileName: job.fileName,
          state: 'queued' as const,
          progressPercent: 0,
          currentTask: t('lc.ap.waiting_queue')
        }));

        const jobsKey = `batchJobs_${id}`;
        const startKey = `batchStartTime_${id}`;

        // Append to existing jobs or create new
        const existingJobsStr = localStorage.getItem(jobsKey);
        let existingJobs = [];
        if (existingJobsStr) {
          try { existingJobs = JSON.parse(existingJobsStr); } catch (e) { }
        }

        const combinedJobs = [...existingJobs, ...newJobs];
        localStorage.setItem(jobsKey, JSON.stringify(combinedJobs));

        if (!localStorage.getItem(startKey)) {
          localStorage.setItem(startKey, Date.now().toString());
        }

        navigate(`/lecturer/grading/assignments/${id}/submit`);
      } else {
        setError(t('lc.ap.none_eligible'));
      }
    } catch (err) {
      console.error("Failed to start batch grading", err);
      setError(t('lc.ap.start_grading_failed'));
    } finally {
      setLoading(false);
    }
  };

  const doPublishAll = async () => {
    if (!id) return;
    try {
      setIsPublishingAll(true);
      setError(null);
      const res = await api.bulkPublishGrades(id);

      // Broadcast real-time publish event
      try {
        const pubChannel = new BroadcastChannel('aita_submission_events');
        pubChannel.postMessage({ type: 'SUBMISSION_PUBLISHED', assignmentId: id });
        pubChannel.close();
      } catch (e) { }
      localStorage.setItem('aita_last_publish_event', JSON.stringify({ type: 'SUBMISSION_PUBLISHED', assignmentId: id, timestamp: Date.now() }));

      const successText = res.count ? `🚀 Successfully published grades for ${res.count} student(s)!` : '🚀 Scores successfully published to all students.';
      setPublishSuccessMsg(successText);
      setTimeout(() => setPublishSuccessMsg(null), 5000);

      fetchAssignmentData();
      fetchHistoryData(false);
    } catch (err: any) {
      console.error("Failed to publish grades:", err);
      setError(err.message || t('lc.sm.publish_failed') || 'Failed to publish scores');
    } finally {
      setIsPublishingAll(false);
      setShowPublishAllWarningModal(false);
    }
  };

  const handleCheckDuplicates = async () => {
    if (!id || isCheckingDuplicates) return;
    setIsCheckingDuplicates(true);
    setDuplicateError(false);
    setPenaltySuccessMsg(null);
    try {
      const report = await api.detectDuplicateSubmissions(id, duplicateThreshold);
      setDuplicateReport(report);
    } catch (e) {
      setDuplicateReport(null);
      setDuplicateError(true);
    } finally {
      setIsCheckingDuplicates(false);
      setShowDuplicateModal(true);
    }
  };

  const handleApplyDuplicatePenalty = async (targetSubmissionIds?: string[]) => {
    if (!id || isApplyingPenalty) return;

    let submissionIds = targetSubmissionIds;
    if (!submissionIds || submissionIds.length === 0) {
      if (!duplicateReport || duplicateReport.clusters.length === 0) return;
      const idSet = new Set<string>();
      duplicateReport.clusters.forEach(c => {
        c.submissions.forEach(s => {
          const isPenalized = s.isPenalized ||
            appliedDuplicateIds.includes(s.submissionId) ||
            history.find((item: any) => item.id === s.submissionId)?.instructorFeedback?.includes('[Trừ điểm trùng lặp') ||
            history.find((item: any) => item.id === s.submissionId)?.feedback?.includes('[Trừ điểm trùng lặp') ||
            history.find((item: any) => item.id === s.submissionId)?.instructorFeedback?.includes('[Plagiarism') ||
            history.find((item: any) => item.id === s.submissionId)?.feedback?.includes('[Plagiarism');
          if (!isPenalized) {
            idSet.add(s.submissionId);
          }
        });
      });
      submissionIds = Array.from(idSet);
    }

    if (submissionIds.length === 0) return;

    try {
      setIsApplyingPenalty(true);
      setPenaltySuccessMsg(null);
      const res = await api.applyDuplicatePenalty({
        assignmentId: id,
        submissionIds,
        penaltyType: duplicatePenaltyType,
        penaltyValue: duplicatePenaltyValue,
        reason: 'Phát hiện nội dung tệp mã nguồn trùng lặp qua hệ thống đối soát tự động'
      });

      // Invalidate frontend local storage cache so ResultPage immediately loads fresh score & feedback
      submissionIds.forEach(subId => {
        try {
          localStorage.removeItem(`aita_override_result_${subId}`);
        } catch (e) {}
      });

      setAppliedDuplicateIds(prev => Array.from(new Set([...prev, ...submissionIds])));
      setPenaltySuccessMsg(t('lc.dup.apply_success', { count: res.updatedCount }) || `Đã áp dụng trừ điểm thành công cho ${res.updatedCount} bài nộp!`);
      await fetchHistoryData(false);
      await fetchAssignmentData();

      // Refresh duplicate report immediately with updated state
      try {
        const freshReport = await api.detectDuplicateSubmissions(id, duplicateThreshold);
        setDuplicateReport(freshReport);
      } catch (e) {}

      setTimeout(() => setPenaltySuccessMsg(null), 6000);
    } catch (err: any) {
      alert(err.response?.data?.error || err.message || 'Áp dụng trừ điểm thất bại. Vui lòng thử lại.');
    } finally {
      setIsApplyingPenalty(false);
    }
  };

  const handlePublishAll = async () => {
    if (!id) return;

    // Check assignment deadline
    const dueDateStr = (assignment as any)?.stats?.dueDate || (assignment as any)?.metadata?.dueDate || (assignment as any)?.due;
    if (dueDateStr && new Date() < new Date(dueDateStr)) {
      setShowPublishAllWarningModal(true);
      return;
    }

    if (!window.confirm(t('lc.sm.publish_confirm') || 'Publish scores to all students?')) return;
    await doPublishAll();
  };

  const handleGradeSelected = async () => {
    if (!id || selectedIds.size === 0) return;
    try {
      setLoading(true);
      setError(null);
      const submissionIds = Array.from(selectedIds);
      const res = await api.gradeSelectedBatch(id, submissionIds);
      if (res.jobs && res.jobs.length > 0) {
        // Format jobs and save to localStorage for BatchDashboard
        const newJobs = res.jobs.map((job: any) => ({
          id: job.submissionId,
          studentName: job.studentName,
          fileName: job.fileName,
          state: 'queued' as const,
          progressPercent: 0,
          currentTask: t('lc.ap.waiting_queue')
        }));

        const jobsKey = `batchJobs_${id}`;
        const startKey = `batchStartTime_${id}`;

        // Append to existing jobs or create new
        const existingJobsStr = localStorage.getItem(jobsKey);
        let existingJobs = [];
        if (existingJobsStr) {
          try { existingJobs = JSON.parse(existingJobsStr); } catch (e) { }
        }

        const combinedJobs = [...existingJobs, ...newJobs];
        localStorage.setItem(jobsKey, JSON.stringify(combinedJobs));

        if (!localStorage.getItem(startKey)) {
          localStorage.setItem(startKey, Date.now().toString());
        }

        navigate(`/lecturer/grading/assignments/${id}/submit`);
      } else {
        setError(t('lc.ap.none_selected_eligible'));
      }
    } catch (err) {
      console.error("Failed to grade selected", err);
      setError(t('lc.ap.selected_failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(history.map(h => h.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSet = new Set(selectedIds);
    if (checked) newSet.add(id);
    else newSet.delete(id);
    setSelectedIds(newSet);
  };

  const handleRowClick = (item: any) => {
    if (item.status === 'Graded') {
      navigate(`/lecturer/grading/result/${item.id}`);
    } else if (item.status === 'Submitted') {
      setError(t('lc.ap.submitted_no_result', { name: item.studentName || item.studentCode || item.studentId }));
      setTimeout(() => setError(null), 4000);
    } else if (item.status === 'Grading') {
      navigate(`/lecturer/grading/live/${item.id}?assignmentId=${id || ''}`);
    } else {
      setError(t('lc.ap.not_submitted_nothing', { name: item.studentName || item.studentCode || item.studentId }));
      setTimeout(() => setError(null), 4000);
    }
  };

  const handleViewHistory = (historyId: string) => {
    navigate(`/lecturer/grading/result/${historyId}`);
  };

  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());

  const handleOpenDeadlineModal = () => {
    setDeadlineModalError(null);
    const statsDueDate = (assignment as any)?.stats?.dueDate;
    let initialDate = new Date();
    if (statsDueDate) {
      initialDate = new Date(statsDueDate);
    } else {
      initialDate.setDate(initialDate.getDate() + 7);
    }
    const pad = (n: number) => n.toString().padStart(2, '0');
    setNewDueDate(`${initialDate.getFullYear()}-${pad(initialDate.getMonth() + 1)}-${pad(initialDate.getDate())}T${pad(initialDate.getHours())}:${pad(initialDate.getMinutes())}`);
    setCalendarMonth(new Date(initialDate.getFullYear(), initialDate.getMonth(), 1));
    setIsDeadlineModalOpen(true);
  };

  const handleApplyPreset = (daysToAdd: number) => {
    const baseDate = (assignment as any)?.stats?.dueDate ? new Date((assignment as any).stats.dueDate) : new Date();
    const targetDate = new Date(baseDate);
    targetDate.setDate(targetDate.getDate() + daysToAdd);
    targetDate.setHours(23, 59, 0, 0);
    const pad = (n: number) => n.toString().padStart(2, '0');
    setNewDueDate(`${targetDate.getFullYear()}-${pad(targetDate.getMonth() + 1)}-${pad(targetDate.getDate())}T${pad(targetDate.getHours())}:${pad(targetDate.getMinutes())}`);
    setCalendarMonth(new Date(targetDate.getFullYear(), targetDate.getMonth(), 1));
  };

  const handleSaveDeadline = async () => {
    if (newDueDate) {
      const startDate = (assignment as any)?.stats?.createdAt;
      if (startDate && new Date(newDueDate) < new Date(startDate)) {
        setDeadlineModalError(t('lc.ap.due_before_created'));
        return;
      }
    }
    setDeadlineModalError(null);

    try {
      setSavingDeadline(true);
      const updatedIso = newDueDate ? new Date(newDueDate).toISOString() : null;
      await api.updateAssignment(id!, {
        title: assignment?.metadata?.title,
        description: assignment?.metadata?.description,
        dueDate: updatedIso
      });
      const data = await api.getAssignment(id!);
      setAssignment(data);
      setIsDeadlineModalOpen(false);

      // Real-time broadcast to student pages
      try {
        const channel = new BroadcastChannel('aita_assignment_updates');
        channel.postMessage({ type: 'ASSIGNMENT_DEADLINE_UPDATED', id: id!, dueDate: updatedIso, timestamp: Date.now() });
        channel.close();
      } catch (e) { /* empty */ }

      try {
        localStorage.setItem('aita_last_assignment_update', JSON.stringify({
          id: id!,
          dueDate: updatedIso,
          timestamp: Date.now()
        }));
      } catch (e) { }

      window.dispatchEvent(new CustomEvent('aita_assignment_updated', {
        detail: { id: id!, dueDate: updatedIso }
      }));
    } catch (err: any) {
      console.error(err);
      setDeadlineModalError(err.message || t('lc.ap.due_update_failed'));
    } finally {
      setSavingDeadline(false);
    }
  };

  useEffect(() => {
    if (assignment) {
      const strat = (assignment as any)?.metadata?.gradingStrategy || (assignment as any)?.stats?.gradingStrategy || 'CONTINUOUS_QUEUE';
      setSelectedGradingStrategy(strat);
    }
  }, [assignment]);

  const handleSaveGradingStrategy = async (strategy: 'CONTINUOUS_QUEUE' | 'BATCH_POST_DEADLINE') => {
    try {
      setSavingStrategy(true);
      await api.updateAssignment(id!, {
        title: assignment?.metadata?.title,
        description: assignment?.metadata?.description,
        dueDate: (assignment as any)?.stats?.dueDate || (assignment as any)?.metadata?.dueDate,
        gradingStrategy: strategy
      });
      setSelectedGradingStrategy(strategy);
      const data = await api.getAssignment(id!);
      setAssignment(data);
      setIsGradingSettingsModalOpen(false);
      setPendingGradingStrategy(null);
    } catch (err: any) {
      console.error(err);
    } finally {
      setSavingStrategy(false);
    }
  };

  // Calendar helpers for embedded modal calendar
  const selectedDateObj = newDueDate ? new Date(newDueDate) : null;
  const monthNames = Array.from({ length: 12 }, (_, i) => t(`lc.ap.month.${i + 1}`));

  const handlePrevMonth = () => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1));
  const handleNextMonth = () => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1));

  const daysInMonthCalc = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate();
  const firstDayCalc = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1).getDay();
  const totalSlotsCalc = Math.ceil((firstDayCalc + daysInMonthCalc) / 7) * 7;
  const daysList = Array.from({ length: totalSlotsCalc }, (_, i) => {
    const day = i - firstDayCalc + 1;
    if (day <= 0 || day > daysInMonthCalc) return null;
    return day;
  });

  const handleCalendarDaySelect = (day: number) => {
    const currentHour = selectedDateObj ? selectedDateObj.getHours() : 23;
    const currentMinute = selectedDateObj ? selectedDateObj.getMinutes() : 59;
    const target = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day, currentHour, currentMinute, 0);
    const pad = (n: number) => n.toString().padStart(2, '0');
    setNewDueDate(`${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())}T${pad(target.getHours())}:${pad(target.getMinutes())}`);
  };

  const handleTimeChange = (timeStr: string) => {
    if (!timeStr) return;
    const [hours, minutes] = timeStr.split(':').map(Number);
    const base = selectedDateObj || new Date();
    const target = new Date(base.getFullYear(), base.getMonth(), base.getDate(), isNaN(hours) ? 23 : hours, isNaN(minutes) ? 59 : minutes, 0);
    const pad = (n: number) => n.toString().padStart(2, '0');
    setNewDueDate(`${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())}T${pad(target.getHours())}:${pad(target.getMinutes())}`);
  };

  if (loading && !assignment) return <div className="text-center py-20 text-slate-400">{t('lc.ap.loading')}</div>;
  if (!assignment) return <div className="text-center py-20 text-red-400">{t('lc.ap.not_found')}</div>;

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pb-2 -mt-2 sm:-mt-4">
      <div className="mb-6 animate-fade-in">
        <button onClick={() => navigate(`/lecturer/grading/assignments`)} className="text-slate-400 hover:text-brand-500 transition-colors p-2 -ml-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 font-medium">
          <ArrowLeft size={20} />
          Back to assignments
        </button>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-2 p-4 bg-rose-50 border border-rose-200 text-rose-600 rounded-lg text-sm font-medium animate-in fade-in slide-in-from-top-2 shadow-sm">
          <AlertCircle size={18} />
          {error}
        </div>
      )}
      {uploadAnswerKeySuccess && (
        <div className="mb-6 flex items-center gap-2 p-4 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-lg text-sm font-medium animate-in fade-in slide-in-from-top-2 shadow-sm">
          <CheckCircle2 size={18} />
          {uploadAnswerKeySuccess}
        </div>
      )}
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

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm mb-8 relative z-10">
        <div className="p-6 border-b dark:border-slate-800 border-slate-100 bg-slate-50 dark:bg-slate-800/50 rounded-t-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3 text-brand-600 dark:text-brand-400 mb-2">
              <BookOpen size={20} />
              <span className="font-semibold uppercase tracking-wider text-sm">{t('lc.ap.badge_details')}</span>
            </div>
            <div className="flex items-center gap-3">
              {((assignment?.metadata as any)?.projectType === 'database' || (assignment?.metadata as any)?.subject?.toUpperCase().includes('DBI') || assignment?.rubric?.rules?.some((r: any) => r.scoringStrategy === 'SqlExecutionProbe')) && (
                <label className="cursor-pointer flex items-center gap-2 px-5 py-2.5 bg-emerald-100 dark:bg-emerald-900/40 hover:bg-emerald-200 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-400 rounded-lg font-medium transition-colors shadow-sm text-base">
                  {isUploadingAnswerKey ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    <Database size={20} />
                  )}
                  <span>{isUploadingAnswerKey ? t('lc.ap.updating') : t('lc.ap.update_answer_key')}</span>
                  <input
                    type="file"
                    accept=".sql,.txt"
                    className="hidden"
                    disabled={isUploadingAnswerKey}
                    onChange={handleAnswerKeyUpload}
                  />
                </label>
              )}
              <button
                onClick={() => setIsGradingSettingsModalOpen(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition-colors shadow-sm text-base"
              >
                <Settings size={20} />
                {t('lc.ap.gs.button')}
              </button>
              <button
                onClick={() => navigate(`/lecturer/grading/assignments/${id}/rubric`)}
                className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition-colors shadow-sm text-base"
              >
                <ListChecks size={20} />
                Review rubric
              </button>
              <button
                onClick={() => navigate(`/lecturer/grading/assignments/${id}/submit`)}
                className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition-colors shadow-sm text-base"
              >
                <Upload size={20} />
                Upload file (Manual)
              </button>
              <button
                onClick={hasActiveBatch ? () => navigate(`/lecturer/grading/assignments/${id}/submit`) : handleGradeAll}
                className={classNames(
                  "flex items-center gap-2 px-7 py-2.5 rounded-lg font-medium transition-colors shadow-sm text-white text-base",
                  hasActiveBatch ? "bg-amber-500 hover:bg-amber-600 shadow-amber-500/20" : "bg-brand-600 hover:bg-brand-700"
                )}
              >
                {hasActiveBatch ? (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse"></span>
                    Live grading status
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    Grade all
                  </>
                )}
              </button>
              <button
                onClick={handleCheckDuplicates}
                disabled={isCheckingDuplicates}
                className="flex items-center gap-2 px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors shadow-sm text-base disabled:opacity-50 cursor-pointer"
                title={t('lc.dup.check') || 'Check duplicates'}
              >
                {isCheckingDuplicates ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Copy size={18} />
                )}
                <span>{isCheckingDuplicates ? (t('lc.dup.checking') || 'Checking...') : (t('lc.dup.check') || 'Check duplicates')}</span>
              </button>
              <button
                onClick={handlePublishAll}
                disabled={isPublishingAll}
                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors shadow-sm text-base disabled:opacity-50 cursor-pointer"
                title={t('lc.sm.publish_all') || 'Publish all scores'}
              >
                {isPublishingAll ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Send size={18} />
                )}
                <span>{isPublishingAll ? (t('lc.up.publishing') || 'Publishing...') : (t('lc.sm.publish_all') || 'Publish all results')}</span>
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold dark:text-white text-slate-900">{assignment.metadata?.title || t('lc.ap.assignment_fallback')}</h1>
          </div>

          {assignment.metadata?.projectType && (
            <div className="flex flex-wrap items-center gap-2.5 mt-3 animate-fade-in">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 text-sm font-bold rounded-full border border-brand-200 dark:border-brand-500/20 shadow-sm">
                <Layers size={16} />
                <span className="uppercase tracking-wider">{assignment.metadata.projectType}</span>
              </div>
            </div>
          )}
        </div>

        <div className="p-6">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-3">
            <ListChecks size={22} className="text-brand-500" />
            <h2 className="text-xl font-semibold dark:text-white text-slate-800">{t('lc.ap.details')}</h2>
          </div>
          <div className="space-y-4">
            {assignment.metadata?.description ? (
              <p className="dark:text-slate-300 text-slate-600 text-base leading-relaxed whitespace-pre-wrap">
                {assignment.metadata.description}
              </p>
            ) : (
              <p className="dark:text-slate-500 text-slate-400 italic">{t('lc.ap.no_description')}</p>
            )}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800/80 mt-4">
              <div className="flex items-center gap-2.5 text-base font-medium text-slate-700 dark:text-slate-300">
                <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
                  <Calendar size={18} />
                </div>
                <span>
                  Due:{' '}
                  <strong className="text-brand-600 dark:text-brand-400 font-bold ml-1">
                    {(assignment as any)?.stats?.dueDate
                      ? `${new Date((assignment as any).stats.dueDate).toLocaleDateString('vi-VN')} ${new Date((assignment as any).stats.dueDate).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`
                      : t('lc.ap.not_set')}
                  </strong>
                </span>
              </div>

              <button
                onClick={handleOpenDeadlineModal}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 hover:bg-brand-50 dark:hover:bg-brand-900/30 text-slate-700 dark:text-slate-200 hover:text-brand-600 dark:hover:text-brand-400 rounded-xl text-sm font-semibold transition-all border border-slate-200 dark:border-slate-700 hover:border-brand-300 dark:hover:border-brand-600 shadow-sm whitespace-nowrap"
              >
                <Clock size={16} className="text-brand-500" />
                <span>{t('lc.ap.adjust_due')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {(() => {
        let stats = (assignment as any)?.stats || {
          totalStudents: 0,
          submitted: 0,
          notSubmitted: 0,
          grading: 0,
          averageScore: 0,
          submittedPercentage: 0,
          notSubmittedPercentage: 0,
          gradingPercentage: 0
        };

        if (history && history.length > 0) {
          const totalStudents = history.length;
          const submitted = history.filter(h => h.status !== 'NotSubmitted').length;
          const notSubmitted = history.filter(h => h.status === 'NotSubmitted').length;
          const grading = history.filter(h => h.status === 'Grading').length;
          const gradedList = history.filter(h => h.status === 'Graded' && h.score !== null && h.score !== undefined && !isNaN(Number(h.score)));
          const totalScore = gradedList.reduce((sum, h) => sum + Number(h.score), 0);
          const averageScore = gradedList.length > 0 ? Number((totalScore / gradedList.length).toFixed(1)) : 0;

          stats = {
            totalStudents,
            submitted,
            notSubmitted,
            grading,
            averageScore,
            submittedPercentage: totalStudents > 0 ? Number(((submitted / totalStudents) * 100).toFixed(1)) : 0,
            notSubmittedPercentage: totalStudents > 0 ? Number(((notSubmitted / totalStudents) * 100).toFixed(1)) : 0,
            gradingPercentage: submitted > 0 ? Number(((grading / submitted) * 100).toFixed(1)) : 0,
            dueDate: (assignment as any)?.stats?.dueDate,
            createdAt: (assignment as any)?.stats?.createdAt
          };
        }

        return (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center gap-4 shadow-sm">
              <div className="w-12 h-12 rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <Users size={24} />
              </div>
              <div>
                <div className="text-xl font-bold text-slate-900 dark:text-white leading-none mb-1">{stats.totalStudents}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 leading-tight font-medium">{t('lc.ap.stat_students')} <br /><span className="font-normal opacity-80">{t('lc.ap.stat_total')}</span></div>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center gap-4 shadow-sm">
              <div className="w-12 h-12 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <div className="text-xl font-bold text-slate-900 dark:text-white leading-none mb-1">{stats.submitted}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 leading-tight font-medium">{t('lc.ap.stat_submitted')} <br /><span className="font-normal opacity-80">{stats.submittedPercentage}%</span></div>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center gap-4 shadow-sm">
              <div className="w-12 h-12 rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <Clock size={24} />
              </div>
              <div>
                <div className="text-xl font-bold text-slate-900 dark:text-white leading-none mb-1">{stats.notSubmitted}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 leading-tight font-medium">{t('lc.ap.stat_not_submitted')} <br /><span className="font-normal opacity-80">{stats.notSubmittedPercentage}%</span></div>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center gap-4 shadow-sm">
              <div className="w-12 h-12 rounded-lg bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400 flex items-center justify-center shrink-0">
                <Hourglass size={24} />
              </div>
              <div>
                <div className="text-xl font-bold text-slate-900 dark:text-white leading-none mb-1">{stats.grading}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 leading-tight font-medium">{t('lc.ap.stat_grading')} <br /><span className="font-normal opacity-80">{stats.gradingPercentage}%</span></div>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center gap-4 shadow-sm">
              <div className="w-12 h-12 rounded-lg bg-cyan-50 text-cyan-600 dark:bg-cyan-500/10 dark:text-cyan-400 flex items-center justify-center shrink-0">
                <Star size={24} />
              </div>
              <div>
                <div className="text-xl font-bold text-slate-900 dark:text-white leading-none mb-1">{stats.averageScore}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 leading-tight font-medium">{t('lc.ap.stat_avg')} <br /><span className="font-normal opacity-80">/10</span></div>
              </div>
            </div>
          </div>
        );
      })()}

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm p-4 mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4 flex-1">
          <div className="relative max-w-sm w-full">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <svg className="h-4 w-4 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder={t('lc.ap.search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-slate-50 dark:bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent dark:text-slate-200"
            />
          </div>

          <div className="flex items-center gap-4">
            <CustomSelect
              label={t('lc.ap.f.status')}
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'ALL', label: t('lc.ap.f.all') },
                { value: 'NotSubmitted', label: t('lc.ap.st.not_submitted') },
                { value: 'Submitted', label: t('lc.ap.st.submitted') },
                { value: 'Grading', label: t('lc.ap.st.grading') },
                { value: 'Graded', label: t('lc.ap.st.graded') }
              ]}
            />
            <CustomSelect
              label={t('lc.ap.f.score_range')}
              value={scoreRangeFilter}
              onChange={setScoreRangeFilter}
              options={[
                { value: 'ALL', label: t('lc.ap.f.all') },
                { value: '9-10', label: '9 - 10' },
                { value: '8-9', label: '8 - 8.9' },
                { value: '7-8', label: '7 - 7.9' },
                { value: '5-7', label: '5 - 6.9' },
                { value: '<5', label: t('lc.ap.f.below5') }
              ]}
            />
            <CustomSelect
              label={t('lc.ap.f.sort')}
              value={sortOrder}
              onChange={setSortOrder}
              options={[
                { value: 'score_desc', label: t('lc.ap.f.score_desc') },
                { value: 'score_asc', label: t('lc.ap.f.score_asc') },
                { value: 'name_asc', label: t('lc.ap.f.name_asc') },
                { value: 'time_desc', label: t('lc.ap.f.time_desc') }
              ]}
            />
            <CustomSelect
              label={t('lc.ap.f.class')}
              value={classFilter}
              onChange={(v) => {
                setClassFilter(v);
                setPage(1);
              }}
              options={[
                { value: 'ALL', label: t('lc.ap.f.all_classes') },
                ...classList.map(c => ({ value: c.id, label: c.className || c.classCode }))
              ]}
            />
          </div>
        </div>

        <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
          <button
            onClick={() => setViewMode('table')}
            className={classNames("flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors", viewMode === 'table' ? 'bg-white dark:bg-slate-700 shadow-sm text-brand-600 dark:text-brand-400' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
            {t('lc.ap.view_table')}
          </button>
          <button
            onClick={() => setViewMode('card')}
            className={classNames("flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors", viewMode === 'card' ? 'bg-white dark:bg-slate-700 shadow-sm text-brand-600 dark:text-brand-400' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
            {t('lc.ap.view_cards')}
          </button>
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div className="bg-brand-50 border border-brand-200 dark:bg-brand-900/20 dark:border-brand-800 rounded-lg p-3 mb-6 flex items-center justify-between animate-in fade-in zoom-in-95 duration-200">
          <span className="text-brand-700 dark:text-brand-300 font-medium text-sm px-2">{t('lc.ap.selected_count', { n: selectedIds.size })}</span>
          <button
            onClick={() => handleGradeSelected()}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            <Hourglass size={16} /> {t('lc.ap.grade_selected', { n: selectedIds.size })}
          </button>
        </div>
      )}

      {history.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <Clock className="mx-auto h-12 w-12 text-slate-400 mb-4" />
          <h3 className="text-lg font-medium text-slate-900 dark:text-slate-200 mb-2">{t('lc.ap.no_history')}</h3>
          <p className="text-slate-500 dark:text-slate-400">{t('lc.ap.no_history_desc')}</p>
        </div>
      ) : viewMode === 'table' ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-x-auto mb-12 relative">
          {loading && (
            <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-[1px] flex justify-center pt-20 z-10">
              <div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin"></div>
            </div>
          )}
          <table className="w-full text-left whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-sm font-semibold text-slate-600 dark:text-slate-400">
                <th className="py-4 px-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={history.length > 0 && selectedIds.size === history.length}
                    onChange={handleSelectAll}
                    className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                  />
                </th>
                <th className="py-4 px-4">{t('lc.ap.col.student')}</th>
                <th className="py-4 px-4">{t('lc.ap.col.student_id')}</th>
                <th className="py-4 px-4">{t('lc.ap.col.class')}</th>
                <th className="py-4 px-4">{t('lc.ap.col.submitted_at')}</th>
                <th className="py-4 px-4 min-w-[120px]">{t('lc.ap.col.score')}</th>
                <th className="py-4 px-4 text-center">{t('lc.ap.col.grade')}</th>
                <th className="py-4 px-4 text-center">{t('lc.ap.col.download')}</th>
                <th className="py-4 px-4 text-center">{t('lc.ap.col.status')}</th>
                <th className="py-4 px-4 text-center">{t('lc.ap.col.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {history.map((item) => {
                const percentage = item.maxScore > 0 ? (item.score / item.maxScore) * 100 : 0;
                let textClass = 'text-slate-600';

                if (percentage >= 90) { textClass = 'text-emerald-600 dark:text-emerald-400'; }
                else if (percentage >= 80) { textClass = 'text-emerald-600 dark:text-emerald-400'; }
                else if (percentage >= 70) { textClass = 'text-blue-600 dark:text-blue-400'; }
                else if (percentage >= 60) { textClass = 'text-indigo-600 dark:text-indigo-400'; }
                else if (percentage >= 50) { textClass = 'text-amber-600 dark:text-amber-400'; }
                else { textClass = 'text-red-600 dark:text-red-400'; }

                return (
                  <tr
                    key={item.id}
                    onClick={() => handleRowClick(item)}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer group"
                  >
                    <td className="py-4 px-4 text-center" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(item.id)}
                        onChange={(e) => handleSelectOne(item.id, e.target.checked)}
                        className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                      />
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300 text-xs shrink-0 overflow-hidden">
                          <img src={item.studentAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.studentName || item.studentId || '')}&background=random&color=fff`} alt={item.studentName || item.studentId} className="w-full h-full object-cover" />
                        </div>
                        <span className="font-semibold text-slate-900 dark:text-slate-100">{item.studentName || item.studentId}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-slate-600 dark:text-slate-300 font-medium">{item.studentCode || item.studentId}</td>
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {item.className || item.classCode || '-'}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      {item.status === 'NotSubmitted' ? (
                        <div className="text-slate-400 font-medium">-</div>
                      ) : (
                        <>
                          <div className="text-slate-900 dark:text-slate-200 font-medium">
                            {new Date(item.assessedAt).toLocaleDateString('vi-VN')} {new Date(item.assessedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          {item.isLate || item.latePenaltyAmount > 0 ? (
                            <div className="text-xs text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1 mt-0.5">
                              <Clock size={11} className="shrink-0" />
                              <span>{t('lc.ap.late') || 'Nộp trễ'}</span>
                              {item.latePenaltyAmount > 0 && (
                                <span className="font-extrabold text-[10px] px-1.5 py-0.5 bg-rose-100 dark:bg-rose-950/60 rounded text-rose-700 dark:text-rose-300">
                                  -{item.latePenaltyAmount}đ
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                              {t('lc.ap.on_time') || '(Đúng hạn)'}
                            </div>
                          )}
                        </>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      {item.status === 'Graded' ? (
                        <div>
                          <div className={classNames("text-lg font-bold", textClass)}>
                            {Number(item.score).toLocaleString('vi-VN')}
                          </div>
                          {item.latePenaltyAmount > 0 && (
                            <div className="text-[11px] text-slate-400 font-medium whitespace-nowrap">
                              {item.rawScore}đ - {item.latePenaltyAmount}đ trễ
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-slate-400 font-medium">-</div>
                      )}
                    </td>
                    <td className="py-4 px-4 text-center" onClick={e => e.stopPropagation()}>
                      {item.status === 'Graded' ? (
                        <button
                          onClick={(e) => handleGradeSubmission(e, item.id)}
                          disabled={regradingId === item.id}
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-600 dark:bg-brand-500/10 dark:hover:bg-brand-500/20 dark:text-brand-400 border border-brand-200/60 dark:border-brand-800/60 rounded-lg text-xs font-semibold transition-all shadow-2xs active:scale-95 disabled:opacity-50 cursor-pointer"
                          title={t('lc.ap.act.regrade')}
                        >
                          {regradingId === item.id ? (
                            <Loader2 size={14} className="animate-spin text-brand-600 dark:text-brand-400" />
                          ) : (
                            <RotateCcw size={14} />
                          )}
                          <span>{t('lc.ap.act.regrade')}</span>
                        </button>
                      ) : (
                        <span className="text-slate-400 font-medium">-</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-center" onClick={e => e.stopPropagation()}>
                      {item.status !== 'NotSubmitted' ? (
                        <button
                          onClick={(e) => handleDownloadSubmission(e, item.id, item.studentName || item.studentCode)}
                          disabled={downloadingId === item.id}
                          className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold transition-all shadow-2xs active:scale-95 disabled:opacity-50 cursor-pointer"
                          title={t('lc.ap.act.download') || "Tải về"}
                        >
                          {downloadingId === item.id ? (
                            <Loader2 size={14} className="animate-spin text-slate-600 dark:text-slate-300" />
                          ) : (
                            <Download size={14} />
                          )}
                          <span>{t('lc.ap.act.download')}</span>
                        </button>
                      ) : (
                        <span className="text-slate-400 font-medium">-</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-center">
                      {item.status === 'Graded' && (
                        <div className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-sm font-medium">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          {t('lc.ap.st.graded')}
                        </div>
                      )}
                      {item.status === 'Grading' && (
                        <div className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400 text-sm font-medium">
                          <Hourglass size={16} className="animate-pulse" />
                          {t('lc.ap.st.grading')}
                        </div>
                      )}
                      {item.status === 'Submitted' && (
                        <div className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 text-sm font-medium">
                          <CheckCircle2 size={16} />
                          {t('lc.ap.st.submitted')}
                        </div>
                      )}
                      {item.status === 'NotSubmitted' && (
                        <div className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-sm font-medium">
                          <Clock size={16} />
                          {t('lc.ap.st.not_submitted')}
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-4 text-center" onClick={e => e.stopPropagation()}>
                      {item.status === 'Graded' && (
                        <button
                          onClick={() => handleViewHistory(item.id)}
                          className="flex items-center justify-center gap-2 w-full px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 dark:text-emerald-400 rounded-lg text-sm font-semibold transition-colors"
                        >
                          <Eye size={16} /> {t('lc.ap.act.view')}
                        </button>
                      )}
                      {item.status === 'Grading' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/lecturer/grading/live/${item.id}?assignmentId=${id || ''}`);
                          }}
                          className="flex items-center justify-center gap-2 w-full px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 dark:text-amber-400 rounded-lg text-sm font-semibold transition-all cursor-pointer border border-amber-200/80 dark:border-amber-800/80 shadow-sm"
                          title={t('lc.ap.watch_live_title')}
                        >
                          <Loader2 size={16} className="animate-spin text-amber-600 dark:text-amber-400" />
                          {t('lc.ap.act.grading')}
                        </button>
                      )}
                      {item.status === 'Submitted' && (
                        <button
                          onClick={(e) => handleGradeSubmission(e, item.id)}
                          className="flex items-center justify-center gap-2 w-full px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-600 dark:bg-brand-500/10 dark:hover:bg-brand-500/20 dark:text-brand-400 rounded-lg text-sm font-semibold transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                          {t('lc.ap.act.grade')}
                        </button>
                      )}
                      {item.status === 'NotSubmitted' && (
                        <button disabled className="flex items-center justify-center gap-2 w-full px-3 py-1.5 bg-slate-50 text-slate-300 dark:bg-slate-800/30 dark:text-slate-600 rounded-lg text-sm font-semibold cursor-not-allowed">
                          -
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative">
          {loading && (
            <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-[1px] flex justify-center pt-20 z-10">
              <div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin"></div>
            </div>
          )}
          {history.map((item) => {
            const displayName = item.studentName || item.studentId || item.id.split('-')[0];

            const avatarColors = ['bg-yellow-50 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400', 'bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400', 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400', 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400', 'bg-rose-50 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400'];
            const avatarColor = avatarColors[displayName.charCodeAt(displayName.length - 1) % avatarColors.length] || avatarColors[0];

            return (
              <div
                key={item.id}
                onClick={() => handleRowClick(item)}
                className="group bg-white dark:bg-slate-900 rounded-xl shadow-[0_2px_8px_rgb(0,0,0,0.04)] border border-slate-100 dark:border-slate-800 transition-all cursor-pointer relative overflow-hidden hover:border-brand-300 flex flex-col"
              >
                <div className="p-5 flex-1">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-3">
                      <div className={classNames("w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden", avatarColor)}>
                        <img src={item.studentAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random&color=fff`} alt={displayName} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-slate-100 text-[15px] leading-snug">
                          {displayName}
                        </h3>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-xs text-slate-500 font-medium">{item.studentCode || item.studentId}</p>
                          {item.className && (
                            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-[11px] font-bold border border-slate-200 dark:border-slate-700">
                              {item.className}
                            </span>
                          )}
                        </div>
                        {item.status !== 'NotSubmitted' ? (
                          <div className="mt-0.5">
                            <p className="text-[12px] text-slate-500 dark:text-slate-400">
                              {new Date(item.assessedAt).toLocaleDateString('vi-VN')} {new Date(item.assessedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            {item.isLate || item.latePenaltyAmount > 0 ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                                <Clock size={11} className="shrink-0" />
                                <span>{t('lc.ap.late') || 'Nộp trễ'}</span>
                                {item.latePenaltyAmount > 0 && (
                                  <span className="px-1.5 py-0.2 bg-rose-100 dark:bg-rose-950/60 rounded text-rose-700 dark:text-rose-300 font-extrabold text-[10px]">
                                    -{item.latePenaltyAmount}đ
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                                {t('lc.ap.on_time') || '(Đúng hạn)'}
                              </span>
                            )}
                          </div>
                        ) : (
                          <p className="text-[12px] text-slate-400 dark:text-slate-500 mt-0.5">
                            {t('lc.ap.st.not_submitted') || 'Chưa nộp'}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 flex justify-between">
                      <span>{t('lc.ap.final_score')}</span>
                      <span className="normal-case tracking-normal">
                        {item.status === 'Graded' && <span className="text-emerald-500">{t('lc.ap.st.graded')}</span>}
                        {item.status === 'Grading' && <span className="text-amber-500">{t('lc.ap.st.grading')}</span>}
                        {item.status === 'Submitted' && <span className="text-blue-500">{t('lc.ap.st.submitted')}</span>}
                        {item.status === 'NotSubmitted' && <span className="text-slate-400">{t('lc.ap.st.not_submitted')}</span>}
                      </span>
                    </div>
                    {item.status === 'Graded' ? (
                      <div className="flex justify-between items-end mb-2 min-h-[30px]">
                        <div>
                          <div className="text-[26px] font-bold text-slate-900 dark:text-white leading-none">
                            {Number(item.score).toLocaleString('vi-VN')}
                          </div>
                          {item.latePenaltyAmount > 0 && (
                            <div className="text-[10px] text-slate-400 font-medium mt-1">
                              {item.rawScore}đ - {item.latePenaltyAmount}đ trễ
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between items-end mb-2 h-[30px]">
                        <div className="text-[26px] font-bold text-slate-300 dark:text-slate-600 leading-none">
                          -
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 pt-0 mt-auto flex items-center gap-2">
                  {item.status === 'Graded' && (
                    <>
                      <button
                        onClick={() => handleViewHistory(item.id)}
                        className="flex-1 flex items-center justify-center gap-2 py-2 bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 border border-transparent rounded-lg text-sm font-semibold transition-colors"
                      >
                        <Eye size={16} /> {t('lc.ap.act.view_result')}
                      </button>
                      <button
                        onClick={(e) => handleGradeSubmission(e, item.id)}
                        disabled={regradingId === item.id}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400 hover:bg-brand-100 dark:hover:bg-brand-500/20 border border-brand-200/60 dark:border-brand-800/60 rounded-lg text-sm font-semibold transition-all shadow-2xs active:scale-95 disabled:opacity-50 cursor-pointer"
                        title={t('lc.ap.act.regrade')}
                      >
                        {regradingId === item.id ? (
                          <Loader2 size={16} className="animate-spin text-brand-600 dark:text-brand-400" />
                        ) : (
                          <RotateCcw size={16} />
                        )}
                        <span>{t('lc.ap.act.regrade')}</span>
                      </button>
                    </>
                  )}
                  {item.status === 'Grading' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/lecturer/grading/live/${item.id}?assignmentId=${id || ''}`);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 py-2 bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-500/20 border border-amber-200/80 dark:border-amber-800/80 rounded-lg text-sm font-semibold transition-all cursor-pointer shadow-sm"
                      title={t('lc.ap.watch_live_title')}
                    >
                      <Loader2 size={16} className="animate-spin text-amber-600 dark:text-amber-400" />
                      {t('lc.ap.act.grading')}
                    </button>
                  )}
                  {item.status === 'Submitted' && (
                    <button
                      onClick={(e) => handleGradeSubmission(e, item.id)}
                      className="flex-1 flex items-center justify-center gap-2 py-2 bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400 hover:bg-brand-100 dark:hover:bg-brand-500/20 border border-transparent rounded-lg text-sm font-semibold transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                      {t('lc.ap.act.grade')}
                    </button>
                  )}
                  {item.status !== 'NotSubmitted' && (
                    <button
                      onClick={(e) => handleDownloadSubmission(e, item.id, item.studentName || item.studentCode)}
                      disabled={downloadingId === item.id}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold transition-all shadow-2xs active:scale-95 disabled:opacity-50 cursor-pointer"
                      title="Download student submission"
                    >
                      {downloadingId === item.id ? (
                        <Loader2 size={16} className="animate-spin text-slate-600 dark:text-slate-300" />
                      ) : (
                        <Download size={16} />
                      )}
                    </button>
                  )}
                  {item.status === 'NotSubmitted' && (
                    <button disabled className="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-50 text-slate-300 dark:bg-slate-800/30 dark:text-slate-600 border border-transparent rounded-lg text-sm font-semibold cursor-not-allowed">
                      -
                    </button>
                  )}

                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 0 && history.length > 0 && (
        <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-4 mt-4">
          <div className="text-sm text-slate-500 dark:text-slate-400">
            {t('lc.ap.showing_prefix')} <span className="font-medium text-slate-900 dark:text-white">{Math.min((page - 1) * limit + 1, totalItems)}</span> - <span className="font-medium text-slate-900 dark:text-white">{Math.min(page * limit, totalItems)}</span> {t('lc.ap.showing_of')} <span className="font-medium text-slate-900 dark:text-white">{totalItems}</span> {t('lc.ap.showing_suffix')}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
              .map((p, idx, arr) => (
                <React.Fragment key={p}>
                  {idx > 0 && p - arr[idx - 1] > 1 && (
                    <span className="px-3 py-2 text-slate-400">...</span>
                  )}
                  <button
                    onClick={() => setPage(p)}
                    className={classNames(
                      "w-10 h-10 rounded-lg text-sm font-medium transition-colors",
                      page === p
                        ? "bg-brand-600 text-white shadow-md shadow-brand-500/20 border border-brand-600"
                        : "border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    )}
                  >
                    {p}
                  </button>
                </React.Fragment>
              ))}
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalId && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={24} strokeWidth={2.5} />
              </div>
              <h3 className="text-xl font-bold text-center text-slate-900 dark:text-white mb-2">{t('lc.ap.del.title')}</h3>
              <p className="text-center text-slate-500 dark:text-slate-400 text-sm">
                {t('lc.ap.del.body', {
                  target: deleteModalId === 'BULK'
                    ? t('lc.ap.del.bulk', { n: selectedIds.size })
                    : t('lc.ap.del.single'),
                })}
              </p>
            </div>
            <div className="flex border-t border-slate-100 dark:border-slate-700/50">
              <button
                onClick={() => setDeleteModalId(null)}
                className="flex-1 px-4 py-3.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                {t('lc.ap.del.cancel')}
              </button>
              <div className="w-px bg-slate-100 dark:bg-slate-700/50"></div>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-3.5 text-sm font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
              >
                {t('lc.ap.del.confirm')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Deadline Adjustment Modal */}
      {isDeadlineModalOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-700 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">

            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700/60 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-800/80 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-brand-500/10 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0 border border-brand-500/20">
                  <Clock size={20} className="stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {t('lc.ap.dl.adjust_title')}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[220px] font-medium">
                    {assignment?.metadata?.title || t('lc.ap.assignment_fallback')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDeadlineModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/80 rounded-xl transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto max-h-[80vh]">
              {deadlineModalError && (
                <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-2xl text-xs font-semibold">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{deadlineModalError}</span>
                </div>
              )}

              {/* Current Deadline Banner */}
              <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-700/60 rounded-2xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-medium">
                  <Calendar size={15} className="text-slate-400" />
                  <span>{t('lc.ap.dl.current_due')}</span>
                </div>
                <span className="font-bold text-slate-800 dark:text-slate-200 px-2.5 py-0.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200/60 dark:border-slate-700 font-mono">
                  {(assignment as any)?.stats?.dueDate
                    ? `${new Date((assignment as any).stats.dueDate).toLocaleDateString(i18n.language === 'vi' ? 'vi-VN' : 'en-US')} ${new Date((assignment as any).stats.dueDate).toLocaleTimeString(i18n.language === 'vi' ? 'vi-VN' : 'en-US', { hour: '2-digit', minute: '2-digit' })}`
                    : t('lc.ap.not_set')}
                </span>
              </div>

              {/* Quick Extension Chips */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                  {t('lc.ap.dl.quick_extend')}
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { label: t('lc.ap.dl.days_1'), days: 1 },
                    { label: t('lc.ap.dl.days_3'), days: 3 },
                    { label: t('lc.ap.dl.days_7'), days: 7 },
                    { label: t('lc.ap.dl.days_14'), days: 14 }
                  ].map(preset => (
                    <button
                      key={preset.days}
                      type="button"
                      onClick={() => handleApplyPreset(preset.days)}
                      className="py-2 px-1 bg-slate-50 dark:bg-slate-700/40 hover:bg-brand-50 dark:hover:bg-brand-500/15 text-slate-700 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 rounded-xl text-xs font-bold transition-all border border-slate-200/60 dark:border-slate-700/60 hover:border-brand-300 dark:hover:border-brand-500/40 text-center"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Integrated Calendar Box */}
              <div className="border border-slate-200/80 dark:border-slate-700/80 rounded-2xl p-3.5 bg-white dark:bg-slate-800/90 shadow-2xs">

                {/* Month Header */}
                <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-slate-100 dark:border-slate-700/50">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <div className="font-bold text-slate-900 dark:text-white text-sm">
                    {monthNames[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}
                  </div>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>

                {/* Day of Week Labels */}
                <div className="grid grid-cols-7 gap-1 mb-1 text-center">
                  {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map(day => (
                    <div key={day} className="text-[11px] font-bold text-slate-400 dark:text-slate-500 py-1">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 gap-1">
                  {daysList.map((day, idx) => {
                    if (day === null) return <div key={`empty-${idx}`} className="w-8 h-8"></div>;
                    const isSelected = selectedDateObj?.getDate() === day && selectedDateObj?.getMonth() === calendarMonth.getMonth() && selectedDateObj?.getFullYear() === calendarMonth.getFullYear();
                    const isToday = new Date().getDate() === day && new Date().getMonth() === calendarMonth.getMonth() && new Date().getFullYear() === calendarMonth.getFullYear();

                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => handleCalendarDaySelect(day)}
                        className={classNames(
                          "w-full aspect-square rounded-xl flex items-center justify-center text-xs font-bold transition-all duration-150 relative",
                          isSelected
                            ? "bg-brand-600 text-white shadow-md shadow-brand-600/30 scale-105"
                            : isToday
                              ? "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400 hover:bg-brand-100"
                              : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/80"
                        )}
                      >
                        {day}
                        {isToday && !isSelected && (
                          <span className="absolute bottom-1 w-1 h-1 rounded-full bg-brand-500"></span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Result Preview & Time Adjustment Banner (Unified Card) */}
              <div className="p-3 bg-brand-500/10 dark:bg-brand-500/20 border border-brand-500/30 rounded-2xl flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-slate-600 dark:text-slate-400 font-medium shrink-0">{t('lc.ap.dl.new_due')}</span>
                  <span className="font-bold text-brand-600 dark:text-brand-400 font-mono truncate">
                    {selectedDateObj ? (
                      selectedDateObj.toLocaleDateString(i18n.language === 'vi' ? 'vi-VN' : 'en-US', { day: '2-digit', month: '2-digit', year: 'numeric' })
                    ) : (
                      t('lc.ap.dl.no_date')
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-slate-800 border border-brand-300 dark:border-brand-500/40 rounded-xl shadow-2xs">
                    <Clock size={13} className="text-brand-500 shrink-0" />
                    <input
                      type="time"
                      value={selectedDateObj ? `${selectedDateObj.getHours().toString().padStart(2, '0')}:${selectedDateObj.getMinutes().toString().padStart(2, '0')}` : '23:59'}
                      onChange={(e) => handleTimeChange(e.target.value)}
                      className="bg-transparent text-brand-700 dark:text-brand-300 font-mono font-bold text-xs focus:outline-none cursor-pointer"
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Footer Actions */}
            <div className="px-5 py-3.5 border-t border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsDeadlineModalOpen(false)}
                disabled={savingDeadline}
                className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors disabled:opacity-50"
              >
                {t('lc.ap.del.cancel')}
              </button>
              <button
                type="button"
                onClick={handleSaveDeadline}
                disabled={savingDeadline}
                className="flex items-center gap-2 px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold rounded-xl shadow-md shadow-brand-600/25 transition-all disabled:opacity-50"
              >
                {savingDeadline ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Save size={16} />
                )}
                <span>{t('lc.ap.dl.update')}</span>
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}

      {/* Grading Strategy Settings Modal */}
      {isGradingSettingsModalOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-700 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">

            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700/60 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-800/80 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-brand-500/10 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0 border border-brand-500/20">
                  <Settings size={22} className="stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {t('lc.ap.gs.title')}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[280px] font-medium">
                    {assignment?.metadata?.title || t('lc.ap.assignment_fallback')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsGradingSettingsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/80 rounded-xl transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 overflow-y-auto max-h-[80vh]">

              {/* Option 1: Continuous queue (background grading) */}
              <div
                onClick={() => {
                  if (!savingStrategy && selectedGradingStrategy !== 'CONTINUOUS_QUEUE') {
                    setPendingGradingStrategy('CONTINUOUS_QUEUE');
                  }
                }}
                className={classNames(
                  "p-5 rounded-2xl border-2 transition-all relative overflow-hidden group",
                  selectedGradingStrategy === 'CONTINUOUS_QUEUE'
                    ? "bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500 shadow-md shadow-emerald-500/10 cursor-default"
                    : "bg-white dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-500/50 cursor-pointer"
                )}
              >
                <div className="flex items-start gap-4">
                  <div className={classNames(
                    "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105",
                    selectedGradingStrategy === 'CONTINUOUS_QUEUE'
                      ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/30"
                      : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                  )}>
                    <Zap size={24} className="stroke-[2.5]" />
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        {t('lc.ap.gs.queue_title')}
                      </h4>
                      {selectedGradingStrategy === 'CONTINUOUS_QUEUE' && (
                        <span className="px-2.5 py-0.5 bg-emerald-500 text-white text-[11px] font-extrabold rounded-full uppercase tracking-wider">
                          {t('lc.ap.gs.in_use')}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      {t('lc.ap.gs.queue_desc')}
                    </p>
                    <div className="pt-2 flex items-center gap-2">
                      <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold rounded-lg border border-emerald-200/60 dark:border-emerald-500/20">
                        {t('lc.ap.gs.queue_tag1')}
                      </span>
                      <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-medium rounded-lg">
                        {t('lc.ap.gs.queue_tag2')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Option 2: Batch after deadline */}
              <div
                onClick={() => {
                  if (!savingStrategy && selectedGradingStrategy !== 'BATCH_POST_DEADLINE') {
                    setPendingGradingStrategy('BATCH_POST_DEADLINE');
                  }
                }}
                className={classNames(
                  "p-5 rounded-2xl border-2 transition-all relative overflow-hidden group",
                  selectedGradingStrategy === 'BATCH_POST_DEADLINE'
                    ? "bg-amber-500/5 dark:bg-amber-500/10 border-amber-500 shadow-md shadow-amber-500/10 cursor-default"
                    : "bg-white dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-500/50 cursor-pointer"
                )}
              >
                <div className="flex items-start gap-4">
                  <div className={classNames(
                    "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105",
                    selectedGradingStrategy === 'BATCH_POST_DEADLINE'
                      ? "bg-amber-500 text-white shadow-md shadow-amber-500/30"
                      : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                  )}>
                    <Clock size={24} className="stroke-[2.5]" />
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        {t('lc.ap.gs.batch_title')}
                      </h4>
                      {selectedGradingStrategy === 'BATCH_POST_DEADLINE' && (
                        <span className="px-2.5 py-0.5 bg-amber-500 text-white text-[11px] font-extrabold rounded-full uppercase tracking-wider">
                          {t('lc.ap.gs.in_use')}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      {t('lc.ap.gs.batch_desc')}
                    </p>
                    <div className="pt-2 flex items-center gap-2">
                      <span className="px-2.5 py-1 bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 text-[11px] font-bold rounded-lg border border-amber-200/60 dark:border-amber-500/20">
                        {t('lc.ap.gs.batch_tag1')}
                      </span>
                      <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-medium rounded-lg">
                        {t('lc.ap.gs.batch_tag2')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Footer Actions */}
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between shrink-0">
              <span className="text-xs text-slate-400 font-medium">
                {savingStrategy ? t('lc.ap.gs.saving') : t('lc.ap.gs.click_hint')}
              </span>
              <button
                type="button"
                onClick={() => setIsGradingSettingsModalOpen(false)}
                className="px-5 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
              >
                {t('lc.ap.gs.close')}
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}

      {/* Strategy Switch Confirmation Modal */}
      {pendingGradingStrategy && createPortal(
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-700 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto border border-amber-500/20">
                <HelpCircle size={28} className="stroke-[2.5]" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {t('lc.ap.gs.confirm_title')}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  {t('lc.ap.gs.confirm_body', {
                    mode: (pendingGradingStrategy === 'CONTINUOUS_QUEUE'
                      ? t('lc.ap.gs.queue_title')
                      : t('lc.ap.gs.batch_title')
                    ).replace(/^[^\p{L}\p{N}\s]+/u, '').trim()
                  })}
                </p>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={savingStrategy}
                onClick={() => setPendingGradingStrategy(null)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors disabled:opacity-50"
              >
                {t('lc.ap.gs.confirm_cancel')}
              </button>
              <button
                type="button"
                disabled={savingStrategy}
                onClick={() => handleSaveGradingStrategy(pendingGradingStrategy)}
                className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold rounded-xl shadow-md shadow-brand-600/25 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {savingStrategy ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Check size={16} />
                )}
                <span>{t('lc.ap.gs.confirm_btn')}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Deadline Warning Modal for Bulk Publish */}
      {showPublishAllWarningModal && createPortal(
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
                If you publish scores for all students right now, all graded students will be able to <strong>view full answers and detailed feedback</strong>.
              </p>
              <p className="text-amber-800 dark:text-amber-300 font-medium">
                ⚠️ Since the deadline has not passed yet, students may use the published answers to <strong>revise and resubmit their work</strong>.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowPublishAllWarningModal(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={doPublishAll}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-bold shadow-md shadow-amber-600/20 transition-all cursor-pointer flex items-center gap-2"
              >
                <Send size={16} />
                <span>Publish All Scores Anyway</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showDuplicateModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-[#121622] border border-slate-200/90 dark:border-slate-800 rounded-3xl max-w-3xl w-full shadow-2xl shadow-slate-950/30 flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-rose-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/25">
                  <Copy size={22} className="stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg sm:text-xl text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    {t('lc.dup.title') || 'Báo cáo trùng lặp bài nộp'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {t('lc.dup.subtitle') || 'Đối soát mức độ tương đồng mã nguồn và áp dụng trừ điểm bài trùng lặp'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDuplicateModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 custom-scrollbar">
              {duplicateError ? (
                <div className="bg-rose-50 dark:bg-rose-950/30 p-4 rounded-2xl border border-rose-200 dark:border-rose-900/50 text-sm text-rose-700 dark:text-rose-300 flex items-center gap-3">
                  <AlertTriangle size={20} className="text-rose-500 shrink-0" />
                  <span>{t('lc.dup.error') || 'Kiểm tra trùng lặp thất bại. Vui lòng thử lại sau.'}</span>
                </div>
              ) : duplicateReport && (() => {
                const isSubmissionPenalized = (sId: string, isPenFlag?: boolean) => {
                  if (isPenFlag) return true;
                  if (appliedDuplicateIds.includes(sId)) return true;
                  const hItem = history.find((item: any) => item.id === sId || item.submissionId === sId);
                  if (!hItem) return false;
                  const ifb = hItem.instructorFeedback || '';
                  const fb = hItem.feedback || '';
                  return (
                    ifb.includes('[Trừ điểm trùng lặp') ||
                    ifb.includes('[Plagiarism') ||
                    fb.includes('[Trừ điểm trùng lặp') ||
                    fb.includes('[Plagiarism')
                  );
                };

                const getStudentLabel = (member: { submissionId: string; studentId: string | null; studentName: string | null; studentCode: string | null }) => {
                  const matchedSt = history.find((h: any) =>
                    h.id === member.submissionId ||
                    h.submissionId === member.submissionId ||
                    (member.studentId && (h.studentId === member.studentId || h.id === member.studentId)) ||
                    (member.studentCode && (h.studentCode === member.studentCode || h.studentId === member.studentCode)) ||
                    (member.studentName && (h.studentName === member.studentName || h.name === member.studentName))
                  );

                  const name = (matchedSt ? (matchedSt.studentName || matchedSt.name) : null) || member.studentName || null;
                  const code = (matchedSt ? (matchedSt.studentCode || matchedSt.code) : null) || member.studentCode || null;

                  if (name && code) {
                    return name.includes(code) ? name : `${name} (${code})`;
                  }
                  if (name) return name;
                  if (code) return `Sinh viên (${code})`;
                  return null;
                };

                const dupList: Array<{
                  submissionId: string;
                  studentName: string | null;
                  studentId: string | null;
                  studentCode: string | null;
                  submittedAt: string | null;
                  topSimilarity: number;
                  isFirst: boolean;
                  diffLabel: string;
                  isPenalized: boolean;
                  matchedWithNames: string[];
                  hasPenalizedMatch: boolean;
                }> = [];
                const seenIds = new Set<string>();

                duplicateReport.clusters.forEach((cluster) => {
                  const clusterPenalizedMembers = cluster.submissions.filter(s => isSubmissionPenalized(s.submissionId, s.isPenalized));
                  const clusterPendingMembers = cluster.submissions.filter(s => !isSubmissionPenalized(s.submissionId, s.isPenalized));

                  const seenPenalized = new Set<string>();
                  const penalizedNames: string[] = [];
                  clusterPenalizedMembers.forEach(pm => {
                    const label = getStudentLabel(pm);
                    if (label && !seenPenalized.has(label)) {
                      seenPenalized.add(label);
                      penalizedNames.push(label);
                    }
                  });

                  const seenPending = new Set<string>();
                  const pendingNames: string[] = [];
                  clusterPendingMembers.forEach(pm => {
                    const label = getStudentLabel(pm);
                    if (label && !seenPending.has(label)) {
                      seenPending.add(label);
                      pendingNames.push(label);
                    }
                  });

                  // Only show pending (unpenalized) submissions in dupList!
                  clusterPendingMembers.forEach((s) => {
                    if (seenIds.has(s.submissionId)) return;
                    seenIds.add(s.submissionId);

                    const matchedStudent = history.find((h: any) =>
                      h.id === s.submissionId ||
                      h.submissionId === s.submissionId ||
                      h.studentId === s.studentId ||
                      (s.studentCode && (h.studentCode === s.studentCode || h.studentId === s.studentCode)) ||
                      (s.studentName && h.studentName === s.studentName)
                    );

                    const studentName = s.studentName || (matchedStudent ? (matchedStudent.studentName || matchedStudent.name) : null) || (s.studentCode ? `Sinh viên (${s.studentCode})` : (s.studentId || s.submissionId));
                    const studentCode = s.studentCode || (matchedStudent ? (matchedStudent.studentCode || matchedStudent.code) : null);

                    const hasPenalizedMatch = penalizedNames.length > 0;
                    const otherPendingNames = pendingNames.filter(n => !n.includes(studentCode || studentName || '___'));
                    const displayMatchedNames = hasPenalizedMatch ? penalizedNames : otherPendingNames;

                    dupList.push({
                      submissionId: s.submissionId,
                      studentName,
                      studentId: s.studentId,
                      studentCode,
                      submittedAt: s.submittedAt ? String(s.submittedAt) : null,
                      topSimilarity: s.topSimilarity ?? cluster.maxSimilarity ?? 100,
                      isFirst: false,
                      diffLabel: '',
                      isPenalized: false,
                      matchedWithNames: displayMatchedNames,
                      hasPenalizedMatch,
                    });
                  });
                });

                const maxSimilarity = dupList.length > 0
                  ? dupList.reduce((max, s) => Math.max(max, s.topSimilarity || 0), 0)
                  : 0;

                const resolvedCount = (duplicateReport as any).resolvedClustersCount || duplicateReport.clusters.filter((c: any) => c.isResolved).length;

                return (
                  <>
                    {/* Summary Metric Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                          <Users size={18} />
                        </div>
                        <div>
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            {t('lc.dup.metric_scanned') || 'Đã quét'}
                          </p>
                          <p className="text-base font-extrabold text-slate-900 dark:text-white">
                            {duplicateReport.checkedCount} <span className="text-xs font-medium text-slate-400">{t('lc.dup.metric_scanned_unit') || 'bài nộp'}</span>
                          </p>
                        </div>
                      </div>

                      <div className={`p-3.5 rounded-2xl border flex items-center gap-3 ${
                        dupList.length > 0
                          ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-200'
                          : 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-200'
                      }`}>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                          dupList.length > 0
                            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                            : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                        }`}>
                          {dupList.length > 0 ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
                        </div>
                        <div>
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            {t('lc.dup.metric_duplicates') || 'Trùng lặp'}
                          </p>
                          <p className="text-base font-extrabold">
                            {dupList.length} <span className="text-xs font-medium opacity-80">{t('lc.dup.metric_duplicates_unit') || 'bài nộp phát hiện'}</span>
                          </p>
                        </div>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
                          <Flame size={18} />
                        </div>
                        <div>
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            {t('lc.dup.metric_similarity') || 'Độ tương đồng'}
                          </p>
                          <p className="text-base font-extrabold text-rose-600 dark:text-rose-400">
                            {dupList.length > 0 ? (t('lc.dup.similarity_badge', { pct: maxSimilarity }) || `${maxSimilarity}% Giống nhau`) : '0%'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {penaltySuccessMsg && (
                      <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2.5 animate-in fade-in slide-in-from-top-1">
                        <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>{penaltySuccessMsg}</span>
                      </div>
                    )}

                    {dupList.length === 0 ? (
                      <div className="bg-emerald-50/80 dark:bg-emerald-950/20 p-8 rounded-2xl border border-emerald-200 dark:border-emerald-900/40 text-center space-y-2">
                        <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-2">
                          <CheckCircle2 size={26} />
                        </div>
                        <p className="text-base font-bold text-emerald-800 dark:text-emerald-200">
                          {t('lc.dup.none') || 'Không phát hiện bài nộp nào bị trùng lặp!'}
                        </p>
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 max-w-md mx-auto">
                          {resolvedCount > 0 || duplicateReport.clusters.length > 0
                            ? (t('lc.dup.all_penalized_desc') || 'Tất cả các bài nộp trùng lặp trước đó đã được áp dụng trừ điểm. Không có vi phạm mới.')
                            : (t('lc.dup.none_desc', { threshold: duplicateThreshold }) || 'Tất cả các bài làm đã nộp đều có nội dung tệp mã nguồn độc lập và khác biệt.')}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {dupList.map((s) => {
                          const studentName = s.studentName || s.studentId || s.submissionId;
                          const initials = studentName
                            ? studentName.split(' ').map((w: string) => w[0]).filter(Boolean).slice(-2).join('').toUpperCase()
                            : 'SV';
                          const pct = s.topSimilarity || 100;

                          return (
                            <div
                              key={s.submissionId}
                              className="p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs bg-white dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700/80 hover:border-slate-300"
                            >
                              {/* Student Info */}
                              <div className="flex items-center gap-3.5 min-w-0">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shrink-0 shadow-sm bg-gradient-to-br from-indigo-500 to-blue-600 text-white">
                                  {initials}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100">
                                      {studentName}
                                    </p>
                                    {s.studentCode && (
                                      <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600">
                                        {s.studentCode}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Right Details: Similarity % */}
                              <div className="flex items-center gap-3 flex-wrap shrink-0">
                                {/* Similarity percentage badge */}
                                <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-xs font-black shadow-xs">
                                  <Flame size={13} className="text-rose-500 fill-rose-500" />
                                  <span>{t('lc.dup.similarity_badge', { pct }) || `${pct}% Giống nhau`}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Detailed Reason & Comparison Breakdown Card */}
                    {dupList.length > 0 ? (
                      <div className="bg-amber-50/70 dark:bg-amber-950/20 p-4 rounded-2xl border border-amber-200/80 dark:border-amber-900/40 space-y-2.5 text-xs text-amber-900 dark:text-amber-200">
                        <div className="flex items-center gap-2 font-extrabold text-amber-900 dark:text-amber-200 text-xs uppercase tracking-wider">
                          <Info size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
                          <span>{t('lc.dup.reason_title') || 'Chi tiết lý do & Đối soát trùng khớp mã nguồn:'}</span>
                        </div>

                        <div className="space-y-1.5 pl-6 text-slate-700 dark:text-slate-300">
                          {dupList.map((item, idx) => (
                            <div key={idx} className="flex items-start gap-1.5 leading-relaxed">
                              <span className="text-amber-500 font-bold">•</span>
                              <div>
                                <span className="font-bold text-slate-900 dark:text-slate-100">
                                  {item.studentName} {item.studentCode ? `(${item.studentCode})` : ''}
                                </span>
                                : {item.matchedWithNames.length > 0 ? (
                                  <>
                                    {' '}{t('lc.dup.reason_matches_prefix') || 'Phát hiện mã nguồn trùng khớp'}{' '}
                                    <strong className="text-rose-600 dark:text-rose-400 font-black">{item.topSimilarity}%</strong>{' '}
                                    {t('lc.dup.reason_matches_with') || 'với bài làm của'}{' '}
                                    <span className="font-bold text-slate-900 dark:text-slate-100">
                                      {item.matchedWithNames.join(', ')}
                                    </span>
                                    {item.hasPenalizedMatch && (
                                      <span className="ml-1.5 px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold border border-emerald-300 dark:border-emerald-800">
                                        {t('lc.dup.reason_status_penalized') || 'Đã trừ điểm trước đó'}
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  ` ${t('lc.dup.reason_cluster_member') || 'Phát hiện mã nguồn trùng khớp với các bài nộp trong cùng bài tập.'}`
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="pt-2 border-t border-amber-200/60 dark:border-amber-900/30 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed pl-6">
                          <span className="font-bold text-slate-700 dark:text-slate-300">
                            {t('lc.dup.mechanism_label') || 'Cơ chế xử lý: '}
                          </span>
                          {t('lc.dup.reason_mechanism_note', { count: dupList.length }) || `Khi bấm "Áp dụng trừ điểm ngay", hệ thống chỉ áp dụng mức phạt đối với ${dupList.length} bài nộp vi phạm mới này và bảo lưu kết quả của các bài nộp đã xử lý trước đó để đảm bảo tính công bằng.`}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-start gap-3 text-xs text-slate-500 dark:text-slate-400">
                        <Info size={16} className="text-amber-500 shrink-0 mt-0.5" />
                        <div className="leading-relaxed">
                          <span className="font-bold text-slate-700 dark:text-slate-300">
                            {t('lc.dup.mechanism_label') || 'Cơ chế xử lý: '}
                          </span>
                          {t('lc.dup.mechanism_text') || 'Hệ thống đối soát mã nguồn và chỉ cho phép áp dụng trừ điểm 1 lần duy nhất cho các bài nộp bị trùng lặp để đảm bảo tính công bằng và tránh trừ điểm nhiều lần.'}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            {/* Modal Footer with Penalty Policy Configuration & One-Click Apply */}
            {(() => {
              const pendingCount = duplicateReport
                ? duplicateReport.clusters.reduce((sum, c) => {
                    return sum + c.submissions.filter(s => {
                      const isPen = s.isPenalized ||
                        appliedDuplicateIds.includes(s.submissionId) ||
                        history.find((item: any) => item.id === s.submissionId)?.instructorFeedback?.includes('[Trừ điểm trùng lặp') ||
                        history.find((item: any) => item.id === s.submissionId)?.feedback?.includes('[Trừ điểm trùng lặp') ||
                        history.find((item: any) => item.id === s.submissionId)?.instructorFeedback?.includes('[Plagiarism') ||
                        history.find((item: any) => item.id === s.submissionId)?.feedback?.includes('[Plagiarism');
                      return !isPen;
                    }).length;
                  }, 0)
                : 0;

              return (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-[#0e121a]">
                  {/* Penalty Controls */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap flex items-center gap-1.5">
                        <ShieldAlert size={15} className="text-rose-500" />
                        {t('lc.dup.penalty_label') || 'Mức trừ điểm:'}
                      </span>
                      <select
                        disabled={isApplyingPenalty || pendingCount === 0}
                        value={duplicatePenaltyType}
                        onChange={(e) => setDuplicatePenaltyType(e.target.value as any)}
                        className="text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-3 py-2 cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-rose-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="FLAT_POINTS">{t('lc.dup.opt_flat') || 'Trừ điểm cố định (-X điểm)'}</option>
                        <option value="ZERO_SCORE">{t('lc.dup.opt_zero') || 'Trừ về 0 điểm (Hủy bài)'}</option>
                      </select>

                      {duplicatePenaltyType === 'FLAT_POINTS' && (
                        <div className="relative flex items-center shrink-0">
                          <input
                            type="number"
                            disabled={isApplyingPenalty || pendingCount === 0}
                            step="0.5"
                            min="0"
                            max="10"
                            value={duplicatePenaltyValue}
                            onChange={(e) => setDuplicatePenaltyValue(Number(e.target.value))}
                            className="w-20 pl-2.5 pr-6 py-1.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 text-center shadow-xs focus:outline-none focus:ring-2 focus:ring-rose-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                          <span className="absolute right-2 text-[10px] font-bold text-slate-400 pointer-events-none">
                            đ
                          </span>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowConfirmPenaltyModal(true)}
                      disabled={isApplyingPenalty || pendingCount === 0}
                      className={`
                        px-4 py-2 text-xs font-extrabold rounded-xl transition-all flex items-center gap-1.5 shadow-md
                        ${pendingCount === 0
                          ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-300 dark:border-slate-700 shadow-none'
                          : 'bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-700 hover:to-amber-700 text-white shadow-rose-600/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
                        }
                      `}
                    >
                      {isApplyingPenalty ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          <span>{t('lc.dup.applying') || 'Đang áp dụng...'}</span>
                        </>
                      ) : pendingCount === 0 ? (
                        <>
                          <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                          <span>{t('lc.dup.already_applied') || 'Đã áp dụng trừ điểm (1 lần duy nhất)'}</span>
                        </>
                      ) : (
                        <>
                          <Flame size={14} className="fill-white" />
                          <span>{t('lc.dup.apply_btn_count', { count: pendingCount }) || `Áp dụng trừ điểm ngay (${pendingCount} bài nộp)`}</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Close Button */}
                  <div className="flex items-center justify-end shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowDuplicateModal(false)}
                      className="px-6 py-2 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                    >
                      {t('lc.dup.close') || 'Đóng'}
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>,
        document.body
      )}

      {/* Confirmation Modal: Confirm / Cancel before applying penalty */}
      {showConfirmPenaltyModal && createPortal(
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  {t('lc.dup.confirm_title') || 'Xác nhận áp dụng trừ điểm'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t('lc.dup.confirm_subtitle') || 'Cập nhật điểm công bố và thêm giải thích trong AI Feedback.'}
                </p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                <span className="font-medium text-slate-500 dark:text-slate-400">
                  {t('lc.dup.penalty_label') || 'Mức trừ điểm:'}
                </span>
                <span className="font-extrabold text-rose-600 dark:text-rose-400">
                  {duplicatePenaltyType === 'ZERO_SCORE'
                    ? (t('lc.dup.zero_desc') || 'Hủy bài làm (về 0 điểm)')
                    : (t('lc.dup.flat_desc', { val: duplicatePenaltyValue }) || `Trừ ${duplicatePenaltyValue} điểm`)}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                <span className="font-medium text-slate-500 dark:text-slate-400">
                  {t('lc.dup.confirm_ai_label') || 'Nhận xét từ AI:'}
                </span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {t('lc.dup.confirm_ai_val') || 'Tự động viết lý do bị trừ điểm'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 leading-relaxed">
                {t('lc.dup.confirm_desc') || 'Điểm số sau khi trừ sẽ được áp dụng vào kết quả bài thi để công bố (Publish) cho sinh viên, kèm giải thích chi tiết trong phần nhận xét của AI Mentor.'}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmPenaltyModal(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                {t('lc.dup.cancel') || 'Hủy'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowConfirmPenaltyModal(false);
                  handleApplyDuplicatePenalty();
                }}
                disabled={isApplyingPenalty}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold shadow-md shadow-rose-600/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isApplyingPenalty ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>{t('lc.dup.applying') || 'Đang áp dụng...'}</span>
                  </>
                ) : (
                  <>
                    <Check size={14} />
                    <span>{t('lc.dup.confirm_btn') || 'Đồng ý trừ điểm'}</span>
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





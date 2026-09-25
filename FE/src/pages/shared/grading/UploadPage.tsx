import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import FileUpload from '@/components/modules/grading/FileUpload';
import LiveActivityLog from '@/components/modules/grading/LiveActivityLog';
import { gradingApi as api } from '@/lib/api';
import { ShieldAlert, RefreshCw } from 'lucide-react';

export default function UploadPage() {
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progressData, setProgressData] = useState<{ percent: number, task: string } | null>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const startTimeRef = useRef<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const navigate = useNavigate();

  const [assignmentTitle, setAssignmentTitle] = useState<string>('Automated Assessment');

  const [searchParams] = useSearchParams();
  const assignmentId = searchParams.get('assignmentId') || undefined;

  useEffect(() => {
    if (assignmentId) {
      api.getAssignment(assignmentId)
        .then(res => setAssignmentTitle(res.metadata?.title || 'Automated Assessment'))
        .catch(err => console.error("Failed to fetch assignment details:", err));
    }
  }, [assignmentId]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isUploading) {
      interval = setInterval(() => {
        if (startTimeRef.current) {
          setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isUploading]);



  const handleUpload = async (file: File) => {
    setFileName(file.name);
    setError(null);
    setIsUploading(true);
    startTimeRef.current = null;
    setElapsedSeconds(0);
    setProgressData({ percent: 0, task: 'Uploading project...' });
    
    try {
      const res = await api.submitProject(file, assignmentId);
      const subId = res.submissionId;
      setSubmissionId(subId);
      
      api.subscribeToProgress(
        subId,
        (job) => {
          setProgressData({
            percent: job.progressPercent || 0,
            task: job.currentTask || 'Processing...'
          });

          // Start timer only when actual evaluation begins (progress > 0)
          if (job.progressPercent > 0 && !startTimeRef.current) {
            startTimeRef.current = Date.now();
          }

          if (job.meta) {
            setActivities(prev => [{ id: Date.now().toString() + Math.random(), task: job.currentTask, meta: job.meta }, ...prev]);
          }
        },
        async () => {
          try {
            setProgressData({ percent: 100, task: 'Fetching final report...' });
            const result = await api.getSubmissionResult(subId);
            setIsUploading(false);
            const finalTime = startTimeRef.current ? Math.floor((Date.now() - startTimeRef.current) / 1000) : 0;
            navigate(`/lecturer/grading/result/${result.submissionId}`, { state: { result, gradingTime: finalTime } });
          } catch (err: any) {
            setError(err.response?.data?.error || err.message || "Failed to fetch result");
            setIsUploading(false);
          }
        },
        (err) => {
          setError(err.message || "Progress stream failed");
          setIsUploading(false);
        }
      );
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Failed to submit project");
      setIsUploading(false);
    }
  };

  const handleCancelClick = () => {
      if (!submissionId) return;
      setShowCancelModal(true);
  };

  const confirmCancel = async () => {
      setShowCancelModal(false);
      setIsCancelling(true);
      try {
          await api.cancelSubmission(submissionId!);
          // Optimistic update to reflect immediately on UI
          setError('Cancelled by user');
          setIsUploading(false);
      } catch (err: any) {
          setError(err.response?.data?.error || err.message || "Failed to cancel job");
      } finally {
          setIsCancelling(false);
      }
  };

  return (
    <div className="max-w-6xl mx-auto py-12 px-4">
      {!isUploading && (
        <div className="relative text-center mb-12 animate-fade-in">
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-cyan-500 dark:from-emerald-400 dark:to-cyan-400 mb-4">
            Grade student submission
          </h1>
          <p className="text-xl dark:text-slate-400 text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Upload a student's project file to automatically evaluate it against your defined rubric. The grading engine will analyze the code, execute tests, and generate a comprehensive report.
          </p>
        </div>
      )}

      {error === 'Cancelled by user' ? (
          <div className="flex flex-col items-center justify-center p-10 relative overflow-hidden rounded-2xl border dark:border-slate-800 border-slate-200 bg-white dark:bg-slate-900 mt-6 shadow-xl group animate-fade-in max-w-2xl mx-auto">
             {/* Background glow effects */}
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-amber-500/10 dark:bg-amber-500/5 blur-3xl rounded-full opacity-50 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
             
             {/* Icon container */}
             <div className="relative mb-6">
                 <div className="absolute inset-0 bg-amber-500 blur-xl opacity-20 rounded-full animate-pulse"></div>
                 <div className="relative w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg shadow-amber-500/30 border-4 dark:border-slate-900 border-white transition-transform duration-500 group-hover:scale-110">
                    <ShieldAlert size={32} className="text-white" />
                 </div>
             </div>

             <h3 className="text-2xl dark:text-white text-slate-900 mb-2 font-bold tracking-tight z-10">Grading safely terminated</h3>
             <p className="dark:text-slate-400 text-slate-500 mb-8 text-center max-w-md text-base leading-relaxed z-10">
                 The background AI evaluation process has been aborted and all sandbox resources have been released securely.
             </p>
             <button 
                onClick={() => { setError(null); setProgressData(null); setActivities([]); }} 
                className="flex items-center gap-2 px-6 py-3 bg-slate-900 dark:bg-white dark:text-slate-900 text-white hover:bg-slate-800 dark:hover:bg-slate-100 rounded-xl font-semibold transition-all shadow-md hover:shadow-xl hover:-translate-y-0.5 z-10 text-sm"
             >
                 <RefreshCw size={16} />
                 Start new assessment
             </button>
          </div>
      ) : (
          !isUploading && (
            <FileUpload 
              onUpload={handleUpload} 
              isUploading={isUploading}
              accept=".zip,.pdf,.docx,.doc,.sql,.txt"
            />
          )
      )}

      {isUploading && progressData && (
        <div className="w-full max-w-4xl mx-auto mb-6 animate-fade-in mt-8">
          <div className="flex justify-between items-end mb-2">
            <span className="text-emerald-500 font-mono text-sm tracking-widest uppercase flex items-center gap-2">
              {assignmentTitle}
              <button 
                  onClick={handleCancelClick}
                  disabled={isCancelling || progressData?.percent === 100 || error !== null}
                  className="ml-4 flex items-center gap-1 px-3 py-1 border border-red-500/50 hover:bg-red-50 dark:hover:bg-red-500/10 rounded transition-colors text-red-600 dark:text-red-400 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                  {isCancelling ? 'Cancelling...' : 'Cancel'}
              </button>
            </span>
            <div className="flex flex-col items-end">
              <span className="text-emerald-400 font-mono text-xs opacity-80 mb-1">
                TIME ELAPSED: {Math.floor(elapsedSeconds / 60).toString().padStart(2, '0')}:{(elapsedSeconds % 60).toString().padStart(2, '0')}
              </span>
              <span className="text-emerald-500 font-mono text-lg font-bold shadow-emerald-500/50 drop-shadow-md leading-none">
                {progressData.percent}%
              </span>
            </div>
          </div>
          <div className="w-full bg-slate-900 border border-emerald-900/50 h-3 flex overflow-hidden relative shadow-[0_0_15px_rgba(16,185,129,0.1)]">
            <div 
              className="bg-emerald-500 h-full transition-all duration-300 ease-out relative" 
              style={{ width: `${progressData.percent}%` }}
            >
                <div className="absolute right-0 top-0 bottom-0 w-4 bg-white/50 shadow-[0_0_10px_white]"></div>
            </div>
            
            <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent,transparent_4px,rgba(0,0,0,0.5)_4px,rgba(0,0,0,0.5)_8px)] pointer-events-none"></div>
          </div>
        </div>
      )}

      {isUploading && (
        <div className="animate-fade-in">
          <LiveActivityLog activities={activities} fileName={fileName} assignmentId={assignmentId} />
        </div>
      )}

      {error && error !== 'Cancelled by user' && (
        <div className="mt-8 p-4 dark:bg-red-500/10 bg-red-50 border dark:border-red-500/30 border-red-200 rounded-lg dark:text-red-400 text-red-600 text-center">
          <p className="font-semibold">Upload failed</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
              <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl shadow-2xl max-w-sm w-full mx-4">
                  <h3 className="text-xl font-bold text-white mb-2">Cancel grading?</h3>
                  <p className="text-slate-400 text-sm mb-6">
                      Are you sure you want to abort this evaluation? This action will immediately terminate the AI analysis and cannot be undone.
                  </p>
                  <div className="flex gap-3 justify-end">
                      <button 
                          onClick={() => setShowCancelModal(false)}
                          className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors font-medium text-sm"
                      >
                          No, keep running
                      </button>
                      <button 
                          onClick={confirmCancel}
                          className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white transition-colors font-medium text-sm shadow-lg shadow-red-500/20"
                      >
                          Yes, cancel it
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}




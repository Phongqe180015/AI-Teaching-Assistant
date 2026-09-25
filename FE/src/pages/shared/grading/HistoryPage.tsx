import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { gradingApi as api } from '@/lib/api';
import { Trash2, ArrowLeft, Clock, MoreVertical } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useTranslation } from 'react-i18next';

export default function HistoryPage() {
  const { t } = useTranslation();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(window.location.search);
  const assignmentIdFilter = searchParams.get('assignmentId');

  useEffect(() => {
    loadHistory();
  }, [assignmentIdFilter]);

  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const loadHistory = async () => {
    try {
      const res: any = await api.getHistory(assignmentIdFilter || undefined, 1, 100);
      setHistory(res.history || []);
    } catch (err) {
      console.error("Failed to load history", err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      await api.deleteHistory(deletingId);
      setHistory(prev => prev.filter(x => x.id !== deletingId));
    } catch (err) {
      console.error("Failed to delete history record", err);
    } finally {
      setIsDeleting(false);
      setDeletingId(null);
    }
  };

  const handleView = (id: string) => {
    navigate(`/lecturer/grading/result/${id}`);
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-12 px-4 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-12 px-4 animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-brand-500 transition-colors p-2 -ml-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">
            Grading history
          </h1>
        </div>
      </div>

      {history.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <Clock className="mx-auto h-12 w-12 text-slate-400 mb-4" />
          <h3 className="text-lg font-medium text-slate-900 dark:text-slate-200 mb-2">No history found</h3>
          <p className="text-slate-500 dark:text-slate-400">You haven't graded any assignments yet.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                <th className="py-4 px-6 font-medium text-slate-600 dark:text-slate-400">Assignment / student</th>
                <th className="py-4 px-6 font-medium text-slate-600 dark:text-slate-400">Score</th>
                <th className="py-4 px-6 font-medium text-slate-600 dark:text-slate-400">Date assessed</th>
                <th className="py-4 px-6 font-medium text-slate-600 dark:text-slate-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {history.map((item) => {
                const percentage = item.maxScore > 0 ? (item.score / item.maxScore) * 100 : 0;
                let scoreColor = 'text-red-500';
                if (percentage >= 80) scoreColor = 'text-brand-600 dark:text-brand-400';
                else if (percentage >= 50) scoreColor = 'text-amber-500';

                return (
                  <tr
                    key={item.id}
                    onClick={() => handleView(item.id)}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer"
                  >
                    <td className="py-4 px-6">
                      <div className="font-medium text-slate-900 dark:text-slate-200">{item.title || 'Unknown assignment'}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-500 font-mono mt-1">
                        {item.studentId ? `Student: ${item.studentId}` : `ID: ${item.id.split('-')[0]}...`}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className={`font-bold ${scoreColor}`}>
                        {item.score} / {item.maxScore}
                      </div>
                      <div className="text-xs text-slate-500">{percentage.toFixed(1)}%</div>
                    </td>
                    <td className="py-4 px-6 text-sm text-slate-600 dark:text-slate-400">
                      {new Date(item.assessedAt).toLocaleString()}
                    </td>
                    <td className="py-4 px-6 text-right relative">
                      <div className="flex items-center justify-end">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(openMenuId === item.id ? null : item.id);
                          }}
                          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-300 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        >
                          <MoreVertical size={18} />
                        </button>

                        {openMenuId === item.id && (
                          <div className="absolute right-8 top-10 w-36 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 z-10 overflow-hidden animate-fade-in-up origin-top-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(null);
                                setDeletingId(item.id);
                              }}
                              className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2 transition-colors cursor-pointer"
                            >
                              <Trash2 size={16} />
                              {t('common.delete', 'Delete')}
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Centered Modal Confirm Delete History Record */}
      <ConfirmDialog
        isOpen={!!deletingId}
        title={t('common.confirm_delete', 'Confirm Delete')}
        subtitle={t('common.delete_warning', 'Delete grading history record')}
        message={t('common.delete_history_confirm', 'Are you sure you want to delete this graded assignment history?')}
        confirmText={t('common.delete', 'Delete')}
        cancelText={t('notif.cancel', 'Cancel')}
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          if (!isDeleting) setDeletingId(null);
        }}
      />
    </div>
  );
}





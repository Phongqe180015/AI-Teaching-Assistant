import ProgressRing from './ProgressRing';
import { Clock } from 'lucide-react';

interface ScoreCardProps {
  score: number;
  maxScore: number;
  assessedAt: string;
  gradingTime?: number;
}

export default function ScoreCard({ score, maxScore, assessedAt, gradingTime }: ScoreCardProps) {
  const percent = maxScore > 0 ? (score / maxScore) * 100 : 0;
  
  let feedback = 'Needs Improvement';
  let feedbackColor = 'text-rose-600 dark:text-rose-400';
  if (percent >= 85) {
    feedback = 'Excellent Work!';
    feedbackColor = 'text-slate-800 dark:text-slate-100';
  } else if (percent >= 70) {
    feedback = 'Good Job';
    feedbackColor = 'text-slate-800 dark:text-slate-100';
  } else if (percent >= 50) {
    feedback = 'Passed';
    feedbackColor = 'text-slate-800 dark:text-slate-100';
  }

  const isLowOrZero = score <= 0 || (maxScore > 0 && percent < 50);

  return (
    <div className={`relative border dark:bg-slate-900 rounded-2xl shadow-xl shadow-slate-200/40 dark:shadow-none p-6 md:p-8 flex flex-col md:flex-row items-center gap-8 overflow-hidden transition-all duration-300 ${
      isLowOrZero
        ? 'bg-rose-50/40 border-rose-200 dark:border-rose-900/60 dark:bg-slate-900'
        : 'bg-white border-slate-200 dark:border-slate-800'
    }`}>
      {/* Subtle decorative background for light mode to prevent it from looking empty */}
      <div className={`absolute top-0 right-0 w-[400px] h-[400px] rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none opacity-60 ${
        isLowOrZero
          ? 'bg-gradient-to-br from-rose-100 to-transparent dark:from-rose-950/40'
          : 'bg-gradient-to-br from-brand-50 to-transparent'
      }`}></div>
      
      <div className="shrink-0 relative z-10">
        <ProgressRing score={score} maxScore={maxScore} size={110} strokeWidth={8} />
      </div>
      
      <div className="flex-1 text-center md:text-left relative z-10">
        <h2 className={`text-2xl md:text-3xl font-extrabold mb-2 tracking-tight ${feedbackColor}`}>{feedback}</h2>
        <p className="text-slate-500 dark:text-slate-400 text-base mb-6 font-medium">
          {score <= 0 ? 'Score is zero or negative. Please review your submission feedback.' : 'Your project has been analyzed successfully.'}
        </p>
        
        <div className="flex flex-wrap justify-center md:justify-start gap-3">
          {gradingTime !== undefined && (
            <div className="flex items-center gap-2.5 px-4 py-2.5 bg-brand-50/80 dark:bg-slate-800/50 rounded-xl border border-brand-100/50 dark:border-slate-800/80">
              <div className="p-1.5 bg-brand-100 dark:bg-slate-700 rounded-lg">
                <Clock className="text-brand-600 dark:text-brand-400" size={16} />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[9px] font-extrabold text-brand-500 dark:text-slate-400 uppercase tracking-widest">Evaluation Time</span>
                <span className="text-sm font-bold text-brand-900 dark:text-slate-300 font-mono mt-0.5">
                  {Math.floor(gradingTime / 60).toString().padStart(2, '0')}:{(gradingTime % 60).toString().padStart(2, '0')}
                </span>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2.5 px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800/80">
            <div className="p-1.5 bg-white dark:bg-slate-700 rounded-lg shadow-sm border border-slate-100 dark:border-none">
              <Clock className="text-slate-500 dark:text-slate-400" size={16} />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest">Date Assessed</span>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-300 mt-0.5">
                {new Date(assessedAt).toLocaleString(undefined, {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                })}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

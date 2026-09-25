import classNames from 'classnames';
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

interface StatusBadgeProps {
  passed: boolean;
  isPartial?: boolean;
  className?: string;
}

export default function StatusBadge({ passed, isPartial, className }: StatusBadgeProps) {
  let bgColor = "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/20";
  let Icon = XCircle;
  let text = 'Failed';

  if (passed) {
    bgColor = "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20";
    Icon = CheckCircle2;
    text = 'Passed';
  } else if (isPartial) {
    bgColor = "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20";
    Icon = AlertTriangle;
    text = 'Partial';
  }

  return (
    <div
      className={classNames(
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider",
        bgColor,
        className
      )}
    >
      <Icon size={14} />
      {text}
    </div>
  );
}

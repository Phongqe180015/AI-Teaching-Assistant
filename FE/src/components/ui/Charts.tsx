import { useTranslation } from 'react-i18next';

export interface DonutChartProps {
  value: number;
  max: number;
  label?: string;
  color?: string;
  size?: number;
  className?: string;
}

export function DonutChart({
  value,
  max,
  label = '',
  color = '#4f46e5',
  size = 180,
  className = '',
}: DonutChartProps) {
  const safeMax = max > 0 ? max : 1;
  const percentage = Math.min(100, Math.max(0, Math.round((value / safeMax) * 100)));

  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className={`relative flex flex-col items-center justify-center ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90 transition-all duration-500 drop-shadow-sm"
      >
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-slate-100 dark:text-slate-800"
          fill="transparent"
        />

        {/* Value ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          className="transition-all duration-700 ease-out"
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
          {percentage}%
        </span>
        <span className="text-xs font-semibold text-slate-400 mt-0.5">
          {value} / {max} {label}
        </span>
      </div>
    </div>
  );
}

export interface BarChartItem {
  label: string;
  value: number;
  color?: string;
}

export interface BarChartProps {
  data: BarChartItem[];
  height?: number;
  className?: string;
}

export function BarChart({ data, height = 200, className = '' }: BarChartProps) {
  const { t } = useTranslation();
  if (!data || data.length === 0) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center text-slate-400 text-sm font-medium"
      >
        {t('ui.no_chart_data')}
      </div>
    );
  }

  // Find max value to normalize height (default min max is 10 for GPA scales)
  const maxVal = Math.max(...data.map((d) => (isNaN(d.value) ? 0 : d.value)), 10);

  return (
    <div className={`w-full flex flex-col justify-end ${className}`}>
      <div style={{ height }} className="w-full flex items-end justify-around gap-3 pt-6 pb-2">
        {data.map((item, idx) => {
          const val = isNaN(item.value) ? 0 : item.value;
          const heightPercent = maxVal > 0 ? (val / maxVal) * 100 : 0;
          const barColor = item.color || '#3b82f6';

          return (
            <div key={idx} className="flex-1 flex flex-col items-center group h-full justify-end">
              {/* Value Label */}
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 opacity-90 group-hover:scale-110 transition-transform">
                {val}
              </span>

              {/* Bar Container */}
              <div className="w-full max-w-[48px] bg-slate-100 dark:bg-slate-800 rounded-t-xl overflow-hidden relative flex items-end flex-1">
                <div
                  style={{
                    height: `${Math.max(heightPercent, 4)}%`,
                    backgroundColor: barColor,
                  }}
                  className="w-full rounded-t-xl transition-all duration-500 group-hover:brightness-110 group-hover:shadow-lg"
                />
              </div>

              {/* Axis Label */}
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-2 truncate max-w-full">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

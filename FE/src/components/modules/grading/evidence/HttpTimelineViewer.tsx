import { useState } from 'react';
import type { HttpStep } from '@/types';
import { Activity, Server, ChevronDown, ChevronUp } from 'lucide-react';
import classNames from 'classnames';

interface HttpTimelineViewerProps {
  steps: HttpStep[];
}

export default function HttpTimelineViewer({ steps }: HttpTimelineViewerProps) {
  if (!steps || steps.length === 0) return null;

  return (
    <div className="bg-slate-900 rounded-lg p-4 border border-slate-700/50 shadow-inner">
      <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-4 pb-2 border-b border-slate-800">
        <Activity size={16} className="text-blue-400" />
        HTTP Probe Timeline
      </h4>
      
      <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-700 before:to-transparent">
        {steps.map((step, idx) => (
          <HttpTimelineItem key={idx} step={step} index={idx + 1} />
        ))}
      </div>
    </div>
  );
}

function HttpTimelineItem({ step, index }: { step: HttpStep; index: number }) {
  const [expanded, setExpanded] = useState(false);
  
  const isSuccess = step.status >= 200 && step.status < 300;
  
  const methodColor = 
    step.method === 'GET' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
    step.method === 'POST' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
    step.method === 'PUT' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
    step.method === 'DELETE' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' :
    'bg-slate-500/20 text-slate-400 border-slate-500/30';

  const statusColor = isSuccess 
    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
    : 'bg-rose-500/20 text-rose-400 border-rose-500/30';

  const hasDetails = step.requestBody || step.responseBody || (step.assertions && step.assertions.length > 0);

  return (
    <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
      {/* Icon */}
      <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-slate-900 bg-slate-800 text-slate-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
        <span className="text-xs font-bold">{index}</span>
      </div>
      
      {/* Card */}
      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-slate-800/60 p-4 rounded border border-slate-700/50 hover:bg-slate-800/80 transition-colors shadow">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className={classNames("px-2 py-0.5 text-[10px] font-bold uppercase rounded border", methodColor)}>
              {step.method}
            </span>
            <span className="font-mono text-xs text-slate-300 truncate max-w-[200px]" title={step.url}>
              {new URL(step.url).pathname}
            </span>
          </div>
          <div className={classNames("px-2 py-0.5 text-xs font-bold rounded border flex items-center gap-1", statusColor)}>
            <Server size={12} />
            {step.status}
          </div>
        </div>

        {hasDetails && (
          <div className="mt-3">
            <button 
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {expanded ? "Hide Details" : "View Details"}
            </button>
            
            {expanded && (
              <div className="mt-3 space-y-3">
                {step.assertions && step.assertions.length > 0 && (
                  <div>
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 block">JSON Assertions</span>
                    <div className="space-y-1">
                      {step.assertions.map((a, i) => (
                        <div key={i} className={classNames("text-[10px] p-2 rounded border", a.passed ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300" : "bg-rose-500/10 border-rose-500/20 text-rose-300")}>
                          <div className="flex items-center gap-1 font-mono">
                            <span>{a.passed ? '✅' : '❌'}</span>
                            <span>{a.assertion}</span>
                          </div>
                          {!a.passed && (
                            <div className="mt-1 pl-4 opacity-80 font-mono">
                              Actual: {JSON.stringify(a.actual)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {step.requestBody && (
                  <div>
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Request Body</span>
                    <pre className="bg-slate-950 p-2 rounded text-[10px] font-mono text-slate-300 overflow-x-auto border border-slate-800">
                      {JSON.stringify(step.requestBody, null, 2)}
                    </pre>
                  </div>
                )}
                {step.responseBody && (
                  <div>
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Response Body</span>
                    <pre className="bg-slate-950 p-2 rounded text-[10px] font-mono text-emerald-400 overflow-x-auto border border-slate-800">
                      {typeof step.responseBody === 'object' 
                        ? JSON.stringify(step.responseBody, null, 2)
                        : step.responseBody}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}





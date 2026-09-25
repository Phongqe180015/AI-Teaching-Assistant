import React from 'react';
import type { IoTestCaseEvidence } from '@/types';
import { Code2, CheckCircle2, XCircle, Clock } from 'lucide-react';

interface Props {
  testCases: IoTestCaseEvidence[];
}

const IoTestCaseViewer: React.FC<Props> = ({ testCases }) => {
  return (
    <div className="mt-4 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-[#151821] font-sans antialiased">
      {/* Header */}
      <div className="bg-slate-50/80 dark:bg-slate-900/50 px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
        <Code2 size={16} className="text-slate-500 dark:text-slate-400" />
        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
          Test Case Execution Results
        </h4>
      </div>
      
      {/* Body */}
      <div className="p-0 overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs uppercase bg-white dark:bg-[#151821] text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th scope="col" className="px-5 py-3 font-semibold w-24">Case ID</th>
              <th scope="col" className="px-5 py-3 font-semibold">Input</th>
              <th scope="col" className="px-5 py-3 font-semibold">Expected Output</th>
              <th scope="col" className="px-5 py-3 font-semibold">Actual Output</th>
              <th scope="col" className="px-5 py-3 font-semibold text-center w-32">Result</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {testCases.map((tc, idx) => (
              <tr key={tc.caseId || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group bg-white dark:bg-[#151821]">
                <td className="px-5 py-4 font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap align-top">
                  {tc.caseId}
                </td>
                
                <td className="px-5 py-4 align-top">
                  <div className="font-mono text-[13px] whitespace-pre-wrap text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-md p-2.5 max-h-40 overflow-y-auto custom-scrollbar">
                    {tc.input}
                  </div>
                </td>
                
                <td className="px-5 py-4 align-top">
                  <div className="font-mono text-[13px] whitespace-pre-wrap text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/50 rounded-md p-2.5 max-h-40 overflow-y-auto custom-scrollbar">
                    {tc.expected}
                  </div>
                </td>
                
                <td className="px-5 py-4 align-top">
                  <div className={`font-mono text-[13px] whitespace-pre-wrap max-h-40 overflow-y-auto custom-scrollbar rounded-md p-2.5 border ${
                    tc.passed 
                      ? 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-400' 
                      : 'bg-rose-50/50 dark:bg-rose-900/10 border-rose-100 dark:border-rose-800/50 text-rose-700 dark:text-rose-400'
                  }`}>
                    {tc.actual || <span className="italic opacity-50 text-slate-500">(Empty)</span>}
                  </div>
                </td>
                
                <td className="px-5 py-4 text-center align-top">
                  <div className="flex justify-center mt-1">
                    {tc.passed ? (
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-semibold text-xs border border-emerald-200 dark:border-emerald-800/50">
                        <CheckCircle2 size={14} /> Passed
                      </div>
                    ) : tc.timedOut ? (
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 font-semibold text-xs border border-amber-200 dark:border-amber-800/50">
                        <Clock size={14} /> Timeout
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 font-semibold text-xs border border-rose-200 dark:border-rose-800/50">
                        <XCircle size={14} /> Failed
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb {
          background-color: #94a3b8;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #334155;
        }
        .dark .custom-scrollbar:hover::-webkit-scrollbar-thumb {
          background-color: #475569;
        }
      `}} />
    </div>
  );
};

export default IoTestCaseViewer;

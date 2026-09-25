import { useState } from 'react';
import { CheckCircle2, XCircle, Database, Table, Layers, FileCode2, Maximize2, Minimize2 } from 'lucide-react';
import classNames from 'classnames';

interface SqlTestCase {
  caseId: string;
  title: string;
  passed: boolean;
  diffSummary?: string;
  actualColumns?: string[];
  actualRows?: string[][];
  expectedColumns?: string[];
  expectedRows?: string[][];
  errorMessage?: string;
  points?: number;
  earnedPoints?: number;
}

interface Props {
  testCases: SqlTestCase[];
}

export default function SqlTestCaseViewer({ testCases }: Props) {
  const [expandedCases, setExpandedCases] = useState<Record<string, boolean>>({});

  if (!testCases || testCases.length === 0) return null;

  const toggleExpand = (caseId: string) => {
    setExpandedCases(prev => ({ ...prev, [caseId]: !prev[caseId] }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-200">
          <Database size={17} className="text-emerald-500" />
          <span>SQL Execution Evidence (Sandbox Execution Evidence)</span>
        </h4>
        <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          {testCases.filter(c => c.passed).length}/{testCases.length} Test Cases Passed
        </span>
      </div>

      <div className="space-y-4">
        {testCases.map((tc, idx) => {
          const caseKey = tc.caseId || `tc-${idx}`;
          const isExpanded = !!expandedCases[caseKey];
          const hasOutputTables = tc.expectedColumns && tc.expectedColumns.length > 0;
          const totalExpectedRows = tc.expectedRows?.length || 0;
          const totalActualRows = tc.actualRows?.length || 0;

          return (
            <div
              key={caseKey}
              className={classNames(
                "rounded-xl border transition-all shadow-sm overflow-hidden",
                tc.passed
                  ? "bg-white dark:bg-slate-900/90 border-emerald-500/30 dark:border-emerald-500/20"
                  : "bg-white dark:bg-slate-900/90 border-rose-500/30 dark:border-rose-500/20"
              )}
            >
              {/* Card Header */}
              <div className={classNames(
                "p-3.5 border-b flex items-start justify-between gap-3",
                tc.passed
                  ? "bg-emerald-500/5 border-emerald-500/15"
                  : "bg-rose-500/5 border-rose-500/15"
              )}>
                <div className="flex items-start gap-2.5">
                  {tc.passed ? (
                    <CheckCircle2 size={18} className="text-emerald-500 dark:text-emerald-400 mt-0.5 shrink-0" />
                  ) : (
                    <XCircle size={18} className="text-rose-500 dark:text-rose-400 mt-0.5 shrink-0" />
                  )}
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h5 className={classNames(
                        "text-sm font-bold",
                        tc.passed ? "text-emerald-800 dark:text-emerald-300" : "text-rose-800 dark:text-rose-300"
                      )}>
                        {tc.title}
                      </h5>
                      <span className={classNames(
                        "text-[10px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider",
                        tc.passed
                          ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                          : "bg-rose-500/20 text-rose-700 dark:text-rose-300"
                      )}>
                        {tc.passed ? 'PASSED' : 'FAILED'}
                      </span>
                    </div>

                    {tc.diffSummary && (
                      <p className="text-xs text-slate-700 dark:text-slate-300 font-sans mt-1.5 whitespace-pre-wrap leading-relaxed">
                        {tc.diffSummary}
                      </p>
                    )}

                    {tc.errorMessage && (
                      <div className="mt-2 p-2 bg-rose-500/10 border border-rose-500/20 rounded-lg">
                        <p className="text-xs text-rose-600 dark:text-rose-300 font-mono break-words">
                          {tc.errorMessage}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {hasOutputTables && totalExpectedRows > 8 && (
                  <button
                    onClick={() => toggleExpand(caseKey)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 transition-colors shrink-0 cursor-pointer"
                  >
                    {isExpanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                    <span>{isExpanded ? 'Collapse' : `View all ${totalExpectedRows} rows`}</span>
                  </button>
                )}
              </div>

              {/* Output Comparison Tables */}
              {hasOutputTables && (
                <div className="p-4 space-y-3 bg-slate-50/50 dark:bg-slate-950/40">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-semibold flex items-center gap-1">
                      <Table size={14} className="text-emerald-500" />
                      Actual query result comparison:
                    </span>
                    <span className="font-mono text-[11px] bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300">
                      {totalExpectedRows} Rows × {tc.expectedColumns?.length || 0} Columns (Full display)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Expected Output Table */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <h6 className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                          <Layers size={13} className="text-blue-500" />
                          Expected Result (Reference Answer)
                        </h6>
                        <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
                          {totalExpectedRows} rows
                        </span>
                      </div>
                      <div className={classNames(
                        "overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-inner",
                        !isExpanded && totalExpectedRows > 12 ? "max-h-80 overflow-y-auto" : ""
                      )}>
                        <table className="w-full text-left text-[11px] font-mono whitespace-nowrap">
                          <thead className="bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 sticky top-0 border-b border-slate-200 dark:border-slate-700">
                            <tr>
                              <th className="px-2.5 py-1.5 font-bold w-8 text-slate-400 dark:text-slate-500 border-r border-slate-200 dark:border-slate-700">#</th>
                              {tc.expectedColumns?.map((col, i) => (
                                <th key={i} className="px-2.5 py-1.5 font-bold border-r border-slate-200/60 dark:border-slate-700/60 last:border-r-0">{col}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-800 dark:text-slate-300">
                            {tc.expectedRows && tc.expectedRows.length > 0 ? (
                              tc.expectedRows.map((row, rIdx) => (
                                <tr key={rIdx} className="hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-colors">
                                  <td className="px-2.5 py-1 text-slate-400 dark:text-slate-600 font-bold border-r border-slate-100 dark:border-slate-800 text-[10px]">{rIdx + 1}</td>
                                  {row.map((cell, cIdx) => (
                                    <td key={cIdx} className="px-2.5 py-1 border-r border-slate-100 dark:border-slate-800/40 last:border-r-0">
                                      {cell === 'NULL' || cell === null ? (
                                        <span className="italic text-slate-400 dark:text-slate-500 font-sans">NULL</span>
                                      ) : cell}
                                    </td>
                                  ))}
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={(tc.expectedColumns?.length || 1) + 1} className="px-3 py-3 text-center text-slate-400 italic font-sans">
                                  No data
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Student Actual Output Table */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <h6 className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                          <FileCode2 size={13} className="text-emerald-500" />
                          Student Submission Result
                        </h6>
                        <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                          {totalActualRows} rows
                        </span>
                      </div>
                      <div className={classNames(
                        "overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-inner",
                        !isExpanded && totalActualRows > 12 ? "max-h-80 overflow-y-auto" : ""
                      )}>
                        <table className="w-full text-left text-[11px] font-mono whitespace-nowrap">
                          <thead className="bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 sticky top-0 border-b border-slate-200 dark:border-slate-700">
                            <tr>
                              <th className="px-2.5 py-1.5 font-bold w-8 text-slate-400 dark:text-slate-500 border-r border-slate-200 dark:border-slate-700">#</th>
                              {tc.actualColumns?.map((col, i) => (
                                <th key={i} className="px-2.5 py-1.5 font-bold border-r border-slate-200/60 dark:border-slate-700/60 last:border-r-0">{col}</th>
                              ))}
                              {(!tc.actualColumns || tc.actualColumns.length === 0) && (
                                <th className="px-2.5 py-1.5 font-bold">Result</th>
                              )}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-800 dark:text-slate-300">
                            {tc.actualRows && tc.actualRows.length > 0 ? (
                              tc.actualRows.map((row, rIdx) => (
                                <tr key={rIdx} className="hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-colors">
                                  <td className="px-2.5 py-1 text-slate-400 dark:text-slate-600 font-bold border-r border-slate-100 dark:border-slate-800 text-[10px]">{rIdx + 1}</td>
                                  {row.map((cell, cIdx) => (
                                    <td key={cIdx} className="px-2.5 py-1 border-r border-slate-100 dark:border-slate-800/40 last:border-r-0">
                                      {cell === 'NULL' || cell === null ? (
                                        <span className="italic text-slate-400 dark:text-slate-500 font-sans">NULL</span>
                                      ) : cell}
                                    </td>
                                  ))}
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={(tc.actualColumns?.length || 1) + 1} className="px-3 py-3 text-center text-slate-400 italic font-sans">
                                  No data
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

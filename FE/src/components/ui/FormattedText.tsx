import React from 'react';
import { formatLatexMath } from '@/utils/mathHelper';

interface FormattedTextProps {
  text?: string;
  className?: string;
}

export function FormattedText({ text, className }: FormattedTextProps) {
  if (!text) return null;

  // Pre-process LaTeX math expressions
  let processedText = formatLatexMath(text);

  // If text contains ERD entity definitions like "Departments (...), Employees (...), Dependants (...)", break them into bullet lines
  if (processedText.includes('derived from the ERD') || processedText.includes('ERD:')) {
    processedText = processedText
      .replace(/:\s*([A-Z][a-zA-Z0-9_]+)\s*\(/g, ':\n- **$1** (')
      .replace(/\),\s*([A-Z][a-zA-Z0-9_]+)\s*\(/g, ')\n- **$1** (')
      .replace(/\),\s*and\s+([A-Z][a-zA-Z0-9_]+)\s*\(/g, ')\n- **$1** (');
  }

  const rawLines = processedText.split('\n');
  const renderedBlocks: React.ReactNode[] = [];

  // Helper to render inline markdown: `code`, 'bold', **bold**
  const renderInlineParts = (str: string) => {
    const inlineRegex = /(`[^`]+`|'[^']+'|\*\*[^*]+\*\*)/g;
    const parts = str.split(inlineRegex);

    return parts.map((part, pIdx) => {
      if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
        return (
          <code key={pIdx} className="font-mono text-[0.88em] bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded border border-blue-200/60 dark:border-blue-800/60 mx-0.5 font-semibold">
            {part.slice(1, -1)}
          </code>
        );
      }
      if (part.startsWith("'") && part.endsWith("'") && part.length > 2) {
        return (
          <strong key={pIdx} className="font-semibold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">
            {part.slice(1, -1)}
          </strong>
        );
      }
      if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
        return (
          <strong key={pIdx} className="font-bold text-slate-900 dark:text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return <React.Fragment key={pIdx}>{part}</React.Fragment>;
    });
  };

  let lineIdx = 0;
  while (lineIdx < rawLines.length) {
    const rawLine = rawLines[lineIdx];
    const trimmedLine = rawLine.trim();

    // 1. Handle Fenced Code Blocks (```sql ... ```)
    if (trimmedLine.startsWith('```')) {
      const lang = trimmedLine.replace(/^```/, '').trim() || 'code';
      const codeLines: string[] = [];
      lineIdx++;
      while (lineIdx < rawLines.length && !rawLines[lineIdx].trim().startsWith('```')) {
        codeLines.push(rawLines[lineIdx]);
        lineIdx++;
      }
      if (lineIdx < rawLines.length && rawLines[lineIdx].trim().startsWith('```')) {
        lineIdx++;
      }
      renderedBlocks.push(
        <div key={`code-block-${lineIdx}`} className="my-2.5 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 shadow-sm font-mono text-xs">
          <div className="flex items-center justify-between px-3 py-1.5 bg-slate-200/80 dark:bg-slate-800 border-b border-slate-300 dark:border-slate-800 text-[11px] text-slate-700 dark:text-slate-300">
            <span className="text-brand-600 dark:text-emerald-400 font-bold uppercase tracking-wider">{lang}</span>
          </div>
          <pre className="p-3 text-slate-900 dark:text-slate-100 overflow-x-auto whitespace-pre-wrap leading-relaxed bg-slate-50 dark:bg-slate-900/90">{codeLines.join('\n')}</pre>
        </div>
      );
      continue;
    }

    // 2. Handle Markdown Table rendering (| col1 | col2 |)
    if (trimmedLine.startsWith('|') && trimmedLine.endsWith('|')) {
      const tableRows: string[] = [];
      while (lineIdx < rawLines.length && rawLines[lineIdx].trim().startsWith('|') && rawLines[lineIdx].trim().endsWith('|')) {
        tableRows.push(rawLines[lineIdx].trim());
        lineIdx++;
      }

      if (tableRows.length >= 2) {
        const parseRowCells = (rowStr: string) =>
          rowStr.split('|').map(c => c.trim()).filter((_, i, arr) => i > 0 && i < arr.length - 1);

        const headerCells = parseRowCells(tableRows[0]);
        const hasDivider = tableRows[1].includes('---');
        const dataRows = (hasDivider ? tableRows.slice(2) : tableRows.slice(1)).map(parseRowCells);

        renderedBlocks.push(
          <div key={`table-block-${lineIdx}`} className="my-2.5 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  {headerCells.map((hCell, hIdx) => (
                    <th key={hIdx} className="px-3 py-1.5 border-r border-slate-200 dark:border-slate-700/60 last:border-r-0">{renderInlineParts(hCell)}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-800 dark:text-slate-300">
                {dataRows.map((dRow, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    {dRow.map((cell, cIdx) => (
                      <td key={cIdx} className="px-3 py-1.5 border-r border-slate-100 dark:border-slate-800/40 last:border-r-0">{renderInlineParts(cell)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }
    }

    // 2. Handle Normal & Bullet Lines
    const isBullet = trimmedLine.startsWith('* ') || trimmedLine.startsWith('- ');
    const lineContent = isBullet ? trimmedLine.replace(/^\s*[*|-]\s+/, '') : trimmedLine;

    // Check if line is a Section or Entity Header (e.g. "Departments:", "Employees:", "Dependants:", "Rules:", "Entity Attributes:")
    const cleanContent = lineContent.replace(/\*\*/g, '').trim();
    const isHeader = (cleanContent.endsWith(':') && cleanContent.length < 50) || /^([A-Z][a-zA-Z0-9_\s]+):$/.test(cleanContent);



    if (isHeader) {
      renderedBlocks.push(
        <div key={`header-${lineIdx}`} className="font-bold text-sm text-slate-900 dark:text-white mt-3.5 mb-1.5 flex items-center gap-2 border-l-2 border-brand-500 pl-2">
          {renderInlineParts(lineContent)}
        </div>
      );
    } else if (isBullet) {
      // Check if bullet represents an ERD entity table definition e.g. **Departments** (cols...)
      const isEntityCard = /^\*\*([A-Z][a-zA-Z0-9_]+)\*\*\s*\((.+)\)/.test(lineContent);

      if (isEntityCard) {
        const match = lineContent.match(/^\*\*([A-Z][a-zA-Z0-9_]+)\*\*\s*\((.+)\)/);
        if (match) {
          const tableName = match[1];
          const schemaDetails = match[2];

          renderedBlocks.push(
            <div key={`entity-${lineIdx}`} className="my-1.5 p-2.5 bg-white dark:bg-slate-900/80 rounded-lg border border-blue-200/80 dark:border-blue-900/40 shadow-sm flex items-start gap-2.5">
              <span className="px-2 py-0.5 bg-blue-600 text-white font-mono text-xs font-bold rounded shrink-0 mt-0.5">
                {tableName}
              </span>
              <div className="text-xs text-slate-700 dark:text-slate-300 font-mono leading-relaxed flex-1">
                {renderInlineParts(schemaDetails)}
              </div>
            </div>
          );
          lineIdx++;
          continue;
        }
      }

      renderedBlocks.push(
        <div key={`bullet-${lineIdx}`} className="flex items-start gap-2 mt-1 leading-relaxed ml-3.5">
          <span className="text-slate-400 dark:text-slate-500 font-mono text-xs font-bold shrink-0 mt-0.5">–</span>
          <div className="flex-1 min-w-0 break-words text-slate-700 dark:text-slate-300 text-xs font-mono">{renderInlineParts(lineContent)}</div>
        </div>
      );
    } else {
      renderedBlocks.push(
        <div key={`line-${lineIdx}`} className={lineIdx > 0 ? 'mt-1.5 leading-relaxed text-slate-700 dark:text-slate-300' : 'leading-relaxed text-slate-700 dark:text-slate-300'}>
          {renderInlineParts(lineContent)}
        </div>
      );
    }

    lineIdx++;
  }

  return <div className={`space-y-1 min-w-0 break-words ${className || ''}`}>{renderedBlocks}</div>;
}

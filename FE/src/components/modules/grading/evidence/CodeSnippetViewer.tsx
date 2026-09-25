import { useEffect, useState } from 'react';
import { codeToHtml } from 'shiki';
import { FileCode, ChevronDown, ChevronUp } from 'lucide-react';

interface CodeSnippetViewerProps {
  codeSnippet: string;
  filePath?: string;
  startLine?: number;
  endLine?: number;
  explanation?: string;
}

export default function CodeSnippetViewer({
  codeSnippet,
  filePath,
  startLine,
  endLine,
  explanation
}: CodeSnippetViewerProps) {
  const [html, setHtml] = useState<string>('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(true);

  // Calculate lines for truncation
  const lines = codeSnippet.split(/\r\n|\r|\n/);
  const totalLines = lines.length;
  const isTruncated = totalLines > 30;
  
  const displayCode = isExpanded || !isTruncated 
    ? codeSnippet 
    : lines.slice(0, 30).join('\n');

  useEffect(() => {
    let mounted = true;
    const highlight = async () => {
      setLoading(true);
      try {
        const highlighted = await codeToHtml(displayCode, {
          lang: 'csharp',
          theme: 'github-dark'
        });
        if (mounted) {
          setHtml(highlighted);
        }
      } catch (err) {
        console.error("Failed to highlight code:", err);
        if (mounted) {
          // Fallback if shiki fails
          setHtml(`<pre class="shiki"><code>${displayCode.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };
    
    highlight();
    return () => { mounted = false; };
  }, [displayCode]);

  return (
    <div className="bg-slate-900 rounded-lg overflow-hidden border border-slate-700/50 shadow-inner">
      {/* File Path Header */}
      {filePath && (
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/80 border-b border-slate-700/50 text-xs text-slate-400 font-mono">
          <FileCode size={14} className="text-blue-400" />
          <span className="truncate">{filePath}</span>
          {(startLine !== undefined && endLine !== undefined) && (
            <span className="text-slate-500 ml-auto whitespace-nowrap">
              Lines {startLine}-{endLine}
            </span>
          )}
        </div>
      )}
      
      {/* Code Area */}
      <div className="relative">
        {loading ? (
          <div className="p-4 text-slate-500 text-sm font-mono animate-pulse">Loading code...</div>
        ) : (
          <div 
            className="p-4 overflow-x-auto text-sm"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )}
        
        {/* Show More Overlay for collapsed state */}
        {(isTruncated && !isExpanded) && (
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-slate-900 to-transparent flex items-end justify-center pb-2">
          </div>
        )}
      </div>

      {/* Show More Toggle */}
      {isTruncated && (
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full py-2 bg-slate-800/40 hover:bg-slate-800/60 text-xs text-slate-300 flex items-center justify-center gap-1 border-t border-slate-700/30 transition-colors"
        >
          {isExpanded ? (
            <><ChevronUp size={14} /> Show Less</>
          ) : (
            <><ChevronDown size={14} /> Show all {totalLines} lines</>
          )}
        </button>
      )}

      {/* Explanation Footer */}
      {explanation && (
        <div className="px-4 py-3 bg-slate-800/60 border-t border-slate-700/50">
          <p className="text-sm text-slate-300 font-sans italic">
            <span className="font-semibold text-slate-400 not-italic mr-2">Reasoning:</span>
            {explanation}
          </p>
        </div>
      )}
    </div>
  );
}


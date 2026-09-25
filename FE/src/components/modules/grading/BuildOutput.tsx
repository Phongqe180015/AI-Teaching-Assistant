import { useState } from 'react';
import type { BuildResult } from '@/types';
import { ChevronDown, ChevronUp, Terminal } from 'lucide-react';
import classNames from 'classnames';

interface BuildOutputProps {
  build: BuildResult;
}

export default function BuildOutput({ build }: BuildOutputProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="glass-panel overflow-hidden">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between border-b border-slate-700/50 bg-slate-800/80 hover:bg-slate-700/80 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Terminal size={20} className={build.success ? "text-emerald-400" : "text-red-400"} />
          <h3 className="text-lg font-semibold text-white">Build Log</h3>
        </div>
        {isOpen ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
      </button>
      
      <div 
        className={classNames(
          "bg-[#0d1117] overflow-hidden transition-all duration-300 ease-in-out",
          isOpen ? "max-h-[500px]" : "max-h-0"
        )}
      >
        <div className="p-4 overflow-auto max-h-[500px] text-sm font-mono leading-relaxed text-slate-300 whitespace-pre-wrap">
          {build.output || "No build output available."}
        </div>
      </div>
    </div>
  );
}




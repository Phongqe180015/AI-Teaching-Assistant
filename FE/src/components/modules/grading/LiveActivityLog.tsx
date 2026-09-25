import { ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Activity {
  id: string;
  task: string;
  meta?: any;
}

interface LiveActivityLogProps {
  activities: Activity[];
  fileName?: string;
  assignmentId?: string;
}

export default function LiveActivityLog({ activities, fileName, assignmentId }: LiveActivityLogProps) {
  const [currentScene, setCurrentScene] = useState<Activity | null>(null);

  useEffect(() => {
    if (activities.length > 0) {
        // We only jump the scene if there's actual evidence, or if it's the very first activity.
        const latestWithEvidence = activities.find(a => a.meta?.evidence);
        if (latestWithEvidence) {
            setCurrentScene(latestWithEvidence);
        } else {
            setCurrentScene(activities[0]);
        }
    }
  }, [activities]);

  const activeScene = currentScene || { id: 'init', task: 'CONNECTING TO AI ENGINE...' };
  const evidence = activeScene.meta?.evidence;
  const hasImage = !!evidence?.screenshotBase64;
  const hasSnippets = evidence?.snippets && evidence.snippets.length > 0;

  // Calculate dynamic scroll duration for consistent speed (no looping)
  let scrollDuration = 10;
  
  if (hasSnippets) {
      // Estimate height based on line count (approx 20px per line)
      const totalLines = evidence.snippets.reduce((acc: number, s: any) => acc + (s.codeSnippet?.split('\n').length || 1), 0);
      const estimatedHeight = totalLines * 20;
      
      // Distance is container height (350) + element height
      const distance = 350 + estimatedHeight;
      
      // Speed: 60 pixels per second
      scrollDuration = distance / 60;
  }

  return (
    <div className="w-full max-w-5xl mx-auto mt-4 overflow-hidden relative min-h-[450px] flex items-center justify-center bg-black shadow-2xl shadow-emerald-500/10 border border-slate-800/80 rounded-xl">
      
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-900/10 via-black to-black"></div>
      
      {/* Scene Key forces React to re-mount the DOM node, triggering the CSS animation */}
      <div 
        key={activeScene.id} 
        className="w-full h-full flex flex-col items-center relative z-10 p-6"
        style={{ animation: 'fadeZoom 0.5s ease-out forwards' }}
      >
        <style>{`
          @keyframes fadeZoom {
            0% { opacity: 0; transform: scale(0.98); }
            100% { opacity: 1; transform: scale(1); }
          }
          @keyframes slideUpHacker {
            0% { transform: translateY(350px); }
            100% { transform: translateY(-100%); }
          }
          @keyframes fadeIn {
            0% { opacity: 0; }
            100% { opacity: 1; }
          }
          .mask-fade {
            -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%);
            mask-image: linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%);
          }
        `}</style>

        {/* Dashboard Header */}
        <div className="w-full flex items-center justify-between mb-8 pb-4 border-b border-emerald-900/30">
            <div className="flex flex-col gap-1">
                <span className="text-emerald-500 font-mono text-xs uppercase tracking-widest opacity-60">{assignmentId ? 'Assignment Payload' : 'Target Payload'}</span>
                <span className="text-slate-300 font-mono text-sm">{fileName || 'unknown.zip'}</span>
            </div>
            
            <div className="flex items-center gap-4">
                <div className="flex flex-col items-end gap-1">
                    <span className="text-emerald-500 font-mono text-xs uppercase tracking-widest opacity-60">System Status</span>
                    <span className="text-emerald-400 font-mono text-sm font-bold tracking-widest uppercase">{activeScene.task}</span>
                </div>
                {/* Tech Radar Spinner */}
                <div className="relative flex items-center justify-center w-8 h-8">
                    <div className="absolute inset-0 border-2 border-emerald-500/20 rounded-full"></div>
                    <div className="absolute inset-0 border-t-2 border-emerald-400 rounded-full" style={{ animation: 'spin 1.5s linear infinite' }}></div>
                    <div className="w-2 h-2 bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)]" style={{ animation: 'pulse 1s infinite' }}></div>
                </div>
            </div>
        </div>

        {/* Evidence Stage */}
        <div className="w-full flex justify-center items-center flex-1 overflow-hidden">
            
            {!evidence && (
                <div className="flex flex-col items-center gap-6 text-emerald-500/30 py-12">
                    <ShieldCheck size={64} style={{ animation: 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} />
                    <p className="font-mono text-lg tracking-[0.4em] uppercase">Initializing...</p>
                </div>
            )}

            {evidence && (
              <div className="w-full h-[350px] max-w-4xl flex justify-center items-center relative">
                  
                  {/* Image Scene */}
                  {hasImage && (
                    <div className="relative group p-1 bg-black border border-emerald-900/30 rounded-xl h-full max-h-[350px] overflow-hidden flex items-center justify-center">
                      <div className="absolute inset-0 bg-emerald-500/5 rounded-xl" style={{ animation: 'pulse 2s infinite' }}></div>
                      <img 
                        src={evidence.screenshotBase64} 
                        alt="AI Vision Evidence" 
                        className="relative z-10 w-auto h-full max-h-[350px] object-contain rounded-lg opacity-60"
                      />
                    </div>
                  )}

                  {/* Code Scene (Matrix Scrolling) */}
                  {hasSnippets && (
                    <div className="w-full h-full overflow-hidden mask-fade relative bg-black">
                      
                      {/* FALLBACK LAYER (Appears after code finishes scrolling) */}
                      <div 
                          className="absolute inset-0 flex items-center justify-center z-0 opacity-0"
                          style={{ animation: `fadeIn 0.5s ease-out ${scrollDuration}s forwards` }}
                      >
                          <p className="font-mono text-emerald-500/80 text-sm tracking-[0.2em] uppercase flex items-center gap-3 animate-pulse">
                              <span>[ ■ ]</span> COMPILING AI INSIGHTS...
                          </p>
                      </div>

                      <div className="absolute top-0 inset-x-0 w-full z-10" style={{ animation: `slideUpHacker ${scrollDuration}s linear forwards` }}>
                        <div className="w-full flex flex-col gap-4 pb-4">
                          {evidence.snippets.map((snippet: any, idx: number) => (
                            <pre key={idx} className="!bg-transparent !border-none !p-0 !m-0 text-emerald-400 !text-emerald-400 font-mono text-xs md:text-sm whitespace-pre-wrap leading-relaxed opacity-100 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]">
                              <code className="!text-emerald-400 font-mono">{snippet.codeSnippet}</code>
                            </pre>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

              </div>
            )}
        </div>
      </div>
    </div>
  );
}

import { useNavigate } from 'react-router-dom';
import { Sparkles, Upload } from 'lucide-react';

export default function HubPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-5xl mx-auto py-20 px-4">
      <div className="text-center mb-16">
        <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-cyan-500 dark:from-emerald-400 dark:to-cyan-400 mb-6">
          Welcome to auto code assessment
        </h1>
        <p className="text-xl dark:text-slate-400 text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Select an action below to get started. You can either use AI to generate a brand new grading rubric from a requirements document, or submit a student project for immediate evaluation.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        <button
          onClick={() => navigate('/lecturer/grading/assignments/upload')}
          className="group relative flex flex-col items-center p-12 glass-panel dark:hover:bg-slate-800/80 hover:bg-slate-100 transition-all duration-300 border dark:border-slate-700 border-slate-300 dark:hover:border-amber-500/50 hover:border-amber-400 text-left overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="dark:bg-slate-900/50 bg-amber-50 p-4 rounded-full mb-6 text-amber-500 dark:text-amber-400 group-hover:scale-110 transition-transform">
            <Sparkles size={40} />
          </div>
          <h2 className="text-2xl font-bold dark:text-white text-slate-900 mb-4 text-center">Create assignment (AI)</h2>
          <p className="dark:text-slate-400 text-slate-600 text-center leading-relaxed">
            Upload a PDF or Word document containing your project requirements. Gemini AI will automatically extract the specs and generate a strict grading rubric.
          </p>
        </button>

        <button
          onClick={() => navigate('/lecturer/grading/upload')}
          className="group relative flex flex-col items-center p-12 glass-panel dark:hover:bg-slate-800/80 hover:bg-slate-100 transition-all duration-300 border dark:border-slate-700 border-slate-300 dark:hover:border-emerald-500/50 hover:border-emerald-400 text-left overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="dark:bg-slate-900/50 bg-emerald-50 p-4 rounded-full mb-6 text-emerald-500 dark:text-emerald-400 group-hover:scale-110 transition-transform">
            <Upload size={40} />
          </div>
          <h2 className="text-2xl font-bold dark:text-white text-slate-900 mb-4 text-center">Submit student code</h2>
          <p className="dark:text-slate-400 text-slate-600 text-center leading-relaxed">
            Upload a student's source code (ZIP). The grading engine will build the code, run static analysis, execute runtime tests, and evaluate it against the rubric.
          </p>
        </button>
      </div>
    </div>
  );
}

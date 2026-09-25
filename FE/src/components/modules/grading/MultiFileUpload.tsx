import { useState, useRef, useEffect } from 'react';
import { Upload, Folder, FileType, X, FileBadge, Lock, GripVertical, CheckCircle2, ShieldAlert, Play, Trash2 } from 'lucide-react';
import classNames from 'classnames';

interface MultiFileUploadProps {
  onUpload: (files: File[]) => Promise<void>;
  accept?: string;
  isUploading?: boolean;
}

const DEFAULT_MULTI_ACCEPT = ".zip,.pdf,.docx,.doc,.sql,.txt";

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export default function MultiFileUpload({ onUpload, accept = DEFAULT_MULTI_ACCEPT, isUploading = false }: MultiFileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const filesInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedFiles.length > 0) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    }
  }, [selectedFiles.length]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFiles = (files: FileList | File[]) => {
    const acceptedTypes = accept.split(',').map(t => t.trim().toLowerCase());
    const validFiles: File[] = [];
    
    Array.from(files).forEach(file => {
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      if (acceptedTypes.some(type => fileExtension === type || type === '*/*')) {
        validFiles.push(file);
      }
    });

    if (validFiles.length > 0) {
      setSelectedFiles(prev => {
        const newFiles = [...prev];
        validFiles.forEach(vf => {
          if (!newFiles.find(existing => existing.name === vf.name)) {
            newFiles.push(vf);
          }
        });
        return newFiles;
      });
    } else {
      alert(`No valid files found. Please ensure files match the supported format: ${accept}.`);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
    // reset the input value so the same file can be selected again
    e.target.value = '';
  };

  const handleSubmit = async () => {
    if (selectedFiles.length === 0) return;
    await onUpload(selectedFiles);
  };

  const removeFile = (indexToRemove: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== indexToRemove));
  };

  const removeAllFiles = () => {
    setSelectedFiles([]);
  };

  const totalSizeBytes = selectedFiles.reduce((acc, file) => acc + file.size, 0);

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Main White Card for Upload & List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] p-6 flex flex-col gap-6">
        
        {/* Upload Area */}
        <div 
          className={classNames(
            "relative p-8 sm:p-10 flex flex-col items-center justify-center border border-dashed rounded-xl transition-all duration-300",
            dragActive ? "border-brand-500 bg-brand-50/50 scale-[1.01]" : "border-indigo-300 dark:border-indigo-800 bg-slate-50/80 dark:bg-slate-800/30",
            isUploading && "opacity-50 pointer-events-none"
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center gap-4 text-center z-10 pointer-events-none">
            <div className="relative mb-3 flex items-center justify-center">
               {/* Background cloud-like shape */}
               <div className="absolute w-48 h-32 bg-indigo-50 dark:bg-indigo-500/10 rounded-[50%] blur-2xl"></div>
               
               {/* Floating files */}
               <div className="absolute -top-3 -left-10 w-9 h-11 bg-white border border-slate-100 rounded-lg shadow-sm flex items-center justify-center rotate-[-15deg] animate-bounce" style={{ animationDuration: '3.5s' }}>
                  <FileType size={18} className="text-emerald-500" />
               </div>
               <div className="absolute -top-7 right-0 w-10 h-12 bg-white border border-slate-100 rounded-lg shadow-sm flex items-center justify-center rotate-[10deg] animate-bounce" style={{ animationDuration: '4.5s', animationDelay: '1s' }}>
                  <FileType size={20} className="text-amber-500" />
               </div>
               <div className="absolute top-8 -right-10 w-8 h-10 bg-white border border-slate-100 rounded-lg shadow-sm flex items-center justify-center rotate-[25deg] animate-bounce" style={{ animationDuration: '3.8s', animationDelay: '0.5s' }}>
                  <FileType size={16} className="text-emerald-500" />
               </div>

               {/* Central Folder */}
               <div className="relative z-10 drop-shadow-md">
                  <svg width="100" height="100" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                     <path d="M2 6C2 4.89543 2.89543 4 4 4H9.17157C9.70201 4 10.2107 4.21071 10.5858 4.58579L12.4142 6.41421C12.7893 6.78929 13.298 7 13.8284 7H20C21.1046 7 22 7.89543 22 9V18C22 19.1046 21.1046 20 20 20H4C2.89543 20 2 19.1046 2 18V6Z" fill="#7171ff"/>
                     <circle cx="12" cy="14" r="5" fill="#5858ff"/>
                     <path d="M12 11.5V16.5M12 11.5L10 13.5M12 11.5L14 13.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
               </div>
            </div>
            
            <div className="relative z-10">
              <p className="font-bold text-[22px] dark:text-white text-slate-900 mb-1.5">
                Drag and drop files or a folder here
              </p>
              <p className="text-[15px] text-slate-500">
                You can drop multiple files ({accept.replace(/\./g, ' ')}) at once or an entire folder.
              </p>
            </div>
            
            <div className="flex items-center gap-4 mt-3 pointer-events-auto relative z-10">
              <button 
                  onClick={() => filesInputRef.current?.click()}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#5858ff] hover:bg-[#4b4be5] text-white font-semibold transition-colors shadow-sm text-[15px]"
              >
                  <Upload size={18} />
                    Select files
              </button>
              <button 
                  onClick={() => folderInputRef.current?.click()}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm text-[15px]"
              >
                  <Folder size={18} />
                    Select folder
              </button>
            </div>
            
            <div className="flex items-center gap-1.5 mt-2 text-[13px] text-slate-500 font-medium relative z-10">
              <Lock size={13} className="text-slate-400" />
              <span>Max size: 500MB | Supported: {accept}</span>
            </div>
          </div>

          {/* Hidden Inputs */}
          <input 
            type="file" 
            multiple
            accept={accept}
            onChange={handleChange}
            ref={filesInputRef}
            className="hidden"
          />
          <input 
            type="file" 
            /* @ts-expect-error webkitdirectory is non-standard but widely supported */
            webkitdirectory="" 
            directory=""
            onChange={handleChange}
            ref={folderInputRef}
            className="hidden"
          />
        </div>

        {/* Selected Files List */}
        {selectedFiles.length > 0 && (
          <div className="flex flex-col gap-4 animate-fade-in border-t border-slate-100 dark:border-slate-800 pt-6">
              <div className="flex justify-between items-end pb-2">
                  <div className="flex items-center gap-2">
                      <FileBadge className="text-[#5858ff]" size={20} />
                      <h3 className="text-[16px] font-bold text-slate-900 dark:text-white">
                          Selected files ({selectedFiles.length})
                      </h3>
                  </div>
                  <div className="flex items-center gap-6">
                        <span className="text-[14px] text-slate-500">Total size: {formatFileSize(totalSizeBytes)}</span>
                      <button 
                          onClick={removeAllFiles}
                          disabled={isUploading}
                          className="flex items-center gap-1.5 text-[14px] font-medium text-red-500 hover:text-red-600 transition-colors disabled:opacity-50"
                      >
                          <Trash2 size={16} /> Remove all
                      </button>
                  </div>
              </div>
              
              <div className="max-h-[350px] overflow-y-auto flex flex-col gap-3 pr-2">
                  {selectedFiles.map((file, idx) => (
                      <div key={idx} className="flex justify-between items-center p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-[0_1px_4px_rgba(0,0,0,0.02)] group">
                          <div className="flex items-center gap-4">
                              <GripVertical size={18} className="text-slate-300 cursor-grab" />
                              <div className="w-11 h-11 bg-indigo-50/80 dark:bg-indigo-500/10 rounded-lg flex items-center justify-center border border-indigo-100/50 dark:border-indigo-800">
                                  <FileType className="text-[#5858ff]" size={22} />
                              </div>
                              <div className="flex flex-col">
                                  <span className="text-[15px] font-bold text-slate-900 dark:text-slate-100">{file.name}</span>
                                  <span className="text-[13px] text-slate-500">
                                      {formatFileSize(file.size)} • Added at {new Date().toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit'})}
                                  </span>
                              </div>
                          </div>
                          <div className="flex items-center gap-4 pr-2">
                              <CheckCircle2 size={24} className="text-emerald-500" />
                              <button 
                                  onClick={() => removeFile(idx)}
                                  disabled={isUploading}
                                  className="p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors disabled:opacity-0"
                              >
                                  <X size={20} />
                              </button>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
        )}
      </div>

      {/* Bottom Action Bar */}
      {selectedFiles.length > 0 && !isUploading && (
        <div className="flex flex-col md:flex-row items-center gap-5 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-[0_2px_10px_rgba(0,0,0,0.02)] animate-fade-in">
            <div className="flex-1 bg-[#f8f9fe] dark:bg-indigo-500/10 rounded-xl p-5 flex gap-4 h-full border border-indigo-50/50 dark:border-indigo-500/20">
                <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center shrink-0 shadow-[0_2px_6px_rgba(0,0,0,0.04)] border border-indigo-100 dark:border-indigo-500/20">
                    <ShieldAlert className="text-[#5858ff] dark:text-indigo-400" size={24} />
                </div>
                <div className="flex flex-col justify-center">
                  <p className="text-[15px] font-bold text-indigo-950 dark:text-indigo-200 mb-1">After starting, AI will automatically evaluate all submissions.</p>
                  <p className="text-[14px] text-indigo-800/70 dark:text-indigo-400/80 font-medium">You can track progress on the grading monitor page.</p>
                </div>
            </div>
            <div className="w-full md:w-[350px]">
                <button 
                    onClick={handleSubmit}
                    disabled={isUploading}
                    className="w-full flex flex-col items-center justify-center py-4 bg-[#00a8a8] hover:bg-[#009696] text-white rounded-xl shadow-md transition-all active:scale-[0.98]"
                >
                    <div className="flex items-center gap-2 font-bold text-[17px] mb-1">
                        <Play size={20} fill="currentColor" />
                      Start grading ({selectedFiles.length} files)
                    </div>
                    <span className="text-[13px] opacity-90 font-medium">AI will process in the background; you can leave this page.</span>
                </button>
            </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}


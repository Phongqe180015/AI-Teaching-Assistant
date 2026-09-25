import { useState } from 'react';
import { UploadCloud, FileType } from 'lucide-react';
import classNames from 'classnames';

interface FileUploadProps {
  onUpload: (file: File) => Promise<void>;
  accept?: string;
  errorMessage?: string;
  isUploading?: boolean;
}

const DEFAULT_ACCEPT = ".zip,.pdf,.docx,.doc,.sql,.txt";

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export default function FileUpload({ onUpload, accept = DEFAULT_ACCEPT, errorMessage = "Please upload a valid file", isUploading = false }: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      const acceptedTypes = accept.split(',').map(t => t.trim().toLowerCase());
      
      if (acceptedTypes.some(type => fileExtension === type || type === '*/*')) {
        setSelectedFile(file);
      } else {
        alert(errorMessage);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile) return;
    await onUpload(selectedFile);
  };

  return (
    <div className="w-full max-w-2xl mx-auto mt-4">
      <div 
        className={classNames(
          "relative glass-panel p-8 flex flex-col items-center justify-center border-2 border-dashed transition-all duration-300 rounded-xl",
          dragActive ? "border-emerald-500 bg-emerald-500/10 scale-105" : "dark:border-slate-600 border-slate-300 dark:hover:border-slate-500 hover:border-slate-400",
          isUploading && "opacity-50 pointer-events-none"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input 
          type="file" 
          accept={accept}
          onChange={handleChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        
        {selectedFile ? (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="p-4 bg-emerald-500/20 rounded-full">
              <FileType size={48} className="text-emerald-500 dark:text-emerald-400" />
            </div>
            <div>
              <p className="font-medium text-lg dark:text-white text-slate-900">{selectedFile.name}</p>
              <p className="text-sm dark:text-slate-400 text-slate-500">{formatFileSize(selectedFile.size)}</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="p-4 dark:bg-slate-800 bg-slate-100 rounded-full">
              <UploadCloud size={48} className="dark:text-slate-400 text-slate-500" />
            </div>
            <div>
              <p className="font-medium text-lg dark:text-white text-slate-900">Drag & drop your file ({accept.replace(/\./g, ' ')})</p>
              <p className="text-sm dark:text-slate-400 text-slate-500 mt-1">or click to browse from your computer</p>
            </div>
          </div>
        )}
      </div>

      {selectedFile && !isUploading && (
        <div className="mt-8 flex justify-center">
          <button 
            onClick={handleSubmit}
            disabled={isUploading}
            className="flex items-center gap-2 px-8 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 text-white font-semibold rounded-lg shadow-lg shadow-emerald-500/20 transition-all"
          >
            Submit assessment
          </button>
        </div>
      )}

    </div>
  );
}

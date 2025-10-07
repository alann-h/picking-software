import React, { useRef, DragEvent, ChangeEvent, useState, useEffect } from 'react';
import { getJobProgress } from '../api/products';
import { UploadCloud, Upload, CheckCircle, AlertCircle } from 'lucide-react';
import clsx from 'clsx';
import ExcelInfoComponent from './ExcelInfoComponent';

interface FileUploadProps {
  onFileSelect: (_file: File | null) => void;
  onUpload: () => Promise<{ jobId: string } | undefined>;
  selectedFile: File | null;
  onSuccess?: () => void;
}

type UploadState = 'idle' | 'uploading' | 'processing' | 'success' | 'error';

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, onUpload, selectedFile, onSuccess }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [jobId, setJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const savedJobId = localStorage.getItem('activeJobId');
    if (savedJobId) {
      setJobId(savedJobId);
      setUploadState('processing');
    }
  }, []);

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (uploadState === 'idle') setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (uploadState !== 'idle') return;

    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.csv'))) {
      onFileSelect(file);
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (uploadState !== 'idle') return;
    const file = event.target.files?.[0];
    if (file) {
      // Check file size (1MB = 1 * 1024 * 1024 bytes)
      if (file.size > 1 * 1024 * 1024) {
        setProgressMessage('File size exceeds 1MB limit. Please choose a smaller file.');
        setUploadState('error');
        return;
      }
      
      // Check file type
      if (!file.name.endsWith('.csv')) {
        setProgressMessage('Please select a CSV file.');
        setUploadState('error');
        return;
      }
      
      onFileSelect(file);
    }
  };

  const handleUploadClick = async () => {
    if (!selectedFile) return;

    setUploadState('uploading');
    setProgressMessage('Uploading file...');
    try {
      const result = await onUpload();
      if (result && result.jobId) {
        setJobId(result.jobId);
        localStorage.setItem('activeJobId', result.jobId);
        setUploadState('processing');
      } else {
        throw new Error("Upload did not return a job ID.");
      }
    } catch (error) {
      console.error("Upload failed:", error);
      setUploadState('error');
      setProgressMessage('Failed to start upload process.');
    }
  };

  const resetState = () => {
    setUploadState('idle');
    onFileSelect(null);
    setJobId(null);
    setProgress(0);
    setProgressMessage('');
    localStorage.removeItem('activeJobId');
  };

  useEffect(() => {
    const poll = async (currentJobId: string) => {
      try {
        const result = await getJobProgress(currentJobId) as { state: string; progress: number; error?: string };
        const { state, progress: jobProgress, error } = result;
        
        if (state === 'completed') {
          setUploadState('success');
          setProgress(100);
          setProgressMessage('Processing complete!');
          localStorage.removeItem('activeJobId');
          if (onSuccess) onSuccess();
          return;
        }
        
        if (state === 'failed') {
          setUploadState('error');
          setProgressMessage(error || 'An error occurred during processing.');
          localStorage.removeItem('activeJobId');
          return;
        }

        setProgress(jobProgress || 0);
        setProgressMessage('Processing...');
        pollIntervalRef.current = setTimeout(() => poll(currentJobId), 2000);

      } catch (err) {
        console.error("Polling error:", err);
        setUploadState('error');
        setProgressMessage('Could not fetch progress.');
        localStorage.removeItem('activeJobId');
      }
    };

    if (uploadState === 'processing' && jobId) {
      poll(jobId);
    }

    return () => {
      if (pollIntervalRef.current) {
        clearTimeout(pollIntervalRef.current);
      }
    };
  }, [uploadState, jobId, onSuccess]);

  const renderContent = () => {
    switch (uploadState) {
      case 'uploading':
      case 'processing':
        return (
          <div className="text-center p-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">{progressMessage}</h3>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div className="bg-gradient-to-r from-blue-500 to-blue-700 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
            </div>
            <p className="mt-2 text-lg font-bold text-gray-700">{`${Math.round(progress)}%`}</p>
          </div>
        );
      case 'success':
        return (
          <div className="text-center p-8">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-800 mb-2">Upload and Processing Successful!</h3>
            <button
              onClick={resetState}
              className="mt-4 px-6 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Upload Another File
            </button>
          </div>
        );
      case 'error':
        return (
          <div className="text-center p-8">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-800 mb-2">An Error Occurred</h3>
            <p className="text-gray-600">{progressMessage}</p>
            <button
              onClick={resetState}
              className="mt-4 px-6 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Try Again
            </button>
          </div>
        );
      case 'idle':
      default:
        return (
          <div className="mb-8">
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <h3 className="mb-4 text-xl font-semibold">Upload Product Data</h3>
              <p className="mb-6 text-sm text-gray-600">Maximum file size: 1MB</p>
              
              <button 
                onClick={handleUploadClick} 
                disabled={!selectedFile} 
                className="w-full mb-6 inline-flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-md cursor-pointer hover:bg-green-700 disabled:bg-green-300 disabled:cursor-not-allowed transition-colors"
              >
                <Upload className="w-5 h-5 mr-2" />
                <span>Upload & Process</span>
              </button>
              
              <div 
                className={clsx(
                  "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-300 mb-4",
                  isDragging ? 'border-blue-500 bg-blue-50' : selectedFile ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                )}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  ref={fileInputRef}
                  className="hidden"
                />
                
                {selectedFile ? (
                  <>
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                    <p className="text-sm font-medium text-gray-900 mb-1">{selectedFile.name}</p>
                    <p className="text-xs text-gray-500 mb-2">{(selectedFile.size / 1024).toFixed(2)} KB</p>
                    <p className="text-xs text-gray-600">Click to select a different file</p>
                  </>
                ) : (
                  <>
                    <UploadCloud className="h-12 w-12 text-blue-500 mx-auto mb-3" />
                    <p className="text-gray-600">
                      Drag & drop a CSV file here or <span className="font-semibold text-blue-600">click to select</span>
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      <title>Smart Picker | Upload Data</title>
      
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        {renderContent()}
      </div>

      <ExcelInfoComponent />
    </div>
  );
};

export default FileUpload;
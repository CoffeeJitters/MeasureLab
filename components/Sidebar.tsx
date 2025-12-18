'use client';

import { useState, useEffect } from 'react';
import { UploadedFile } from '@/types';
import { storage } from '@/utils/storage';
import { Upload, X, FileText } from 'lucide-react';

interface SidebarProps {
  files: UploadedFile[];
  activeFileId: string | null;
  onFileAdd: (file: UploadedFile) => void;
  onFileSelect: (fileId: string) => void;
  onFileRemove: (fileId: string) => void;
}

export default function Sidebar({ files, activeFileId, onFileAdd, onFileSelect, onFileRemove }: SidebarProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleFileUpload = async (fileList: FileList | null) => {
    if (!fileList) return;

    for (const file of Array.from(fileList)) {
      const fileType = file.type === 'application/pdf' ? 'pdf' : 'image';
      const url = URL.createObjectURL(file);
      
      const uploadedFile: UploadedFile = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        name: file.name,
        type: fileType,
        file,
        url,
      };

      onFileAdd(uploadedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileUpload(e.dataTransfer.files);
  };

  return (
    <div className="w-64 bg-gradient-to-b from-black/90 via-black/85 to-black/90 border-r border-white/5 flex flex-col h-screen">
      <div className="px-4 py-3 border-b border-white/5">
        <h2 className="text-sm font-medium text-white/80">Drawings</h2>
      </div>

      <div
        className={`flex-1 overflow-y-auto p-4 ${isDragging ? 'bg-white/5' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <label className="block mb-4">
          <div className="border border-dashed border-white/10 p-6 text-center cursor-pointer hover:border-white/20 hover:bg-white/3 transition-colors rounded">
            <Upload className="mx-auto h-6 w-6 text-white/50 mb-2" strokeWidth={1.5} />
            <span className="text-xs text-white/70">Click to upload or drag files</span>
            <span className="text-[10px] text-white/40 block mt-1">PDF, PNG, JPG</span>
          </div>
          <input
            type="file"
            multiple
            accept=".pdf,.png,.jpg,.jpeg"
            className="hidden"
            onChange={(e) => handleFileUpload(e.target.files)}
          />
        </label>

        <div className="space-y-1.5">
          {files.map((file) => (
            <div
              key={file.id}
              className={`px-3 py-2 border rounded cursor-pointer transition-all duration-75 ${
                activeFileId === file.id
                  ? 'bg-white/5 border-white/10'
                  : 'bg-white/3 border-white/5 hover:border-white/10 hover:bg-white/5'
              }`}
              onClick={() => onFileSelect(file.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-white/50 flex-shrink-0" strokeWidth={1.5} />
                    <p className="text-xs font-medium text-white/80 truncate">{file.name}</p>
                  </div>
                  <p className="text-[10px] text-white/40 mt-0.5">{file.type.toUpperCase()}</p>
                  {file.pageCount && (
                    <p className="text-[10px] text-white/40">{file.pageCount} page{file.pageCount !== 1 ? 's' : ''}</p>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onFileRemove(file.id);
                  }}
                  className="ml-2 text-white/30 hover:text-white/60 transition-colors"
                  title="Remove file"
                >
                  <X className="w-3.5 h-3.5" strokeWidth={1.5} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {files.length === 0 && (
          <div className="text-center text-white/40 text-xs mt-8">
            No drawings uploaded yet
          </div>
        )}
      </div>
    </div>
  );
}


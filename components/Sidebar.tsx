'use client';

import { useState, useEffect } from 'react';
import { UploadedFile } from '@/types';
import { storage } from '@/utils/storage';

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
    <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col h-screen">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800">Drawings</h2>
      </div>

      <div
        className={`flex-1 overflow-y-auto p-4 ${isDragging ? 'bg-blue-50' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <label className="block mb-4">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
            <svg className="mx-auto h-8 w-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span className="text-sm text-gray-600">Click to upload or drag files</span>
            <span className="text-xs text-gray-500 block mt-1">PDF, PNG, JPG</span>
          </div>
          <input
            type="file"
            multiple
            accept=".pdf,.png,.jpg,.jpeg"
            className="hidden"
            onChange={(e) => handleFileUpload(e.target.files)}
          />
        </label>

        <div className="space-y-2">
          {files.map((file) => (
            <div
              key={file.id}
              className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                activeFileId === file.id
                  ? 'bg-blue-100 border-blue-400'
                  : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => onFileSelect(file.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{file.name}</p>
                  <p className="text-xs text-gray-500 mt-1">{file.type.toUpperCase()}</p>
                  {file.pageCount && (
                    <p className="text-xs text-gray-500">{file.pageCount} page{file.pageCount !== 1 ? 's' : ''}</p>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onFileRemove(file.id);
                  }}
                  className="ml-2 text-gray-400 hover:text-red-500 transition-colors"
                  title="Remove file"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>

        {files.length === 0 && (
          <div className="text-center text-gray-400 text-sm mt-8">
            No drawings uploaded yet
          </div>
        )}
      </div>
    </div>
  );
}


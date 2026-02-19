'use client';

import { getApiUrl } from '@/lib/config';
import { useRef, useState, useCallback } from 'react';
import { Paperclip, X, Upload, Loader2, FileText, Image as ImageIcon } from 'lucide-react';
import { api } from '@/lib/api';

interface FileAttachmentProps {
  ticketId?: string;
  files: UploadedFile[];
  onChange: (files: UploadedFile[]) => void;
  accept?: string;
  maxFiles?: number;
  compact?: boolean;
}

export interface UploadedFile {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
}

export default function FileAttachment({
  ticketId,
  files,
  onChange,
  accept,
  maxFiles = 10,
  compact = false,
}: FileAttachmentProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const uploadFiles = useCallback(async (fileList: FileList | File[]) => {
    const arr = Array.from(fileList);
    if (files.length + arr.length > maxFiles) {
      alert(`Maximum ${maxFiles} files allowed`);
      return;
    }

    setUploading(true);
    const newFiles: UploadedFile[] = [];

    for (const file of arr) {
      try {
        const params: Record<string, string> = {};
        if (ticketId) params.ticketId = ticketId;
        const result = await api.upload('/files/upload', file, params);
        newFiles.push(result);
      } catch (err) {
        console.error('Upload failed:', err);
      }
    }

    setUploading(false);
    if (newFiles.length > 0) {
      onChange([...files, ...newFiles]);
    }
  }, [files, ticketId, maxFiles, onChange]);

  const removeFile = (fileId: string) => {
    onChange(files.filter(f => f.id !== fileId));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer?.files) uploadFiles(e.dataTransfer.files);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const isImage = (mime: string) => mime.startsWith('image/');
  const apiUrl = getApiUrl();

  return (
    <div className="space-y-2">
      {/* Drop zone */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all
          ${dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40 hover:bg-accent/30'}
          ${compact ? 'py-3' : 'py-6'}`}
      >
        {uploading ? (
          <div className="flex items-center justify-center gap-2 text-sm text-primary">
            <Loader2 size={16} className="animate-spin" /> Uploading...
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5">
            <Upload size={compact ? 16 : 20} className="text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {compact ? 'Click or drop files' : 'Click to upload or drag & drop files here'}
            </p>
            {!compact && (
              <p className="text-xs text-muted-foreground/60">
                Images, PDFs, documents — max {maxFiles} files
              </p>
            )}
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={accept}
        className="hidden"
        onChange={(e) => {
          if (e.target.files) uploadFiles(e.target.files);
          e.target.value = '';
        }}
      />

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-1.5">
          {files.map(file => (
            <div key={file.id} className="flex items-center gap-3 bg-card border border-border rounded-lg p-2.5 group">
              {/* Preview */}
              {isImage(file.mimeType) ? (
                <img
                  src={`${apiUrl}/files/${file.id}`}
                  alt={file.originalName}
                  className="w-10 h-10 rounded-md object-cover shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-md bg-secondary flex items-center justify-center shrink-0">
                  <FileText size={16} className="text-muted-foreground" />
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.originalName}</p>
                <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
              </div>

              {/* Actions */}
              <a
                href={`${apiUrl}/files/${file.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                View
              </a>
              <button
                type="button"
                onClick={() => removeFile(file.id)}
                className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors shrink-0"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

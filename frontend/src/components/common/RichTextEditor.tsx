'use client';
import { getApiUrl } from '@/lib/config';

import { useRef, useState, useCallback, useEffect } from 'react';
import { Bold, Italic, Underline, List, ListOrdered, Link as LinkIcon, Image, Code, Paperclip, X, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  ticketId?: string;
  onFilesChange?: (files: UploadedFile[]) => void;
  showToolbar?: boolean;
  disabled?: boolean;
}

export interface UploadedFile {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Type here...',
  minHeight = '150px',
  ticketId,
  onFilesChange,
  showToolbar = true,
  disabled = false,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const isInternalUpdate = useRef(false);

  // Sync value → editor HTML (only when value changes externally)
  useEffect(() => {
    if (editorRef.current && !isInternalUpdate.current) {
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value;
      }
    }
    isInternalUpdate.current = false;
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      isInternalUpdate.current = true;
      onChange(editorRef.current.innerHTML);
    }
  };

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  };

  const uploadFile = useCallback(async (file: File): Promise<UploadedFile | null> => {
    setUploading(true);
    try {
      const params: Record<string, string> = {};
      if (ticketId) params.ticketId = ticketId;
      const result = await api.upload('/files/upload', file, params);
      return result;
    } catch (err) {
      console.error('Upload failed:', err);
      return null;
    } finally {
      setUploading(false);
    }
  }, [ticketId]);

  const insertImageInEditor = (url: string, name: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();

    const img = document.createElement('img');
    img.src = url;
    img.alt = name;
    img.style.maxWidth = '100%';
    img.style.maxHeight = '400px';
    img.style.borderRadius = '8px';
    img.style.margin = '8px 0';
    img.style.display = 'block';

    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(img);
      range.setStartAfter(img);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      editorRef.current.appendChild(img);
    }
    handleInput();
  };

  const handleFileUpload = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const newUploaded: UploadedFile[] = [];

    for (const file of fileArray) {
      const result = await uploadFile(file);
      if (result) {
        newUploaded.push(result);

        // If it's an image, embed it in the editor
        if (file.type.startsWith('image/')) {
          const apiUrl = getApiUrl();
          insertImageInEditor(`${apiUrl}/files/${result.id}`, result.originalName);
        }
      }
    }

    if (newUploaded.length > 0) {
      const allFiles = [...uploadedFiles, ...newUploaded];
      setUploadedFiles(allFiles);
      onFilesChange?.(allFiles);
    }
  };

  // Handle paste (images from clipboard)
  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const imageItems: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          // Rename with timestamp
          const ext = file.type.split('/')[1] || 'png';
          const renamed = new File([file], `pasted-image-${Date.now()}.${ext}`, { type: file.type });
          imageItems.push(renamed);
        }
      }
    }

    if (imageItems.length > 0) {
      await handleFileUpload(imageItems);
    }
  };

  // Handle drag & drop
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      await handleFileUpload(files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = () => setDragOver(false);

  const removeFile = (fileId: string) => {
    const updated = uploadedFiles.filter(f => f.id !== fileId);
    setUploadedFiles(updated);
    onFilesChange?.(updated);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const isImage = (mime: string) => mime.startsWith('image/');

  return (
    <div className={`border border-border rounded-xl overflow-hidden bg-secondary transition-all ${dragOver ? 'ring-2 ring-primary border-primary' : ''} ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      {/* Toolbar */}
      {showToolbar && (
        <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-border bg-card/50 flex-wrap">
          <button type="button" onClick={() => execCommand('bold')} className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors" title="Bold">
            <Bold size={14} />
          </button>
          <button type="button" onClick={() => execCommand('italic')} className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors" title="Italic">
            <Italic size={14} />
          </button>
          <button type="button" onClick={() => execCommand('underline')} className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors" title="Underline">
            <Underline size={14} />
          </button>
          <div className="w-px h-5 bg-border mx-1" />
          <button type="button" onClick={() => execCommand('insertUnorderedList')} className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors" title="Bullet list">
            <List size={14} />
          </button>
          <button type="button" onClick={() => execCommand('insertOrderedList')} className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors" title="Numbered list">
            <ListOrdered size={14} />
          </button>
          <div className="w-px h-5 bg-border mx-1" />
          <button type="button" onClick={() => {
            const url = prompt('Enter URL:');
            if (url) execCommand('createLink', url);
          }} className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors" title="Insert link">
            <LinkIcon size={14} />
          </button>
          <button type="button" onClick={() => execCommand('formatBlock', 'pre')} className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors" title="Code block">
            <Code size={14} />
          </button>
          <div className="w-px h-5 bg-border mx-1" />
          <button type="button" onClick={() => fileInputRef.current?.click()} className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1" title="Attach file">
            <Paperclip size={14} />
            <span className="text-xs">Attach</span>
          </button>
          <button type="button" onClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = (e) => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (file) handleFileUpload([file]);
            };
            input.click();
          }} className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1" title="Insert image">
            <Image size={14} />
            <span className="text-xs">Image</span>
          </button>

          {uploading && (
            <div className="flex items-center gap-1.5 ml-2 text-xs text-primary">
              <Loader2 size={12} className="animate-spin" /> Uploading...
            </div>
          )}
        </div>
      )}

      {/* Editor area */}
      <div
        ref={editorRef}
        contentEditable={!disabled}
        onInput={handleInput}
        onPaste={handlePaste}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        data-placeholder={placeholder}
        className="px-4 py-3 text-sm outline-none overflow-y-auto prose prose-sm prose-invert max-w-none
          [&:empty]:before:content-[attr(data-placeholder)] [&:empty]:before:text-muted-foreground [&:empty]:before:pointer-events-none
          [&_img]:rounded-lg [&_img]:max-w-full [&_img]:my-2
          [&_pre]:bg-card [&_pre]:p-3 [&_pre]:rounded-lg [&_pre]:text-xs [&_pre]:font-mono
          [&_a]:text-primary [&_a]:underline"
        style={{ minHeight }}
      />

      {/* Hidden file input for general attachments */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) handleFileUpload(e.target.files);
          e.target.value = '';
        }}
      />

      {/* Uploaded files list */}
      {uploadedFiles.length > 0 && (
        <div className="border-t border-border px-3 py-2 space-y-1.5">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Attachments ({uploadedFiles.length})</p>
          <div className="flex flex-wrap gap-2">
            {uploadedFiles.map(file => (
              <div key={file.id} className="group relative flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2 text-xs">
                {isImage(file.mimeType) ? (
                  <img
                    src={`${getApiUrl()}/files/${file.id}`}
                    alt={file.originalName}
                    className="w-8 h-8 rounded object-cover"
                  />
                ) : (
                  <Paperclip size={14} className="text-muted-foreground" />
                )}
                <div className="min-w-0">
                  <p className="truncate max-w-[150px] font-medium">{file.originalName}</p>
                  <p className="text-muted-foreground">{formatFileSize(file.size)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(file.id)}
                  className="ml-1 p-0.5 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Drop zone indicator */}
      {dragOver && (
        <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary rounded-xl flex items-center justify-center z-10 pointer-events-none">
          <div className="text-primary font-medium text-sm">Drop files here</div>
        </div>
      )}
    </div>
  );
}

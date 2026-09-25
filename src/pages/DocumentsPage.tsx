import { useEffect, useState, useCallback, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Upload,
  Trash2,
  Search,
  File,
  Loader2,
  AlertCircle,
  X,
  ShieldCheck,
  ShieldAlert,
  FileCheck2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { GlassCard, Skeleton } from '@/components/ui';
import { useToast } from '@/components/Toast';
import { ToastContainer } from '@/components/Toast';
import { validateFile, generateSecureFilename } from '@/lib/security';
import { logSecurityEvent } from '@/lib/audit';

interface Document {
  id: string;
  original_filename: string;
  file_type: string;
  file_size: number;
  chunk_count: number;
  processing_status: string;
  is_malicious: boolean;
  security_flags: string[];
  storage_path: string;
  created_at: string;
}

export function DocumentsPage() {
  const { user } = useAuth();
  const { toasts, show, dismiss } = useToast();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationResult, setValidationResult] = useState<{ valid: boolean; reason?: string; flags: string[] } | null>(null);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });

    if (error) {
      show('error', 'Failed to load documents.');
    } else {
      setDocuments(data as Document[]);
    }
    setLoading(false);
  }, [user, show]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  function handleFileSelect(file: File) {
    setSelectedFile(file);
    const result = validateFile(file);
    setValidationResult(result);

    if (!result.valid) {
      logSecurityEvent({
        eventType: 'malicious_upload',
        severity: result.flags.includes('path_traversal') || result.flags.includes('blocked_extension') ? 'HIGH' : 'MEDIUM',
        description: `Blocked file upload: ${file.name} — ${result.reason}`,
        metadata: { filename: file.name, flags: result.flags },
        blocked: true,
      });
    }
  }

  async function handleUpload(e: FormEvent) {
    e.preventDefault();
    if (!selectedFile || !validationResult?.valid) return;

    setUploading(true);
    const secureFilename = generateSecureFilename(selectedFile.name);
    const storagePath = `${user!.id}/${secureFilename}`;

    try {
      // Upload to Supabase Storage (private bucket)
      const { error: storageError } = await supabase.storage
        .from('documents')
        .upload(storagePath, selectedFile, { contentType: selectedFile.type });

      if (storageError) {
        show('error', 'Failed to upload file. Please try again.');
        setUploading(false);
        return;
      }

      // Read file content for text files
      let content: string | null = null;
      if (selectedFile.type === 'text/plain' || selectedFile.type === 'text/markdown') {
        content = await selectedFile.text();
      }

      // Insert document record
      const { data: doc, error: dbError } = await supabase
        .from('documents')
        .insert({
          filename: secureFilename,
          original_filename: selectedFile.name,
          file_type: selectedFile.name.substring(selectedFile.name.lastIndexOf('.') + 1).toLowerCase(),
          file_size: selectedFile.size,
          mime_type: selectedFile.type || 'application/octet-stream',
          storage_path: storagePath,
          content,
          processing_status: 'completed',
          chunk_count: content ? Math.ceil(content.length / 500) : 0,
          security_flags: validationResult.flags,
        })
        .select()
        .single();

      if (dbError) {
        show('error', 'Failed to save document record.');
        setUploading(false);
        return;
      }

      // If we have text content, create chunks
      if (content && doc) {
        await createChunks(doc.id, content);
      }

      await logSecurityEvent({
        eventType: 'document_upload',
        severity: 'INFO',
        description: `Document uploaded: ${selectedFile.name}`,
        metadata: { document_id: doc.id, file_type: selectedFile.type, size: selectedFile.size },
      });

      show('success', `Document "${selectedFile.name}" uploaded successfully.`);
      setUploadModalOpen(false);
      setSelectedFile(null);
      setValidationResult(null);
      loadDocuments();
    } catch {
      show('error', 'Something went wrong during upload.');
    }
    setUploading(false);
  }

  async function createChunks(documentId: string, content: string) {
    const chunkSize = 500;
    const overlap = 50;
    const chunks: { document_id: string; chunk_index: number; content: string; token_count: number }[] = [];

    for (let i = 0; i < content.length; i += chunkSize - overlap) {
      const chunkContent = content.slice(i, i + chunkSize);
      if (chunkContent.trim().length === 0) continue;
      chunks.push({
        document_id: documentId,
        chunk_index: chunks.length,
        content: chunkContent,
        token_count: Math.ceil(chunkContent.length / 4),
      });
    }

    if (chunks.length > 0) {
      await supabase.from('document_chunks').insert(chunks);
    }

    // Update document chunk count
    await supabase.from('documents').update({ chunk_count: chunks.length }).eq('id', documentId);
  }

  async function handleDelete(doc: Document) {
    if (!confirm(`Delete "${doc.original_filename}"? This action cannot be undone.`)) return;

    // Delete from storage
    await supabase.storage.from('documents').remove([doc.storage_path]);

    // Delete from database (cascades to chunks)
    const { error } = await supabase.from('documents').delete().eq('id', doc.id);

    if (error) {
      show('error', 'Failed to delete document.');
    } else {
      await logSecurityEvent({
        eventType: 'document_deletion',
        severity: 'INFO',
        description: `Document deleted: ${doc.original_filename}`,
        metadata: { document_id: doc.id },
      });
      show('success', 'Document deleted.');
      loadDocuments();
    }
  }

  const filteredDocs = documents.filter((d) =>
    d.original_filename.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} dismiss={dismiss} />
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-1">My Documents</h1>
          <p className="text-sm text-slate-400">Upload and manage your secure documents.</p>
        </div>
        <button onClick={() => setUploadModalOpen(true)} className="btn-primary inline-flex items-center gap-2">
          <Upload className="w-4 h-4" /> Upload Document
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field pl-10"
          placeholder="Search documents..."
        />
      </div>

      {/* Documents grid */}
      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : filteredDocs.length === 0 ? (
        <GlassCard className="p-16 text-center">
          <FileText className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-300 mb-2">
            {search ? 'No documents found' : 'No documents yet'}
          </h3>
          <p className="text-sm text-slate-500 mb-6">
            {search ? 'Try a different search term.' : 'Upload your first document to get started.'}
          </p>
          {!search && (
            <button onClick={() => setUploadModalOpen(true)} className="btn-primary inline-flex items-center gap-2">
              <Upload className="w-4 h-4" /> Upload Document
            </button>
          )}
        </GlassCard>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map((doc, i) => (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <GlassCard hover className="p-5">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">{doc.original_filename}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {doc.file_type.toUpperCase()} • {formatSize(doc.file_size)}
                    </p>
                  </div>
                  {doc.is_malicious ? (
                    <ShieldAlert className="w-5 h-5 text-red-400 flex-shrink-0" />
                  ) : (
                    <ShieldCheck className="w-5 h-5 text-emerald-400/60 flex-shrink-0" />
                  )}
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Uploaded</span>
                    <span className="text-slate-300">{new Date(doc.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Chunks</span>
                    <span className="text-slate-300">{doc.chunk_count}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Status</span>
                    <span className={`badge ${
                      doc.processing_status === 'completed' ? 'badge-success' :
                      doc.processing_status === 'failed' ? 'badge-high' : 'badge-info'
                    }`}>
                      {doc.processing_status}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(doc)}
                  className="mt-4 w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/5 transition-all"
                >
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      <AnimatePresence>
        {uploadModalOpen && (
          <UploadModal
            onClose={() => { setUploadModalOpen(false); setSelectedFile(null); setValidationResult(null); }}
            onFileSelect={handleFileSelect}
            onClear={() => { setSelectedFile(null); setValidationResult(null); }}
            onUpload={handleUpload}
            uploading={uploading}
            selectedFile={selectedFile}
            validationResult={validationResult}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function UploadModal({
  onClose,
  onFileSelect,
  onClear,
  onUpload,
  uploading,
  selectedFile,
  validationResult,
}: {
  onClose: () => void;
  onFileSelect: (file: File) => void;
  onClear: () => void;
  onUpload: (e: FormEvent) => void;
  uploading: boolean;
  selectedFile: File | null;
  validationResult: { valid: boolean; reason?: string; flags: string[] } | null;
}) {
  const [dragOver, setDragOver] = useState(false);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) onFileSelect(file);
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="glass-card p-6 w-full max-w-md"
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold">Secure Document Upload</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-800/50">
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          <form onSubmit={onUpload} className="space-y-4">
            {/* Drop zone */}
            {!selectedFile ? (
              <label
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`block border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                  dragOver ? 'border-cyan-500/40 bg-cyan-500/5' : 'border-slate-700 hover:border-slate-600'
                }`}
              >
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.txt,.docx"
                  onChange={(e) => e.target.files?.[0] && onFileSelect(e.target.files[0])}
                />
                <Upload className="w-10 h-10 text-slate-500 mx-auto mb-3" />
                <p className="text-sm text-slate-300 mb-1">Click to select or drag a file</p>
                <p className="text-xs text-slate-500">Allowed: PDF, TXT, DOCX • Max 10MB</p>
              </label>
            ) : (
              <div className="space-y-3">
                {/* Selected file info */}
                <div className="flex items-center gap-3 p-4 rounded-lg bg-slate-900/40 border border-slate-800/50">
                  <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                    <File className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">{selectedFile.name}</p>
                    <p className="text-xs text-slate-500">{formatSize(selectedFile.size)} • {selectedFile.type || 'unknown'}</p>
                  </div>
                </div>

                {/* Validation result */}
                {validationResult && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className={`p-3 rounded-lg border text-sm ${
                      validationResult.valid
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                        : 'bg-red-500/10 border-red-500/20 text-red-300'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {validationResult.valid ? (
                        <FileCheck2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      )}
                      <div>
                        <p>{validationResult.valid ? 'File passed security validation.' : validationResult.reason}</p>
                        {validationResult.flags.length > 0 && validationResult.valid && (
                          <p className="text-xs text-slate-400 mt-1">Security checks: {validationResult.flags.join(', ') || 'none'}</p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Security features info */}
                <div className="p-3 rounded-lg bg-slate-900/30 border border-slate-800/30">
                  <p className="text-xs text-slate-400 mb-2">Security checks applied:</p>
                  <ul className="space-y-1 text-xs text-slate-500">
                    <li>• Extension validation (blocks EXE, scripts, archives)</li>
                    <li>• MIME type verification</li>
                    <li>• File size limit (10MB)</li>
                    <li>• Path traversal protection</li>
                    <li>• Random server-side filename</li>
                    <li>• Private storage (not publicly accessible)</li>
                  </ul>
                </div>

                <div className="flex gap-3">
                  <button type="button" onClick={onClear} className="btn-secondary flex-1">
                    Choose Different File
                  </button>
                  {validationResult?.valid && (
                    <button type="submit" disabled={uploading} className="btn-primary flex-1 flex items-center justify-center gap-2">
                      {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Upload Securely'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </form>
        </motion.div>
      </motion.div>
    </>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

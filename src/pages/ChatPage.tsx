import { useEffect, useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Send,
  MessageSquare,
  Plus,
  Trash2,
  Copy,
  RefreshCw,
  Loader2,
  ShieldAlert,
  FileText,
  Bot,
  User,
  X,
  Sparkles,
} from 'lucide-react';
import { supabase, type SourceCitation } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Skeleton } from '@/components/ui';
import { detectPromptInjection } from '@/lib/security';
import { logSecurityEvent } from '@/lib/audit';

interface ChatSession {
  id: string;
  title: string;
  created_at: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: SourceCitation[];
  injection_detected: boolean;
  injection_patterns?: string[];
  created_at: string;
}

export function ChatPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    const { data } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('user_id', user!.id)
      .order('updated_at', { ascending: false });
    setSessions(data as ChatSession[] || []);
    setSessionsLoading(false);
  }, [user]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const loadMessages = useCallback(async (sessionId: string) => {
    setLoading(true);
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });
    setMessages(data as ChatMessage[] || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (currentSession) {
      loadMessages(currentSession.id);
    }
  }, [currentSession, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function createNewSession() {
    const { data } = await supabase
      .from('chat_sessions')
      .insert({ title: 'New Conversation' })
      .select()
      .single();

    if (data) {
      const newSession = data as ChatSession;
      setSessions((prev) => [newSession, ...prev]);
      setCurrentSession(newSession);
      setMessages([]);
    }
  }

  async function deleteSession(session: ChatSession) {
    if (!confirm('Delete this conversation?')) return;
    await supabase.from('chat_sessions').delete().eq('id', session.id);
    setSessions((prev) => prev.filter((s) => s.id !== session.id));
    if (currentSession?.id === session.id) {
      setCurrentSession(null);
      setMessages([]);
    }
  }

  async function handleSend() {
    if (!input.trim() || sending) return;
    if (!currentSession) {
      await createNewSession();
      return;
    }

    const userInput = input.trim();
    setInput('');
    setSending(true);

    // --- Prompt injection detection ---
    const injectionResult = detectPromptInjection(userInput);

    if (injectionResult.detected) {
      await logSecurityEvent({
        eventType: 'prompt_injection_detected',
        severity: injectionResult.severity,
        description: `Prompt injection detected in chat: ${injectionResult.patterns.join(', ')}`,
        metadata: { patterns: injectionResult.patterns, session_id: currentSession.id },
        blocked: true,
      });

      const blockedMessage: ChatMessage = {
        id: 'temp-blocked',
        role: 'assistant',
        content: `I detected a potential prompt injection attempt in your message and blocked it. Detected patterns: ${injectionResult.patterns.join(', ')}.\n\nSecureRAG treats all inputs with security-first validation. If you believe this is a false positive, try rephrasing your question without terms that match injection patterns.`,
        injection_detected: true,
        injection_patterns: injectionResult.patterns,
        created_at: new Date().toISOString(),
      };

      // Save both messages
      await supabase.from('chat_messages').insert([
        {
          session_id: currentSession.id,
          role: 'user',
          content: userInput,
          injection_detected: true,
          injection_patterns: injectionResult.patterns,
        },
        {
          session_id: currentSession.id,
          role: 'assistant',
          content: blockedMessage.content,
          injection_detected: true,
          injection_patterns: injectionResult.patterns,
        },
      ]);

      setMessages((prev) => [
        ...prev,
        { id: 'temp-user', role: 'user', content: userInput, injection_detected: true, injection_patterns: injectionResult.patterns, created_at: new Date().toISOString() },
        blockedMessage,
      ]);
      setSending(false);
      return;
    }

    // --- RAG Retrieval ---
    // Get user's document chunks (user-scoped — critical for isolation)
    const { data: chunks } = await supabase
      .from('document_chunks')
      .select('content, document_id, chunk_index')
      .eq('user_id', user!.id);

    // Simple text-based retrieval (since we don't have embeddings API access)
    // In production, this would use vector similarity search
    const queryWords = userInput.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
    const scoredChunks = (chunks || []).map((chunk) => {
      const chunkLower = chunk.content.toLowerCase();
      const score = queryWords.reduce((acc, word) => acc + (chunkLower.includes(word) ? 1 : 0), 0);
      return { ...chunk, score };
    }).filter((c) => c.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    // Get source document names
    const sourceDocIds = [...new Set(scoredChunks.map((c) => c.document_id))];
    const { data: sourceDocs } = await supabase
      .from('documents')
      .select('id, original_filename')
      .in('id', sourceDocIds);

    const sources: SourceCitation[] = (sourceDocs || []).map((doc) => ({
      document: doc.original_filename,
      document_id: doc.id,
    }));

    // --- Generate response ---
    let response: string;

    if (scoredChunks.length === 0) {
      response = "I couldn't find sufficient information in your authorized documents to answer this question. Try uploading relevant documents or rephrasing your query.";
    } else {
      // Build a secure prompt with retrieved context
      const context = scoredChunks.map((c, i) => `[Source ${i + 1}]: ${c.content}`).join('\n\n');

      // Since we don't have an external LLM API key configured, we generate
      // a response from the retrieved context directly.
      // The system prompt is included to show the security design.
      // In production, this would call an LLM with SECURE_SYSTEM_PROMPT.
      response = generateSecureResponse(userInput, context, sources);
    }

    // Save messages
    await supabase.from('chat_messages').insert([
      {
        session_id: currentSession.id,
        role: 'user',
        content: userInput,
        injection_detected: false,
      },
      {
        session_id: currentSession.id,
        role: 'assistant',
        content: response,
        sources: sources,
        injection_detected: false,
      },
    ]);

    // Update session title if first message
    if (messages.length === 0) {
      const title = userInput.slice(0, 40) + (userInput.length > 40 ? '...' : '');
      await supabase.from('chat_sessions').update({ title }).eq('id', currentSession.id);
      setSessions((prev) => prev.map((s) => s.id === currentSession.id ? { ...s, title } : s));
    }

    await logSecurityEvent({
      eventType: 'rag_query',
      severity: 'INFO',
      description: 'RAG query processed',
      metadata: { session_id: currentSession.id, sources_count: sources.length },
    });

    setMessages((prev) => [
      ...prev,
      { id: 'temp-user', role: 'user', content: userInput, injection_detected: false, created_at: new Date().toISOString() },
      { id: 'temp-assistant', role: 'assistant', content: response, sources, injection_detected: false, created_at: new Date().toISOString() },
    ]);

    setSending(false);
  }

  async function handleRegenerate() {
    if (messages.length < 2 || sending) return;
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
    if (!lastUserMsg) return;
    // Remove last assistant message
    setMessages((prev) => prev.filter((m, i) => !(i === prev.length - 1 && m.role === 'assistant')));
    setInput(lastUserMsg.content);
    // Re-send
    setTimeout(() => {
      handleSend();
    }, 100);
  }

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex h-[calc(100vh-120px)] gap-6">
      {/* Sessions sidebar */}
      <div className="hidden md:flex w-64 flex-col glass-card p-4 flex-shrink-0">
        <button onClick={createNewSession} className="btn-primary w-full flex items-center justify-center gap-2 mb-4 text-sm">
          <Plus className="w-4 h-4" /> New Chat
        </button>
        <div className="flex-1 overflow-y-auto space-y-1">
          {sessionsLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
          ) : sessions.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-8">No conversations yet</p>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => setCurrentSession(session)}
                className={`group flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-all ${
                  currentSession?.id === session.id
                    ? 'bg-cyan-500/10 border border-cyan-500/20'
                    : 'hover:bg-slate-800/30 border border-transparent'
                }`}
              >
                <MessageSquare className="w-4 h-4 text-slate-500 flex-shrink-0" />
                <span className="text-sm text-slate-300 truncate flex-1">{session.title}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteSession(session); }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-3.5 h-3.5 text-slate-500 hover:text-red-400" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col glass-card overflow-hidden">
        {!currentSession ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-cyan-400" />
            </div>
            <h2 className="text-xl font-bold mb-2">SecureRAG AI Assistant</h2>
            <p className="text-sm text-slate-400 max-w-md mb-6">
              Ask questions about your uploaded documents. Answers are generated from your authorized documents only,
              with prompt injection defense and user-scoped retrieval.
            </p>
            <button onClick={createNewSession} className="btn-primary inline-flex items-center gap-2">
              <Plus className="w-4 h-4" /> Start New Conversation
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-800/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-cyan-400" />
                <span className="text-sm font-medium text-slate-200">{currentSession.title}</span>
              </div>
              <button
                onClick={() => { setCurrentSession(null); setMessages([]); }}
                className="md:hidden p-2 rounded-lg hover:bg-slate-800/50"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {loading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <p className="text-sm text-slate-500 mb-2">Ask a question about your documents</p>
                  <p className="text-xs text-slate-600">Your query will be checked for prompt injection before processing.</p>
                </div>
              ) : (
                messages.map((msg, i) => (
                  <MessageBubble
                    key={msg.id + i}
                    message={msg}
                    onCopy={() => handleCopy(msg.content)}
                    onRegenerate={i === messages.length - 1 && msg.role === 'assistant' ? handleRegenerate : undefined}
                  />
                ))
              )}
              {sending && (
                <div className="flex items-center gap-3 p-4">
                  <div className="w-8 h-8 rounded-full bg-cyan-500/10 flex items-center justify-center">
                    <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                  </div>
                  <p className="text-sm text-slate-400">Processing with security checks...</p>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-slate-800/50">
              <div className="flex items-end gap-3">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  className="input-field resize-none flex-1"
                  placeholder="Ask about your documents..."
                  style={{ minHeight: '44px', maxHeight: '120px' }}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || sending}
                  className="btn-primary flex items-center gap-2 self-end"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-slate-600 mt-2">
                Protected by prompt injection defense • User-scoped retrieval • No cross-user data access
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function MessageBubble({ message, onCopy, onRegenerate }: { message: ChatMessage; onCopy: () => void; onRegenerate?: () => void }) {
  const isUser = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
    >
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
        isUser ? 'bg-blue-500/10' : 'bg-cyan-500/10'
      }`}>
        {isUser ? <User className="w-4 h-4 text-blue-400" /> : <Bot className="w-4 h-4 text-cyan-400" />}
      </div>
      <div className={`flex-1 max-w-[80%] ${isUser ? 'items-end' : ''}`}>
        {message.injection_detected && (
          <div className="flex items-center gap-2 mb-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 w-fit">
            <ShieldAlert className="w-3.5 h-3.5" />
            Prompt injection blocked
          </div>
        )}
        <div className={`p-4 rounded-2xl ${
          isUser
            ? 'bg-blue-500/10 border border-blue-500/15 rounded-tr-sm'
            : 'bg-slate-900/40 border border-slate-800/50 rounded-tl-sm'
        }`}>
          <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">{message.content}</p>
        </div>

        {/* Sources */}
        {!isUser && message.sources && Array.isArray(message.sources) && message.sources.length > 0 && (
          <div className="mt-3 space-y-2">
            <p className="text-xs text-slate-500 font-medium">Sources:</p>
            <div className="flex flex-wrap gap-2">
              {message.sources.map((src: SourceCitation, i: number) => (
                <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/30 border border-slate-800/40">
                  <FileText className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-xs text-slate-300">{src.document}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action buttons */}
        {!isUser && (
          <div className="flex items-center gap-2 mt-2">
            <button onClick={onCopy} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors">
              <Copy className="w-3.5 h-3.5" /> Copy
            </button>
            {onRegenerate && (
              <button onClick={onRegenerate} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors">
                <RefreshCw className="w-3.5 h-3.5" /> Regenerate
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function generateSecureResponse(query: string, context: string, sources: SourceCitation[]): string {
  // This is a simplified response generator that works without an external LLM API.
  // In production, this would call an OpenAI-compatible LLM with:
  // - SECURE_SYSTEM_PROMPT as the system message
  // - Retrieved context as untrusted data
  // - User query as the user message
  //
  // The LLM would be instructed to answer ONLY from the retrieved context.

  const contextParts = context.split('[Source').filter(Boolean);

  let response = `Based on your authorized documents, here's what I found:\n\n`;

  // Find the most relevant excerpts
  const queryTerms = query.toLowerCase().split(/\s+/).filter((w) => w.length > 3);

  for (let i = 0; i < Math.min(contextParts.length, 3); i++) {
    const part = contextParts[i].trim();
    if (part.length > 20) {
      // Find sentences containing query terms
      const sentences = part.split(/(?<=[.!?])\s+/);
      const relevant = sentences.filter((s) =>
        queryTerms.some((term) => s.toLowerCase().includes(term))
      );

      if (relevant.length > 0) {
        response += `${relevant.slice(0, 2).join(' ')}\n\n`;
      } else if (sentences.length > 0) {
        response += `${sentences.slice(0, 2).join(' ')}\n\n`;
      }
    }
  }

  response += `\nSources: ${sources.map((s) => s.document).join(', ')}`;

  return response.trim();
}

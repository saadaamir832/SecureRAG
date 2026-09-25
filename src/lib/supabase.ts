import { createClient } from '@supabase/supabase-js';

export interface SourceCitation {
  document: string;
  document_id: string;
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export type Database = {
  profiles: {
    Row: {
      id: string;
      email: string;
      display_name: string | null;
      role: 'user' | 'admin';
      failed_login_count: number;
      locked_until: string | null;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      email: string;
      display_name?: string | null;
      role?: 'user' | 'admin';
      failed_login_count?: number;
      locked_until?: string | null;
    };
    Update: {
      display_name?: string | null;
      role?: 'user' | 'admin';
      failed_login_count?: number;
      locked_until?: string | null;
    };
  };
  documents: {
    Row: {
      id: string;
      user_id: string;
      filename: string;
      original_filename: string;
      file_type: string;
      file_size: number;
      mime_type: string;
      storage_path: string;
      content: string | null;
      chunk_count: number;
      processing_status: 'pending' | 'processing' | 'completed' | 'failed';
      is_malicious: boolean;
      security_flags: string[];
      created_at: string;
      updated_at: string;
    };
    Insert: {
      user_id?: string;
      filename: string;
      original_filename: string;
      file_type: string;
      file_size: number;
      mime_type: string;
      storage_path: string;
      content?: string | null;
      chunk_count?: number;
      processing_status?: 'pending' | 'processing' | 'completed' | 'failed';
      is_malicious?: boolean;
      security_flags?: string[];
    };
    Update: {
      processing_status?: 'pending' | 'processing' | 'completed' | 'failed';
      chunk_count?: number;
      content?: string | null;
      is_malicious?: boolean;
      security_flags?: string[];
    };
  };
  document_chunks: {
    Row: {
      id: string;
      document_id: string;
      user_id: string;
      chunk_index: number;
      content: string;
      embedding: number[] | null;
      token_count: number;
      created_at: string;
    };
    Insert: {
      document_id: string;
      user_id?: string;
      chunk_index: number;
      content: string;
      embedding?: number[] | null;
      token_count?: number;
    };
  };
  chat_sessions: {
    Row: {
      id: string;
      user_id: string;
      title: string;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      user_id?: string;
      title?: string;
    };
    Update: {
      title?: string;
    };
  };
  chat_messages: {
    Row: {
      id: string;
      session_id: string;
      user_id: string;
      role: 'user' | 'assistant';
      content: string;
      sources: SourceCitation[] | null;
      injection_detected: boolean;
      injection_patterns: string[];
      created_at: string;
    };
    Insert: {
      session_id: string;
      user_id?: string;
      role: 'user' | 'assistant';
      content: string;
      sources?: SourceCitation[] | null;
      injection_detected?: boolean;
      injection_patterns?: string[];
    };
  };
  security_events: {
    Row: {
      id: string;
      user_id: string | null;
      event_type: string;
      severity: 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      description: string;
      ip_address: string | null;
      user_agent: string | null;
      metadata: Record<string, unknown>;
      blocked: boolean;
      created_at: string;
    };
    Insert: {
      user_id?: string | null;
      event_type: string;
      severity?: 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      description: string;
      ip_address?: string | null;
      user_agent?: string | null;
      metadata?: Record<string, unknown>;
      blocked?: boolean;
    };
  };
  login_attempts: {
    Row: {
      id: string;
      email: string;
      ip_address: string | null;
      successful: boolean;
      created_at: string;
    };
  };
};

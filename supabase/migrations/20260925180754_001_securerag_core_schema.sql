/*
# SecureRAG Core Schema

## Overview
Creates the core database tables for SecureRAG, a security-focused RAG platform.
All tables have Row Level Security enabled with owner-scoped policies.

## New Tables
1. `profiles` — extends auth.users with role (user/admin), display name
2. `documents` — uploaded documents, owner-scoped, with validation metadata
3. `document_chunks` — text chunks of documents with embeddings (pgvector)
4. `chat_sessions` — RAG chat conversations, owner-scoped
5. `chat_messages` — messages within chat sessions, owner-scoped
6. `security_events` — audit log of security-relevant actions, owner-scoped + admin-visible
7. `login_attempts` — tracks failed logins for rate limiting / lockout

## Security
- RLS enabled on ALL tables
- Owner-scoped policies using auth.uid()
- user_id columns default to auth.uid() so inserts work without explicit owner
- Admin role can read all security_events via policy
- Vector search always filtered by user_id via RLS policies
*/

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- profiles table
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  display_name text,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  failed_login_count int NOT NULL DEFAULT 0,
  locked_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "admin_select_all_profiles" ON profiles;
CREATE POLICY "admin_select_all_profiles" ON profiles FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- ============================================================
-- documents table
-- ============================================================
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  filename text NOT NULL,
  original_filename text NOT NULL,
  file_type text NOT NULL,
  file_size bigint NOT NULL,
  mime_type text NOT NULL,
  storage_path text NOT NULL,
  content text,
  chunk_count int NOT NULL DEFAULT 0,
  processing_status text NOT NULL DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  is_malicious boolean NOT NULL DEFAULT false,
  security_flags text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_documents" ON documents;
CREATE POLICY "select_own_documents" ON documents FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_documents" ON documents;
CREATE POLICY "insert_own_documents" ON documents FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_documents" ON documents;
CREATE POLICY "update_own_documents" ON documents FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_documents" ON documents;
CREATE POLICY "delete_own_documents" ON documents FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at DESC);

-- ============================================================
-- document_chunks table (with vector embeddings)
-- ============================================================
CREATE TABLE IF NOT EXISTS document_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  chunk_index int NOT NULL,
  content text NOT NULL,
  embedding vector(1536),
  token_count int DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_chunks" ON document_chunks;
CREATE POLICY "select_own_chunks" ON document_chunks FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_chunks" ON document_chunks;
CREATE POLICY "insert_own_chunks" ON document_chunks FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_chunks" ON document_chunks;
CREATE POLICY "update_own_chunks" ON document_chunks FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_chunks" ON document_chunks;
CREATE POLICY "delete_own_chunks" ON document_chunks FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_chunks_document_id ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_chunks_user_id ON document_chunks(user_id);

-- ============================================================
-- chat_sessions table
-- ============================================================
CREATE TABLE IF NOT EXISTS chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'New Conversation',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_sessions" ON chat_sessions;
CREATE POLICY "select_own_sessions" ON chat_sessions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_sessions" ON chat_sessions;
CREATE POLICY "insert_own_sessions" ON chat_sessions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_sessions" ON chat_sessions;
CREATE POLICY "update_own_sessions" ON chat_sessions FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_sessions" ON chat_sessions;
CREATE POLICY "delete_own_sessions" ON chat_sessions FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- chat_messages table
-- ============================================================
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  sources jsonb,
  injection_detected boolean NOT NULL DEFAULT false,
  injection_patterns text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_messages" ON chat_messages;
CREATE POLICY "select_own_messages" ON chat_messages FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_messages" ON chat_messages;
CREATE POLICY "insert_own_messages" ON chat_messages FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_messages" ON chat_messages;
CREATE POLICY "update_own_messages" ON chat_messages FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_messages" ON chat_messages;
CREATE POLICY "delete_own_messages" ON chat_messages FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON chat_messages(created_at DESC);

-- ============================================================
-- security_events table (audit log)
-- ============================================================
CREATE TABLE IF NOT EXISTS security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  severity text NOT NULL DEFAULT 'INFO' CHECK (severity IN ('INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  description text NOT NULL,
  ip_address text,
  user_agent text,
  metadata jsonb DEFAULT '{}',
  blocked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_events" ON security_events;
CREATE POLICY "select_own_events" ON security_events FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_events" ON security_events;
CREATE POLICY "insert_own_events" ON security_events FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "admin_select_all_events" ON security_events;
CREATE POLICY "admin_select_all_events" ON security_events FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE INDEX IF NOT EXISTS idx_events_user_id ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON security_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_severity ON security_events(severity);
CREATE INDEX IF NOT EXISTS idx_events_event_type ON security_events(event_type);

-- ============================================================
-- login_attempts table (rate limiting / lockout tracking)
-- ============================================================
CREATE TABLE IF NOT EXISTS login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  ip_address text,
  successful boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_login_attempts" ON login_attempts;
CREATE POLICY "select_own_login_attempts" ON login_attempts FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.email = login_attempts.email)
  );

DROP POLICY IF EXISTS "admin_select_all_login_attempts" ON login_attempts;
CREATE POLICY "admin_select_all_login_attempts" ON login_attempts FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_login_attempts_created_at ON login_attempts(created_at DESC);

-- ============================================================
-- Trigger: auto-create profile on signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- Function: get admin dashboard stats (SECURITY DEFINER)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_users', (SELECT count(*) FROM profiles),
    'total_documents', (SELECT count(*) FROM documents),
    'total_queries', (SELECT count(*) FROM chat_messages WHERE role = 'user'),
    'total_security_events', (SELECT count(*) FROM security_events),
    'blocked_threats', (SELECT count(*) FROM security_events WHERE blocked = true),
    'failed_logins', (SELECT count(*) FROM security_events WHERE event_type = 'failed_login'),
    'injection_attempts', (SELECT count(*) FROM security_events WHERE event_type = 'prompt_injection_detected'),
    'unauthorized_access', (SELECT count(*) FROM security_events WHERE event_type = 'unauthorized_access'),
    'malicious_uploads', (SELECT count(*) FROM security_events WHERE event_type = 'malicious_upload'),
    'rate_limit_violations', (SELECT count(*) FROM security_events WHERE event_type = 'rate_limit_violation')
  ) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

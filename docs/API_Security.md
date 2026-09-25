# API Security

## Overview

SecureRAG's API surface consists of Supabase client-side queries (PostgreSQL via PostgREST), Supabase Auth, and Supabase Storage. All access control is enforced server-side by Row Level Security policies.

## Authentication

### Requirement
All protected endpoints require a valid JWT session token. Unauthenticated requests receive zero rows from RLS-protected tables.

### Implementation
- Supabase Auth manages JWT issuance and refresh
- The `AuthContext` provider maintains session state
- Tokens are automatically included in all Supabase client requests
- `onAuthStateChange` keeps the session synchronized

### Testing
Test 6 in the Testing Lab creates a fresh Supabase client with no session and attempts to read documents — verifies zero rows are returned.

## Authorization

### Row Level Security
Every table has RLS enabled with owner-scoped policies:

```sql
-- Example: documents table
CREATE POLICY "select_own_documents" ON documents FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
```

### Admin Access
Admin policies use an `EXISTS` subquery to verify the admin role:

```sql
CREATE POLICY "admin_select_all_events" ON security_events FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );
```

### IDOR/BOLA Protection
- Document IDs are UUIDs (not enumerable)
- Every query is scoped by `user_id` via RLS
- Client-supplied document IDs are never trusted without RLS verification
- A user cannot read, update, or delete another user's documents

## Input Validation

### Chat Queries
- Prompt injection detection runs before any processing
- Queries matching injection patterns are blocked
- Input is sanitized (XSS tags, javascript: URIs, event handlers stripped)

### File Uploads
- Extension allowlist (PDF, TXT, DOCX)
- Extension blocklist (16 dangerous types)
- MIME type validation
- File size limit (10MB)
- Path traversal detection in filenames
- Double extension detection
- Empty file detection

## Output Security

### Safe Error Messages
- Users see: "Something went wrong. Please try again."
- Never exposed: stack traces, database errors, internal paths, API keys
- Edge functions return generic error messages with CORS headers

### No Secret Exposure
- API keys are never included in client responses
- System prompt is never returned to the client
- Environment variables are server-side only
- The LLM is instructed never to reveal secrets

## CORS

Edge functions include mandatory CORS headers on all responses:

```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};
```

## SQL Injection Protection

- Supabase client uses parameterized queries via PostgREST
- No raw SQL is constructed from user input in the frontend
- The `detectPromptInjection()` function also detects SQL injection patterns in chat queries
- Database RLS policies use `auth.uid()` (not user input) for filtering

## XSS Protection

- React automatically escapes rendered content
- Input sanitization strips `<script>`, `javascript:`, and event handler attributes
- Chat messages are rendered as text (not HTML) via React's default escaping
- Injection detection flags XSS patterns in queries

## Path Traversal Protection

- Filenames are validated for `..`, `/`, `\` sequences
- Server-side filenames are randomly generated UUIDs
- Storage paths are constructed as `{user_id}/{random_filename}`
- Storage RLS policies verify the user ID in the path matches `auth.uid()`

## Rate Limiting

### Current
- Supabase Auth provides server-side brute-force protection
- Failed login attempts are tracked in the `login_attempts` table
- File size limits prevent storage abuse

### Limitation
Application-level rate limiting on API endpoints (e.g., X requests per minute per user) would require edge function middleware. This is noted as a future improvement.

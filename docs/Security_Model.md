# Security Model

## Principles

1. **Defense in Depth** — Multiple independent security layers; failure of one does not compromise the system
2. **Never Trust User Input** — All user-supplied data (queries, files, document IDs) is validated and treated as hostile
3. **Server-Side Enforcement** — Access control is enforced by PostgreSQL RLS, not client-side checks
4. **Least Privilege** — Users can only access their own data; admin role grants additional read access only
5. **Fail Secure** — When in doubt, block and log rather than allow
6. **No Secret Exposure** — API keys, system prompts, and internal configuration are never returned to the client

## Authentication

### Password Storage
- Passwords are hashed using bcrypt via Supabase Auth
- No plaintext passwords are ever stored or logged
- Password minimum length: 8 characters (enforced client-side)

### Session Management
- JWT tokens managed by Supabase Auth
- Sessions persist across reloads (`persistSession: true`)
- Tokens auto-refresh (`autoRefreshToken: true`)
- Secure logout clears session and profile state

### Login Tracking
- Every login attempt (success or failure) is recorded in `login_attempts`
- Failed logins generate a `security_events` entry with MEDIUM severity
- Successful logins generate an INFO event
- `profiles.failed_login_count` tracks consecutive failures

## Authorization (RBAC + Ownership)

### User Role
- Can access only their own documents, chunks, chat sessions, messages, and security events
- Cannot access admin panel (redirected to dashboard)
- Cannot read other users' profiles

### Admin Role
- All user capabilities plus:
- Can read all `profiles` (user list)
- Can read all `security_events` (system-wide audit log)
- Can read all `login_attempts`
- Cannot read other users' documents or chat data (still RLS-scoped)

### Enforcement Mechanism
- Row Level Security policies on every table
- Admin policies use: `EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')`
- Role is stored in `profiles.role` (database-enforced, not client-side)
- No client-side role check gates access — the database rejects unauthorized queries

## Data Isolation

### Document Isolation
- `documents` table: `user_id uuid NOT NULL DEFAULT auth.uid()`
- RLS policy: `auth.uid() = user_id` for SELECT, INSERT, UPDATE, DELETE
- Storage bucket: files stored under `{user_id}/` path
- Storage RLS: `storage.foldername(name)[1] = auth.uid()::text`

### Vector Isolation
- `document_chunks` table: `user_id uuid NOT NULL DEFAULT auth.uid()`
- RLS policy: `auth.uid() = user_id` for all operations
- Retrieval queries always filter by authenticated user
- No global vector search is possible from a client request

### Chat Isolation
- `chat_sessions` and `chat_messages` both have `user_id` with RLS
- Users cannot access other users' conversations

## Prompt Injection Defense

See [Prompt_Injection.md](Prompt_Injection.md) for full details.

### Summary
- 20+ regex patterns covering direct and indirect injection
- Suspicious context detection (authority claims, priority overrides)
- Secure system prompt explicitly treats retrieved documents as untrusted
- Detected injections are blocked, logged, and reported to the user with pattern details

## File Upload Security

| Check | Implementation |
|-------|---------------|
| Extension allowlist | Only `.pdf`, `.txt`, `.docx` accepted |
| Extension blocklist | 16 dangerous extensions blocked (EXE, BAT, SH, PHP, etc.) |
| MIME validation | Checked against allowlist when provided |
| File size limit | 10MB maximum |
| Empty file detection | Zero-byte files rejected |
| Double extension | Flagged as suspicious (e.g., `file.pdf.exe`) |
| Path traversal | `..`, `/`, `\` in filenames rejected |
| Random filename | `crypto.randomUUID()` + timestamp |
| Private storage | Files in private bucket, not publicly accessible |
| Storage RLS | User-scoped storage policies |

## Audit Logging

### Logged Events
| Event Type | Severity | Trigger |
|-----------|----------|---------|
| `successful_login` | INFO | User signs in |
| `failed_login` | MEDIUM | Login attempt fails |
| `logout` | INFO | User signs out |
| `account_created` | INFO | New registration |
| `document_upload` | INFO | Document uploaded |
| `document_deletion` | INFO | Document deleted |
| `rag_query` | INFO | RAG query processed |
| `prompt_injection_detected` | HIGH/CRITICAL | Injection pattern detected |
| `malicious_upload` | MEDIUM/HIGH | Blocked file upload attempt |
| `security_test` | INFO/HIGH | Testing lab test executed |

### Never Logged
- Passwords (any form)
- API keys or secrets
- Full document contents
- JWT tokens
- Internal system paths
- Database connection strings

## Error Handling

- Client errors show friendly messages ("Something went wrong. Please try again.")
- Technical details are logged to console (development) but never shown to users
- No stack traces, internal paths, or database errors are exposed
- Edge function errors return generic messages with proper CORS headers

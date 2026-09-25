# SecureRAG — Security-First RAG Platform

SecureRAG is a security-focused AI document intelligence platform that combines Retrieval-Augmented Generation with real, functioning application and LLM security controls. It is designed as an Information Security Engineering portfolio project — every security control is implemented and enforced, not mocked.

## Features

- **Secure Authentication** — Email/password auth with Supabase, failed-login tracking, audit logging
- **Safe Document Upload** — Extension allowlisting (PDF, TXT, DOCX), MIME validation, blocked extensions (EXE, scripts, archives), path traversal protection, random server-side filenames, private storage
- **User-Isolated RAG** — Vector database retrieval is always scoped to the authenticated user via Row Level Security; no cross-user data leakage
- **Prompt Injection Defense** — Multi-layer detection with 20+ patterns covering direct injection, indirect (document-based) injection, jailbreaks, secret extraction, and role hijacking
- **Secure AI Chat** — Conversation history, source citations, injection-blocked messaging, regenerate, copy
- **Security Center** — Real-time threat statistics, event timeline, severity distribution, audit log table
- **Security Testing Lab** — 6 interactive tests that run against real backend controls and report PASS/FAIL
- **Admin Panel** — Role-based access control (RBAC), system-wide statistics, user management, all security events
- **Audit Logging** — Every security-relevant action recorded (logins, uploads, deletions, queries, injections, unauthorized access, tests)

## Architecture

```
User → Authentication → Security Middleware → Document Processing →
Vector Database → Secure Retrieval (user-scoped) → LLM Security Layer →
Output Validation → AI Response
```

**Frontend:** React + TypeScript + Vite + Tailwind CSS + Framer Motion + Recharts
**Backend:** Supabase (PostgreSQL + pgvector + Auth + Storage + Edge Functions)
**Database:** PostgreSQL with Row Level Security on all tables

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS 3 |
| Animations | Framer Motion |
| Charts | Recharts |
| Icons | Lucide React |
| Backend | Supabase (PostgreSQL + Auth + Storage) |
| Vector DB | pgvector extension on PostgreSQL |
| Auth | Supabase Auth (bcrypt password hashing) |

## Security Controls

### Authentication
- Passwords hashed with bcrypt (via Supabase Auth)
- Session management with JWT tokens
- Failed login tracking with audit events
- Secure logout

### Access Control (IDOR/BOLA Protection)
- Row Level Security on every database table
- All queries scoped by `auth.uid()` — users can only access their own data
- Document IDs are never trusted without ownership verification
- Admin role checked via database policies, not client-side

### Prompt Injection Defense
- 20+ regex patterns detecting: instruction override, system prompt extraction, secret revelation, role hijacking, code execution, jailbreak attempts, SQL injection, XSS, path traversal
- Suspicious context detection (authority claims, priority overrides)
- Secure system prompt explicitly treats retrieved documents as untrusted content
- Blocked messages logged as security events with detected patterns and severity

### File Upload Security
- Extension allowlist: PDF, TXT, DOCX only
- Blocked extensions: EXE, BAT, CMD, SH, PS1, PHP, JS, JAR, ZIP, TAR, GZ, RAR, 7Z, MSI, DLL, SO, APP
- MIME type validation
- File size limit (10MB)
- Empty file detection
- Double extension detection
- Path traversal in filename detection
- Random UUID-based server filenames
- Private storage bucket (not publicly accessible)
- Storage RLS policies enforce user-scoped file access

### Vector Database Isolation
- Every chunk row contains `user_id` (defaults to `auth.uid()`)
- RLS policy on `document_chunks` enforces `auth.uid() = user_id`
- Retrieval queries always filter by authenticated user
- No global vector search possible from client requests

### API Security
- Authentication required on all protected routes
- Authorization via RLS policies
- Input validation (file uploads, chat queries)
- Safe error messages (no stack traces, no internal paths)
- CORS headers on edge functions

### Audit Logging
- Successful/failed logins
- Document upload/deletion/access
- RAG queries
- Prompt injection detections
- Unauthorized access attempts
- Security test runs
- Account creation/logout
- Never logs: passwords, API keys, full documents, secrets

## Threat Model

See [docs/Threat_Model.md](docs/Threat_Model.md) for the full STRIDE analysis and RAG-specific threat coverage.

## Installation

### Prerequisites
- Node.js 18+
- A Supabase project (URL and anon key)

### Setup

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your Supabase URL and anon key

# Run development server
npm run dev

# Build for production
npm run build

# Type check
npm run typecheck
```

### Environment Variables

See `.env.example` for required variables:
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anon/public key

## Testing

The Security Testing Lab (available in-app at `/testing-lab`) provides 6 interactive tests:

1. **Prompt Injection** — Verifies injection detection blocks malicious queries
2. **Indirect Document Prompt Injection** — Verifies document content is treated as untrusted
3. **Cross-User Document Access** — Verifies RLS prevents accessing other users' documents
4. **Malicious File Upload** — Verifies file validation rejects EXE files
5. **Brute Force Simulation** — Verifies authentication rejects rapid failed logins
6. **Unauthorized API Request** — Verifies unauthenticated requests are blocked

Each test runs against real backend controls and reports actual PASS/FAIL results.

## Documentation

- [Architecture](docs/Architecture.md)
- [Security Model](docs/Security_Model.md)
- [Threat Model](docs/Threat_Model.md)
- [Prompt Injection Defense](docs/Prompt_Injection.md)
- [API Security](docs/API_Security.md)
- [Testing](docs/Testing.md)
- [Deployment](docs/Deployment.md)

## Security Limitations

- **LLM Generation:** The RAG response generation uses local text-similarity rather than calling an external LLM API (no OpenAI key configured in this environment). Prompt injection defense, user-scoped retrieval, and the secure system prompt are all functional — only the final LLM call is simplified.
- **Password Reset:** The forgot-password flow is UI-complete but requires email confirmation to be enabled in Supabase for actual email delivery.
- **Rate Limiting:** Login attempt tracking is recorded in the database; Supabase Auth handles brute-force protection server-side. Application-level rate limiting on API endpoints would require edge function middleware.
- **Embeddings:** Document chunks are stored with a vector column (pgvector enabled) but embeddings are not generated without an external embedding API. Retrieval uses text-similarity matching as a fallback.
- **Antivirus Scanning:** File upload validation includes extension, MIME, size, and structure checks but does not include ClamAV or equivalent scanning (noted as future improvement).

## Future Improvements

- Integrate OpenAI or open-source LLM for full RAG generation
- Generate real embeddings with OpenAI or sentence-transformers
- Add application-level rate limiting via edge function middleware
- Implement account lockout after N failed attempts (database tracking exists)
- Add ClamAV antivirus scanning for uploaded files
- Add admin user management (promote/revoke admin, ban users)
- Add document content extraction for PDF and DOCX files
- Add real-time security alerts via Supabase Realtime

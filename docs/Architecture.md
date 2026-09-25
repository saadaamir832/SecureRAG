# Architecture

## Overview

SecureRAG is a single-page application with a Supabase backend. The frontend communicates directly with Supabase (PostgreSQL, Auth, Storage) using the anon key, with Row Level Security enforcing all access control server-side.

## System Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                      │
│                                                          │
│  Landing → Auth → Dashboard → Documents → Chat →        │
│  Security Center → Testing Lab → Admin                  │
│                                                          │
│  Auth Context │ Security Lib │ Audit Lib │ Supabase    │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│                   Supabase Backend                       │
│                                                          │
│  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │  Auth   │  │ PostgreSQL│  │ Storage  │  │ Edge Fn │ │
│  │ (JWT)   │  │ + pgvector│  │ (private)│  │         │ │
│  └─────────┘  └──────────┘  └──────────┘  └─────────┘ │
│                     │                                    │
│              Row Level Security                          │
│              (auth.uid() policies)                       │
└─────────────────────────────────────────────────────────┘
```

## Request Flow

### Document Upload
1. User selects a file in the browser
2. `validateFile()` checks extension, MIME type, size, filename safety (client-side first layer)
3. File is uploaded to private Supabase Storage bucket under `{user_id}/{random_filename}`
4. Storage RLS policy verifies `storage.foldername(name)[1] = auth.uid()`
5. Document record inserted into `documents` table (RLS enforces `user_id = auth.uid()`)
6. Text content is chunked and inserted into `document_chunks` (RLS enforces user isolation)
7. Security event logged

### RAG Query
1. User submits a question in the chat interface
2. `detectPromptInjection()` scans the input for 20+ injection patterns
3. If injection detected: query blocked, security event logged, user notified
4. If clean: retrieve user's document chunks (RLS scopes to `auth.uid()`)
5. Text-similarity scoring against query terms
6. Top chunks used as context
7. Response generated from retrieved context only
8. Source citations attached from matched documents
9. Both messages (user + assistant) saved to `chat_messages`

### Authentication
1. User registers/logs in via Supabase Auth
2. Supabase creates session JWT and sets cookies
3. `AuthContext` listens via `onAuthStateChange`
4. Profile loaded from `profiles` table (auto-created via trigger on `auth.users` insert)
5. All subsequent database queries carry the JWT, and RLS policies enforce ownership

## Database Schema

### Tables

| Table | Purpose | RLS |
|-------|---------|-----|
| `profiles` | Extends auth.users with role, display name, login tracking | Owner-scoped + admin read |
| `documents` | Uploaded document metadata | Owner-scoped |
| `document_chunks` | Text chunks with vector embeddings | Owner-scoped |
| `chat_sessions` | Chat conversations | Owner-scoped |
| `chat_messages` | Messages within sessions | Owner-scoped |
| `security_events` | Audit log | Owner-scoped + admin read all |
| `login_attempts` | Failed/successful login tracking | Owner-scoped + admin read all |

### Key Design Decisions

- **`user_id` defaults to `auth.uid()`**: Client inserts omit `user_id`, and the database default fills it from the authenticated session. This prevents clients from spoofing ownership.
- **Admin role in `profiles`**: Role is stored in the database (not client-side). Admin policies check `EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')`.
- **Auto-profile trigger**: A `AFTER INSERT` trigger on `auth.users` automatically creates the profile row on signup.
- **CASCADE deletes**: Deleting a user cascades to all their data (documents, chunks, sessions, messages, events).
- **pgvector**: The `vector(1536)` column on `document_chunks` is ready for OpenAI embeddings. Retrieval currently uses text-similarity as a fallback.

## Frontend Structure

```
src/
├── App.tsx                    # Router + auth provider
├── main.tsx                   # React entry point
├── index.css                  # Theme, design system, animations
├── lib/
│   ├── supabase.ts            # Supabase client + TypeScript types
│   ├── security.ts            # Prompt injection detection, file validation
│   └── audit.ts               # Security event logging
├── context/
│   └── AuthContext.tsx        # Auth state provider
├── components/
│   ├── CyberBackground.tsx    # Animated particle/grid background
│   ├── DashboardLayout.tsx    # Sidebar + topbar layout for authenticated pages
│   ├── Toast.tsx              # Toast notification system
│   └── ui.tsx                 # Shared UI primitives (GlassCard, Skeleton, etc.)
└── pages/
    ├── LandingPage.tsx        # Marketing landing page
    ├── AuthPages.tsx          # Login, Register, Forgot Password
    ├── DashboardPage.tsx      # Security overview with counters
    ├── DocumentsPage.tsx      # Document management + secure upload
    ├── ChatPage.tsx           # AI chat with RAG + injection defense
    ├── SecurityCenterPage.tsx # Threat monitoring + charts
    ├── TestingLabPage.tsx     # Interactive security tests
    └── AdminPage.tsx          # Admin panel with RBAC
```

## Security Architecture Layers

1. **Authentication Layer** — Supabase Auth with JWT sessions
2. **Authorization Layer** — Row Level Security policies on every table
3. **Input Validation Layer** — Client-side file validation + prompt injection detection
4. **Retrieval Isolation Layer** — User-scoped vector search via RLS
5. **LLM Security Layer** — Secure system prompt treating documents as untrusted
6. **Output Layer** — Safe error messages, no secret exposure
7. **Audit Layer** — All security events recorded to `security_events` table

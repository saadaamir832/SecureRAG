# Deployment

## Prerequisites

- Node.js 18+
- A Supabase project with:
  - Email/password auth enabled
  - `vector` extension enabled
  - Database migrations applied (see Installation below)

## Environment Variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

These are the only required variables. All other configuration (JWT secrets, database credentials) is managed by Supabase.

For an `.env.example` reference:

```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Optional: For edge function LLM integration (future)
# OPENAI_API_KEY=your-openai-key
```

## Database Setup

The schema is applied via Supabase MCP migrations. Two migrations are included:

1. **001_securerag_core_schema** — Creates all 7 tables, RLS policies, triggers, and admin stats function
2. **002_create_documents_bucket** — Creates the private storage bucket and storage RLS policies

These are automatically applied when the project is initialized. To re-apply or verify, use the Supabase MCP tools.

## Building

```bash
# Install dependencies
npm install

# Type check
npm run typecheck

# Production build
npm run build
```

The build output is in `dist/`.

## Deployment Options

### Option 1: Static Hosting
The built `dist/` folder can be deployed to any static hosting service:
- Netlify
- Vercel
- Cloudflare Pages
- AWS S3 + CloudFront

### Option 2: Bolt.new
The project is configured for Bolt.new deployment. The dev server runs automatically.

## Post-Deployment Verification

1. Visit the landing page — verify it loads with animations
2. Register a new account — verify profile is created
3. Log in — verify dashboard loads with security overview
4. Upload a TXT document — verify it appears in the documents list
5. Open AI Chat — ask a question — verify response with sources
6. Try a prompt injection query — verify it is blocked
7. Visit Security Center — verify events are logged
8. Run all tests in the Testing Lab — verify all pass
9. Visit Admin Panel (requires admin role) — verify system statistics

## Creating an Admin User

To grant admin access to a user:

```sql
UPDATE profiles SET role = 'admin' WHERE email = 'admin@example.com';
```

Run this via the Supabase SQL editor or MCP `execute_sql` tool.

## Security Checklist for Production

- [ ] Supabase Auth email confirmation setting configured (currently OFF for development)
- [ ] Storage bucket is private (verified by migration 002)
- [ ] RLS is enabled on all tables (verified by migration 001)
- [ ] No secrets in `.env` are exposed to the client (only `VITE_` prefixed vars are client-safe)
- [ ] HTTPS is enforced by the hosting provider
- [ ] Error messages do not expose internal details
- [ ] Audit logging is active (verify in Security Center)

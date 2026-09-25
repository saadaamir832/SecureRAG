import type { LucideIcon } from 'lucide-react';

export interface SecurityEventRow {
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
}

export interface ProfileRow {
  id: string;
  email: string;
  display_name: string | null;
  role: 'user' | 'admin';
  failed_login_count: number;
  locked_until: string | null;
  created_at: string;
}

export interface AdminStats {
  total_users: number;
  total_documents: number;
  total_queries: number;
  total_security_events: number;
  blocked_threats: number;
  failed_logins: number;
  injection_attempts: number;
  unauthorized_access: number;
  malicious_uploads: number;
  rate_limit_violations: number;
}

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  role: 'user' | 'admin';
  failed_login_count: number;
  locked_until: string | null;
  created_at: string;
}

export type { LucideIcon };

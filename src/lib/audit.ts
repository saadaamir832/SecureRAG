import { supabase } from '@/lib/supabase';

export interface SecurityEventInput {
  eventType: string;
  severity?: 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  metadata?: Record<string, unknown>;
  blocked?: boolean;
}

export async function logSecurityEvent(event: SecurityEventInput): Promise<void> {
  try {
    await supabase.from('security_events').insert({
      event_type: event.eventType,
      severity: event.severity ?? 'INFO',
      description: event.description,
      metadata: event.metadata ?? {},
      blocked: event.blocked ?? false,
    });
  } catch {
    // Silently fail — don't expose errors from logging
  }
}

export async function logLoginAttempt(email: string, successful: boolean): Promise<void> {
  try {
    await supabase.from('login_attempts').insert({
      email,
      successful,
    });
  } catch {
    // Silently fail
  }
}

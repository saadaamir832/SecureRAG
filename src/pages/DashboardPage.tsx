import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  MessageSquare,
  Activity,
  ShieldX,
  ShieldCheck,
  Lock,
  FileLock2,
  ScanSearch,
  Zap,
  TrendingUp,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { GlassCard, Skeleton, StatusDot } from '@/components/ui';
import type { SecurityEventRow } from '@/lib/types';

interface DashboardStats {
  documents: number;
  queries: number;
  securityEvents: number;
  blockedThreats: number;
}

export function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentEvents, setRecentEvents] = useState<SecurityEventRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    const [docRes, queryRes, eventRes, blockedRes, recentRes] = await Promise.all([
      supabase.from('documents').select('id', { count: 'exact', head: true }).eq('user_id', user!.id),
      supabase.from('chat_messages').select('id', { count: 'exact', head: true }).eq('user_id', user!.id).eq('role', 'user'),
      supabase.from('security_events').select('id', { count: 'exact', head: true }).eq('user_id', user!.id),
      supabase.from('security_events').select('id', { count: 'exact', head: true }).eq('user_id', user!.id).eq('blocked', true),
      supabase.from('security_events').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(8),
    ]);

    setStats({
      documents: docRes.count ?? 0,
      queries: queryRes.count ?? 0,
      securityEvents: eventRes.count ?? 0,
      blockedThreats: blockedRes.count ?? 0,
    });
    setRecentEvents(recentRes.data ?? []);
    setLoading(false);
  }

  const securityChecks = [
    { label: 'Authentication', icon: Lock, status: 'active' as const },
    { label: 'Access Control', icon: ShieldCheck, status: 'active' as const },
    { label: 'Prompt Injection Defense', icon: ScanSearch, status: 'active' as const },
    { label: 'File Validation', icon: FileLock2, status: 'active' as const },
    { label: 'Rate Limiting', icon: Zap, status: 'active' as const },
  ];

  const statCards = [
    { label: 'Documents', value: stats?.documents, icon: FileText, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
    { label: 'RAG Queries', value: stats?.queries, icon: MessageSquare, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Security Events', value: stats?.securityEvents, icon: Activity, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { label: 'Blocked Threats', value: stats?.blockedThreats, icon: ShieldX, color: 'text-red-400', bg: 'bg-red-500/10' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Security Overview</h1>
        <p className="text-sm text-slate-400">Monitor your document intelligence security posture.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <GlassCard hover className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center`}>
                  <card.icon className={`w-5 h-5 ${card.color}`} />
                </div>
                <TrendingUp className="w-4 h-4 text-slate-600" />
              </div>
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-2xl font-bold">{(card.value ?? 0).toLocaleString()}</p>
              )}
              <p className="text-sm text-slate-400 mt-1">{card.label}</p>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* Security status + Recent events */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Security Status Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-1"
        >
          <GlassCard className="p-6 h-full">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-sm font-semibold text-slate-300">SYSTEM SECURITY STATUS</h3>
                <div className="flex items-center gap-2 mt-1">
                  <StatusDot status="active" />
                  <span className="text-emerald-400 font-medium text-sm">Protected</span>
                </div>
              </div>
              <ShieldCheck className="w-8 h-8 text-emerald-400/60" />
            </div>

            <div className="space-y-3">
              {securityChecks.map((check) => (
                <div key={check.label} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <check.icon className="w-4 h-4 text-emerald-400" />
                  </div>
                  <span className="text-sm text-slate-300 flex-1">{check.label}</span>
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>

        {/* Recent Security Events */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2"
        >
          <GlassCard className="p-6 h-full">
            <h3 className="text-sm font-semibold text-slate-300 mb-5">Recent Security Events</h3>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : recentEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Activity className="w-10 h-10 text-slate-600 mb-3" />
                <p className="text-sm text-slate-500">No security events yet.</p>
                <p className="text-xs text-slate-600 mt-1">Events will appear here as you use the platform.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[320px] overflow-y-auto">
                {recentEvents.map((event, i) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/30 border border-slate-800/30"
                  >
                    <div className={`w-2 h-2 rounded-full ${
                      event.severity === 'CRITICAL' ? 'bg-red-400' :
                      event.severity === 'HIGH' ? 'bg-orange-400' :
                      event.severity === 'MEDIUM' ? 'bg-amber-400' :
                      event.severity === 'LOW' ? 'bg-slate-400' : 'bg-blue-400'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-200 truncate">{event.description}</p>
                      <p className="text-xs text-slate-500">{new Date(event.created_at).toLocaleString()}</p>
                    </div>
                    <span className={`badge ${
                      event.severity === 'CRITICAL' ? 'badge-critical' :
                      event.severity === 'HIGH' ? 'badge-high' :
                      event.severity === 'MEDIUM' ? 'badge-medium' :
                      event.severity === 'LOW' ? 'badge-low' : 'badge-info'
                    }`}>
                      {event.severity}
                    </span>
                  </motion.div>
                ))}
              </div>
            )}
          </GlassCard>
        </motion.div>
      </div>
    </div>
  );
}

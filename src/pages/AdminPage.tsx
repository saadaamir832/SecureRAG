import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users,
  FileText,
  MessageSquare,
  ShieldX,
  Activity,
  Ban,
  Lock,
  FileWarning,
  ShieldCheck,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { GlassCard, Skeleton, SeverityBadge } from '@/components/ui';
import type { AdminStats, SecurityEventRow, ProfileRow } from '@/lib/types';

export function AdminPage() {
  const { profile, loading } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [allEvents, setAllEvents] = useState<SecurityEventRow[]>([]);
  const [allUsers, setAllUsers] = useState<ProfileRow[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (profile?.role === 'admin') {
      loadAdminData();
    }
  }, [profile]);

  async function loadAdminData() {
    setDataLoading(true);

    // Get admin stats via RPC
    const { data: statsData } = await supabase.rpc('get_admin_stats');
    setStats(statsData);

    // Get recent security events (all users)
    const { data: events } = await supabase
      .from('security_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    setAllEvents(events || []);

    // Get all users
    const { data: users } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    setAllUsers(users || []);

    setDataLoading(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
    );
  }

  if (profile?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  const statCards = [
    { label: 'Total Users', value: stats?.total_users ?? 0, icon: Users, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
    { label: 'Total Documents', value: stats?.total_documents ?? 0, icon: FileText, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Total Queries', value: stats?.total_queries ?? 0, icon: MessageSquare, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Security Events', value: stats?.total_security_events ?? 0, icon: Activity, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { label: 'Blocked Threats', value: stats?.blocked_threats ?? 0, icon: ShieldX, color: 'text-red-400', bg: 'bg-red-500/10' },
    { label: 'Failed Logins', value: stats?.failed_logins ?? 0, icon: Ban, color: 'text-orange-400', bg: 'bg-orange-500/10' },
    { label: 'Injection Attempts', value: stats?.injection_attempts ?? 0, icon: Lock, color: 'text-pink-400', bg: 'bg-pink-500/10' },
    { label: 'Malicious Uploads', value: stats?.malicious_uploads ?? 0, icon: FileWarning, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  ];

  const chartData = [
    { name: 'Failed Logins', count: stats?.failed_logins ?? 0 },
    { name: 'Injections', count: stats?.injection_attempts ?? 0 },
    { name: 'Unauthorized', count: stats?.unauthorized_access ?? 0 },
    { name: 'Malicious', count: stats?.malicious_uploads ?? 0 },
    { name: 'Rate Limit', count: stats?.rate_limit_violations ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-cyan-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold mb-0">Admin Panel</h1>
          <p className="text-sm text-slate-400">System-wide security monitoring and user management.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <GlassCard hover className="p-4">
              <div className={`w-9 h-9 rounded-lg ${card.bg} flex items-center justify-center mb-3`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
              {dataLoading ? (
                <Skeleton className="h-6 w-12" />
              ) : (
                <p className="text-xl font-bold">{card.value.toLocaleString()}</p>
              )}
              <p className="text-xs text-slate-400 mt-1">{card.label}</p>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* Chart */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <GlassCard className="p-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Threat Statistics</h3>
          {dataLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={12} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(15,20,32,0.95)',
                    border: '1px solid rgba(148,163,184,0.15)',
                    borderRadius: '10px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="count" fill="#00d4ff" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </GlassCard>
      </motion.div>

      {/* Users table */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <GlassCard className="p-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Registered Users</h3>
          {dataLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : allUsers.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">No users found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500 border-b border-slate-800/50">
                    <th className="pb-3 font-medium">User</th>
                    <th className="pb-3 font-medium">Role</th>
                    <th className="pb-3 font-medium">Failed Logins</th>
                    <th className="pb-3 font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {allUsers.map((u) => (
                    <tr key={u.id} className="border-b border-slate-800/30 last:border-0">
                      <td className="py-3 pr-4">
                        <p className="text-slate-200">{u.display_name || 'Unknown'}</p>
                        <p className="text-xs text-slate-500">{u.email}</p>
                      </td>
                      <td className="py-3 pr-4">
                        {u.role === 'admin' ? (
                          <span className="badge badge-info">ADMIN</span>
                        ) : (
                          <span className="badge badge-low">USER</span>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-slate-300">{u.failed_login_count}</td>
                      <td className="py-3 text-xs text-slate-400">{new Date(u.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      </motion.div>

      {/* All security events */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <GlassCard className="p-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">All Security Events</h3>
          {dataLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : allEvents.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">No security events recorded.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500 border-b border-slate-800/50">
                    <th className="pb-3 font-medium">Event</th>
                    <th className="pb-3 font-medium">Severity</th>
                    <th className="pb-3 font-medium">Time</th>
                    <th className="pb-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {allEvents.map((event) => (
                    <tr key={event.id} className="border-b border-slate-800/30 last:border-0">
                      <td className="py-3 pr-4">
                        <p className="text-slate-200 truncate max-w-xs">{event.description}</p>
                        <p className="text-xs text-slate-500">{event.event_type}</p>
                      </td>
                      <td className="py-3 pr-4"><SeverityBadge severity={event.severity} /></td>
                      <td className="py-3 pr-4 text-xs text-slate-400">{new Date(event.created_at).toLocaleString()}</td>
                      <td className="py-3">
                        {event.blocked ? <span className="badge badge-high">BLOCKED</span> : <span className="badge badge-success">ALLOWED</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      </motion.div>
    </div>
  );
}

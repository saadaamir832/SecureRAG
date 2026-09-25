import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Shield,
  ShieldX,
  Activity,
  Lock,
  Zap,
  FileWarning,
  Ban,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
} from 'recharts';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { GlassCard, Skeleton, SeverityBadge } from '@/components/ui';
import type { SecurityEventRow } from '@/lib/types';

interface EventStats {
  prompt_injection: number;
  unauthorized_access: number;
  failed_logins: number;
  rate_limit: number;
  malicious_uploads: number;
}

interface TimelineData {
  time: string;
  events: number;
  blocked: number;
}

export function SecurityCenterPage() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<SecurityEventRow[]>([]);
  const [stats, setStats] = useState<EventStats>({
    prompt_injection: 0,
    unauthorized_access: 0,
    failed_logins: 0,
    rate_limit: 0,
    malicious_uploads: 0,
  });
  const [timeline, setTimeline] = useState<TimelineData[]>([]);
  const [severityData, setSeverityData] = useState<{ name: string; value: number; color: string }[]>([]);

  useEffect(() => {
    loadSecurityData();
  }, []);

  async function loadSecurityData() {
    setLoading(true);
    const isAdmin = profile?.role === 'admin';
    const query = supabase
      .from('security_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (!isAdmin) {
      query.eq('user_id', user!.id);
    }

    const { data } = await query;
    const allEvents = data || [];

    setEvents(allEvents.slice(0, 20));

    // Calculate stats
    const newStats: EventStats = {
      prompt_injection: allEvents.filter((e) => e.event_type === 'prompt_injection_detected').length,
      unauthorized_access: allEvents.filter((e) => e.event_type === 'unauthorized_access').length,
      failed_logins: allEvents.filter((e) => e.event_type === 'failed_login').length,
      rate_limit: allEvents.filter((e) => e.event_type === 'rate_limit_violation').length,
      malicious_uploads: allEvents.filter((e) => e.event_type === 'malicious_upload').length,
    };
    setStats(newStats);

    // Build timeline (last 7 days)
    const days: TimelineData[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayEvents = allEvents.filter((e) => e.created_at.startsWith(dateStr));
      days.push({
        time: date.toLocaleDateString('en', { weekday: 'short' }),
        events: dayEvents.length,
        blocked: dayEvents.filter((e) => e.blocked).length,
      });
    }
    setTimeline(days);

    // Severity distribution
    const severities = ['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    const colors = ['#3b82f6', '#94a3b8', '#f59e0b', '#ef4444', '#dc2626'];
    setSeverityData(
      severities
        .map((s, i) => ({ name: s, value: allEvents.filter((e) => e.severity === s).length, color: colors[i] }))
        .filter((d) => d.value > 0)
    );

    setLoading(false);
  }

  const threatCards = [
    { label: 'Prompt Injection Attempts', value: stats.prompt_injection, icon: ShieldX, color: 'text-red-400', bg: 'bg-red-500/10' },
    { label: 'Unauthorized Access', value: stats.unauthorized_access, icon: Lock, color: 'text-orange-400', bg: 'bg-orange-500/10' },
    { label: 'Failed Logins', value: stats.failed_logins, icon: Ban, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { label: 'Rate Limit Violations', value: stats.rate_limit, icon: Zap, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
    { label: 'Malicious Uploads', value: stats.malicious_uploads, icon: FileWarning, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  ];

  const barData = threatCards.map((t) => ({ name: t.label.replace(/ Attempts| Violations| Logins| Uploads| Access/, ''), count: t.value }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Security Center</h1>
        <p className="text-sm text-slate-400">
          Real-time threat monitoring and audit log.{profile?.role === 'admin' ? ' (Admin view — all users)' : ''}
        </p>
      </div>

      {/* Threat stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {threatCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <GlassCard hover className="p-4">
              <div className={`w-9 h-9 rounded-lg ${card.bg} flex items-center justify-center mb-3`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
              {loading ? (
                <Skeleton className="h-6 w-10" />
              ) : (
                <p className="text-xl font-bold">{card.value}</p>
              )}
              <p className="text-xs text-slate-400 mt-1">{card.label}</p>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Timeline chart */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2"
        >
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-300">Security Events Timeline</h3>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <div className="w-2.5 h-2.5 rounded-full bg-cyan-400" /> Events
                </span>
                <span className="flex items-center gap-1.5 text-slate-400">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400" /> Blocked
                </span>
              </div>
            </div>
            {loading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={timeline}>
                  <defs>
                    <linearGradient id="colorEvents" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorBlocked" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                  <XAxis dataKey="time" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(15,20,32,0.95)',
                      border: '1px solid rgba(148,163,184,0.15)',
                      borderRadius: '10px',
                      fontSize: '12px',
                    }}
                  />
                  <Area type="monotone" dataKey="events" stroke="#00d4ff" fillOpacity={1} fill="url(#colorEvents)" strokeWidth={2} />
                  <Area type="monotone" dataKey="blocked" stroke="#ef4444" fillOpacity={1} fill="url(#colorBlocked)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </GlassCard>
        </motion.div>

        {/* Severity distribution */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <GlassCard className="p-6 h-full">
            <h3 className="text-sm font-semibold text-slate-300 mb-4">Severity Distribution</h3>
            {loading ? (
              <Skeleton className="h-48 w-full" />
            ) : severityData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center">
                <Activity className="w-10 h-10 text-slate-600 mb-3" />
                <p className="text-sm text-slate-500">No events to display</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={severityData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                    {severityData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(15,20,32,0.95)',
                      border: '1px solid rgba(148,163,184,0.15)',
                      borderRadius: '10px',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
            {severityData.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3 justify-center">
                {severityData.map((d) => (
                  <span key={d.name} className="flex items-center gap-1.5 text-xs text-slate-400">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} /> {d.name}: {d.value}
                  </span>
                ))}
              </div>
            )}
          </GlassCard>
        </motion.div>
      </div>

      {/* Bar chart */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <GlassCard className="p-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Threat Statistics Breakdown</h3>
          {loading ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData}>
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

      {/* Recent Security Events Table */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <GlassCard className="p-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Recent Security Events</h3>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Shield className="w-10 h-10 text-slate-600 mb-3" />
              <p className="text-sm text-slate-500">No security events recorded yet.</p>
            </div>
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
                  {events.map((event, i) => (
                    <motion.tr
                      key={event.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.03 }}
                      className="border-b border-slate-800/30 last:border-0"
                    >
                      <td className="py-3 pr-4">
                        <p className="text-slate-200 truncate max-w-xs">{event.description}</p>
                        <p className="text-xs text-slate-500">{event.event_type}</p>
                      </td>
                      <td className="py-3 pr-4">
                        <SeverityBadge severity={event.severity} />
                      </td>
                      <td className="py-3 pr-4 text-xs text-slate-400">
                        {new Date(event.created_at).toLocaleString()}
                      </td>
                      <td className="py-3">
                        {event.blocked ? (
                          <span className="badge badge-high">BLOCKED</span>
                        ) : (
                          <span className="badge badge-success">ALLOWED</span>
                        )}
                      </td>
                    </motion.tr>
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

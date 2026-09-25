import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

export function AnimatedCounter({ value }: { value: number }) {
  return (
    <motion.span
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {value.toLocaleString()}
    </motion.span>
  );
}

export function GlassCard({ children, className = '', hover = false }: { children: ReactNode; className?: string; hover?: boolean }) {
  return (
    <div className={`${hover ? 'glass-card-hover' : 'glass-card'} ${className}`}>
      {children}
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton rounded-lg ${className}`} />;
}

export function StatusDot({ status }: { status: 'active' | 'warning' | 'error' | 'idle' }) {
  const colors = {
    active: 'bg-emerald-400',
    warning: 'bg-amber-400',
    error: 'bg-red-400',
    idle: 'bg-slate-500',
  };
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className={`absolute inline-flex h-full w-full rounded-full ${colors[status]} opacity-60 animate-ping`} />
      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${colors[status]}`} />
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' }) {
  return (
    <span className={`badge badge-${severity.toLowerCase()}`}>
      {severity}
    </span>
  );
}

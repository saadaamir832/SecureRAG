import { useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  LayoutDashboard,
  FileText,
  MessageSquare,
  Activity,
  FlaskConical,
  Users,
  LogOut,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { CyberBackground } from '@/components/CyberBackground';
import { logSecurityEvent } from '@/lib/audit';
import type { LucideIcon, Profile } from '@/lib/types';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/documents', label: 'Documents', icon: FileText },
  { path: '/chat', label: 'AI Chat', icon: MessageSquare },
  { path: '/security', label: 'Security Center', icon: Activity },
  { path: '/testing-lab', label: 'Testing Lab', icon: FlaskConical },
];

const adminItems = [
  { path: '/admin', label: 'Admin Panel', icon: Users },
];

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, profile, signOut, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <CyberBackground variant="minimal" />
        <div className="flex flex-col items-center gap-3">
          <Shield className="w-8 h-8 text-cyan-400 animate-pulse" />
          <p className="text-sm text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const isAdmin = profile?.role === 'admin';
  const items = isAdmin ? [...navItems, ...adminItems] : navItems;

  async function handleSignOut() {
    await logSecurityEvent({
      eventType: 'logout',
      severity: 'INFO',
      description: 'User logged out',
    });
    await signOut();
    navigate('/');
  }

  return (
    <div className="min-h-screen flex">
      <CyberBackground variant="minimal" />

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-slate-800/50 bg-[#0a0e17]/60 backdrop-blur-md fixed inset-y-0 left-0 z-40">
        <SidebarContent
          items={items}
          currentPath={location.pathname}
          profile={profile}
          onSignOut={handleSignOut}
        />
      </aside>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/60 z-40"
            />
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-[#0a0e17] border-r border-slate-800/50"
            >
              <SidebarContent
                items={items}
                currentPath={location.pathname}
                profile={profile}
                onSignOut={handleSignOut}
                onClose={() => setSidebarOpen(false)}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 lg:ml-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 backdrop-blur-md bg-[#0a0e17]/70 border-b border-slate-800/50 px-6 py-3 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-slate-800/50"
          >
            <Menu className="w-5 h-5 text-slate-300" />
          </button>
          <div className="hidden lg:flex items-center gap-2 text-sm text-slate-400">
            <Shield className="w-4 h-4 text-cyan-400" />
            <span className="text-emerald-400 font-medium">System Protected</span>
          </div>
          <div className="flex items-center gap-3 ml-auto">
            <div className="text-right">
              <p className="text-sm font-medium text-slate-200">{profile?.display_name || 'User'}</p>
              <p className="text-xs text-slate-500">{profile?.email}</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center text-sm font-semibold text-cyan-300 border border-cyan-500/20">
              {(profile?.display_name || profile?.email || 'U')[0].toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6 max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

function SidebarContent({
  items,
  currentPath,
  profile,
  onSignOut,
  onClose,
}: {
  items: { path: string; label: string; icon: LucideIcon }[];
  currentPath: string;
  profile: Profile | null;
  onSignOut: () => void;
  onClose?: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-5 flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-2.5">
          <Shield className="w-7 h-7 text-cyan-400" />
          <span className="text-lg font-bold">Secure<span className="gradient-text">RAG</span></span>
        </Link>
        {onClose && (
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-800/50">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-1">
        {items.map((item) => {
          const active = currentPath === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                active
                  ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
              }`}
            >
              <item.icon className="w-4 h-4" />
              <span>{item.label}</span>
              {active && <ChevronRight className="w-4 h-4 ml-auto" />}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="p-3 border-t border-slate-800/50">
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center text-xs font-semibold text-cyan-300 border border-cyan-500/20">
            {(profile?.display_name || profile?.email || 'U')[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-200 truncate">{profile?.display_name || 'User'}</p>
            <p className="text-xs text-slate-500 truncate">{profile?.role}</p>
          </div>
        </div>
        <button
          onClick={onSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/5 transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}

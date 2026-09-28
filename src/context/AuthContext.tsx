import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { hasSupabaseConfig, supabase } from '@/lib/supabase';

interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  role: 'user' | 'admin';
  failed_login_count: number;
  locked_until: string | null;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const demoUsersKey = 'securerag_demo_users';
const demoCurrentUserKey = 'securerag_demo_current_user';

const readDemoUsers = (): Array<{ email: string; password: string; display_name?: string; id: string; role: 'user' | 'admin'; created_at: string }> => {
  try {
    const raw = localStorage.getItem(demoUsersKey);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const writeDemoUsers = (users: Array<{ email: string; password: string; display_name?: string; id: string; role: 'user' | 'admin'; created_at: string }>) => {
  localStorage.setItem(demoUsersKey, JSON.stringify(users));
};

const getDemoUserFromStorage = (): User | null => {
  try {
    const raw = localStorage.getItem(demoCurrentUserKey);
    if (!raw) return null;
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hasSupabaseConfig) {
      const storedUser = getDemoUserFromStorage();
      setUser(storedUser);
      setSession({
        access_token: 'demo-access-token',
        refresh_token: 'demo-refresh-token',
        expires_in: 3600,
        token_type: 'bearer',
        user: storedUser ?? undefined,
      } as Session);
      setProfile(storedUser ? {
        id: storedUser.id,
        email: storedUser.email,
        display_name: storedUser.user_metadata?.display_name ?? null,
        role: 'user',
        failed_login_count: 0,
        locked_until: null,
        created_at: new Date().toISOString(),
      } : null);
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        (async () => {
          await loadProfile(session.user.id);
        })();
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadProfile(userId: string) {
    if (!hasSupabaseConfig) {
      const storedUser = getDemoUserFromStorage();
      setProfile(storedUser ? {
        id: storedUser.id,
        email: storedUser.email,
        display_name: storedUser.user_metadata?.display_name ?? null,
        role: 'user',
        failed_login_count: 0,
        locked_until: null,
        created_at: new Date().toISOString(),
      } : null);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Failed to load profile');
      setProfile(null);
    } else {
      setProfile(data as Profile | null);
    }
    setLoading(false);
  }

  async function refreshProfile() {
    if (user && hasSupabaseConfig) {
      await loadProfile(user.id);
    }
  }

  async function signIn(email: string, password: string): Promise<{ error: string | null }> {
    if (!hasSupabaseConfig) {
      const savedUsers = readDemoUsers();
      const match = savedUsers.find((item) => item.email.toLowerCase() === email.toLowerCase() && item.password === password);
      if (!match) {
        return { error: 'Invalid email or password in demo mode.' };
      }

      const demoUser = {
        id: match.id,
        email: match.email,
        app_metadata: { provider: 'demo' },
        user_metadata: { display_name: match.display_name ?? match.email.split('@')[0] },
        aud: 'authenticated',
        created_at: match.created_at,
      } as User;

      setUser(demoUser);
      setProfile({
        id: match.id,
        email: match.email,
        display_name: match.display_name ?? null,
        role: match.role,
        failed_login_count: 0,
        locked_until: null,
        created_at: match.created_at,
      });
      localStorage.setItem(demoCurrentUserKey, JSON.stringify(demoUser));
      setSession({
        access_token: 'demo-access-token',
        refresh_token: 'demo-refresh-token',
        expires_in: 3600,
        token_type: 'bearer',
        user: demoUser,
      } as Session);
      return { error: null };
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        return { error: error.message };
      }
      return { error: null };
    } catch {
      return { error: 'Failed to connect to authentication service.' };
    }
  }

  async function signUp(email: string, password: string, displayName?: string): Promise<{ error: string | null }> {
    if (!hasSupabaseConfig) {
      const savedUsers = readDemoUsers();
      const existing = savedUsers.find((item) => item.email.toLowerCase() === email.toLowerCase());
      if (existing) {
        return { error: 'An account with this email already exists.' };
      }

      const newUser = {
        id: (globalThis.crypto && 'randomUUID' in globalThis.crypto ? globalThis.crypto.randomUUID() : `demo-${Date.now()}`),
        email,
        password,
        display_name: displayName ?? email.split('@')[0],
        role: 'user' as const,
        created_at: new Date().toISOString(),
      };

      const updatedUsers = [...savedUsers, newUser];
      writeDemoUsers(updatedUsers);

      const userObject = {
        id: newUser.id,
        email: newUser.email,
        app_metadata: { provider: 'demo' },
        user_metadata: { display_name: newUser.display_name },
        aud: 'authenticated',
        created_at: newUser.created_at,
      } as User;

      setUser(userObject);
      setProfile({
        id: newUser.id,
        email: newUser.email,
        display_name: newUser.display_name,
        role: 'user',
        failed_login_count: 0,
        locked_until: null,
        created_at: newUser.created_at,
      });
      setSession({
        access_token: 'demo-access-token',
        refresh_token: 'demo-refresh-token',
        expires_in: 3600,
        token_type: 'bearer',
        user: userObject,
      } as Session);
      localStorage.setItem(demoCurrentUserKey, JSON.stringify(userObject));
      return { error: null };
    }

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName },
        },
      });
      if (error) {
        return { error: error.message };
      }
      return { error: null };
    } catch {
      return { error: 'Failed to connect to authentication service.' };
    }
  }

  async function signOut() {
    if (!hasSupabaseConfig) {
      setProfile(null);
      setUser(null);
      setSession(null);
      localStorage.removeItem(demoCurrentUserKey);
      return;
    }

    await supabase.auth.signOut();
    setProfile(null);
  }

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signIn, signUp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

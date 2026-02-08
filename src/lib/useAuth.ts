import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { createClient, Session, SupabaseClient } from '@supabase/supabase-js';

let _supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kzxveopoyooaxvejjtve.supabase.co',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6eHZlb3BveW9vYXh2ZWpqdHZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxMzc4OTgsImV4cCI6MjA4NTcxMzg5OH0.9X8BB4hruzkaHIrvlrd9GkDS4rSzqVLT5c13XFhrFE0'
    );
  }
  return _supabase;
}

// Keep backward compat
export const supabase = typeof window !== 'undefined' ? getSupabase() : (null as any);

export function useAuth() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sb = getSupabase();
    sb.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace('/login');
      } else {
        setSession(data.session);
        setLoading(false);
      }
    });

    const { data: listener } = sb.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.replace('/login');
      } else {
        setSession(session);
      }
    });

    return () => { listener.subscription.unsubscribe(); };
  }, [router]);

  const signOut = async () => {
    await getSupabase().auth.signOut();
    router.replace('/login');
  };

  return { session, loading, signOut };
}

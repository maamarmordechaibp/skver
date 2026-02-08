import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { createClient, Session, SupabaseClient } from '@supabase/supabase-js';

let _supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
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

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { createClient, Session } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export function useAuth() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace('/login');
      } else {
        setSession(data.session);
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.replace('/login');
      } else {
        setSession(session);
      }
    });

    return () => { listener.subscription.unsubscribe(); };
  }, [router]);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  return { session, loading, signOut };
}

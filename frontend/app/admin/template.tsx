'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

/**
 * Admin template component that wraps all admin pages
 * Provides session refresh and auth state monitoring
 */
export default function AdminTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    // Set up session refresh interval (every 5 minutes)
    const refreshInterval = setInterval(async () => {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session) {
        // Session invalid - redirect to login
        router.push('/auth/login');
      }
    }, 5 * 60 * 1000); // 5 minutes

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        router.push('/auth/login');
      } else if (event === 'TOKEN_REFRESHED') {
        // Session refreshed successfully
        console.log('Session refreshed');
      } else if (event === 'USER_UPDATED') {
        // Verify user still has admin role
        if (session?.user) {
          supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single()
            .then(({ data }) => {
              if (!data || (data.role !== 'admin' && data.role !== 'selector')) {
                supabase.auth.signOut();
                router.push('/?error=unauthorized');
              }
            });
        }
      }
    });

    // Initial session check
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error || !session) {
        router.push('/auth/login');
      }
    });

    return () => {
      clearInterval(refreshInterval);
      subscription.unsubscribe();
    };
  }, [router]);

  return <>{children}</>;
}

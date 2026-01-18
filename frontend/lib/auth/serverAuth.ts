import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

/**
 * Server-side authentication check for admin routes
 * Verifies session exists and user has admin or selector role
 * Redirects to login if not authenticated or unauthorized
 *
 * Usage in Server Components:
 * const user = await requireAuth(['admin', 'selector']);
 */
export async function requireAuth(allowedRoles: string[] = ['admin', 'selector']) {
  const supabase = createClient();

  // Check session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/auth/login');
  }

  // Check user role
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role, email, full_name')
    .eq('id', session.user.id)
    .single();

  if (error || !profile) {
    console.error('Error fetching user profile:', error);
    redirect('/auth/login');
  }

  // Verify role authorization
  if (!allowedRoles.includes(profile.role)) {
    redirect('/?error=unauthorized');
  }

  return {
    user: session.user,
    profile,
  };
}

/**
 * Check if current user has admin role
 * Returns boolean without redirecting
 */
export async function isAdmin(): Promise<boolean> {
  const supabase = createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) return false;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single();

  return profile?.role === 'admin';
}

/**
 * Check if current user is authenticated
 * Returns boolean without redirecting
 */
export async function isAuthenticated(): Promise<boolean> {
  const supabase = createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  return !!session;
}

import { createRouteHandler } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import {
  checkRateLimit,
  recordFailedAttempt,
  clearFailedAttempts,
  getClientIP,
} from '@/lib/auth/rateLimit';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email et mot de passe requis' },
        { status: 400 }
      );
    }

    // Get client IP for rate limiting
    const clientIP = getClientIP(request.headers);

    // Check rate limit
    const rateLimit = checkRateLimit(clientIP);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: `Trop de tentatives. Veuillez réessayer dans ${rateLimit.retryAfter} secondes.`,
          retryAfter: rateLimit.retryAfter,
        },
        { status: 429 }
      );
    }

    // Attempt authentication
    const supabase = createRouteHandler();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Record failed attempt
      recordFailedAttempt(clientIP);

      // Generic error message (don't reveal if email exists)
      return NextResponse.json(
        { error: 'Email ou mot de passe incorrect' },
        { status: 401 }
      );
    }

    if (!data.user || !data.session) {
      recordFailedAttempt(clientIP);
      return NextResponse.json(
        { error: 'Email ou mot de passe incorrect' },
        { status: 401 }
      );
    }

    // Check user role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single();

    if (!profile || (profile.role !== 'admin' && profile.role !== 'selector')) {
      // User exists but doesn't have admin/selector role
      await supabase.auth.signOut();
      recordFailedAttempt(clientIP);
      return NextResponse.json(
        { error: 'Accès non autorisé' },
        { status: 403 }
      );
    }

    // Successful login - clear failed attempts
    clearFailedAttempts(clientIP);

    return NextResponse.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        role: profile.role,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json(
      { error: 'Une erreur est survenue' },
      { status: 500 }
    );
  }
}

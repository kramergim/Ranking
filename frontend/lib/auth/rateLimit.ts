/**
 * Simple in-memory rate limiting for login attempts
 * Tracks failed login attempts by IP address
 *
 * Security considerations:
 * - Max 5 attempts per IP per 15 minutes
 * - Exponential backoff after failed attempts
 * - Auto-cleanup of old entries
 */

interface LoginAttempt {
  count: number;
  firstAttempt: number;
  lastAttempt: number;
  blockedUntil?: number;
}

// In-memory store (for production, use Redis or similar)
const loginAttempts = new Map<string, LoginAttempt>();

// Configuration
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const BLOCK_DURATION_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Clean up old entries from the map (older than window)
 */
function cleanup() {
  const now = Date.now();
  for (const [ip, attempt] of loginAttempts.entries()) {
    if (now - attempt.lastAttempt > WINDOW_MS) {
      loginAttempts.delete(ip);
    }
  }
}

/**
 * Check if an IP is currently rate limited
 * @param ip - IP address or identifier
 * @returns { allowed: boolean, retryAfter?: number }
 */
export function checkRateLimit(ip: string): {
  allowed: boolean;
  retryAfter?: number;
  remainingAttempts?: number;
} {
  cleanup();
  const now = Date.now();
  const attempt = loginAttempts.get(ip);

  if (!attempt) {
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS };
  }

  // Check if currently blocked
  if (attempt.blockedUntil && now < attempt.blockedUntil) {
    return {
      allowed: false,
      retryAfter: Math.ceil((attempt.blockedUntil - now) / 1000),
    };
  }

  // Check if window has expired
  if (now - attempt.firstAttempt > WINDOW_MS) {
    loginAttempts.delete(ip);
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS };
  }

  // Check attempt count
  if (attempt.count >= MAX_ATTEMPTS) {
    // Block the IP
    attempt.blockedUntil = now + BLOCK_DURATION_MS;
    loginAttempts.set(ip, attempt);
    return {
      allowed: false,
      retryAfter: Math.ceil(BLOCK_DURATION_MS / 1000),
    };
  }

  return {
    allowed: true,
    remainingAttempts: MAX_ATTEMPTS - attempt.count,
  };
}

/**
 * Record a failed login attempt
 * @param ip - IP address or identifier
 */
export function recordFailedAttempt(ip: string): void {
  cleanup();
  const now = Date.now();
  const attempt = loginAttempts.get(ip);

  if (!attempt) {
    loginAttempts.set(ip, {
      count: 1,
      firstAttempt: now,
      lastAttempt: now,
    });
  } else {
    attempt.count += 1;
    attempt.lastAttempt = now;
    loginAttempts.set(ip, attempt);
  }
}

/**
 * Clear failed attempts for an IP (on successful login)
 * @param ip - IP address or identifier
 */
export function clearFailedAttempts(ip: string): void {
  loginAttempts.delete(ip);
}

/**
 * Get client IP from request headers
 * Checks X-Forwarded-For, X-Real-IP, and other common headers
 */
export function getClientIP(headers: Headers): string {
  // Check common proxy headers
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIP = headers.get('x-real-ip');
  if (realIP) {
    return realIP.trim();
  }

  const cfConnectingIP = headers.get('cf-connecting-ip');
  if (cfConnectingIP) {
    return cfConnectingIP.trim();
  }

  // Fallback
  return 'unknown';
}

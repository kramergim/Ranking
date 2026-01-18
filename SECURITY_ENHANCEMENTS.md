# Security Enhancements - Swiss Taekwondo Ranking System

## Overview
This document outlines the security enhancements implemented to protect admin access and prevent unauthorized access to the ranking system.

## Security Layers Implemented

### 1. **Row-Level Security (RLS) Policies**

All database tables have RLS enabled with strict policies:

- **Public users**: Can only view published snapshots and selection results
- **Selectors**: Can manage results, events, and selections
- **Admins**: Full access to all data

**New Addition**: `hero_banners` table now has RLS policies:
- Public can only see active banners
- Only admins can create/edit/delete banners

**Migration to apply**: `supabase/migrations/add_hero_banners_rls.sql`

### 2. **Middleware Authentication**

File: `frontend/middleware.ts`

**Protection**:
- Intercepts all `/admin/*` routes
- Verifies Supabase session exists
- Checks user role from `profiles` table
- Only allows `admin` and `selector` roles
- Redirects unauthorized users to home page

**Effectiveness**:
- ✅ Prevents unauthenticated access
- ✅ Prevents privilege escalation
- ✅ Runs on edge (fast, before page load)

### 3. **Rate Limiting on Login**

Files:
- `frontend/lib/auth/rateLimit.ts` - Rate limiting logic
- `frontend/app/api/auth/login/route.ts` - Protected login endpoint

**Protection**:
- **Max 5 failed login attempts** per IP per 15 minutes
- **30-minute block** after exceeding limit
- Prevents brute force attacks
- Tracks attempts by IP address

**Configuration**:
```typescript
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const BLOCK_DURATION_MS = 30 * 60 * 1000; // 30 minutes
```

### 4. **Generic Error Messages**

**Before**:
- "User not found"
- "Invalid password"
- "No admin role"

**After**:
- All failures return: "Email ou mot de passe incorrect"

**Why**: Prevents attackers from enumerating valid email addresses

### 5. **Session Refresh & Monitoring**

File: `frontend/app/admin/template.tsx`

**Protection**:
- Automatic session validation every 5 minutes
- Listens for auth state changes:
  - `SIGNED_OUT` → redirect to login
  - `USER_UPDATED` → re-verify role
  - `TOKEN_REFRESHED` → logged
- Prevents session hijacking
- Detects role changes in real-time

### 6. **Server-Side Auth Helpers**

File: `frontend/lib/auth/serverAuth.ts`

**Functions**:
- `requireAuth(['admin', 'selector'])` - Server component auth check with redirect
- `isAdmin()` - Boolean check for admin role
- `isAuthenticated()` - Boolean check for valid session

**Usage in Server Components**:
```typescript
export default async function AdminPage() {
  const { user, profile } = await requireAuth(['admin']);
  // Page content...
}
```

## Security Best Practices Applied

### ✅ Defense in Depth
- Multiple layers: Middleware → RLS → Client checks
- If one layer fails, others still protect

### ✅ Principle of Least Privilege
- Public sees only published data
- Selectors have limited admin access
- Admins have full control

### ✅ Fail Secure
- Default deny on all policies
- Redirects on any auth failure
- No data leak on errors

### ✅ Audit Trail
- `audit_log` table tracks all admin actions
- Immutable (no UPDATE/DELETE allowed)
- Includes user ID, action, timestamp

## Attack Vectors Mitigated

| Attack | Mitigation |
|--------|-----------|
| Brute Force Login | Rate limiting (5 attempts/15min) |
| Session Hijacking | Auto-refresh + state monitoring |
| Privilege Escalation | Middleware role check + RLS |
| SQL Injection | Supabase prepared statements |
| Email Enumeration | Generic error messages |
| Direct URL Access | Middleware auth check |
| Data Exposure | RLS on all tables |
| CSRF | Next.js built-in protection |

## Remaining Recommendations

### For Production Deployment:

1. **Enable HTTPS Only**
   - Force HTTPS in production
   - Set secure cookie flags

2. **Rate Limit Persistence**
   - Current: In-memory (resets on server restart)
   - Recommended: Redis or database-backed

3. **Multi-Factor Authentication (MFA)**
   - Supabase supports MFA
   - Highly recommended for admin accounts

4. **IP Whitelisting (Optional)**
   - If admins access from known IPs
   - Additional middleware check

5. **Security Headers**
   - Configure `next.config.js`:
   ```javascript
   headers: [
     {
       key: 'X-Frame-Options',
       value: 'DENY',
     },
     {
       key: 'X-Content-Type-Options',
       value: 'nosniff',
     },
     {
       key: 'Strict-Transport-Security',
       value: 'max-age=31536000; includeSubDomains',
     },
   ]
   ```

6. **Regular Security Audits**
   - Monitor `audit_log` table
   - Review failed login attempts
   - Check for suspicious patterns

7. **Backup & Recovery**
   - Regular database backups
   - Test restore procedures
   - Separate backup access credentials

## Testing Checklist

- [ ] Verify rate limiting blocks after 5 failed attempts
- [ ] Verify session refresh works (wait 5 minutes in admin)
- [ ] Verify unauthorized role cannot access admin routes
- [ ] Verify RLS prevents public from seeing unpublished data
- [ ] Verify audit log captures admin actions
- [ ] Verify generic error message on invalid credentials
- [ ] Verify logout works and clears session
- [ ] Verify direct URL access to `/admin` redirects

## Migration Instructions

### To Apply Security Enhancements:

1. **Apply database migration**:
   ```bash
   cd supabase
   npx supabase db push migrations/add_hero_banners_rls.sql
   ```

2. **Verify RLS is enabled**:
   ```sql
   SELECT tablename, rowsecurity
   FROM pg_tables
   WHERE schemaname = 'public';
   ```
   All should show `rowsecurity = true`

3. **Test login with rate limiting**:
   - Try 5 failed login attempts
   - Verify 6th attempt is blocked
   - Wait 30 minutes or restart server
   - Verify can login again

4. **Monitor in production**:
   - Check server logs for rate limit events
   - Monitor Supabase auth logs
   - Review audit_log table regularly

## Contact

For security concerns or to report vulnerabilities, contact:
- [Your security contact email]

Last updated: 2025-12-27

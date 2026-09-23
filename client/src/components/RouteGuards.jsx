import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

/**
 * RequireAuth — redirects unauthenticated users to /login.
 * Shows a full-screen spinner while the auth state is being restored from localStorage.
 */
export function RequireAuth() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-3"
        style={{ backgroundColor: 'var(--color-bg)' }}
      >
        <Loader2 size={32} className="animate-spin" style={{ color: 'var(--color-brand)' }} />
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Restoring session…</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

/**
 * RedirectIfAuth — sends already-authenticated users away from public pages (e.g. /login).
 */
export function RedirectIfAuth() {
  const { user, loading } = useAuth();
  // Don't flash the login page while auth is resolving
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <Outlet />;
}

/**
 * RequireRole — guards a route to specific roles.
 * Redirects to /unauthorized (not the dashboard) so users understand why they were blocked.
 *
 * Usage: <RequireRole roles={['ADMIN', 'HOST']} />
 */
export function RequireRole({ roles }) {
  const { user } = useAuth();
  if (!user || !roles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }
  return <Outlet />;
}

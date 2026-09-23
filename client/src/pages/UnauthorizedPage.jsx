import { ShieldOff, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Shown when an authenticated user tries to access a route
 * their role does not permit.
 */
export default function UnauthorizedPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ backgroundColor: 'var(--color-bg)' }}
    >
      <div className="text-center max-w-sm animate-slide-up">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
          style={{ backgroundColor: 'var(--color-rejected-bg)' }}
        >
          <ShieldOff size={32} style={{ color: 'var(--color-rejected)' }} />
        </div>

        <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
          Access Denied
        </h1>

        <p className="text-sm mb-2" style={{ color: 'var(--color-text-secondary)' }}>
          Your role (<strong>{user?.role?.replace('_', ' ')}</strong>) does not have permission
          to view this page.
        </p>

        <p className="text-xs mb-8" style={{ color: 'var(--color-text-muted)' }}>
          If you believe this is a mistake, please contact your system administrator.
        </p>

        <button
          onClick={() => navigate('/')}
          className="btn btn-primary gap-2"
          id="back-to-dashboard-btn"
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}

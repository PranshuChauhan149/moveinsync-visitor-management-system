import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, UserPlus, CheckSquare, Monitor,
  BarChart2, FileText, LogOut, ChevronLeft, ChevronRight,
  Building2, Menu, X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { approvalService } from '../services';

const NAV = [
  { to: '/',             icon: LayoutDashboard, label: 'Dashboard',   roles: ['ADMIN','HOST','FRONT_DESK'] },
  { to: '/visitors',     icon: Users,           label: 'Visitors',    roles: ['ADMIN','HOST','FRONT_DESK'] },
  { to: '/invite',       icon: UserPlus,        label: 'Invite Visitor', roles: ['ADMIN','HOST'] },
  { to: '/approvals',    icon: CheckSquare,     label: 'Approvals',   roles: ['ADMIN','HOST'] },
  { to: '/front-desk',   icon: Monitor,         label: 'Front Desk',  roles: ['ADMIN','FRONT_DESK'] },
  { to: '/reports',      icon: BarChart2,       label: 'Reports',     roles: ['ADMIN'] },
  { to: '/audit-logs',   icon: FileText,        label: 'Audit Logs',  roles: ['ADMIN'] },
];

export default function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }) {
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (user?.role !== 'FRONT_DESK') {
      approvalService.getPendingCount()
        .then(r => setPendingCount(r.data.count))
        .catch(() => {});
    }
  }, [user]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const filteredNav = NAV.filter(n => n.roles.includes(user?.role));

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-4 border-b`} style={{ borderColor: 'var(--color-border)' }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--color-brand)' }}>
          <Building2 size={16} className="text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="text-sm font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>MoveInSync</div>
            <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Visitor Management</div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {filteredNav.map(({ to, icon: Icon, label }) => {
          const isActive = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);
          const showBadge = to === '/approvals' && pendingCount > 0;
          return (
            <Link
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
              className={`sidebar-link ${isActive ? 'active' : ''}`}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon size={18} className="flex-shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1 truncate">{label}</span>
                  {showBadge && (
                    <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-red-500 text-white min-w-[18px] text-center">
                      {pendingCount > 9 ? '9+' : pendingCount}
                    </span>
                  )}
                </>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User profile */}
      <div className="px-2 py-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
        <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg ${collapsed ? 'justify-center' : ''}`}>
          <div className="avatar avatar-sm flex-shrink-0">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>{user?.name}</div>
              <div className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>{user?.role?.replace('_', ' ')}</div>
            </div>
          )}
        </div>
        <button
          onClick={handleLogout}
          className={`sidebar-link w-full mt-1 ${collapsed ? 'justify-center' : ''}`}
          aria-label="Logout"
        >
          <LogOut size={16} className="flex-shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex flex-col flex-shrink-0 h-screen sticky top-0 transition-all duration-200 border-r"
        style={{
          width: collapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)',
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
        }}
      >
        <SidebarContent />
        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-16 w-6 h-6 rounded-full border flex items-center justify-center shadow-sm transition-colors hover:bg-gray-50"
          style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside
            className="fixed left-0 top-0 h-full z-50 w-64 shadow-2xl flex flex-col animate-slide-in-right"
            style={{ backgroundColor: 'var(--color-surface)' }}
          >
            <div className="absolute top-4 right-4">
              <button
                onClick={() => setMobileOpen(false)}
                className="btn-ghost p-1 rounded-lg"
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
            </div>
            <SidebarContent />
          </aside>
        </>
      )}
    </>
  );
}

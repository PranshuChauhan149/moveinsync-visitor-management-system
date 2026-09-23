import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, Bell, HelpCircle, Sun, Moon, Menu, ChevronDown, LogOut, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const BREADCRUMBS = {
  '/':            ['Dashboard'],
  '/visitors':    ['Visitors'],
  '/invite':      ['Visitors', 'Invite Visitor'],
  '/approvals':   ['Approvals'],
  '/front-desk':  ['Front Desk'],
  '/reports':     ['Reports & Analytics'],
  '/audit-logs':  ['Audit Logs'],
};

const ROLE_LABELS = {
  ADMIN: 'Administrator',
  HOST: 'Host Employee',
  FRONT_DESK: 'Front Desk',
};

export default function Topbar({ setMobileOpen }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const profileRef = useRef(null);

  const breadcrumbs = BREADCRUMBS[location.pathname] ||
    BREADCRUMBS[Object.keys(BREADCRUMBS).find(k => location.pathname.startsWith(k) && k !== '/')] ||
    ['Dashboard'];

  // Close profile dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header
      className="sticky top-0 z-30 flex items-center gap-4 px-6 border-b"
      style={{
        height: 'var(--topbar-height)',
        backgroundColor: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
      }}
    >
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden btn-ghost p-1.5 rounded-lg"
        aria-label="Open menu"
      >
        <Menu size={18} />
      </button>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm min-w-0">
        {breadcrumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <span style={{ color: 'var(--color-text-muted)' }}>/</span>}
            <span
              className={i === breadcrumbs.length - 1 ? 'font-semibold' : ''}
              style={{ color: i === breadcrumbs.length - 1 ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}
            >
              {crumb}
            </span>
          </span>
        ))}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Search */}
      <div className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition-all duration-150 cursor-text ${searchFocused ? 'w-72' : 'w-56'}`}
        style={{
          backgroundColor: 'var(--color-surface-2)',
          borderColor: searchFocused ? 'var(--color-brand-light)' : 'var(--color-border)',
          boxShadow: searchFocused ? '0 0 0 3px rgba(59,86,245,0.12)' : 'none',
        }}
        onClick={() => document.getElementById('global-search')?.focus()}
      >
        <Search size={14} style={{ color: 'var(--color-text-muted)' }} />
        <input
          id="global-search"
          type="text"
          placeholder="Search visitors..."
          className="bg-transparent outline-none flex-1 text-sm"
          style={{ color: 'var(--color-text-primary)' }}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
        />
        <kbd className="hidden sm:inline text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>⌘K</kbd>
      </div>

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="btn-ghost p-2 rounded-lg"
        aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      >
        {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
      </button>

      {/* Help */}
      <button className="hidden sm:flex btn-ghost p-2 rounded-lg" aria-label="Help">
        <HelpCircle size={16} />
      </button>

      {/* Notifications */}
      <button className="btn-ghost p-2 rounded-lg relative" aria-label="Notifications">
        <Bell size={16} />
        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-red-500" />
      </button>

      {/* Profile dropdown */}
      <div className="relative" ref={profileRef}>
        <button
          onClick={() => setProfileOpen(!profileOpen)}
          className="flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors hover:bg-[var(--color-surface-2)]"
          aria-haspopup="true"
          aria-expanded={profileOpen}
        >
          <div className="avatar avatar-sm">{user?.name?.charAt(0).toUpperCase()}</div>
          <div className="hidden sm:block text-left">
            <div className="text-xs font-medium truncate max-w-[100px]" style={{ color: 'var(--color-text-primary)' }}>
              {user?.name?.split(' ')[0]}
            </div>
            <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{ROLE_LABELS[user?.role]}</div>
          </div>
          <ChevronDown size={14} style={{ color: 'var(--color-text-muted)' }} />
        </button>

        {profileOpen && (
          <div
            className="absolute right-0 top-full mt-2 w-52 card shadow-lg animate-fade-in z-50"
            role="menu"
          >
            <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
              <div className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{user?.name}</div>
              <div className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-text-muted)' }}>{user?.email}</div>
              <span className="badge badge-checked-in mt-2 text-[10px]">{ROLE_LABELS[user?.role]}</span>
            </div>
            <div className="p-2">
              <button className="btn-ghost w-full justify-start gap-2 text-xs py-2" role="menuitem">
                <User size={14} />
                Profile Settings
              </button>
              <button onClick={handleLogout} className="btn-ghost w-full justify-start gap-2 text-xs py-2 text-red-500 hover:text-red-600" role="menuitem">
                <LogOut size={14} />
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

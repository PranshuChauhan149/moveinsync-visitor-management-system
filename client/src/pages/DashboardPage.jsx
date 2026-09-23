import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Clock, UserCheck, Calendar, TrendingUp, TrendingDown, ArrowRight, UserPlus, Monitor, CheckSquare, History, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { reportService, visitorService } from '../services';
import StatusBadge from '../components/StatusBadge';
import Avatar from '../components/Avatar';
import { SkeletonCard } from '../components/Skeleton';
import { ErrorState } from '../components/States';
import { format } from 'date-fns';

function StatCard({ icon: Icon, label, value, sub, subIcon: SubIcon, color = 'var(--color-brand)', loading }) {
  if (loading) return <SkeletonCard />;
  return (
    <div className="stat-card flex items-start gap-4">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}18` }}>
        <Icon size={20} style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
        <p className="text-3xl font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
          {value ?? '—'}
        </p>
        {sub && (
          <p className="text-xs mt-1 flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
            {SubIcon && <SubIcon size={12} />}
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

function QuickAction({ icon: Icon, title, desc, to, onClick }) {
  const nav = useNavigate();
  return (
    <button
      onClick={onClick || (() => nav(to))}
      className="flex items-center gap-4 p-4 card card-hover text-left w-full group"
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--color-surface-2)' }}>
        <Icon size={18} style={{ color: 'var(--color-brand)' }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{title}</div>
        <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{desc}</div>
      </div>
      <ArrowRight size={16} className="transition-transform group-hover:translate-x-1 flex-shrink-0" style={{ color: 'var(--color-text-muted)' }} />
    </button>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardPage() {
  const { user, isAdmin, isHost } = useAuth();
  const [stats, setStats] = useState(null);
  const [todayVisitors, setTodayVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, visitorsRes] = await Promise.all([
        reportService.getDashboardStats(),
        visitorService.getTodaysVisitors(),
      ]);
      setStats(statsRes.data.data);
      setTodayVisitors(visitorsRes.data.data.slice(0, 8));
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  if (error) {
    return (
      <div className="page-container">
        <ErrorState message={error} onRetry={fetchData} />
      </div>
    );
  }

  const trend = stats?.trend;
  const trendPositive = trend !== null && parseFloat(trend) >= 0;

  return (
    <div className="page-container max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="page-title">
          {getGreeting()}, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p className="page-subtitle">
          Here's what's happening with your workplace visitors today.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={Users}
          label="Today's Visitors"
          value={stats?.todayVisitors}
          sub={trend != null ? `${trendPositive ? '+' : ''}${trend}% from yesterday` : 'First day on record'}
          subIcon={trendPositive ? TrendingUp : TrendingDown}
          color="var(--color-brand)"
          loading={loading}
        />
        <StatCard
          icon={Clock}
          label="Pending Approvals"
          value={stats?.pendingApprovals}
          sub="Needs attention"
          color="var(--color-pending)"
          loading={loading}
        />
        <StatCard
          icon={UserCheck}
          label="Currently Inside"
          value={stats?.currentlyInside}
          sub="Live"
          color="var(--color-checked-in)"
          loading={loading}
        />
        <StatCard
          icon={Calendar}
          label="Pre-approved"
          value={stats?.preApproved}
          sub="Upcoming visits"
          color="var(--color-pre-approved)"
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's visitor activity */}
        <div className="lg:col-span-2">
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
              <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Today's Visitor Activity</h2>
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {format(new Date(), 'MMMM d, yyyy')}
              </span>
            </div>
            {loading ? (
              <div className="p-5 space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="skeleton w-9 h-9 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <div className="skeleton h-3 w-32" />
                      <div className="skeleton h-3 w-48" />
                    </div>
                    <div className="skeleton h-5 w-20 rounded-full" />
                  </div>
                ))}
              </div>
            ) : todayVisitors.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No visitors today</p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                {todayVisitors.map((v) => (
                  <div key={v._id} className="flex items-center gap-4 px-5 py-3 hover:bg-[var(--color-surface-2)] transition-colors">
                    <Avatar name={v.fullName} src={v.photoUrl} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>{v.fullName}</div>
                      <div className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
                        {v.company && `${v.company} · `}{v.purpose} · Host: {v.hostId?.name}
                      </div>
                    </div>
                    <div className="text-xs flex-shrink-0" style={{ color: 'var(--color-text-muted)' }}>
                      {v.startTime}–{v.endTime}
                    </div>
                    <StatusBadge status={v.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold px-1" style={{ color: 'var(--color-text-primary)' }}>Quick Actions</h2>
          {(isAdmin || isHost) && (
            <QuickAction
              icon={UserPlus}
              title="Invite Visitor"
              desc="Create a visitor invitation"
              to="/invite"
            />
          )}
          <QuickAction
            icon={Monitor}
            title="Front Desk Check-in"
            desc="Manage walk-in visitors"
            to="/front-desk"
          />
          {(isAdmin || isHost) && (
            <QuickAction
              icon={CheckSquare}
              title="Review Approvals"
              desc={stats?.pendingApprovals > 0 ? `${stats.pendingApprovals} pending approval${stats.pendingApprovals > 1 ? 's' : ''}` : 'No pending approvals'}
              to="/approvals"
            />
          )}
          <QuickAction
            icon={History}
            title="Visitor History"
            desc="View all visitor records"
            to="/visitors"
          />
        </div>
      </div>
    </div>
  );
}

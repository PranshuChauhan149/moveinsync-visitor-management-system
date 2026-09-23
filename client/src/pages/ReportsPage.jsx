import { useState, useEffect, useCallback } from 'react';
import { Users, CheckCircle, XCircle, UserCheck, Clock, Calendar } from 'lucide-react';
import { reportService } from '../services';
import { ErrorState } from '../components/States';
import { SkeletonCard } from '../components/Skeleton';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const STATUS_COLORS = {
  PENDING: '#d97706', APPROVED: '#16a34a', REJECTED: '#dc2626',
  CHECKED_IN: '#0284c7', CHECKED_OUT: '#7c3aed', PRE_APPROVED: '#0891b2', EXPIRED: '#64748b',
};
const PURPOSE_COLORS = ['#1b22a6', '#3b56f5', '#0284c7', '#16a34a', '#7c3aed', '#d97706', '#dc2626', '#0891b2'];

function StatCard({ icon: Icon, label, value, color, loading }) {
  if (loading) return <SkeletonCard />;
  return (
    <div className="stat-card flex items-start gap-4">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}18` }}>
        <Icon size={20} style={{ color }} />
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
        <p className="text-3xl font-bold mt-1" style={{ color: 'var(--color-text-primary)' }}>{value ?? '—'}</p>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashRes, analyticsRes] = await Promise.all([
        reportService.getDashboardStats(),
        reportService.getAnalytics(dateRange.start ? { startDate: dateRange.start, endDate: dateRange.end } : {}),
      ]);
      setData({ dash: dashRes.data.data, analytics: analyticsRes.data.data });
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load analytics data.');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const statusData = data?.analytics?.statusBreakdown?.map(s => ({
    name: s._id.replace('_', ' '),
    value: s.count,
    fill: STATUS_COLORS[s._id] || '#64748b',
  })) || [];

  const purposeData = data?.analytics?.purposeBreakdown?.map((p, i) => ({
    name: p._id,
    count: p.count,
    fill: PURPOSE_COLORS[i % PURPOSE_COLORS.length],
  })) || [];

  const dailyData = data?.analytics?.dailyTrend?.map(d => ({
    date: d._id,
    visitors: d.count,
  })) || [];

  const peakData = data?.analytics?.peakHours?.map(h => ({
    hour: `${h._id}:00`,
    visitors: h.count,
  })) || [];

  const approved = data?.analytics?.statusBreakdown?.find(s => s._id === 'APPROVED')?.count || 0;
  const rejected = data?.analytics?.statusBreakdown?.find(s => s._id === 'REJECTED')?.count || 0;
  const checkedIn = data?.analytics?.statusBreakdown?.find(s => s._id === 'CHECKED_IN')?.count || 0;
  const checkedOut = data?.analytics?.statusBreakdown?.find(s => s._id === 'CHECKED_OUT')?.count || 0;

  return (
    <div className="page-container max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title">Reports & Analytics</h1>
          <p className="page-subtitle">Visitor trends and operational insights.</p>
        </div>
        <div className="flex gap-2">
          <input type="date" value={dateRange.start} onChange={e => setDateRange(r => ({ ...r, start: e.target.value }))} className="input text-sm" />
          <input type="date" value={dateRange.end} onChange={e => setDateRange(r => ({ ...r, end: e.target.value }))} className="input text-sm" />
        </div>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={fetchData} />
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <StatCard icon={Users} label="Total Visitors" value={data?.analytics?.totalVisitors} color="var(--color-brand)" loading={loading} />
            <StatCard icon={CheckCircle} label="Approved" value={approved} color="var(--color-approved)" loading={loading} />
            <StatCard icon={XCircle} label="Rejected" value={rejected} color="var(--color-rejected)" loading={loading} />
            <StatCard icon={UserCheck} label="Checked In" value={checkedIn} color="var(--color-checked-in)" loading={loading} />
            <StatCard icon={Clock} label="Checked Out" value={checkedOut} color="var(--color-checked-out)" loading={loading} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily trend */}
            <div className="card p-5">
              <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>Visitor Trend (Last 7 days)</h3>
              {loading ? <div className="skeleton h-48" /> : (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="var(--color-text-muted)" />
                    <YAxis tick={{ fontSize: 11 }} stroke="var(--color-text-muted)" />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', fontSize: '12px' }} />
                    <Line type="monotone" dataKey="visitors" stroke="var(--color-brand)" strokeWidth={2} dot={{ fill: 'var(--color-brand)', r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Status distribution */}
            <div className="card p-5">
              <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>Status Distribution</h3>
              {loading ? <div className="skeleton h-48" /> : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {statusData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Purpose breakdown */}
            <div className="card p-5">
              <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>Visit Purpose Breakdown</h3>
              {loading ? <div className="skeleton h-48" /> : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={purposeData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis type="number" tick={{ fontSize: 11 }} stroke="var(--color-text-muted)" />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} stroke="var(--color-text-muted)" width={90} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', fontSize: '12px' }} />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {purposeData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Peak hours */}
            <div className="card p-5">
              <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>Peak Visiting Hours</h3>
              {loading ? <div className="skeleton h-48" /> : (
                peakData.length === 0 ? (
                  <div className="flex items-center justify-center h-48 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    No check-in data available
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={peakData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                      <XAxis dataKey="hour" tick={{ fontSize: 11 }} stroke="var(--color-text-muted)" />
                      <YAxis tick={{ fontSize: 11 }} stroke="var(--color-text-muted)" />
                      <Tooltip contentStyle={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', fontSize: '12px' }} />
                      <Bar dataKey="visitors" fill="var(--color-brand)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

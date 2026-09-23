import { useState, useEffect, useCallback } from 'react';
import { Search, Filter } from 'lucide-react';
import { auditService } from '../services';
import Pagination from '../components/Pagination';
import { SkeletonTable } from '../components/Skeleton';
import { EmptyState, ErrorState } from '../components/States';
import { format } from 'date-fns';

const ACTION_LABELS = {
  VISITOR_CREATED:      { label: 'Visitor Created',       color: 'var(--color-brand)' },
  VISITOR_UPDATED:      { label: 'Visitor Updated',       color: 'var(--color-pending)' },
  VISITOR_DELETED:      { label: 'Visitor Deleted',       color: 'var(--color-rejected)' },
  APPROVAL_REQUESTED:   { label: 'Approval Requested',    color: 'var(--color-pending)' },
  VISITOR_APPROVED:     { label: 'Visitor Approved',      color: 'var(--color-approved)' },
  VISITOR_REJECTED:     { label: 'Visitor Rejected',      color: 'var(--color-rejected)' },
  PASS_GENERATED:       { label: 'Pass Generated',        color: 'var(--color-pre-approved)' },
  PASS_REVOKED:         { label: 'Pass Revoked',          color: 'var(--color-rejected)' },
  VISITOR_CHECKED_IN:   { label: 'Checked In',            color: 'var(--color-checked-in)' },
  VISITOR_CHECKED_OUT:  { label: 'Checked Out',           color: 'var(--color-checked-out)' },
  USER_LOGIN:           { label: 'User Login',            color: 'var(--color-brand)' },
  USER_LOGOUT:          { label: 'User Logout',           color: 'var(--color-text-muted)' },
  USER_CREATED:         { label: 'User Created',          color: 'var(--color-approved)' },
  PRE_APPROVAL_CREATED: { label: 'Pre-approval Created',  color: 'var(--color-pre-approved)' },
  PASS_SCANNED:         { label: 'Pass Scanned',          color: 'var(--color-checked-in)' },
  PASS_EXPIRED:         { label: 'Pass Expired',          color: 'var(--color-expired)' },
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: 20 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const debounceRef = {};

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit: 20 };
      if (search) params.search = search;
      if (dateRange.start) params.startDate = dateRange.start;
      if (dateRange.end) params.endDate = dateRange.end;
      const res = await auditService.getAuditLogs(params);
      setLogs(res.data.data);
      setPagination(res.data.pagination);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  }, [page, search, dateRange]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const handleSearch = (val) => {
    clearTimeout(debounceRef.t);
    debounceRef.t = setTimeout(() => {
      setSearch(val);
      setPage(1);
    }, 350);
  };

  return (
    <div className="page-container max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="page-title">Audit Logs</h1>
        <p className="page-subtitle">Complete security audit trail of all system actions.</p>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="flex flex-col sm:flex-row gap-3 p-4">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
            <input
              type="text"
              onChange={e => handleSearch(e.target.value)}
              placeholder="Search by actor, action..."
              className="input pl-9"
            />
          </div>
          <input
            type="date"
            value={dateRange.start}
            onChange={e => setDateRange(r => ({ ...r, start: e.target.value }))}
            className="input w-full sm:w-40 text-sm"
          />
          <input
            type="date"
            value={dateRange.end}
            onChange={e => setDateRange(r => ({ ...r, end: e.target.value }))}
            className="input w-full sm:w-40 text-sm"
          />
        </div>
      </div>

      {/* Table */}
      {error ? (
        <ErrorState message={error} onRetry={fetchLogs} />
      ) : loading ? (
        <SkeletonTable rows={10} />
      ) : logs.length === 0 ? (
        <div className="card">
          <EmptyState title="No audit logs found" description="No records match your current filters." />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="table-container">
            <table className="table" aria-label="Audit logs table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const actionConfig = ACTION_LABELS[log.action] || { label: log.action, color: 'var(--color-text-muted)' };
                  return (
                    <tr key={log._id}>
                      <td className="text-xs whitespace-nowrap" style={{ color: 'var(--color-text-muted)' }}>
                        {format(new Date(log.createdAt), 'MMM d, HH:mm:ss')}
                      </td>
                      <td>
                        <div className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                          {log.actorName || log.actor?.name || 'System'}
                        </div>
                        <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                          {log.actor?.role?.replace('_', ' ')}
                        </div>
                      </td>
                      <td>
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                          style={{ backgroundColor: `${actionConfig.color}18`, color: actionConfig.color }}
                        >
                          {actionConfig.label}
                        </span>
                      </td>
                      <td className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{log.entityType || '—'}</td>
                      <td className="text-xs max-w-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
                        {log.metadata ? JSON.stringify(log.metadata).replace(/[{}"]/g, '').replace(/:/g, ': ').slice(0, 80) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination {...pagination} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}

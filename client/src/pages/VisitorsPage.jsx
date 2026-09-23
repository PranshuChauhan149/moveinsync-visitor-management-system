import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Download, Plus, Eye, Trash2 } from 'lucide-react';
import { visitorService } from '../services';
import StatusBadge from '../components/StatusBadge';
import Avatar from '../components/Avatar';
import Pagination from '../components/Pagination';
import { SkeletonTable } from '../components/Skeleton';
import { EmptyState, ErrorState } from '../components/States';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const STATUSES = ['', 'PENDING', 'APPROVED', 'REJECTED', 'CHECKED_IN', 'CHECKED_OUT', 'PRE_APPROVED', 'EXPIRED'];

export default function VisitorsPage() {
  const navigate = useNavigate();
  const { isAdmin, isHost } = useAuth();
  const [visitors, setVisitors] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: 10 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ search: '', status: '', page: 1 });
  const [searchInput, setSearchInput] = useState('');
  const debounceRef = {};

  const fetchVisitors = useCallback(async (f = filters) => {
    setLoading(true);
    setError(null);
    try {
      const params = { page: f.page, limit: 10 };
      if (f.search) params.search = f.search;
      if (f.status) params.status = f.status;
      const res = await visitorService.getVisitors(params);
      setVisitors(res.data.data);
      setPagination(res.data.pagination);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load visitors.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchVisitors(filters); }, [filters]);

  const handleSearch = (val) => {
    setSearchInput(val);
    clearTimeout(debounceRef.t);
    debounceRef.t = setTimeout(() => {
      setFilters(f => ({ ...f, search: val, page: 1 }));
    }, 350);
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete ${name}? This cannot be undone.`)) return;
    try {
      await visitorService.deleteVisitor(id);
      toast.success('Visitor deleted');
      fetchVisitors(filters);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to delete visitor');
    }
  };

  return (
    <div className="page-container max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title">Visitors</h1>
          <p className="page-subtitle">Manage workplace visitors and access activity.</p>
        </div>
        {(isAdmin || isHost) && (
          <button onClick={() => navigate('/invite')} className="btn btn-primary gap-2 self-start sm:self-auto">
            <Plus size={16} />
            Invite Visitor
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="flex flex-col sm:flex-row gap-3 p-4">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search visitors by name, phone, company..."
              className="input pl-9"
            />
          </div>
          <select
            value={filters.status}
            onChange={(e) => setFilters(f => ({ ...f, status: e.target.value, page: 1 }))}
            className="input w-full sm:w-44"
            aria-label="Filter by status"
          >
            <option value="">All Statuses</option>
            {STATUSES.filter(Boolean).map(s => (
              <option key={s} value={s}>{s.replace('_', ' ')}</option>
            ))}
          </select>
          <button className="btn btn-secondary gap-2 flex-shrink-0" aria-label="Filter options">
            <Filter size={14} />
            <span className="hidden sm:inline">Filter</span>
          </button>
          <button className="btn btn-secondary gap-2 flex-shrink-0" aria-label="Export">
            <Download size={14} />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* Table */}
      {error ? (
        <ErrorState message={error} onRetry={() => fetchVisitors(filters)} />
      ) : loading ? (
        <SkeletonTable rows={8} />
      ) : visitors.length === 0 ? (
        <div className="card">
          <EmptyState
            title="No visitors found"
            description={filters.search || filters.status ? 'No visitors match your current filters.' : 'No visitors have been registered yet.'}
            action={filters.search || filters.status ? () => setFilters({ search: '', status: '', page: 1 }) : undefined}
            actionLabel="Clear filters"
          />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="table-container">
            <table className="table" aria-label="Visitors table">
              <thead>
                <tr>
                  <th>Visitor</th>
                  <th>Company</th>
                  <th>Host</th>
                  <th>Purpose</th>
                  <th>Visit Date</th>
                  <th>Time</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visitors.map((v) => (
                  <tr key={v._id}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={v.fullName} src={v.photoUrl} size="sm" />
                        <div>
                          <div className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{v.fullName}</div>
                          <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{v.phone}</div>
                        </div>
                      </div>
                    </td>
                    <td className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{v.company || '—'}</td>
                    <td>
                      <div className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{v.hostId?.name}</div>
                      <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{v.hostId?.department}</div>
                    </td>
                    <td className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{v.purpose}</td>
                    <td className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                      {format(new Date(v.visitDate), 'MMM d, yyyy')}
                    </td>
                    <td className="text-sm whitespace-nowrap" style={{ color: 'var(--color-text-secondary)' }}>
                      {v.startTime} – {v.endTime}
                    </td>
                    <td><StatusBadge status={v.status} /></td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => navigate(`/visitors/${v._id}`)}
                          className="btn-ghost p-1.5 rounded"
                          aria-label={`View ${v.fullName}`}
                        >
                          <Eye size={15} />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => handleDelete(v._id, v.fullName)}
                            className="btn-ghost p-1.5 rounded text-red-500 hover:text-red-700"
                            aria-label={`Delete ${v.fullName}`}
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination {...pagination} onPageChange={(p) => setFilters(f => ({ ...f, page: p }))} />
        </div>
      )}
    </div>
  );
}

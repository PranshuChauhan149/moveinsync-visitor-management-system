/**
 * Front Desk Page
 *
 * Optimized for security staff. Features:
 * - Stats overview (expected, inside, completed, expired)
 * - Pass code / QR verification with backend call
 * - Live search across today's visitors
 * - Tab-filtered visitor list: Expected | Inside | Completed
 * - Check-in / Check-out with confirmation modal
 * - Link to digital pass
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, QrCode, LogIn, LogOut, Loader2, RefreshCw,
  CheckCircle, XCircle, Clock, Calendar, User, Building2,
  Phone, ShieldCheck, AlertTriangle, ExternalLink, Eye,
  Users, UserCheck, UserMinus, AlertCircle,
} from 'lucide-react';
import { visitorService, visitService, passService } from '../services';
import StatusBadge from '../components/StatusBadge';
import Avatar from '../components/Avatar';
import Modal from '../components/Modal';
import { EmptyState, ErrorState } from '../components/States';
import { SkeletonTable } from '../components/Skeleton';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

// ─── Reason messages for failed gate checks ───────────────────────────────────
const GATE_REASON_MESSAGES = {
  'INVALID_STATUS:PENDING':     'This visitor has not been approved yet.',
  'INVALID_STATUS:REJECTED':    'This visitor was rejected and cannot enter.',
  'INVALID_STATUS:EXPIRED':     "This visitor's pass has expired.",
  'INVALID_STATUS:CHECKED_OUT': 'This visitor has already completed their visit.',
  NO_ACTIVE_PASS:               'No active pass found for this visitor.',
  EXPIRED:                      'This visitor pass has expired.',
  REVOKED:                      'This visitor pass has been revoked.',
  ALREADY_USED:                 'This pass has already been used.',
  ALREADY_CHECKED_IN:           'This visitor is already inside.',
  INVALID_PASS:                 'Pass code not found. Please verify the code.',
};

function gateMessage(reason) {
  return GATE_REASON_MESSAGES[reason] || `Entry denied (${reason}).`;
}

// ─── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, count, color, onClick, active }) {
  return (
    <button
      onClick={onClick}
      className="stat-card flex items-start gap-3 text-left transition-all"
      style={{
        outline: active ? `2px solid ${color}` : 'none',
        outlineOffset: '2px',
      }}
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${color}18` }}>
        <Icon size={20} style={{ color }} />
      </div>
      <div>
        <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{count}</p>
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
      </div>
    </button>
  );
}

// ─── Pass verification result card ────────────────────────────────────────────
function PassResultCard({ result, onCheckIn }) {
  if (!result) return null;
  const { valid, reason, visitor, pass } = result;

  if (!valid) {
    return (
      <div className="card p-5 border-2" style={{ borderColor: 'var(--color-rejected)' }}>
        <div className="flex items-center gap-3 mb-3">
          <XCircle size={22} style={{ color: 'var(--color-rejected)' }} />
          <h3 className="font-bold text-base" style={{ color: 'var(--color-rejected)' }}>Invalid Pass</h3>
        </div>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          {gateMessage(reason)}
        </p>
      </div>
    );
  }

  return (
    <div className="card p-5 border-2" style={{ borderColor: 'var(--color-approved)' }}>
      <div className="flex items-center gap-2 mb-4">
        <ShieldCheck size={20} style={{ color: 'var(--color-approved)' }} />
        <h3 className="font-bold text-sm" style={{ color: 'var(--color-approved)' }}>VALID PASS ✓</h3>
      </div>
      <div className="flex items-start gap-4">
        <Avatar name={visitor?.fullName} src={visitor?.photoUrl} size="lg" />
        <div className="flex-1 space-y-2">
          <div>
            <p className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>{visitor?.fullName}</p>
            {visitor?.company && <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{visitor.company}</p>}
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div><span style={{ color: 'var(--color-text-muted)' }}>Purpose: </span><strong>{visitor?.purpose}</strong></div>
            <div><span style={{ color: 'var(--color-text-muted)' }}>Host: </span><strong>{visitor?.hostId?.name}</strong></div>
            <div><span style={{ color: 'var(--color-text-muted)' }}>Time: </span><strong>{visitor?.startTime}–{visitor?.endTime}</strong></div>
            <div><span style={{ color: 'var(--color-text-muted)' }}>Pass: </span><strong className="font-mono">{pass?.passCode}</strong></div>
          </div>
          <StatusBadge status={visitor?.status} />
        </div>
      </div>
      {visitor?.status === 'APPROVED' || visitor?.status === 'PRE_APPROVED' ? (
        <button
          onClick={() => onCheckIn(visitor)}
          className="btn btn-primary w-full mt-4 gap-2 justify-center"
        >
          <LogIn size={15} /> Check In {visitor?.fullName}
        </button>
      ) : (
        <div className="mt-3 text-xs text-center" style={{ color: 'var(--color-text-muted)' }}>
          No check-in action available for status: {visitor?.status}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function FrontDeskPage() {
  const navigate = useNavigate();
  const [todayVisitors, setTodayVisitors] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);
  const [search,        setSearch]        = useState('');
  const [tab,           setTab]           = useState('expected');
  const [actionLoading, setActionLoading] = useState('');
  const [confirmModal,  setConfirmModal]  = useState(null); // { visitor, action }
  const [passCode,      setPassCode]      = useState('');
  const [passResult,    setPassResult]    = useState(null);
  const [passLoading,   setPassLoading]   = useState(false);
  const passInputRef = useRef(null);

  // ── Fetch today's visitors ─────────────────────────────────────────────────
  const fetchVisitors = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await visitorService.getTodaysVisitors();
      setTodayVisitors(res.data.data);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load visitors.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchVisitors(); }, [fetchVisitors]);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = {
    expected:  todayVisitors.filter(v => ['APPROVED', 'PRE_APPROVED'].includes(v.status)).length,
    pending:   todayVisitors.filter(v => v.status === 'PENDING').length,
    inside:    todayVisitors.filter(v => v.status === 'CHECKED_IN').length,
    completed: todayVisitors.filter(v => ['CHECKED_OUT'].includes(v.status)).length,
    expired:   todayVisitors.filter(v => ['EXPIRED', 'REJECTED'].includes(v.status)).length,
  };

  // ── Filtered list by tab + search ─────────────────────────────────────────
  const filtered = todayVisitors.filter(v => {
    const q = search.toLowerCase();
    const matchesSearch = !q
      || v.fullName.toLowerCase().includes(q)
      || v.phone?.includes(q)
      || v._id?.includes(q);
    if (tab === 'expected')  return matchesSearch && ['APPROVED', 'PRE_APPROVED', 'PENDING'].includes(v.status);
    if (tab === 'inside')    return matchesSearch && v.status === 'CHECKED_IN';
    if (tab === 'completed') return matchesSearch && ['CHECKED_OUT'].includes(v.status);
    if (tab === 'expired')   return matchesSearch && ['EXPIRED', 'REJECTED'].includes(v.status);
    return matchesSearch;
  });

  // ── Pass verification ──────────────────────────────────────────────────────
  const verifyPass = async (e) => {
    e?.preventDefault();
    const code = passCode.trim().toUpperCase();
    if (!code) return;
    setPassLoading(true); setPassResult(null);
    try {
      const res = await passService.verifyPass(code);
      setPassResult(res.data);
    } catch (e) {
      setPassResult({ valid: false, reason: 'INVALID_PASS' });
    } finally {
      setPassLoading(false);
    }
  };

  // ── Check-in / check-out ───────────────────────────────────────────────────
  const handleAction = async () => {
    if (!confirmModal) return;
    const { visitor, action } = confirmModal;
    setActionLoading(visitor._id);
    try {
      if (action === 'checkin') {
        await visitService.checkIn(visitor._id);
        toast.success(`✅ ${visitor.fullName} checked in at ${format(new Date(), 'HH:mm')}`);
      } else {
        await visitService.checkOut(visitor._id);
        toast.success(`✅ ${visitor.fullName} checked out at ${format(new Date(), 'HH:mm')}`);
      }
      setConfirmModal(null);
      setPassResult(null);
      setPassCode('');
      await fetchVisitors();
    } catch (e) {
      toast.error(e.response?.data?.message || `${action} failed.`);
    } finally {
      setActionLoading('');
    }
  };

  const openCheckIn  = (v) => setConfirmModal({ visitor: v, action: 'checkin' });
  const openCheckOut = (v) => setConfirmModal({ visitor: v, action: 'checkout' });

  const TABS = [
    { key: 'expected',  label: 'Expected',   count: stats.expected + stats.pending },
    { key: 'inside',    label: 'Inside',     count: stats.inside },
    { key: 'completed', label: 'Completed',  count: stats.completed },
    { key: 'expired',   label: 'Denied/Exp', count: stats.expired },
  ];

  return (
    <div className="page-container max-w-7xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Front Desk</h1>
          <p className="page-subtitle">{format(new Date(), 'EEEE, MMMM d, yyyy')} · Visitor entry management</p>
        </div>
        <button onClick={fetchVisitors} className="btn btn-secondary btn-sm gap-2">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
        <StatCard icon={Calendar}    label="Expected Today"  count={stats.expected}  color="#3b56f5" onClick={() => setTab('expected')}  active={tab === 'expected'} />
        <StatCard icon={Clock}       label="Pending Approval" count={stats.pending}  color="#d97706" onClick={() => setTab('expected')}  active={false} />
        <StatCard icon={UserCheck}   label="Currently Inside" count={stats.inside}   color="#16a34a" onClick={() => setTab('inside')}    active={tab === 'inside'} />
        <StatCard icon={Users}       label="Completed"        count={stats.completed} color="#7c3aed" onClick={() => setTab('completed')} active={tab === 'completed'} />
        <StatCard icon={AlertCircle} label="Denied / Expired" count={stats.expired}  color="#dc2626" onClick={() => setTab('expired')}   active={tab === 'expired'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left panel — QR / Pass verification */}
        <div className="space-y-4">
          <div className="card p-5">
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
              <QrCode size={16} style={{ color: 'var(--color-brand)' }} />
              Pass Verification
            </h2>
            <form onSubmit={verifyPass} className="space-y-3">
              <div>
                <label className="label">Enter Pass Code</label>
                <input
                  ref={passInputRef}
                  type="text"
                  value={passCode}
                  onChange={e => { setPassCode(e.target.value.toUpperCase()); setPassResult(null); }}
                  placeholder="VIS-XXXXXXXX"
                  className="input font-mono uppercase tracking-widest text-center"
                  maxLength={16}
                  autoComplete="off"
                  aria-label="Pass code"
                  id="pass-code-input"
                />
              </div>
              <button
                type="submit"
                disabled={!passCode.trim() || passLoading}
                className="btn btn-primary w-full gap-2 justify-center"
                id="verify-pass-btn"
              >
                {passLoading
                  ? <><Loader2 size={14} className="animate-spin" /> Verifying…</>
                  : <><ShieldCheck size={14} /> Verify Pass</>}
              </button>
            </form>

            {passResult && (
              <div className="mt-4">
                <PassResultCard
                  result={passResult}
                  onCheckIn={openCheckIn}
                />
              </div>
            )}
          </div>

          {/* Quick search hint */}
          <div className="card p-4 text-xs" style={{ color: 'var(--color-text-muted)' }}>
            <p className="font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>💡 Tip</p>
            <p>Enter the pass code exactly as printed on the visitor's e-pass. Pass codes start with <strong>VIS-</strong>.</p>
          </div>
        </div>

        {/* Right panel — Visitor table */}
        <div className="lg:col-span-2 space-y-4">
          {/* Search + tabs */}
          <div className="card p-4 space-y-3">
            {/* Search */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or phone…"
                className="input pl-9"
                aria-label="Search visitors"
                id="visitor-search"
              />
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 rounded-lg" style={{ backgroundColor: 'var(--color-surface-2)' }}>
              {TABS.map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className="flex-1 py-1.5 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-1.5"
                  style={{
                    backgroundColor: tab === t.key ? 'var(--color-surface)' : 'transparent',
                    color:           tab === t.key ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                  }}
                  aria-selected={tab === t.key}
                >
                  {t.label}
                  {t.count > 0 && (
                    <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-xs font-bold text-white"
                      style={{ backgroundColor: tab === t.key ? 'var(--color-brand)' : 'var(--color-text-muted)', minWidth: '1.25rem' }}>
                      {t.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          {error ? (
            <ErrorState message={error} onRetry={fetchVisitors} />
          ) : loading ? (
            <SkeletonTable rows={5} />
          ) : filtered.length === 0 ? (
            <div className="card">
              <EmptyState
                title={search ? `No results for "${search}"` : `No ${tab} visitors today`}
                description={tab === 'expected'
                  ? 'No approved visitors are expected today.'
                  : `No visitors in the ${tab} state.`}
              />
            </div>
          ) : (
            <div className="card overflow-hidden">
              <div className="table-container">
                <table className="table" aria-label="Visitors table">
                  <thead>
                    <tr>
                      <th>Visitor</th>
                      <th>Purpose</th>
                      <th>Host</th>
                      <th>Time</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(v => {
                      const isCheckedIn    = v.status === 'CHECKED_IN';
                      const canCheckIn     = ['APPROVED', 'PRE_APPROVED'].includes(v.status);
                      const isActing       = actionLoading === v._id;
                      return (
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
                          <td className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{v.purpose}</td>
                          <td>
                            <div className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{v.hostId?.name}</div>
                            <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{v.hostId?.department}</div>
                          </td>
                          <td className="text-xs whitespace-nowrap" style={{ color: 'var(--color-text-secondary)' }}>
                            {v.startTime}–{v.endTime}
                          </td>
                          <td><StatusBadge status={v.status} /></td>
                          <td>
                            <div className="flex items-center gap-1">
                              {canCheckIn && (
                                <button
                                  onClick={() => openCheckIn(v)}
                                  disabled={isActing}
                                  className="btn btn-sm gap-1"
                                  style={{ backgroundColor: 'var(--color-approved-bg)', color: 'var(--color-approved)', border: 'none' }}
                                  aria-label={`Check in ${v.fullName}`}
                                  id={`checkin-btn-${v._id}`}
                                >
                                  {isActing ? <Loader2 size={11} className="animate-spin" /> : <LogIn size={11} />}
                                  In
                                </button>
                              )}
                              {isCheckedIn && (
                                <button
                                  onClick={() => openCheckOut(v)}
                                  disabled={isActing}
                                  className="btn btn-sm gap-1"
                                  style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }}
                                  aria-label={`Check out ${v.fullName}`}
                                  id={`checkout-btn-${v._id}`}
                                >
                                  {isActing ? <Loader2 size={11} className="animate-spin" /> : <LogOut size={11} />}
                                  Out
                                </button>
                              )}
                              <button
                                onClick={() => navigate(`/visitors/${v._id}`)}
                                className="btn btn-sm btn-ghost p-1.5"
                                aria-label={`View ${v.fullName}`}
                              >
                                <Eye size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirm check-in/out modal */}
      <Modal
        isOpen={!!confirmModal}
        onClose={() => setConfirmModal(null)}
        title={confirmModal?.action === 'checkin' ? 'Confirm Check-In' : 'Confirm Check-Out'}
      >
        {confirmModal && (
          <>
            <div className="flex items-center gap-4 mb-5 p-4 rounded-xl"
              style={{ backgroundColor: 'var(--color-surface-2)' }}>
              <Avatar name={confirmModal.visitor.fullName} src={confirmModal.visitor.photoUrl} size="lg" />
              <div>
                <p className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>
                  {confirmModal.visitor.fullName}
                </p>
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{confirmModal.visitor.company}</p>
                <div className="flex items-center gap-1.5 mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  <Clock size={11} />
                  {confirmModal.visitor.startTime} – {confirmModal.visitor.endTime}
                </div>
              </div>
            </div>

            <p className="text-sm mb-5" style={{ color: 'var(--color-text-secondary)' }}>
              {confirmModal.action === 'checkin'
                ? `You are about to check in ${confirmModal.visitor.fullName}. This will record the current timestamp and mark the visitor as inside.`
                : `You are about to check out ${confirmModal.visitor.fullName}. This will record the check-out time and mark the visit as complete.`}
            </p>

            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmModal(null)} className="btn btn-secondary">Cancel</button>
              <button
                onClick={handleAction}
                disabled={!!actionLoading}
                className="btn btn-primary gap-2"
                id="confirm-action-btn"
              >
                {actionLoading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : confirmModal.action === 'checkin' ? (
                  <LogIn size={14} />
                ) : (
                  <LogOut size={14} />
                )}
                {confirmModal.action === 'checkin' ? 'Check In' : 'Check Out'}
              </button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}

/**
 * Approvals Page
 *
 * Full approval / rejection workflow for HOST and ADMIN roles.
 * Features:
 *  - Tabs: Pending / Approved / Rejected / Pre-approved
 *  - Inline approve / reject actions on pending requests
 *  - Visitor detail side drawer (click any row)
 *  - Pass QR preview inside the drawer after approval
 *  - Rejection modal with reason field
 *  - Pass card on approved visitors
 *  - Pre-approved visitors section
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle, XCircle, Loader2, AlertCircle, ShieldCheck,
  Clock, Calendar, Building2, Phone, QrCode, ExternalLink,
  RefreshCw, ChevronRight, User,
} from 'lucide-react';
import { approvalService } from '../services';
import StatusBadge from '../components/StatusBadge';
import Avatar from '../components/Avatar';
import Modal from '../components/Modal';
import Drawer from '../components/Drawer';
import Pagination from '../components/Pagination';
import { SkeletonTable } from '../components/Skeleton';
import { EmptyState, ErrorState } from '../components/States';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

// ─── Tab definitions ──────────────────────────────────────────────────────────
const TABS = [
  { key: 'PENDING',     label: 'Pending',      color: 'var(--color-pending)' },
  { key: 'APPROVED',    label: 'Approved',     color: 'var(--color-approved)' },
  { key: 'REJECTED',    label: 'Rejected',     color: 'var(--color-rejected)' },
  { key: 'PRE_APPROVED',label: 'Pre-Approved', color: 'var(--color-pre-approved)' },
];

// ─── Visitor detail drawer ────────────────────────────────────────────────────
function ApprovalDrawer({ approval, onClose, onApprove, onReject, actionLoading }) {
  const navigate = useNavigate();
  if (!approval) return null;
  const v    = approval.visitorId;
  const pass = approval._pass;

  return (
    <Drawer isOpen={!!approval} onClose={onClose} title="Visitor Details" width="520px">
      {/* Visitor identity */}
      <div className="flex items-center gap-4 mb-6">
        <Avatar name={v?.fullName} src={v?.photoUrl} size="xl" />
        <div>
          <h3 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>{v?.fullName}</h3>
          {v?.company && <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{v.company}</p>}
          <div className="mt-2"><StatusBadge status={v?.status} /></div>
        </div>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {[
          { icon: Phone,     label: 'Phone',       value: v?.phone },
          { icon: Building2, label: 'Company',     value: v?.company || '—' },
          { icon: User,      label: 'Purpose',     value: v?.purpose },
          { icon: User,      label: 'Host',        value: approval.hostId?.name },
          { icon: Calendar,  label: 'Visit Date',  value: v?.visitDate ? format(new Date(v.visitDate), 'MMM d, yyyy') : '—' },
          { icon: Clock,     label: 'Time Window', value: `${v?.startTime} – ${v?.endTime}` },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label}>
            <div className="flex items-center gap-1.5 mb-0.5">
              <Icon size={12} style={{ color: 'var(--color-text-muted)' }} />
              <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
            </div>
            <p className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Pre-approval badge */}
      {v?.isPreApproved && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg mb-4 text-sm font-medium"
          style={{ backgroundColor: 'var(--color-pre-approved-bg)', color: 'var(--color-pre-approved)' }}>
          <ShieldCheck size={15} />
          This visitor was pre-approved
        </div>
      )}

      {/* Notes */}
      {v?.notes && (
        <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: 'var(--color-surface-2)' }}>
          <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>Notes</p>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{v.notes}</p>
        </div>
      )}

      {/* Rejection reason */}
      {approval.status === 'REJECTED' && approval.remarks && (
        <div className="mb-4 p-3 rounded-lg border" style={{ backgroundColor: 'var(--color-rejected-bg)', borderColor: 'var(--color-rejected)', borderStyle: 'solid' }}>
          <p className="text-xs font-semibold mb-1" style={{ color: 'var(--color-rejected)' }}>Rejection Reason</p>
          <p className="text-sm" style={{ color: 'var(--color-rejected)' }}>{approval.remarks}</p>
          {approval.rejectedAt && (
            <p className="text-xs mt-1" style={{ color: 'var(--color-rejected)', opacity: 0.7 }}>
              {format(new Date(approval.rejectedAt), 'MMM d, yyyy HH:mm')}
            </p>
          )}
        </div>
      )}

      {/* QR Pass */}
      {pass && (
        <div className="mb-6 p-4 rounded-xl text-center border" style={{ borderColor: 'var(--color-border)' }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--color-text-muted)' }}>Visitor Pass</p>
          <img src={pass.qrCodeDataUrl} alt="QR Pass" className="w-36 h-36 mx-auto rounded-lg mb-2" />
          <p className="font-mono text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>{pass.passCode}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Valid {format(new Date(pass.validFrom), 'HH:mm')} – {format(new Date(pass.validUntil), 'HH:mm')}
          </p>
          <StatusBadge status={pass.status} />
        </div>
      )}

      {/* Actions */}
      <div className="space-y-2 pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
        {approval.status === 'PENDING' && (
          <>
            <button
              onClick={() => onApprove(approval)}
              disabled={!!actionLoading}
              className="btn btn-primary w-full gap-2 justify-center"
              id={`drawer-approve-${approval._id}`}
            >
              {actionLoading === approval._id + '_approve'
                ? <Loader2 size={16} className="animate-spin" />
                : <CheckCircle size={16} />}
              Approve Visitor
            </button>
            <button
              onClick={() => onReject(approval)}
              disabled={!!actionLoading}
              className="btn btn-danger w-full gap-2 justify-center"
              id={`drawer-reject-${approval._id}`}
            >
              <XCircle size={16} /> Reject Visitor
            </button>
          </>
        )}
        <button
          onClick={() => { onClose(); navigate(`/visitors/${v?._id}`); }}
          className="btn btn-secondary w-full gap-2 justify-center"
        >
          <ExternalLink size={14} /> View Full Profile
        </button>
      </div>
    </Drawer>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function ApprovalsPage() {
  const { isAdmin, isHost } = useAuth();
  const [tab,           setTab]           = useState('PENDING');
  const [approvals,     setApprovals]     = useState([]);
  const [pagination,    setPagination]    = useState({ page: 1, pages: 1, total: 0, limit: 10 });
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);
  const [page,          setPage]          = useState(1);
  const [selectedApproval, setSelectedApproval] = useState(null); // drawer
  const [rejectModal,   setRejectModal]   = useState(null);
  const [rejectReason,  setRejectReason]  = useState('');
  const [actionLoading, setActionLoading] = useState('');

  const fetchApprovals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit: 10 };
      if (tab !== 'ALL') params.status = tab;
      const res = await approvalService.getApprovals(params);
      setApprovals(res.data.data);
      setPagination(res.data.pagination);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load approvals.');
    } finally {
      setLoading(false);
    }
  }, [tab, page]);

  useEffect(() => { fetchApprovals(); }, [fetchApprovals]);
  useEffect(() => { setPage(1); }, [tab]);

  // ── Approve ──────────────────────────────────────────────────────────────────
  const handleApprove = async (approval) => {
    setActionLoading(approval._id + '_approve');
    try {
      const res = await approvalService.approveVisitor(approval._id);
      toast.success('✅ Visitor approved! Pass generated successfully.');
      setSelectedApproval(null);
      fetchApprovals();

      // Show pass code in toast for quick reference
      if (res.data.pass?.passCode) {
        setTimeout(() => toast.success(`Pass code: ${res.data.pass.passCode}`, { icon: '🎟️', duration: 5000 }), 600);
      }
    } catch (e) {
      toast.error(e.response?.data?.message || 'Approval failed.');
    } finally {
      setActionLoading('');
    }
  };

  // ── Reject ──────────────────────────────────────────────────────────────────
  const handleOpenReject = (approval) => {
    setRejectModal(approval);
    setRejectReason('');
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    setActionLoading(rejectModal._id + '_reject');
    try {
      await approvalService.rejectVisitor(rejectModal._id, { remarks: rejectReason });
      toast.success('Visitor rejected.');
      setRejectModal(null);
      setRejectReason('');
      setSelectedApproval(null);
      fetchApprovals();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Rejection failed.');
    } finally {
      setActionLoading('');
    }
  };

  // ── Tab counts ────────────────────────────────────────────────────────────────
  const tabCounts = approvals.reduce((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {});

  const tabLabel = (t) => {
    const count = t.key === tab ? pagination.total : undefined;
    return count !== undefined ? `${t.label} (${count})` : t.label;
  };

  return (
    <div className="page-container max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Visitor Approvals</h1>
          <p className="page-subtitle">
            {isHost ? 'Review and approve visitors assigned to you.' : 'Manage all visitor approval requests.'}
          </p>
        </div>
        <button onClick={fetchApprovals} className="btn btn-secondary btn-sm gap-2">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl mb-6 w-fit" style={{ backgroundColor: 'var(--color-surface-2)' }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 flex items-center gap-2"
            style={{
              backgroundColor: tab === t.key ? 'var(--color-surface)' : 'transparent',
              color:           tab === t.key ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
              boxShadow:       tab === t.key ? 'var(--tw-shadow-sm)' : 'none',
            }}
            aria-selected={tab === t.key}
          >
            {tabLabel(t)}
            {t.key === 'PENDING' && pagination.total > 0 && tab === 'PENDING' && (
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold text-white"
                style={{ backgroundColor: 'var(--color-pending)' }}>
                {pagination.total}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {error ? (
        <ErrorState message={error} onRetry={fetchApprovals} />
      ) : loading ? (
        <SkeletonTable rows={6} />
      ) : approvals.length === 0 ? (
        <div className="card">
          <EmptyState
            title={tab === 'PENDING' ? 'No pending approvals 🎉' : `No ${tab.toLowerCase().replace('_', '-')} approvals`}
            description={tab === 'PENDING'
              ? "You're all caught up! No visitors are waiting for approval."
              : `No approvals found in this status.`}
          />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="table-container">
            <table className="table" aria-label="Approvals table">
              <thead>
                <tr>
                  <th>Visitor</th>
                  <th>Purpose</th>
                  <th>Host</th>
                  <th>Visit Date</th>
                  <th>Time</th>
                  <th>Status</th>
                  {tab === 'PENDING' && <th>Actions</th>}
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {approvals.map((a) => {
                  const v = a.visitorId;
                  if (!v) return null;
                  const isApproving = actionLoading === a._id + '_approve';
                  const isRejecting = actionLoading === a._id + '_reject';
                  return (
                    <tr
                      key={a._id}
                      className="cursor-pointer hover:bg-[var(--color-surface-2)]"
                      onClick={() => setSelectedApproval({ ...a, _pass: null })}
                    >
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
                        <div className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{a.hostId?.name}</div>
                        <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{a.hostId?.department}</div>
                      </td>
                      <td className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                        {v.visitDate ? format(new Date(v.visitDate), 'MMM d, yyyy') : '—'}
                      </td>
                      <td className="text-sm whitespace-nowrap" style={{ color: 'var(--color-text-secondary)' }}>
                        {v.startTime}–{v.endTime}
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        {tab === 'REJECTED' && a.remarks ? (
                          <div className="group relative inline-block">
                            <StatusBadge status="REJECTED" />
                            <div className="hidden group-hover:block absolute left-0 bottom-full mb-1 z-20 p-2 rounded-lg shadow-xl text-xs w-52"
                              style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                              <span className="font-semibold block mb-0.5" style={{ color: 'var(--color-rejected)' }}>Reason:</span>
                              {a.remarks}
                            </div>
                          </div>
                        ) : (
                          <StatusBadge status={a.status} />
                        )}
                      </td>
                      {tab === 'PENDING' && (
                        <td onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleApprove(a)}
                              disabled={!!actionLoading}
                              className="btn btn-sm gap-1"
                              style={{ backgroundColor: 'var(--color-approved-bg)', color: 'var(--color-approved)', border: 'none' }}
                              aria-label={`Approve ${v.fullName}`}
                              id={`approve-btn-${a._id}`}
                            >
                              {isApproving ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle size={11} />}
                              Approve
                            </button>
                            <button
                              onClick={() => handleOpenReject(a)}
                              disabled={!!actionLoading}
                              className="btn btn-sm gap-1"
                              style={{ backgroundColor: 'var(--color-rejected-bg)', color: 'var(--color-rejected)', border: 'none' }}
                              aria-label={`Reject ${v.fullName}`}
                              id={`reject-btn-${a._id}`}
                            >
                              {isRejecting ? <Loader2 size={11} className="animate-spin" /> : <XCircle size={11} />}
                              Reject
                            </button>
                          </div>
                        </td>
                      )}
                      <td>
                        <ChevronRight size={14} style={{ color: 'var(--color-text-muted)' }} />
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

      {/* Visitor Detail Drawer */}
      <ApprovalDrawer
        approval={selectedApproval}
        onClose={() => setSelectedApproval(null)}
        onApprove={handleApprove}
        onReject={handleOpenReject}
        actionLoading={actionLoading}
      />

      {/* Reject Modal */}
      <Modal
        isOpen={!!rejectModal}
        onClose={() => { setRejectModal(null); setRejectReason(''); }}
        title="Reject Visitor"
      >
        {rejectModal && (
          <>
            {/* Warning banner */}
            <div className="flex items-start gap-3 p-3 rounded-lg mb-4"
              style={{ backgroundColor: 'var(--color-rejected-bg)' }}>
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--color-rejected)' }} />
              <p className="text-sm" style={{ color: 'var(--color-rejected)' }}>
                You are about to reject{' '}
                <strong>{rejectModal.visitorId?.fullName}</strong>
                {rejectModal.visitorId?.company ? ` from ${rejectModal.visitorId.company}` : ''}.
                This action will deny their entry.
              </p>
            </div>

            <label className="label">
              Reason for rejection
              <span className="text-xs font-normal ml-1" style={{ color: 'var(--color-text-muted)' }}>(recommended)</span>
            </label>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              className="input resize-none"
              rows={3}
              placeholder="e.g., Unverified identity, access not on permitted list, scheduling conflict..."
              autoFocus
              maxLength={500}
            />
            <p className="text-xs mt-1 text-right" style={{ color: 'var(--color-text-muted)' }}>
              {rejectReason.length}/500
            </p>

            <div className="flex gap-3 mt-5 justify-end">
              <button
                onClick={() => { setRejectModal(null); setRejectReason(''); }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading === rejectModal._id + '_reject'}
                className="btn btn-danger gap-2"
                id="confirm-reject-btn"
              >
                {actionLoading === rejectModal._id + '_reject' && <Loader2 size={14} className="animate-spin" />}
                Confirm Rejection
              </button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}

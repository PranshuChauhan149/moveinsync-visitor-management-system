import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, LogIn, LogOut, QrCode, Loader2, Printer } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { visitorService, approvalService, visitService, passService } from '../services';
import StatusBadge from '../components/StatusBadge';
import Avatar from '../components/Avatar';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

function TimelineItem({ label, time, done }) {
  return (
    <div className="flex items-start gap-3">
      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${done ? 'bg-green-100' : 'bg-gray-100'}`}>
        <div className={`w-2 h-2 rounded-full ${done ? 'bg-green-500' : 'bg-gray-300'}`} />
      </div>
      <div>
        <div className="text-sm font-medium" style={{ color: done ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}>{label}</div>
        {time && <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{time}</div>}
      </div>
    </div>
  );
}

export default function VisitorDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin, isHost, isFrontDesk } = useAuth();
  const [visitor, setVisitor] = useState(null);
  const [approval, setApproval] = useState(null);
  const [pass, setPass] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      // Visitor detail — all authenticated roles can access
      const vRes = await visitorService.getVisitorById(id);
      setVisitor(vRes.data.data);

      // Approval fetch — only ADMIN and HOST have permission
      // FRONT_DESK gets 403, so skip it for them
      if (!isFrontDesk) {
        try {
          await approvalService.getApprovals({ limit: 1 });
        } catch {}
      }

      // Pass fetch — silently ignore if not found / no permission
      try {
        const pRes = await passService.getPassByVisitor(id);
        setPass(pRes.data.data);
      } catch {}

    } catch (e) {
      // Only show error + redirect on visitor fetch failure (true 403/404)
      toast.error(e.response?.data?.message || 'Failed to load visitor details.');
      navigate('/visitors');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [id]);

  const handleApprove = async () => {
    setActionLoading('approve');
    try {
      const aRes = await approvalService.getApprovals({ limit: 100 });
      const appr = aRes.data.data.find(a => a.visitorId?._id === id || a.visitorId === id);
      if (!appr) { toast.error('Approval record not found.'); return; }
      await approvalService.approveVisitor(appr._id);
      toast.success('Visitor approved and pass generated!');
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Approval failed.');
    } finally {
      setActionLoading('');
    }
  };

  const handleReject = async () => {
    setActionLoading('reject');
    try {
      const aRes = await approvalService.getApprovals({ limit: 100 });
      const appr = aRes.data.data.find(a => a.visitorId?._id === id || a.visitorId === id);
      if (!appr) { toast.error('Approval record not found.'); return; }
      await approvalService.rejectVisitor(appr._id, { remarks: rejectReason });
      toast.success('Visitor rejected.');
      setRejectModal(false);
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Rejection failed.');
    } finally {
      setActionLoading('');
    }
  };

  const handleCheckIn = async () => {
    setActionLoading('checkin');
    try {
      await visitService.checkIn(id);
      toast.success('Visitor checked in!');
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Check-in failed.');
    } finally {
      setActionLoading('');
    }
  };

  const handleCheckOut = async () => {
    setActionLoading('checkout');
    try {
      await visitService.checkOut(id);
      toast.success('Visitor checked out!');
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Check-out failed.');
    } finally {
      setActionLoading('');
    }
  };

  if (loading) {
    return (
      <div className="page-container flex items-center justify-center min-h-64">
        <Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-brand)' }} />
      </div>
    );
  }

  if (!visitor) return null;

  const isApproved = visitor.status === 'APPROVED';
  const isPending = visitor.status === 'PENDING';
  const isCheckedIn = visitor.status === 'CHECKED_IN';
  const canApproveReject = (isAdmin || isHost) && isPending;
  const canCheckIn = (isAdmin || isFrontDesk) && (isApproved || visitor.status === 'PRE_APPROVED');
  const canCheckOut = (isAdmin || isFrontDesk) && isCheckedIn;

  return (
    <div className="page-container max-w-4xl mx-auto">
      {/* Back */}
      <button onClick={() => navigate('/visitors')} className="btn-ghost flex items-center gap-2 mb-6 -ml-1">
        <ArrowLeft size={16} />
        <span className="text-sm">Back to Visitors</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left panel */}
        <div className="space-y-4">
          {/* Visitor card */}
          <div className="card p-6 text-center">
            <div className="flex justify-center mb-4">
              <Avatar name={visitor.fullName} src={visitor.photoUrl} size="2xl" />
            </div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>{visitor.fullName}</h2>
            {visitor.company && <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>{visitor.company}</p>}
            <div className="mt-3 flex justify-center"><StatusBadge status={visitor.status} /></div>
          </div>

          {/* QR Pass */}
          {pass && (
            <div className="card p-5 text-center">
              <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text-muted)' }}>Visitor Pass</div>
              <div className="w-40 h-40 mx-auto rounded-lg overflow-hidden bg-white p-2 flex items-center justify-center">
                <QRCodeSVG
                  value={pass.qrPayload || pass.passCode}
                  size={144}
                  bgColor="#ffffff"
                  fgColor="#0f172a"
                  level="M"
                />
              </div>
              <div className="mt-2 text-xs font-mono font-semibold" style={{ color: 'var(--color-text-primary)' }}>{pass.passCode}</div>
              <StatusBadge status={pass.status} />
              <button
                onClick={() => navigate(`/visitors/${id}/pass`)}
                className="btn btn-secondary btn-sm mt-3 gap-2 w-full"
                id="view-pass-btn"
              >
                <Printer size={14} />
                Print / View Full Pass
              </button>
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="lg:col-span-2 space-y-4">
          {/* Info */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>Visit Information</h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              {[
                { label: 'Phone', value: visitor.phone },
                { label: 'Email', value: visitor.email || '—' },
                { label: 'Company', value: visitor.company || '—' },
                { label: 'Purpose', value: visitor.purpose },
                { label: 'Host', value: visitor.hostId?.name },
                { label: 'Department', value: visitor.hostId?.department || visitor.department },
                { label: 'Visit Date', value: format(new Date(visitor.visitDate), 'MMMM d, yyyy') },
                { label: 'Time Window', value: `${visitor.startTime} – ${visitor.endTime}` },
                { label: 'Pre-approved', value: visitor.isPreApproved ? 'Yes' : 'No' },
                { label: 'Created', value: format(new Date(visitor.createdAt), 'MMM d, yyyy HH:mm') },
              ].map(({ label, value }) => (
                <div key={label}>
                  <dt className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>{label}</dt>
                  <dd className="text-sm mt-0.5" style={{ color: 'var(--color-text-primary)' }}>{value}</dd>
                </div>
              ))}
            </dl>
            {visitor.notes && (
              <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <dt className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>Notes</dt>
                <dd className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{visitor.notes}</dd>
              </div>
            )}
          </div>

          {/* Approval timeline */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>Approval Timeline</h3>
            <div className="space-y-3">
              <TimelineItem label="Visit request created" time={format(new Date(visitor.createdAt), 'MMM d, HH:mm')} done />
              <TimelineItem label="Approval requested from host" done={visitor.status !== 'PENDING'} />
              <TimelineItem label="Approved by host" done={['APPROVED','CHECKED_IN','CHECKED_OUT','PRE_APPROVED'].includes(visitor.status)} />
              <TimelineItem label="Visitor pass generated" done={!!pass} />
              <TimelineItem label="Checked in" done={['CHECKED_IN','CHECKED_OUT'].includes(visitor.status)} />
              <TimelineItem label="Checked out" done={visitor.status === 'CHECKED_OUT'} />
            </div>
          </div>

          {/* Actions */}
          {(canApproveReject || canCheckIn || canCheckOut) && (
            <div className="flex flex-wrap gap-3">
              {canApproveReject && (
                <>
                  <button
                    onClick={handleApprove}
                    disabled={actionLoading === 'approve'}
                    className="btn btn-primary gap-2"
                  >
                    {actionLoading === 'approve' ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                    Approve
                  </button>
                  <button
                    onClick={() => setRejectModal(true)}
                    disabled={actionLoading === 'reject'}
                    className="btn btn-danger gap-2"
                  >
                    <XCircle size={14} />
                    Reject
                  </button>
                </>
              )}
              {canCheckIn && (
                <button onClick={handleCheckIn} disabled={actionLoading === 'checkin'} className="btn btn-primary gap-2">
                  {actionLoading === 'checkin' ? <Loader2 size={14} className="animate-spin" /> : <LogIn size={14} />}
                  Check In
                </button>
              )}
              {canCheckOut && (
                <button onClick={handleCheckOut} disabled={actionLoading === 'checkout'} className="btn btn-secondary gap-2">
                  {actionLoading === 'checkout' ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
                  Check Out
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Reject modal */}
      <Modal isOpen={rejectModal} onClose={() => setRejectModal(false)} title="Reject Visitor">
        <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
          Please provide a reason for rejecting <strong>{visitor.fullName}</strong>.
        </p>
        <label className="label">Reason for rejection</label>
        <textarea
          value={rejectReason}
          onChange={e => setRejectReason(e.target.value)}
          className="input resize-none"
          rows={3}
          placeholder="e.g., Unverified identity, not on approved list..."
        />
        <div className="flex gap-3 mt-5 justify-end">
          <button onClick={() => setRejectModal(false)} className="btn btn-secondary">Cancel</button>
          <button
            onClick={handleReject}
            disabled={actionLoading === 'reject'}
            className="btn btn-danger gap-2"
          >
            {actionLoading === 'reject' ? <Loader2 size={14} className="animate-spin" /> : null}
            Reject Visitor
          </button>
        </div>
      </Modal>
    </div>
  );
}

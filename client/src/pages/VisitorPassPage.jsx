/**
 * Visitor Pass Page — /visitors/:id/pass
 *
 * Premium printable digital pass for an approved visitor.
 * Uses QRCode from qrcode.react to render the QR from the backend-stored qrPayload.
 * Print-friendly CSS isolates only the pass card when printing.
 */
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import {
  Printer, ArrowLeft, Shield, Calendar, Clock,
  Building2, User, Phone, CheckCircle, XCircle, AlertCircle,
  Download,
} from 'lucide-react';
import { visitorService, passService } from '../services';
import Avatar from '../components/Avatar';
import StatusBadge from '../components/StatusBadge';
import { format } from 'date-fns';

// ─── Status icons ─────────────────────────────────────────────────────────────
const PassStatusIcon = ({ status }) => {
  if (status === 'ACTIVE')  return <CheckCircle size={16} className="text-green-500" />;
  if (status === 'USED')    return <CheckCircle size={16} className="text-blue-500" />;
  if (status === 'EXPIRED') return <AlertCircle size={16} className="text-amber-500" />;
  if (status === 'REVOKED') return <XCircle     size={16} className="text-red-500" />;
  return null;
};

export default function VisitorPassPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [visitor, setVisitor] = useState(null);
  const [pass,    setPass]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [vRes, pRes] = await Promise.all([
          visitorService.getVisitorById(id),
          passService.getPassByVisitor(id).catch(() => null),
        ]);
        setVisitor(vRes.data.data);
        setPass(pRes?.data?.data || null);
      } catch (e) {
        setError(e.response?.data?.message || 'Could not load pass.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="page-container flex items-center justify-center min-h-64">
        <div className="animate-spin w-8 h-8 rounded-full border-4" style={{ borderColor: 'var(--color-brand)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (error || !visitor) {
    return (
      <div className="page-container max-w-md mx-auto text-center py-16">
        <AlertCircle size={48} className="mx-auto mb-4 text-red-400" />
        <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>Pass not found</h2>
        <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>{error || 'This visitor or pass does not exist.'}</p>
        <button onClick={() => navigate(-1)} className="btn btn-secondary gap-2">
          <ArrowLeft size={14} /> Go Back
        </button>
      </div>
    );
  }

  const hasPass   = !!pass;
  const qrPayload = pass?.qrPayload || JSON.stringify({ passCode: 'NO-PASS', visitorId: id, issuedAt: new Date().toISOString() });

  const passStatusColors = {
    ACTIVE:  { bg: '#dcfce7', text: '#16a34a', border: '#16a34a' },
    USED:    { bg: '#dbeafe', text: '#1d4ed8', border: '#1d4ed8' },
    EXPIRED: { bg: '#fef3c7', text: '#d97706', border: '#d97706' },
    REVOKED: { bg: '#fee2e2', text: '#dc2626', border: '#dc2626' },
  };
  const psColor = pass?.status ? (passStatusColors[pass.status] || passStatusColors.EXPIRED) : passStatusColors.REVOKED;

  return (
    <>
      {/* Print-only styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .printable-pass, .printable-pass * { visibility: visible; }
          .printable-pass { position: fixed; top: 0; left: 0; width: 100%; }
          .no-print { display: none !important; }
          @page { size: A5 landscape; margin: 12mm; }
        }
      `}</style>

      <div className="page-container max-w-2xl mx-auto">
        {/* Header — hidden on print */}
        <div className="no-print flex items-center justify-between mb-6">
          <button onClick={() => navigate(-1)} className="btn-ghost flex items-center gap-2 text-sm">
            <ArrowLeft size={16} /> Back
          </button>
          <div className="flex gap-2">
            <button onClick={handlePrint} className="btn btn-secondary gap-2">
              <Printer size={14} /> Print Pass
            </button>
          </div>
        </div>

        {/* Pass card */}
        <div
          className="printable-pass rounded-2xl overflow-hidden shadow-2xl"
          style={{ border: `2px solid ${psColor.border}` }}
        >
          {/* Header band */}
          <div className="px-8 py-5 flex items-center justify-between"
            style={{ background: 'linear-gradient(135deg, #1b22a6, #3b56f5)' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Shield size={20} className="text-white" />
              </div>
              <div>
                <p className="text-white/70 text-xs font-medium tracking-widest uppercase">MoveInSync</p>
                <p className="text-white text-base font-bold tracking-wide">Visitor Management</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-white/70 text-xs">Pass Status</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <PassStatusIcon status={pass?.status} />
                <span className="text-white font-bold text-sm">{pass?.status || 'NO PASS'}</span>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-8" style={{ backgroundColor: 'var(--color-surface)' }}>
            <div className="flex gap-8">
              {/* Left — Visitor info */}
              <div className="flex-1 space-y-4">
                {/* Identity */}
                <div className="flex items-center gap-4">
                  <Avatar name={visitor.fullName} src={visitor.photoUrl} size="2xl" />
                  <div>
                    <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                      {visitor.fullName}
                    </h2>
                    {visitor.company && (
                      <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                        {visitor.company}
                      </p>
                    )}
                    <div className="mt-2"><StatusBadge status={visitor.status} /></div>
                  </div>
                </div>

                {/* Details grid */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-3 pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
                  {[
                    { icon: Phone,     label: 'Phone',      value: visitor.phone },
                    { icon: Building2, label: 'Company',    value: visitor.company || '—' },
                    { icon: User,      label: 'Purpose',    value: visitor.purpose },
                    { icon: User,      label: 'Host',       value: visitor.hostId?.name },
                    { icon: Building2, label: 'Department', value: visitor.hostId?.department || '—' },
                    { icon: Calendar,  label: 'Visit Date', value: visitor.visitDate ? format(new Date(visitor.visitDate), 'EEE, MMM d yyyy') : '—' },
                  ].map(({ icon: Icon, label, value }) => (
                    <div key={label}>
                      <div className="flex items-center gap-1 mb-0.5">
                        <Icon size={11} style={{ color: 'var(--color-text-muted)' }} />
                        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
                      </div>
                      <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{value}</p>
                    </div>
                  ))}
                </div>

                {/* Time window */}
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
                  style={{ backgroundColor: 'var(--color-surface-2)' }}>
                  <Clock size={16} style={{ color: 'var(--color-brand)' }} />
                  <div>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Authorized Visit Window</p>
                    <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
                      {visitor.startTime} – {visitor.endTime}
                    </p>
                  </div>
                </div>
              </div>

              {/* Right — QR code */}
              <div className="flex flex-col items-center justify-start gap-3 pl-6 border-l" style={{ borderColor: 'var(--color-border)' }}>
                <div className="p-3 rounded-xl bg-white shadow-inner">
                  <QRCodeSVG
                    value={qrPayload}
                    size={160}
                    bgColor="#ffffff"
                    fgColor="#0f172a"
                    level="M"
                    includeMargin={false}
                  />
                </div>
                <div className="text-center">
                  <p className="font-mono text-xs font-bold tracking-widest"
                    style={{ color: 'var(--color-text-primary)' }}>
                    {pass?.passCode || 'NO-PASS'}
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Scan at entry</p>
                </div>
                {pass && (
                  <div className="text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    <p>Valid from</p>
                    <p className="font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                      {format(new Date(pass.validFrom),  'HH:mm')} –{' '}
                      {format(new Date(pass.validUntil), 'HH:mm')}
                    </p>
                    <p className="mt-1">{format(new Date(pass.validFrom), 'MMM d, yyyy')}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-8 py-3 flex items-center justify-between"
            style={{ backgroundColor: 'var(--color-surface-2)', borderTop: '1px solid var(--color-border)' }}>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              Issued by MoveInSync VMS · This pass is non-transferable
            </p>
            {pass?.createdAt && (
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Issued: {format(new Date(pass.createdAt), 'MMM d, yyyy HH:mm')}
              </p>
            )}
          </div>
        </div>

        {/* No-pass warning */}
        {!hasPass && (
          <div className="no-print mt-4 p-4 rounded-xl flex items-start gap-3"
            style={{ backgroundColor: 'var(--color-rejected-bg)' }}>
            <AlertCircle size={16} style={{ color: 'var(--color-rejected)' }} className="flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--color-rejected)' }}>No pass generated yet</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-rejected)', opacity: 0.8 }}>
                A pass is generated automatically when the host approves this visitor.
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

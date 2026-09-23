// StatusBadge — maps visitor status to a styled badge
const STATUS_CONFIG = {
  PENDING:      { label: 'Pending',      cls: 'badge-pending' },
  APPROVED:     { label: 'Approved',     cls: 'badge-approved' },
  REJECTED:     { label: 'Rejected',     cls: 'badge-rejected' },
  CHECKED_IN:   { label: 'Checked In',   cls: 'badge-checked-in' },
  CHECKED_OUT:  { label: 'Checked Out',  cls: 'badge-checked-out' },
  PRE_APPROVED: { label: 'Pre-approved', cls: 'badge-pre-approved' },
  EXPIRED:      { label: 'Expired',      cls: 'badge-expired' },
  CANCELLED:    { label: 'Cancelled',    cls: 'badge-expired' },
};

export default function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || { label: status, cls: 'badge-expired' };
  return <span className={`badge ${config.cls}`}>{config.label}</span>;
}

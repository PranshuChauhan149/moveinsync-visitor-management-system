/**
 * Invite Visitor Page
 *
 * Fully validated multi-section form for registering a new visitor.
 * Connects directly to POST /api/visitors — no mock data.
 *
 * Sections:
 *  1. Visitor Information  (name, phone, email, company, photo)
 *  2. Visit Details        (purpose, host, department, date, time, notes)
 *  3. Access Settings      (pre-approval toggle)
 */
import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Upload, Camera, Loader2,
  ToggleLeft, ToggleRight, User, Phone, Mail, Building2,
  Briefcase, Calendar, Clock, FileText, CheckCircle, AlertCircle, X,
} from 'lucide-react';
import { visitorService } from '../services';
import EmployeeSearch from '../components/EmployeeSearch';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

// ─── Constants ───────────────────────────────────────────────────────────────
const PURPOSES = [
  'Meeting', 'Interview', 'Delivery', 'Maintenance',
  'Vendor', 'Business Guest', 'Government Official', 'Personnel', 'Other',
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[\+]?[\d\s\-\(\)]{7,20}$/;
const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5 MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const today = () => new Date().toISOString().split('T')[0];

const timeToMinutes = (t) => {
  if (!t) return -1;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

// ─── Form field error display ─────────────────────────────────────────────────
function FieldError({ msg }) {
  if (!msg) return null;
  return (
    <p className="flex items-center gap-1 text-xs mt-1.5 text-red-500" role="alert">
      <AlertCircle size={11} className="flex-shrink-0" />
      {msg}
    </p>
  );
}

// ─── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ step, title, subtitle }) {
  return (
    <div className="flex items-start gap-4 mb-6 pb-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
        style={{ background: 'var(--color-brand)' }}
      >
        {step}
      </div>
      <div>
        <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{title}</h2>
        {subtitle && <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{subtitle}</p>}
      </div>
    </div>
  );
}

// ─── Form input wrapper ────────────────────────────────────────────────────────
function FormField({ label, required, error, hint, children }) {
  return (
    <div>
      <label className="label">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{hint}</p>}
      <FieldError msg={error} />
    </div>
  );
}

// ─── Photo Upload ──────────────────────────────────────────────────────────────
function PhotoUploader({ photo, preview, onChange, error }) {
  const inputRef = useRef(null);

  const handleFile = (file) => {
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error('Only JPEG, PNG, or WebP images are accepted.');
      return;
    }
    if (file.size > MAX_PHOTO_SIZE) {
      toast.error('Photo must be smaller than 5 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => onChange(file, e.target.result);
    reader.readAsDataURL(file);
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }, []);

  const handleDragOver = (e) => e.preventDefault();

  return (
    <div>
      <label className="label">Visitor Photo <span className="text-xs font-normal" style={{ color: 'var(--color-text-muted)' }}>(optional)</span></label>
      <div
        className="flex items-start gap-5"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        {/* Preview */}
        <div
          className="w-24 h-24 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0 border-2 border-dashed relative group cursor-pointer"
          style={{ borderColor: error ? '#dc2626' : 'var(--color-border)' }}
          onClick={() => inputRef.current?.click()}
        >
          {preview ? (
            <>
              <img src={preview} alt="Visitor preview" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera size={18} className="text-white" />
              </div>
            </>
          ) : (
            <div className="text-center p-2">
              <Camera size={22} className="mx-auto mb-1" style={{ color: 'var(--color-text-muted)' }} />
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Click or drag</span>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="space-y-2 flex-1">
          <label
            htmlFor="photo-upload"
            className="btn btn-secondary btn-sm gap-2 cursor-pointer inline-flex"
          >
            <Upload size={13} />
            {preview ? 'Change Photo' : 'Upload Photo'}
            <input
              id="photo-upload"
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </label>
          {preview && (
            <button
              type="button"
              className="btn btn-ghost btn-sm gap-1.5 text-red-500 hover:text-red-600"
              onClick={() => onChange(null, null)}
            >
              <X size={13} /> Remove
            </button>
          )}
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            JPEG, PNG or WebP · max 5 MB · drag & drop supported
          </p>
        </div>
      </div>
      <FieldError msg={error} />
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function InviteVisitorPage() {
  const navigate = useNavigate();
  const { user }  = useAuth();

  // Form state
  const [form, setForm] = useState({
    fullName:  '',
    phone:     '',
    email:     '',
    company:   '',
    purpose:   'Meeting',
    department: '',
    visitDate: today(),
    startTime: '10:00',
    endTime:   '11:00',
    notes:     '',
  });
  const [host, setHost]             = useState(null);
  const [photo, setPhoto]           = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [preApprove, setPreApprove] = useState(false);
  const [loading, setLoading]       = useState(false);
  const [errors, setErrors]         = useState({});
  const [submitted, setSubmitted]   = useState(false); // flag for success state

  // Field change — clears that field's error
  const set = (key, val) => {
    setForm(f => ({ ...f, [key]: val }));
    setErrors(e => ({ ...e, [key]: '' }));
  };

  const handlePhoto = (file, preview) => {
    setPhoto(file);
    setPhotoPreview(preview);
    setErrors(e => ({ ...e, photo: '' }));
  };

  // ── Validation ──────────────────────────────────────────────────────────────
  const validate = () => {
    const e = {};

    // Full name
    if (!form.fullName.trim())              e.fullName = 'Full name is required.';
    else if (form.fullName.trim().length < 2) e.fullName = 'Name must be at least 2 characters.';
    else if (form.fullName.trim().length > 100) e.fullName = 'Name cannot exceed 100 characters.';

    // Phone
    if (!form.phone.trim())                 e.phone = 'Phone number is required.';
    else if (!PHONE_RE.test(form.phone.trim())) e.phone = 'Phone number is not valid (e.g. +91 98765 43210).';

    // Email (optional but must be valid if provided)
    if (form.email.trim() && !EMAIL_RE.test(form.email.trim())) {
      e.email = 'Email address is not valid.';
    }

    // Purpose
    if (!form.purpose)                      e.purpose = 'Purpose of visit is required.';

    // Host
    if (!host)                              e.host = 'Please select a host employee.';

    // Visit date
    if (!form.visitDate)                    e.visitDate = 'Visit date is required.';
    else {
      const visitD  = new Date(form.visitDate);
      const todayD  = new Date(); todayD.setHours(0,0,0,0);
      const maxDate = new Date(); maxDate.setFullYear(maxDate.getFullYear() + 1);
      if (isNaN(visitD.getTime()))           e.visitDate = 'Visit date is not valid.';
      else if (visitD < todayD)              e.visitDate = 'Visit date cannot be in the past.';
      else if (visitD > maxDate)             e.visitDate = 'Visit date cannot be more than 1 year ahead.';
    }

    // Start/End times
    if (!form.startTime)                    e.startTime = 'Start time is required.';
    if (!form.endTime)                      e.endTime   = 'End time is required.';
    if (form.startTime && form.endTime) {
      if (timeToMinutes(form.endTime) <= timeToMinutes(form.startTime)) {
        e.endTime = 'End time must be after start time.';
      }
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      // Scroll to first error
      const first = document.querySelector('[aria-invalid="true"], .input-error');
      first?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setLoading(true);
    try {
      const fd = new FormData();

      // Append all text fields
      Object.entries(form).forEach(([k, v]) => { if (v !== '') fd.append(k, v); });
      fd.append('hostId', host._id);
      fd.append('department', host.department || form.department || '');
      fd.append('isPreApproved', String(preApprove));

      // Append photo if selected
      if (photo) fd.append('photo', photo);

      const res = await visitorService.createVisitor(fd);
      const newVisitor = res.data.data;

      toast.success(
        preApprove
          ? '✅ Visitor pre-approved and registered!'
          : '📨 Visitor invitation sent for host approval.',
        { duration: 4000 }
      );

      // Navigate: HOST → Approvals page to approve right away
      //           Admin/others → visitor detail page
      if (user?.role === 'HOST') {
        navigate('/approvals');
      } else {
        navigate(`/visitors/${newVisitor._id}`);
      }
    } catch (err) {
      const apiMessage = err.response?.data?.message;
      const apiErrors  = err.response?.data?.errors || [];

      if (err.response?.status === 409) {
        // Duplicate visit — show in the date field area
        setErrors(e => ({ ...e, visitDate: apiMessage }));
        toast.error(apiMessage);
      } else if (err.response?.status === 400 && apiErrors.length > 0) {
        // Validation errors from server — map back to fields if possible
        toast.error(apiErrors[0]);
      } else {
        toast.error(apiMessage || 'Failed to register visitor. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="page-container max-w-3xl mx-auto">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="btn-ghost flex items-center gap-2 mb-6 -ml-1"
        aria-label="Go back"
      >
        <ArrowLeft size={16} />
        <span className="text-sm">Back</span>
      </button>

      <div className="mb-7">
        <h1 className="page-title">Invite a Visitor</h1>
        <p className="page-subtitle">
          Complete the form below to register a visitor.
          {' '}{preApprove
            ? 'A digital pass will be generated immediately.'
            : 'The host will receive an approval request.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-6">

        {/* ───── Section 1: Visitor Information ───── */}
        <div className="card p-6">
          <SectionHeader
            step="1"
            title="Visitor Information"
            subtitle="Enter the visitor's personal and contact details."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">

            {/* Full Name */}
            <div className="sm:col-span-2">
              <FormField label="Full Name" required error={errors.fullName}>
                <div className="relative">
                  <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
                  <input
                    type="text"
                    id="fullName"
                    value={form.fullName}
                    onChange={e => set('fullName', e.target.value)}
                    className={`input pl-9 ${errors.fullName ? 'input-error' : ''}`}
                    placeholder="Rahul Verma"
                    aria-invalid={!!errors.fullName}
                    aria-describedby={errors.fullName ? 'fullName-error' : undefined}
                    maxLength={100}
                    autoFocus
                  />
                </div>
              </FormField>
            </div>

            {/* Phone */}
            <FormField label="Mobile Number" required error={errors.phone}>
              <div className="relative">
                <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
                <input
                  type="tel"
                  id="phone"
                  value={form.phone}
                  onChange={e => set('phone', e.target.value)}
                  className={`input pl-9 ${errors.phone ? 'input-error' : ''}`}
                  placeholder="+91 98765 43210"
                  aria-invalid={!!errors.phone}
                />
              </div>
            </FormField>

            {/* Email */}
            <FormField label="Email Address" error={errors.email} hint="Optional — used for confirmation">
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
                <input
                  type="email"
                  id="email"
                  value={form.email}
                  onChange={e => set('email', e.target.value)}
                  className={`input pl-9 ${errors.email ? 'input-error' : ''}`}
                  placeholder="rahul@company.com"
                  aria-invalid={!!errors.email}
                />
              </div>
            </FormField>

            {/* Company */}
            <div className="sm:col-span-2">
              <FormField label="Company / Organization" error={errors.company}>
                <div className="relative">
                  <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
                  <input
                    type="text"
                    id="company"
                    value={form.company}
                    onChange={e => set('company', e.target.value)}
                    className="input pl-9"
                    placeholder="Acme Technologies"
                  />
                </div>
              </FormField>
            </div>

            {/* Photo Upload */}
            <div className="sm:col-span-2">
              <PhotoUploader
                photo={photo}
                preview={photoPreview}
                onChange={handlePhoto}
                error={errors.photo}
              />
            </div>

          </div>
        </div>

        {/* ───── Section 2: Visit Details ───── */}
        <div className="card p-6">
          <SectionHeader
            step="2"
            title="Visit Details"
            subtitle="Specify the purpose, host, and timing for the visit."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">

            {/* Purpose */}
            <div className="sm:col-span-2">
              <FormField label="Purpose of Visit" required error={errors.purpose}>
                <div className="relative">
                  <Briefcase size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
                  <select
                    id="purpose"
                    value={form.purpose}
                    onChange={e => set('purpose', e.target.value)}
                    className={`input pl-9 ${errors.purpose ? 'input-error' : ''}`}
                    aria-invalid={!!errors.purpose}
                  >
                    <option value="">Select purpose…</option>
                    {PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </FormField>
            </div>

            {/* Host Employee */}
            <div className="sm:col-span-2">
              <FormField label="Host Employee" required error={errors.host}>
                <EmployeeSearch
                  value={host}
                  onSelect={emp => { setHost(emp); setErrors(e => ({ ...e, host: '' })); }}
                  onClear={() => setHost(null)}
                  error={!!errors.host}
                />
              </FormField>
            </div>

            {/* Visit Date */}
            <FormField label="Visit Date" required error={errors.visitDate}>
              <div className="relative">
                <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
                <input
                  type="date"
                  id="visitDate"
                  value={form.visitDate}
                  onChange={e => set('visitDate', e.target.value)}
                  min={today()}
                  className={`input pl-9 ${errors.visitDate ? 'input-error' : ''}`}
                  aria-invalid={!!errors.visitDate}
                />
              </div>
            </FormField>

            {/* Time window */}
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Start Time" required error={errors.startTime}>
                <div className="relative">
                  <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
                  <input
                    type="time"
                    id="startTime"
                    value={form.startTime}
                    onChange={e => { set('startTime', e.target.value); setErrors(er => ({ ...er, endTime: '' })); }}
                    className={`input pl-9 ${errors.startTime ? 'input-error' : ''}`}
                    aria-invalid={!!errors.startTime}
                  />
                </div>
              </FormField>
              <FormField label="End Time" required error={errors.endTime}>
                <div className="relative">
                  <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
                  <input
                    type="time"
                    id="endTime"
                    value={form.endTime}
                    onChange={e => set('endTime', e.target.value)}
                    className={`input pl-9 ${errors.endTime ? 'input-error' : ''}`}
                    aria-invalid={!!errors.endTime}
                  />
                </div>
              </FormField>
            </div>

            {/* Notes */}
            <div className="sm:col-span-2">
              <FormField label="Notes" hint="Optional — special instructions, access requirements, etc.">
                <div className="relative">
                  <FileText size={14} className="absolute left-3 top-3.5" style={{ color: 'var(--color-text-muted)' }} />
                  <textarea
                    id="notes"
                    value={form.notes}
                    onChange={e => set('notes', e.target.value)}
                    className="input pl-9 resize-none"
                    rows={3}
                    placeholder="Any special instructions for the visit..."
                    maxLength={1000}
                  />
                </div>
                <p className="text-xs mt-1 text-right" style={{ color: 'var(--color-text-muted)' }}>
                  {form.notes.length}/1000
                </p>
              </FormField>
            </div>

          </div>
        </div>

        {/* ───── Section 3: Access Settings ───── */}
        <div className="card p-6">
          <SectionHeader
            step="3"
            title="Access Settings"
            subtitle="Choose whether the visitor requires manual host approval or can be pre-approved."
          />

          <button
            type="button"
            onClick={() => setPreApprove(v => !v)}
            className="w-full flex items-start gap-4 p-4 rounded-xl border text-left transition-colors"
            style={{
              borderColor: preApprove ? 'var(--color-brand-light)' : 'var(--color-border)',
              backgroundColor: preApprove ? 'rgba(59,86,245,0.05)' : 'transparent',
            }}
            aria-pressed={preApprove}
          >
            {preApprove
              ? <ToggleRight size={28} className="flex-shrink-0" style={{ color: 'var(--color-brand)' }} />
              : <ToggleLeft  size={28} className="flex-shrink-0" style={{ color: 'var(--color-text-muted)' }} />
            }
            <div>
              <div className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                Pre-approve this visitor
              </div>
              <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                {preApprove
                  ? 'Visitor will receive a QR pass immediately and can enter without waiting for manual approval.'
                  : 'The host will be notified and must approve this request before the visitor can enter.'}
              </div>
            </div>
          </button>

          {preApprove && (
            <div
              className="mt-4 flex items-start gap-3 p-3.5 rounded-lg text-sm"
              style={{ backgroundColor: 'var(--color-pre-approved-bg)', color: 'var(--color-pre-approved)' }}
            >
              <CheckCircle size={16} className="flex-shrink-0 mt-0.5" />
              <span>A digital QR pass will be auto-generated immediately after submission. The visitor must arrive within the specified time window.</span>
            </div>
          )}
        </div>

        {/* ───── Actions ───── */}
        <div className="flex flex-col sm:flex-row gap-3 justify-end">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn btn-secondary"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary gap-2 min-w-[180px]"
            id="submit-visitor-btn"
          >
            {loading ? (
              <><Loader2 size={16} className="animate-spin" /> Submitting…</>
            ) : preApprove ? (
              'Create Pre-approved Visit'
            ) : (
              'Send for Approval'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

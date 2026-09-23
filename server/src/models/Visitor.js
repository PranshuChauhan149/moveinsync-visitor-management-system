/**
 * Visitor Schema
 *
 * Photos are stored as URLs (Cloudinary or local-server path).
 * Base64 / binary blobs are NOT stored in MongoDB.
 */
const mongoose = require('mongoose');

const PURPOSES = [
  'Meeting', 'Interview', 'Delivery', 'Maintenance',
  'Vendor', 'Business Guest', 'Government Official', 'Personnel', 'Other',
];

const STATUSES = [
  'PENDING', 'APPROVED', 'REJECTED',
  'CHECKED_IN', 'CHECKED_OUT', 'PRE_APPROVED', 'EXPIRED', 'CANCELLED',
];

const visitorSchema = new mongoose.Schema(
  {
    // ── Identity ────────────────────────────────────────────────────────────
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      minlength: [2,   'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    company: {
      type: String,
      trim: true,
    },

    // ── Visit purpose ────────────────────────────────────────────────────────
    purpose: {
      type: String,
      required: [true, 'Purpose of visit is required'],
      enum: {
        values:   PURPOSES,
        message:  'Invalid purpose of visit.',
      },
    },

    // ── Photo — URL only, never base64 ───────────────────────────────────────
    photoUrl: {
      type: String,
      default: null,
    },
    // Used to delete the photo later (Cloudinary public_id or local filename)
    photoPublicId: {
      type: String,
      default: null,
    },

    // ── Host & department ────────────────────────────────────────────────────
    hostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Host employee is required'],
    },
    department: {
      type: String,
      trim: true,
    },

    // ── Visit window ─────────────────────────────────────────────────────────
    visitDate: {
      type: Date,
      required: [true, 'Visit date is required'],
    },
    startTime: {
      type: String,
      required: [true, 'Start time is required'],
      match: [/^\d{2}:\d{2}$/, 'Start time must be in HH:MM format'],
    },
    endTime: {
      type: String,
      required: [true, 'End time is required'],
      match: [/^\d{2}:\d{2}$/, 'End time must be in HH:MM format'],
    },

    // ── Status & flags ───────────────────────────────────────────────────────
    status: {
      type: String,
      enum: {
        values:  STATUSES,
        message: 'Invalid visitor status.',
      },
      default: 'PENDING',
    },
    isPreApproved: {
      type: Boolean,
      default: false,
    },

    // ── Extra info ───────────────────────────────────────────────────────────
    notes: {
      type: String,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    },
    badgeNumber: {
      type: String,
    },

    // ── Audit ────────────────────────────────────────────────────────────────
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
visitorSchema.index({ visitDate: -1 });
visitorSchema.index({ status: 1 });
visitorSchema.index({ hostId: 1 });
visitorSchema.index({ createdAt: -1 });
// Text search across name, company, phone
visitorSchema.index({ fullName: 'text', company: 'text', phone: 'text', email: 'text' });

// ── Virtual: full photo URL with fallback to initials avatar ─────────────────
visitorSchema.virtual('displayPhoto').get(function () {
  return this.photoUrl || null;
});

module.exports = mongoose.model('Visitor', visitorSchema);

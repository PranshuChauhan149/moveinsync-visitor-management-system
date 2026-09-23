/**
 * Pass & Visit Validation Service
 *
 * Provides server-side helpers that enforce expiration and window checks.
 * These must always run on the backend — never trust frontend-only time checks.
 */

const QRCode       = require('qrcode');
const VisitorPass  = require('../models/VisitorPass');
const Visitor      = require('../models/Visitor');
const { v4: uuidv4 } = require('uuid');

// ─── Core validators ──────────────────────────────────────────────────────────

/**
 * Checks whether a VisitorPass is currently valid:
 * - Status must be ACTIVE
 * - Current time must be within [validFrom, validUntil]
 *
 * Automatically marks the pass EXPIRED in DB if past validUntil.
 *
 * @param {import('../models/VisitorPass').default} pass - populated pass doc
 * @returns {Promise<{ valid: boolean, reason?: string }>}
 */
const isPassValid = async (pass) => {
  if (!pass) return { valid: false, reason: 'INVALID_PASS' };

  const now = new Date();

  if (pass.status === 'REVOKED') return { valid: false, reason: 'REVOKED' };
  if (pass.status === 'USED')    return { valid: false, reason: 'ALREADY_USED' };

  // Auto-expire
  if (now > pass.validUntil) {
    if (pass.status !== 'EXPIRED') {
      await VisitorPass.findByIdAndUpdate(pass._id, { status: 'EXPIRED' });
    }
    return { valid: false, reason: 'EXPIRED' };
  }

  if (pass.status === 'EXPIRED') return { valid: false, reason: 'EXPIRED' };

  return { valid: true };
};

/**
 * Checks whether the current time is within the visitor's allowed visit window.
 * Allows a 30-minute grace period before the window opens.
 *
 * @param {import('../models/Visitor').default} visitor - visitor doc with visitDate/startTime/endTime
 * @returns {{ open: boolean, reason?: string }}
 */
const isVisitWindowOpen = (visitor) => {
  if (!visitor) return { open: false, reason: 'INVALID_VISITOR' };

  const now      = new Date();
  const visitDate = new Date(visitor.visitDate);

  const [startH, startM] = (visitor.startTime || '00:00').split(':').map(Number);
  const [endH,   endM]   = (visitor.endTime   || '23:59').split(':').map(Number);

  const windowStart = new Date(visitDate);
  windowStart.setHours(startH, startM, 0, 0);

  const windowEnd = new Date(visitDate);
  windowEnd.setHours(endH, endM, 0, 0);

  // Allow check-in up to 30 minutes early
  const earlyEntryAllowed = new Date(windowStart.getTime() - 30 * 60 * 1000);

  if (now < earlyEntryAllowed) return { open: false, reason: 'TOO_EARLY' };
  if (now > windowEnd)         return { open: false, reason: 'WINDOW_CLOSED' };

  return { open: true };
};

/**
 * Master entry-gate check — combines pass validity + visitor status + window.
 * Used by front desk and visit controller before allowing check-in.
 *
 * @param {string} visitorId
 * @param {boolean} [enforceWindow=false] - If true, also checks visit time window
 * @returns {Promise<{ allowed: boolean, reason?: string, pass?: object, visitor?: object }>}
 */
const isVisitorAllowedToEnter = async (visitorId, enforceWindow = false) => {
  const visitor = await Visitor.findById(visitorId).populate('hostId', 'name department');
  if (!visitor) return { allowed: false, reason: 'VISITOR_NOT_FOUND' };

  // Must be APPROVED or PRE_APPROVED
  if (!['APPROVED', 'PRE_APPROVED'].includes(visitor.status)) {
    return { allowed: false, reason: `INVALID_STATUS:${visitor.status}` };
  }

  // Get active pass
  const pass = await VisitorPass.findOne({ visitorId, status: 'ACTIVE' }).sort({ createdAt: -1 });
  if (!pass) return { allowed: false, reason: 'NO_ACTIVE_PASS' };

  // Validate pass
  const passCheck = await isPassValid(pass);
  if (!passCheck.valid) return { allowed: false, reason: passCheck.reason };

  // Optionally enforce time window
  if (enforceWindow) {
    const windowCheck = isVisitWindowOpen(visitor);
    if (!windowCheck.open) return { allowed: false, reason: windowCheck.reason };
  }

  return { allowed: true, pass, visitor };
};

// ─── Pass generation ──────────────────────────────────────────────────────────

/**
 * Generates a QR-coded visitor pass for an approved or pre-approved visitor.
 * Revokes any previous active pass for the same visitor first.
 */
const generatePass = async (visitorId, generatedBy) => {
  const visitor = await Visitor.findById(visitorId).populate('hostId', 'name department');
  if (!visitor) throw new Error('Visitor not found');

  const visitDate = new Date(visitor.visitDate);
  const [startH, startM] = (visitor.startTime || '09:00').split(':').map(Number);
  const [endH,   endM]   = (visitor.endTime   || '18:00').split(':').map(Number);

  const validFrom = new Date(visitDate); validFrom.setHours(startH, startM, 0, 0);
  const validUntil = new Date(visitDate); validUntil.setHours(endH, endM, 0, 0);

  const passCode = `VIS-${uuidv4().slice(0, 8).toUpperCase()}`;

  const qrPayload = JSON.stringify({
    passCode,
    visitorId:   visitorId.toString(),
    visitorName: visitor.fullName,
    phone:       visitor.phone,
    hostName:    visitor.hostId?.name,
    department:  visitor.hostId?.department,
    validFrom:   validFrom.toISOString(),
    validUntil:  validUntil.toISOString(),
    purpose:     visitor.purpose,
  });

  const qrCodeDataUrl = await QRCode.toDataURL(qrPayload, {
    width: 256, margin: 2,
    color: { dark: '#0f172a', light: '#ffffff' },
  });

  // Revoke existing active passes
  await VisitorPass.updateMany({ visitorId, status: 'ACTIVE' }, { status: 'REVOKED' });

  const pass = await VisitorPass.create({
    visitorId,
    passCode,
    qrPayload,
    qrCodeDataUrl,
    validFrom,
    validUntil,
    status:      'ACTIVE',
    generatedBy,
  });

  return pass;
};

// ─── Pass verification (used by front desk) ───────────────────────────────────

/**
 * Verifies a QR pass by its passCode.
 * Runs the full validity check and returns the result.
 */
const verifyPass = async (passCode) => {
  const pass = await VisitorPass.findOne({ passCode }).populate({
    path: 'visitorId',
    populate: { path: 'hostId', select: 'name department' },
  });

  if (!pass) return { valid: false, reason: 'INVALID_PASS' };

  const visitor = pass.visitorId;

  // Run pass validity check (auto-expires if needed)
  const passCheck = await isPassValid(pass);
  if (!passCheck.valid) return { valid: false, reason: passCheck.reason };

  // Cannot check in if already inside
  if (visitor?.status === 'CHECKED_IN') return { valid: false, reason: 'ALREADY_CHECKED_IN' };

  return { valid: true, pass, visitor };
};

/**
 * Bulk-expire pre-approved passes and visitors whose time window has closed.
 * Called on a schedule (or on demand) to keep status consistent in DB.
 *
 * @returns {Promise<{ expiredPasses: number, expiredVisitors: number }>}
 */
const expireStalePassesAndVisitors = async () => {
  const now = new Date();

  // Expire passes past validUntil
  const passResult = await VisitorPass.updateMany(
    { status: 'ACTIVE', validUntil: { $lt: now } },
    { status: 'EXPIRED' }
  );

  // Expire visitors who were PRE_APPROVED or APPROVED but window has passed and no check-in
  // Find visitors with passes that just got expired
  const expiredPassVisitorIds = await VisitorPass.distinct('visitorId', {
    status: 'EXPIRED',
    validUntil: { $lt: now },
  });

  const { modifiedCount: expiredVisitors } = await require('../models/Visitor').updateMany(
    {
      _id:    { $in: expiredPassVisitorIds },
      status: { $in: ['APPROVED', 'PRE_APPROVED'] },
    },
    { status: 'EXPIRED' }
  );

  return { expiredPasses: passResult.modifiedCount, expiredVisitors };
};

module.exports = {
  generatePass,
  verifyPass,
  isPassValid,
  isVisitWindowOpen,
  isVisitorAllowedToEnter,
  expireStalePassesAndVisitors,
};

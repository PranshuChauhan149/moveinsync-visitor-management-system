/**
 * Visitor Controller
 *
 * Handles the full visitor registration lifecycle:
 * - Input validation (server-side)
 * - Duplicate visit detection
 * - Photo upload (Cloudinary or local disk — no base64 in DB)
 * - Visitor creation with audit log + approval record
 * - Role-based access controls
 */

const Visitor  = require('../models/Visitor');
const User     = require('../models/User');
const Approval = require('../models/Approval');
const { createAuditLog }                     = require('../services/auditService');
const { uploadPhoto, deletePhoto }           = require('../services/photoService');
const { generatePass }                       = require('../services/passService');
const { sendApprovalEmail }                  = require('../services/emailService');

// ─── Helper — parse ISO/YYYY-MM-DD dates safely ──────────────────────────────
const parseDate = (val) => {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
};

// ─── Helper — compare HH:MM strings ──────────────────────────────────────────
const timeToMinutes = (t) => {
  if (!t || typeof t !== 'string') return -1;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

// ─── Server-side validation ───────────────────────────────────────────────────
const VALID_PURPOSES = [
  'Meeting', 'Interview', 'Delivery', 'Maintenance',
  'Vendor', 'Business Guest', 'Government Official', 'Personnel', 'Other',
];

const EMAIL_RE  = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Accepts: +91 98765 43210, 9876543210, +1-800-555-1234, etc.
const PHONE_RE  = /^[\+]?[\d\s\-\(\)]{7,20}$/;

const validateVisitorInput = (data) => {
  const errors = [];
  const {
    fullName, phone, email, purpose, hostId,
    visitDate, startTime, endTime,
  } = data;

  if (!fullName || !fullName.trim())           errors.push('Full name is required.');
  else if (fullName.trim().length < 2)         errors.push('Full name must be at least 2 characters.');
  else if (fullName.trim().length > 100)       errors.push('Full name cannot exceed 100 characters.');

  if (!phone || !phone.trim())                 errors.push('Phone number is required.');
  else if (!PHONE_RE.test(phone.trim()))       errors.push('Phone number is not valid (e.g. +91 98765 43210).');

  if (email && email.trim() && !EMAIL_RE.test(email.trim())) {
    errors.push('Email address is not valid.');
  }

  if (!purpose)                                errors.push('Purpose of visit is required.');
  else if (!VALID_PURPOSES.includes(purpose))  errors.push(`Invalid purpose. Must be one of: ${VALID_PURPOSES.join(', ')}.`);

  if (!hostId)                                 errors.push('Host employee is required.');

  if (!visitDate)                              errors.push('Visit date is required.');
  else {
    const d = parseDate(visitDate);
    if (!d)                                    errors.push('Visit date is not a valid date.');
    else {
      const todayStart  = new Date(); todayStart.setHours(0, 0, 0, 0);
      const oneYearOut  = new Date(); oneYearOut.setFullYear(oneYearOut.getFullYear() + 1);
      if (d < todayStart)                      errors.push('Visit date cannot be in the past.');
      else if (d > oneYearOut)                 errors.push('Visit date cannot be more than 1 year in the future.');
    }
  }

  if (!startTime)                              errors.push('Start time is required.');
  if (!endTime)                                errors.push('End time is required.');

  if (startTime && endTime) {
    const startMin = timeToMinutes(startTime);
    const endMin   = timeToMinutes(endTime);
    if (startMin < 0)                          errors.push('Start time is not valid (use HH:MM format).');
    if (endMin < 0)                            errors.push('End time is not valid (use HH:MM format).');
    if (startMin >= 0 && endMin >= 0 && endMin <= startMin) {
      errors.push('End time must be after start time.');
    }
  }

  return errors;
};

// ─── GET /api/visitors ────────────────────────────────────────────────────────
const getVisitors = async (req, res, next) => {
  try {
    const {
      page = 1, limit = 10,
      search, status, hostId, date, startDate, endDate, company,
    } = req.query;

    const filter = {};

    // Role-based: HOST only sees visitors they're hosting
    if (req.user.role === 'HOST') {
      filter.hostId = req.user._id;
    } else if (hostId) {
      filter.hostId = hostId;
    }

    if (status)   filter.status  = status;
    if (company)  filter.company = { $regex: company, $options: 'i' };

    if (date) {
      const d = new Date(date); d.setHours(0,0,0,0);
      const next = new Date(d); next.setDate(next.getDate() + 1);
      filter.visitDate = { $gte: d, $lt: next };
    } else if (startDate || endDate) {
      filter.visitDate = {};
      if (startDate) filter.visitDate.$gte = new Date(startDate);
      if (endDate)   filter.visitDate.$lte = new Date(endDate);
    }

    if (search) {
      const q = search.trim();
      filter.$or = [
        { fullName: { $regex: q, $options: 'i' } },
        { company:  { $regex: q, $options: 'i' } },
        { phone:    { $regex: q, $options: 'i' } },
        { email:    { $regex: q, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [visitors, total] = await Promise.all([
      Visitor.find(filter)
        .populate('hostId',    'name department email')
        .populate('createdBy', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Visitor.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: visitors,
      pagination: {
        total,
        page:  Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/visitors/today ──────────────────────────────────────────────────
const getTodaysVisitors = async (req, res, next) => {
  try {
    const today    = new Date(); today.setHours(0,0,0,0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

    const filter = { visitDate: { $gte: today, $lt: tomorrow } };
    if (req.user.role === 'HOST') filter.hostId = req.user._id;

    const visitors = await Visitor.find(filter)
      .populate('hostId', 'name department')
      .sort({ startTime: 1 });

    res.status(200).json({ success: true, data: visitors });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/visitors/:id ────────────────────────────────────────────────────
const getVisitorById = async (req, res, next) => {
  try {
    const visitor = await Visitor.findById(req.params.id)
      .populate('hostId',    'name department email phone')
      .populate('createdBy', 'name role');

    if (!visitor) {
      return res.status(404).json({ success: false, message: 'Visitor not found.' });
    }

    // HOST may only view their own visitors
    if (req.user.role === 'HOST' &&
        visitor.hostId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    res.status(200).json({ success: true, data: visitor });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/visitors ───────────────────────────────────────────────────────
const createVisitor = async (req, res, next) => {
  try {
    const {
      fullName, phone, email, company, purpose,
      hostId, department, visitDate, startTime, endTime,
      isPreApproved, notes,
    } = req.body;

    // 1. Input validation
    const validationErrors = validateVisitorInput({
      fullName, phone, email, purpose, hostId, visitDate, startTime, endTime,
    });
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: validationErrors[0],
        errors: validationErrors,
      });
    }

    // 2. Verify host exists and is a HOST (or ADMIN)
    const hostUser = await User.findById(hostId);
    if (!hostUser) {
      return res.status(400).json({ success: false, message: 'Host employee not found. Please select a valid host.' });
    }
    if (!['HOST', 'ADMIN'].includes(hostUser.role)) {
      return res.status(400).json({ success: false, message: 'The selected employee cannot act as a host.' });
    }

    // 3. Business rule: requester cannot be their own host
    if (req.user.role === 'HOST' && req.user._id.toString() === hostId) {
      return res.status(400).json({ success: false, message: 'You cannot register yourself as a visitor host.' });
    }

    // 4. Duplicate detection — block if an active visit already exists for same phone + same date
    const visitDay    = new Date(visitDate); visitDay.setHours(0,0,0,0);
    const visitDayEnd = new Date(visitDay); visitDayEnd.setDate(visitDayEnd.getDate() + 1);
    const existing = await Visitor.findOne({
      phone:     phone.trim(),
      visitDate: { $gte: visitDay, $lt: visitDayEnd },
      status:    { $in: ['PENDING', 'APPROVED', 'PRE_APPROVED', 'CHECKED_IN'] },
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `A visitor with this phone number already has an active visit on ${new Date(visitDate).toDateString()}.`,
      });
    }

    // 5. Handle photo upload — URL only stored in DB (no base64 blob)
    let photoUrl    = undefined;
    let photoPublicId = undefined;
    if (req.file) {
      try {
        const result = await uploadPhoto(req.file.buffer, req.file.mimetype);
        photoUrl      = result.url;
        photoPublicId = result.publicId;
      } catch (photoErr) {
        console.warn('Photo upload failed (non-fatal):', photoErr.message);
        // Don't fail the entire request if photo upload fails
      }
    }

    // 6. Create visitor
    const preApproved = isPreApproved === 'true' || isPreApproved === true;
    const visitor = await Visitor.create({
      fullName:   fullName.trim(),
      phone:      phone.trim(),
      email:      email?.trim()?.toLowerCase() || undefined,
      company:    company?.trim() || undefined,
      purpose,
      hostId,
      department: department?.trim() || hostUser.department || undefined,
      visitDate:  new Date(visitDate),
      startTime,
      endTime,
      isPreApproved: preApproved,
      status:     preApproved ? 'PRE_APPROVED' : 'PENDING',
      notes:      notes?.trim() || undefined,
      photoUrl,
      photoPublicId,
      createdBy:  req.user._id,
    });

    // 7. Create approval record
    await Approval.create({
      visitorId:   visitor._id,
      hostId,
      requestedBy: req.user._id,
      status:      preApproved ? 'APPROVED' : 'PENDING',
      ...(preApproved && { approvedAt: new Date() }),
    });

    // 8. Audit log
    await createAuditLog({
      actor:      req.user._id,
      actorName:  req.user.name,
      action:     preApproved ? 'PRE_APPROVAL_CREATED' : 'VISITOR_CREATED',
      entityType: 'Visitor',
      entityId:   visitor._id,
      metadata:   { visitorName: fullName, purpose, hostName: hostUser.name },
      ipAddress:  req.ip,
    });

    // 9. Return populated visitor
    const populated = await Visitor.findById(visitor._id)
      .populate('hostId',    'name department email')
      .populate('createdBy', 'name');

    // 10. For pre-approved: generate QR pass + send email (non-blocking)
    if (preApproved) {
      try {
        const pass = await generatePass(visitor._id, req.user._id);
        // Send email with QR pass to visitor (fire-and-forget)
        sendApprovalEmail({
          visitor:        populated,
          pass,
          approvedByName: req.user.name,
        }).catch(() => {});
      } catch (passErr) {
        console.warn('Pass generation failed for pre-approved visitor (non-fatal):', passErr.message);
      }
    }

    res.status(201).json({
      success: true,
      message: preApproved
        ? 'Visitor pre-approved and registered successfully.'
        : 'Visitor registration submitted. Pending host approval.',
      data: populated,
    });
  } catch (err) {
    next(err);
  }
};

// ─── PATCH /api/visitors/:id ──────────────────────────────────────────────────
const updateVisitor = async (req, res, next) => {
  try {
    const visitor = await Visitor.findById(req.params.id);
    if (!visitor) {
      return res.status(404).json({ success: false, message: 'Visitor not found.' });
    }

    // Only allow updates if still pending/pre-approved (not checked-in or out)
    if (['CHECKED_IN', 'CHECKED_OUT'].includes(visitor.status) && req.user.role !== 'ADMIN') {
      return res.status(400).json({ success: false, message: 'Cannot update a visitor who is currently checked in or out.' });
    }

    // Handle new photo
    if (req.file) {
      try {
        // Delete old photo if it exists
        if (visitor.photoPublicId) await deletePhoto(visitor.photoPublicId);
        const result = await uploadPhoto(req.file.buffer, req.file.mimetype);
        req.body.photoUrl      = result.url;
        req.body.photoPublicId = result.publicId;
      } catch (photoErr) {
        console.warn('Photo update failed (non-fatal):', photoErr.message);
      }
    }

    // Prevent direct status manipulation via PATCH (use approval/visit endpoints)
    const safeFields = [
      'fullName','phone','email','company','purpose','department',
      'visitDate','startTime','endTime','notes','photoUrl','photoPublicId',
    ];
    const updateData = {};
    safeFields.forEach(f => { if (req.body[f] !== undefined) updateData[f] = req.body[f]; });

    const updated = await Visitor.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).populate('hostId', 'name department');

    await createAuditLog({
      actor:      req.user._id,
      actorName:  req.user.name,
      action:     'VISITOR_UPDATED',
      entityType: 'Visitor',
      entityId:   visitor._id,
      metadata:   Object.keys(updateData),
      ipAddress:  req.ip,
    });

    res.status(200).json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

// ─── DELETE /api/visitors/:id (ADMIN only) ────────────────────────────────────
const deleteVisitor = async (req, res, next) => {
  try {
    const visitor = await Visitor.findById(req.params.id);
    if (!visitor) {
      return res.status(404).json({ success: false, message: 'Visitor not found.' });
    }

    // Clean up photo
    if (visitor.photoPublicId) await deletePhoto(visitor.photoPublicId);

    await Visitor.findByIdAndDelete(req.params.id);

    // Also remove associated approval record
    await Approval.deleteMany({ visitorId: req.params.id });

    await createAuditLog({
      actor:      req.user._id,
      actorName:  req.user.name,
      action:     'VISITOR_DELETED',
      entityType: 'Visitor',
      entityId:   visitor._id,
      metadata:   { visitorName: visitor.fullName },
      ipAddress:  req.ip,
    });

    res.status(200).json({ success: true, message: 'Visitor deleted successfully.' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getVisitors, getVisitorById, createVisitor, updateVisitor, deleteVisitor, getTodaysVisitors,
};

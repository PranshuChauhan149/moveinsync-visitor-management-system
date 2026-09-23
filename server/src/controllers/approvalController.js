/**
 * Approval Controller
 *
 * Implements the full approval / rejection / pre-approval workflow with:
 * - Role-based guards (ADMIN/HOST only)
 * - Host ownership enforcement
 * - Duplicate approval/rejection prevention
 * - Auto pass generation on approval
 * - Audit logging for every action
 * - GET /api/approvals/:id  (missing previously)
 */

const Approval    = require('../models/Approval');
const Visitor     = require('../models/Visitor');
const VisitorPass = require('../models/VisitorPass');
const { generatePass, expireStalePassesAndVisitors } = require('../services/passService');
const { createAuditLog } = require('../services/auditService');
const { sendApprovalEmail, sendRejectionEmail }       = require('../services/emailService');

// ─── GET /api/approvals ───────────────────────────────────────────────────────
const getApprovals = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const filter = {};

    // HOST only sees their own assigned approvals
    if (req.user.role === 'HOST') filter.hostId = req.user._id;
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const [approvals, total] = await Promise.all([
      Approval.find(filter)
        .populate({
          path: 'visitorId',
          populate: { path: 'hostId', select: 'name department' },
        })
        .populate('hostId',      'name department email')
        .populate('requestedBy', 'name role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Approval.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: approvals,
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

// ─── GET /api/approvals/:id ───────────────────────────────────────────────────
const getApprovalById = async (req, res, next) => {
  try {
    const approval = await Approval.findById(req.params.id)
      .populate({
        path: 'visitorId',
        populate: { path: 'hostId', select: 'name department email' },
      })
      .populate('hostId',      'name department email')
      .populate('requestedBy', 'name role');

    if (!approval) {
      return res.status(404).json({ success: false, message: 'Approval not found.' });
    }

    // HOST may only view their own
    if (req.user.role === 'HOST' &&
        approval.hostId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    // Attach active pass if one exists
    const pass = await VisitorPass.findOne({
      visitorId: approval.visitorId._id,
      status: { $in: ['ACTIVE', 'USED'] },
    }).sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: { approval, pass: pass || null } });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/approvals/pending-count ────────────────────────────────────────
const getPendingCount = async (req, res, next) => {
  try {
    const filter = { status: 'PENDING' };
    if (req.user.role === 'HOST') filter.hostId = req.user._id;
    const count = await Approval.countDocuments(filter);
    res.status(200).json({ success: true, count });
  } catch (err) {
    next(err);
  }
};

// ─── PATCH /api/approvals/:id/approve ────────────────────────────────────────
const approveVisitor = async (req, res, next) => {
  try {
    const approval = await Approval.findById(req.params.id).populate('visitorId');
    if (!approval) {
      return res.status(404).json({ success: false, message: 'Approval not found.' });
    }

    // 1. HOST may only approve their own assigned visitors
    if (req.user.role === 'HOST' &&
        approval.hostId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied. You can only approve your own visitors.' });
    }

    // 2. Business rule: cannot approve already-processed requests
    if (approval.status === 'APPROVED') {
      return res.status(409).json({ success: false, message: 'This visitor has already been approved.' });
    }
    if (approval.status === 'REJECTED') {
      return res.status(400).json({
        success: false,
        message: 'This request was previously rejected. Please create a new visitor invitation to re-invite.',
      });
    }
    if (approval.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: `Cannot approve a request with status: ${approval.status}.`,
      });
    }

    // 3. Update approval
    approval.status     = 'APPROVED';
    approval.approvedAt = new Date();
    await approval.save();

    // 4. Update visitor status
    await Visitor.findByIdAndUpdate(approval.visitorId._id, { status: 'APPROVED' });

    // 5. Generate visitor pass
    const pass = await generatePass(approval.visitorId._id, req.user._id);

    // 6. Audit log
    await createAuditLog({
      actor:      req.user._id,
      actorName:  req.user.name,
      action:     'VISITOR_APPROVED',
      entityType: 'Approval',
      entityId:   approval._id,
      metadata:   {
        visitorName: approval.visitorId.fullName,
        passCode:    pass.passCode,
        approvedBy:  req.user.name,
      },
      ipAddress: req.ip,
    });

    // 7. Send approval email to visitor (non-blocking)
    const freshVisitor = await Visitor.findById(approval.visitorId._id).populate('hostId', 'name department');
    sendApprovalEmail({
      visitor:        freshVisitor,
      pass,
      approvedByName: req.user.name,
    }).catch(() => {}); // fire-and-forget

    // Return fresh populated approval + pass
    const populated = await Approval.findById(approval._id)
      .populate({ path: 'visitorId', populate: { path: 'hostId', select: 'name department' } })
      .populate('hostId', 'name department');

    res.status(200).json({
      success: true,
      message: 'Visitor approved. Pass generated successfully.',
      data:    populated,
      pass,
    });
  } catch (err) {
    next(err);
  }
};

// ─── PATCH /api/approvals/:id/reject ─────────────────────────────────────────
const rejectVisitor = async (req, res, next) => {
  try {
    const { remarks } = req.body;
    const approval = await Approval.findById(req.params.id).populate('visitorId');
    if (!approval) {
      return res.status(404).json({ success: false, message: 'Approval not found.' });
    }

    // 1. Ownership check for HOST
    if (req.user.role === 'HOST' &&
        approval.hostId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied. You can only reject your own visitors.' });
    }

    // 2. Guard against double-rejection
    if (approval.status === 'REJECTED') {
      return res.status(409).json({ success: false, message: 'This visitor has already been rejected.' });
    }
    if (approval.status === 'APPROVED') {
      return res.status(400).json({
        success: false,
        message: 'Cannot reject an already approved visitor. Revoke their pass instead.',
      });
    }
    if (approval.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: `Cannot reject a request with status: ${approval.status}.`,
      });
    }

    // 3. Update approval
    approval.status     = 'REJECTED';
    approval.rejectedAt = new Date();
    approval.remarks    = remarks?.trim() || 'No reason provided.';
    await approval.save();

    // 4. Update visitor status
    await Visitor.findByIdAndUpdate(approval.visitorId._id, { status: 'REJECTED' });

    // 5. Revoke any active pass (should not exist yet, but be safe)
    await VisitorPass.updateMany(
      { visitorId: approval.visitorId._id, status: 'ACTIVE' },
      { status: 'REVOKED' }
    );

    // 6. Audit log
    await createAuditLog({
      actor:      req.user._id,
      actorName:  req.user.name,
      action:     'VISITOR_REJECTED',
      entityType: 'Approval',
      entityId:   approval._id,
      metadata:   {
        visitorName: approval.visitorId.fullName,
        remarks:     approval.remarks,
        rejectedBy:  req.user.name,
      },
      ipAddress: req.ip,
    });

    // 7. Send rejection email to visitor (non-blocking)
    const freshVisitor = await Visitor.findById(approval.visitorId._id).populate('hostId', 'name department');
    sendRejectionEmail({
      visitor:         freshVisitor,
      remarks:         approval.remarks,
      rejectedByName:  req.user.name,
    }).catch(() => {}); // fire-and-forget

    const populated = await Approval.findById(approval._id)
      .populate({ path: 'visitorId', populate: { path: 'hostId', select: 'name department' } })
      .populate('hostId', 'name department');

    res.status(200).json({
      success: true,
      message: 'Visitor rejected.',
      data:    populated,
    });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/approvals/expire — runs expiration for stale passes/visitors ──
const runExpiration = async (req, res, next) => {
  try {
    const result = await expireStalePassesAndVisitors();
    await createAuditLog({
      actor:      req.user._id,
      actorName:  req.user.name,
      action:     'PASS_EXPIRED',
      entityType: 'System',
      entityId:   null,
      metadata:   result,
      ipAddress:  req.ip,
    });
    res.status(200).json({ success: true, message: 'Expiration run complete.', data: result });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getApprovals,
  getApprovalById,
  approveVisitor,
  rejectVisitor,
  getPendingCount,
  runExpiration,
};

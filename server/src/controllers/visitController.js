/**
 * Visit Controller
 * Handles check-in / check-out, now using isVisitorAllowedToEnter()
 * for server-side gate enforcement.
 */

const Visit       = require('../models/Visit');
const Visitor     = require('../models/Visitor');
const VisitorPass = require('../models/VisitorPass');
const { isVisitorAllowedToEnter } = require('../services/passService');
const { createAuditLog }          = require('../services/auditService');

// ─── POST /api/visits/checkin/:visitorId ──────────────────────────────────────
const checkIn = async (req, res, next) => {
  try {
    const { visitorId } = req.params;

    // Server-side gate check — does NOT enforce time window so front desk
    // can manually check in edge-case visitors outside the strict window
    const gateCheck = await isVisitorAllowedToEnter(visitorId, false);

    if (!gateCheck.allowed) {
      const reason = gateCheck.reason || '';
      // Specific reason strings for the door
      const messages = {
        VISITOR_NOT_FOUND:  'Visitor not found.',
        NO_ACTIVE_PASS:     'No active pass found for this visitor.',
        EXPIRED:            'Visitor pass has expired.',
        REVOKED:            'Visitor pass has been revoked.',
        ALREADY_USED:       'Visitor has already used their pass.',
        ALREADY_CHECKED_IN: 'Visitor is already checked in.',
      };
      const shortReason = reason.split(':')[0];
      const statusDetail = reason.split(':')[1]; // e.g. CHECKED_IN for INVALID_STATUS:CHECKED_IN

      // 409 for conflict/duplicate states
      const is409 = shortReason === 'ALREADY_CHECKED_IN'
        || shortReason === 'ALREADY_USED'
        || statusDetail === 'CHECKED_IN';

      const friendlyMsg = messages[shortReason]
        || (statusDetail ? `Cannot check in visitor with status: ${statusDetail}.` : `Entry denied: ${reason}`);

      return res.status(is409 ? 409 : 400).json({ success: false, message: friendlyMsg });
    }

    const { visitor } = gateCheck;
    // Double-guard
    if (visitor.status === 'CHECKED_IN') {
      return res.status(409).json({ success: false, message: 'Visitor is already checked in.' });
    }

    const checkInTime = new Date();
    const visit = await Visit.create({
      visitorId:   visitor._id,
      checkInTime,
      checkedInBy: req.user._id,
    });

    await Visitor.findByIdAndUpdate(visitor._id, { status: 'CHECKED_IN' });

    // Mark the pass as USED
    await VisitorPass.findOneAndUpdate(
      { visitorId: visitor._id, status: 'ACTIVE' },
      { status: 'USED', scannedAt: checkInTime }
    );

    await createAuditLog({
      actor:      req.user._id,
      actorName:  req.user.name,
      action:     'VISITOR_CHECKED_IN',
      entityType: 'Visit',
      entityId:   visit._id,
      metadata:   { visitorName: visitor.fullName, checkInTime },
      ipAddress:  req.ip,
    });

    const populated = await Visit.findById(visit._id)
      .populate('visitorId',  'fullName company phone purpose')
      .populate('checkedInBy','name');

    res.status(200).json({
      success: true,
      message: `${visitor.fullName} checked in successfully.`,
      data:    populated,
    });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/visits/checkout/:visitorId ─────────────────────────────────────
const checkOut = async (req, res, next) => {
  try {
    const visitor = await Visitor.findById(req.params.visitorId);
    if (!visitor) {
      return res.status(404).json({ success: false, message: 'Visitor not found.' });
    }

    if (visitor.status !== 'CHECKED_IN') {
      return res.status(400).json({
        success: false,
        message: `Cannot check out visitor with status: ${visitor.status}.`,
      });
    }

    const checkOutTime = new Date();
    const visit = await Visit.findOne({ visitorId: visitor._id, checkOutTime: null });
    if (!visit) {
      return res.status(404).json({ success: false, message: 'Active visit record not found.' });
    }

    const durationMinutes = Math.round((checkOutTime - visit.checkInTime) / 60000);
    visit.checkOutTime    = checkOutTime;
    visit.checkedOutBy    = req.user._id;
    visit.durationMinutes = durationMinutes;
    await visit.save();

    await Visitor.findByIdAndUpdate(visitor._id, { status: 'CHECKED_OUT' });

    await createAuditLog({
      actor:      req.user._id,
      actorName:  req.user.name,
      action:     'VISITOR_CHECKED_OUT',
      entityType: 'Visit',
      entityId:   visit._id,
      metadata:   { visitorName: visitor.fullName, checkOutTime, durationMinutes },
      ipAddress:  req.ip,
    });

    const populated = await Visit.findById(visit._id)
      .populate('visitorId',   'fullName company phone')
      .populate('checkedOutBy','name');

    res.status(200).json({
      success: true,
      message: `${visitor.fullName} checked out. Duration: ${durationMinutes} min.`,
      data:    populated,
    });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/visits ──────────────────────────────────────────────────────────
const getVisits = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, visitorId } = req.query;
    const filter = {};
    if (visitorId) filter.visitorId = visitorId;

    const skip = (Number(page) - 1) * Number(limit);
    const [visits, total] = await Promise.all([
      Visit.find(filter)
        .populate('visitorId',   'fullName company phone hostId')
        .populate('checkedInBy', 'name')
        .populate('checkedOutBy','name')
        .sort({ checkInTime: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Visit.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data:    visits,
      pagination: {
        total, page: Number(page), limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { checkIn, checkOut, getVisits };

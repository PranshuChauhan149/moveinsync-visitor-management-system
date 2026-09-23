const VisitorPass = require('../models/VisitorPass');
const { generatePass, verifyPass } = require('../services/passService');
const { createAuditLog } = require('../services/auditService');

// GET /api/passes/:visitorId
const getPassByVisitor = async (req, res, next) => {
  try {
    const pass = await VisitorPass.findOne({
      visitorId: req.params.visitorId,
      status: { $in: ['ACTIVE', 'USED'] },
    }).populate('visitorId').sort({ createdAt: -1 });

    if (!pass) return res.status(404).json({ success: false, message: 'No active pass found.' });
    res.status(200).json({ success: true, data: pass });
  } catch (err) {
    next(err);
  }
};

// POST /api/passes/generate/:visitorId
const generateVisitorPass = async (req, res, next) => {
  try {
    const pass = await generatePass(req.params.visitorId, req.user._id);

    await createAuditLog({
      actor: req.user._id,
      actorName: req.user.name,
      action: 'PASS_GENERATED',
      entityType: 'VisitorPass',
      entityId: pass._id,
      metadata: { passCode: pass.passCode },
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, data: pass });
  } catch (err) {
    next(err);
  }
};

// GET /api/passes/verify/:passCode
const verifyVisitorPass = async (req, res, next) => {
  try {
    const result = await verifyPass(req.params.passCode);

    await createAuditLog({
      actor: req.user._id,
      actorName: req.user.name,
      action: 'PASS_SCANNED',
      entityType: 'VisitorPass',
      entityId: result.pass?._id,
      metadata: { passCode: req.params.passCode, valid: result.valid, reason: result.reason },
      ipAddress: req.ip,
    });

    if (!result.valid) {
      return res.status(200).json({ success: true, valid: false, reason: result.reason });
    }

    res.status(200).json({ success: true, valid: true, pass: result.pass, visitor: result.visitor });
  } catch (err) {
    next(err);
  }
};

module.exports = { getPassByVisitor, generateVisitorPass, verifyVisitorPass };

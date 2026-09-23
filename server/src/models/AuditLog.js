const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    actorName: {
      type: String, // denormalized for fast display
    },
    action: {
      type: String,
      required: true,
      enum: [
        'VISITOR_CREATED',
        'VISITOR_UPDATED',
        'VISITOR_DELETED',
        'APPROVAL_REQUESTED',
        'VISITOR_APPROVED',
        'VISITOR_REJECTED',
        'PASS_GENERATED',
        'PASS_REVOKED',
        'VISITOR_CHECKED_IN',
        'VISITOR_CHECKED_OUT',
        'USER_LOGIN',
        'USER_LOGOUT',
        'USER_CREATED',
        'PRE_APPROVAL_CREATED',
        'PASS_SCANNED',
        'PASS_EXPIRED',
      ],
    },
    entityType: {
      type: String,
      enum: ['Visitor', 'Approval', 'VisitorPass', 'Visit', 'User'],
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed, // flexible extra details
    },
    ipAddress: {
      type: String,
    },
  },
  { timestamps: true }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ actor: 1 });
auditLogSchema.index({ action: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);

const AuditLog = require('../models/AuditLog');

/**
 * Creates an audit log entry.
 * @param {Object} params
 * @param {ObjectId} params.actor - User performing the action
 * @param {string} params.actorName - Denormalized actor name
 * @param {string} params.action - Action enum value
 * @param {string} params.entityType - Entity type (Visitor, Approval, etc.)
 * @param {ObjectId} params.entityId - Entity's MongoDB ID
 * @param {Object} params.metadata - Additional context
 * @param {string} params.ipAddress - Client IP
 */
const createAuditLog = async ({
  actor,
  actorName,
  action,
  entityType,
  entityId,
  metadata = {},
  ipAddress,
}) => {
  try {
    await AuditLog.create({
      actor,
      actorName,
      action,
      entityType,
      entityId,
      metadata,
      ipAddress,
    });
  } catch (err) {
    // Audit log failures should not block the main flow
    console.error('Audit log error:', err.message);
  }
};

module.exports = { createAuditLog };

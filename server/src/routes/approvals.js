const express = require('express');
const {
  getApprovals, getApprovalById, approveVisitor, rejectVisitor,
  getPendingCount, runExpiration,
} = require('../controllers/approvalController');
const { protect }    = require('../middleware/auth');
const { authorize }  = require('../middleware/authorize');

const router = express.Router();

router.use(protect);

// Pending badge count — HOST and ADMIN
router.get('/pending-count', authorize('ADMIN', 'HOST'), getPendingCount);

// Trigger expiration sweep — ADMIN only
router.post('/expire', authorize('ADMIN'), runExpiration);

// List approvals — ADMIN and HOST (HOST filtered in controller)
router.get('/', authorize('ADMIN', 'HOST'), getApprovals);

// Single approval by ID — ADMIN and HOST (ownership check in controller)
router.get('/:id', authorize('ADMIN', 'HOST'), getApprovalById);

// Approve — ADMIN and HOST (FRONT_DESK explicitly excluded)
router.patch('/:id/approve', authorize('ADMIN', 'HOST'), approveVisitor);

// Reject — ADMIN and HOST
router.patch('/:id/reject', authorize('ADMIN', 'HOST'), rejectVisitor);

module.exports = router;

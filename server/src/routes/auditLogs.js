const express = require('express');
const { getAuditLogs } = require('../controllers/auditLogController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');

const router = express.Router();

router.use(protect, authorize('ADMIN'));
router.get('/', getAuditLogs);

module.exports = router;

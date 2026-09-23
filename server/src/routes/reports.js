const express = require('express');
const { getDashboardStats, getAnalytics } = require('../controllers/reportController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');

const router = express.Router();

// Dashboard stats — all authenticated roles (each role sees their own context)
router.get('/dashboard', protect, getDashboardStats);

// Full analytics — ADMIN only
router.get('/analytics', protect, authorize('ADMIN'), getAnalytics);

module.exports = router;

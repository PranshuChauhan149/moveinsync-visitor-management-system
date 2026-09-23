const express = require('express');
const { register, login, logout, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');

const router = express.Router();

// Public
router.post('/login', login);

// Authenticated
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);

// ADMIN only — create new user accounts
router.post('/register', protect, authorize('ADMIN'), register);

module.exports = router;

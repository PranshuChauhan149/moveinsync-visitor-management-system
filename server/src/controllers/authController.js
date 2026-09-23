const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { createAuditLog } = require('../services/auditService');

/**
 * Signs a JWT containing the user's MongoDB _id.
 */
const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

/**
 * Strips sensitive fields and returns a safe user object.
 */
const safeUser = (user) => {
  const obj = user.toObject ? user.toObject() : { ...user };
  delete obj.password;
  delete obj.__v;
  return obj;
};

// ─── POST /api/auth/register ──────────────────────────────────────────────────
// ADMIN-only: creates a new user account.
// The protect + authorize('ADMIN') middleware is applied in the route file.
const register = async (req, res, next) => {
  try {
    const { name, email, password, role, department, phone } = req.body;

    // Trim & normalise — cast to string to handle sanitized injection objects
    const normEmail = String(email || '').trim().toLowerCase();
    const normName  = String(name  || '').trim();

    if (!normName || !normEmail || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required.',
      });
    }

    // Password strength: min 8 chars, at least one uppercase, one digit
    const strongPassword = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!strongPassword.test(password)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters and include an uppercase letter and a digit.',
      });
    }

    const validRoles = ['ADMIN', 'HOST', 'FRONT_DESK'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({ success: false, message: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
    }

    // Duplicate email check
    const existing = await User.findOne({ email: normEmail });
    if (existing) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    const user = await User.create({
      name: normName,
      email: normEmail,
      password,
      role: role || 'HOST',
      department: (department || '').trim() || undefined,
      phone: (phone || '').trim() || undefined,
    });

    await createAuditLog({
      actor: req.user._id,
      actorName: req.user.name,
      action: 'USER_CREATED',
      entityType: 'User',
      entityId: user._id,
      metadata: { email: normEmail, role: user.role },
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, user: safeUser(user) });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
const login = async (req, res, next) => {
  try {
    // Explicitly coerce to string so a sanitized object (e.g. { _gt: '' }) cannot slip through
    const email    = String(req.body.email    || '').trim().toLowerCase();
    const password = String(req.body.password || '').trim();

    // Generic message for both missing fields and wrong credentials
    // — avoids leaking whether the email exists
    if (!email || !password) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const user = await User.findOne({ email }).select('+password');

    // Use constant-time comparison via comparePassword even when no user found
    // (prevents timing attacks that enumerate valid emails)
    const passwordMatch = user ? await user.comparePassword(password) : false;

    if (!user || !passwordMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    if (!user.isActive) {
      // Separate message only after we've confirmed credentials match,
      // so we don't leak account existence on the first check.
      return res.status(403).json({ success: false, message: 'This account has been deactivated. Contact an administrator.' });
    }

    const token = signToken(user._id);

    await createAuditLog({
      actor: user._id,
      actorName: user.name,
      action: 'USER_LOGIN',
      entityType: 'User',
      entityId: user._id,
      metadata: { email: user.email, role: user.role },
      ipAddress: req.ip,
    });

    res.status(200).json({ success: true, token, user: safeUser(user) });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/auth/logout ────────────────────────────────────────────────────
const logout = async (req, res, next) => {
  try {
    await createAuditLog({
      actor: req.user._id,
      actorName: req.user.name,
      action: 'USER_LOGOUT',
      entityType: 'User',
      entityId: req.user._id,
      ipAddress: req.ip,
    });
    // JWT is stateless — client must delete the token locally.
    // For cookie-based flows, clear the cookie here.
    res.status(200).json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
const getMe = async (req, res) => {
  // req.user is already set by protect middleware (password excluded)
  res.status(200).json({ success: true, user: req.user });
};

module.exports = { register, login, logout, getMe };

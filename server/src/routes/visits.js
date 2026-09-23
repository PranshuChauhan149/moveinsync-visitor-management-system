const express = require('express');
const { checkIn, checkOut, getVisits } = require('../controllers/visitController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');

const router = express.Router();

router.use(protect);

// Visit history — ADMIN only
router.get('/', authorize('ADMIN'), getVisits);

// Check-in / check-out — ADMIN or FRONT_DESK only
router.post('/checkin/:visitorId', authorize('ADMIN', 'FRONT_DESK'), checkIn);
router.post('/checkout/:visitorId', authorize('ADMIN', 'FRONT_DESK'), checkOut);

module.exports = router;

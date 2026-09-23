const express = require('express');
const { getPassByVisitor, generateVisitorPass, verifyVisitorPass } = require('../controllers/passController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/visitor/:visitorId', getPassByVisitor);
router.post('/generate/:visitorId', generateVisitorPass);
router.get('/verify/:passCode', verifyVisitorPass);

module.exports = router;

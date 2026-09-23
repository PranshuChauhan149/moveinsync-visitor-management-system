const express = require('express');
const {
  getVisitors, getVisitorById, createVisitor,
  updateVisitor, deleteVisitor, getTodaysVisitors,
} = require('../controllers/visitorController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const upload = require('../middleware/upload');

const router = express.Router();

router.use(protect);

router.get('/today', getTodaysVisitors);
router.get('/', getVisitors);
router.get('/:id', getVisitorById);
router.post('/', upload.single('photo'), createVisitor);
router.patch('/:id', authorize('ADMIN', 'HOST'), upload.single('photo'), updateVisitor);
router.delete('/:id', authorize('ADMIN'), deleteVisitor);

module.exports = router;

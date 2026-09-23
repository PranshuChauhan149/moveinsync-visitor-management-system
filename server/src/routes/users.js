const express = require('express');
const { getUsers, getUserById, createUser, updateUser } = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');

const router = express.Router();

router.use(protect);

router.get('/', getUsers); // All roles — for employee search
router.get('/:id', getUserById);
router.post('/', authorize('ADMIN'), createUser);
router.patch('/:id', authorize('ADMIN'), updateUser);

module.exports = router;

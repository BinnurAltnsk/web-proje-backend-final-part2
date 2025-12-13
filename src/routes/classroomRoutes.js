const express = require('express');
const router = express.Router();
const classroomController = require('../controllers/classroomController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', classroomController.getAllClassrooms);

module.exports = router;
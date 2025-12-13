const express = require('express');
const router = express.Router();
const departmentController = require('../controllers/departmentController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', departmentController.getAllDepartments);

module.exports = router;
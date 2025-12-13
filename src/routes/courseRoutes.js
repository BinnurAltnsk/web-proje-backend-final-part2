const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Tüm rotalar giriş yapmayı gerektirir
router.use(protect);

router.route('/')
  .get(courseController.getAllCourses) // Herkes listeyebilir
  .post(authorize('admin'), courseController.createCourse); // Sadece admin ekleyebilir

router.route('/:id')
  .get(courseController.getCourse) // Herkes detay görebilir
  .put(authorize('admin'), courseController.updateCourse) // Sadece admin güncelleyebilir
  .delete(authorize('admin'), courseController.deleteCourse); // Sadece admin silebilir

module.exports = router;
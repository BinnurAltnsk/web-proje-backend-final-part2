const express = require('express');
const router = express.Router();
const enrollmentController = require('../controllers/enrollmentController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

// Öğrenci İşlemleri
router.post('/', authorize('student'), enrollmentController.enrollCourse);
router.get('/my-courses', authorize('student'), enrollmentController.getMyCourses);
router.delete('/:id', authorize('student'), enrollmentController.dropCourse);

router.get('/section/:sectionId', authorize('faculty', 'admin'), enrollmentController.getStudentsBySection);

module.exports = router;
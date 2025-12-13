const express = require('express');
const router = express.Router();
const gradeController = require('../controllers/gradeController');
const enrollmentController = require('../controllers/enrollmentController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

// Hoca not girer
router.put('/:enrollmentId', authorize('faculty', 'admin'), gradeController.updateGrade);
router.get('/section/:sectionId', authorize('faculty', 'admin'), enrollmentController.getStudentsBySection);
router.get('/my-grades', authorize('student'), gradeController.getMyGrades);
router.get('/transcript/pdf', authorize('student'), gradeController.downloadTranscript);

module.exports = router;
const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { protect, authorize } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
router.use(protect);

// Oturum Yönetimi (Hoca)
router.post('/sessions', authorize('faculty', 'admin'), attendanceController.startSession);
router.get('/sessions/:id', attendanceController.getSession);
router.put('/sessions/:id/close', authorize('faculty', 'admin'), attendanceController.closeSession);

// Yoklama Verme (Öğrenci)
router.post('/sessions/:id/checkin', authorize('student'), attendanceController.checkIn);
router.get('/my-attendance', authorize('student'), attendanceController.getMyAttendance);
router.get('/missed-sessions', authorize('student'), attendanceController.getMissedSessions);

// Raporlama (Hoca)
router.get('/report/:sectionId', authorize('faculty', 'admin'), attendanceController.getAttendanceReport);
router.post(
  '/excuse-requests', 
  authorize('student'), 
  upload.single('document'), 
  attendanceController.createExcuseRequest
);

// Listeleme (Öğrenci kendi, Hoca dersindekileri)
router.get(
  '/excuse-requests', 
  authorize('student', 'faculty', 'admin'), 
  attendanceController.getExcuseRequests
);

// Onaylama/Reddetme (Hoca)
router.put(
  '/excuse-requests/:id', 
  authorize('faculty', 'admin'), 
  attendanceController.updateExcuseStatus
);

router.put('/records/:id', authorize('faculty', 'admin'), attendanceController.manageAttendanceRecord);
router.delete('/records/:id', authorize('faculty', 'admin'), attendanceController.manageAttendanceRecord);
module.exports = router;
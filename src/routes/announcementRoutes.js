const express = require('express');
const router = express.Router();
const announcementController = require('../controllers/announcementController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', announcementController.getAllAnnouncements);
router.post('/', authorize('admin'), announcementController.createAnnouncement);
router.delete('/:id', authorize('admin'), announcementController.deleteAnnouncement);

module.exports = router;
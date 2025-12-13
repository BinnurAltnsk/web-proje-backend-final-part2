const express = require('express');
const router = express.Router();
const sectionController = require('../controllers/sectionController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .get(sectionController.getAllSections)
  .post(authorize('admin'), sectionController.createSection);

router.route('/:id')
  .put(authorize('admin'), sectionController.updateSection)
  .delete(authorize('admin'), sectionController.deleteSection);

module.exports = router;
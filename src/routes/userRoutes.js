
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Bu dosyada tanımlanan tüm rotalar için giriş yapmış olmak zorunlu
router.use(protect);

router.get('/me', userController.getMe);
router.put('/me', userController.updateMe);
router.post(
  '/me/profile-picture',
  protect,
  upload.single('profile_image'),
  userController.uploadProfileImage
);
router.put('/change-password', userController.changePassword);

// Sadece Adminler erişebilir
router.get('/', protect, authorize('admin'), userController.getAllUsers);
module.exports = router;
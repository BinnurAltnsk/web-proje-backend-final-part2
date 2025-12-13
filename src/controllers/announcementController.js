const db = require('../models');
const Announcement = db.Announcement;
const { Op } = require('sequelize');
const asyncHandler = require('../middleware/async');

// @desc    Duyuruları Listele
// @route   GET /api/v1/announcements
// @access  Authenticated
exports.getAllAnnouncements = asyncHandler(async (req, res, next) => {
  const whereClause = {};

  // Rol bazlı filtreleme:
  // Öğrenci ise -> 'all' ve 'student'
  // Hoca ise -> 'all' ve 'faculty'
  // Admin ise -> Hepsi
  if (req.user.role === 'student') {
    whereClause.target_role = { [Op.in]: ['all', 'student'] };
  } else if (req.user.role === 'faculty') {
    whereClause.target_role = { [Op.in]: ['all', 'faculty'] };
  }

  const announcements = await Announcement.findAll({
    where: whereClause,
    order: [
      ['priority', 'DESC'], // Önce 'high' (Yüksek) öncelikliler
      ['created_at', 'DESC'] // Sonra en yeniler
    ]
  });

  res.status(200).json({ success: true, data: announcements });
});

// @desc    Duyuru Oluştur
// @route   POST /api/v1/announcements
// @access  Admin
exports.createAnnouncement = asyncHandler(async (req, res, next) => {
  const announcement = await Announcement.create(req.body);
  res.status(201).json({ success: true, data: announcement });
});

// @desc    Duyuru Sil
// @route   DELETE /api/v1/announcements/:id
// @access  Admin
exports.deleteAnnouncement = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  await Announcement.destroy({ where: { id } });
  res.status(200).json({ success: true, message: 'Duyuru silindi.' });
});
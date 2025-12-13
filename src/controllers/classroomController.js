const db = require('../models');
const Classroom = db.Classroom;
const asyncHandler = require('../middleware/async');

// @desc    Tüm derslikleri getir
// @route   GET /api/v1/classrooms
// @access  Private
exports.getAllClassrooms = asyncHandler(async (req, res, next) => {
  const classrooms = await Classroom.findAll({
    order: [['building', 'ASC'], ['room_number', 'ASC']]
  });

  res.status(200).json({
    success: true,
    count: classrooms.length,
    data: classrooms
  });
});
const db = require('../models');
const Department = db.Department;
const asyncHandler = require('../middleware/async');

// @desc    Tüm bölümleri getir
// @route   GET /api/v1/departments
// @access  Private (Herkes görebilir, seçim kutuları için)
exports.getAllDepartments = asyncHandler(async (req, res, next) => {
  const departments = await Department.findAll({
    order: [['name', 'ASC']]
  });

  res.status(200).json({
    success: true,
    count: departments.length,
    data: departments
  });
});
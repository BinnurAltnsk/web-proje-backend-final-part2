const db = require('../models');
const Course = db.Course;
const Department = db.Department;
const { Op } = require('sequelize');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');

// @desc    Tüm dersleri getir (Arama, Filtreleme, Sayfalama)
// @route   GET /api/v1/courses
// @access  Private (Herkes görebilir)
exports.getAllCourses = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  const { search, department_id } = req.query;
  const whereClause = {};

  // Departmana göre filtrele
  if (department_id) {
    whereClause.departmentId = department_id;
  }

  // Arama (Kod veya İsim)
  if (search) {
    whereClause[Op.or] = [
      { name: { [Op.iLike]: `%${search}%` } }, // Case-insensitive (Postgres)
      { code: { [Op.iLike]: `%${search}%` } }
    ];
  }

  const { count, rows } = await Course.findAndCountAll({
    where: whereClause,
    limit,
    offset,
    include: [
      { model: Department, as: 'department', attributes: ['id', 'name', 'code'] }
    ],
    order: [['code', 'ASC']]
  });

  res.status(200).json({
    success: true,
    data: rows,
    pagination: {
      total: count,
      page,
      totalPages: Math.ceil(count / limit)
    }
  });
});

// @desc    Tek bir dersi getir
// @route   GET /api/v1/courses/:id
exports.getCourse = asyncHandler(async (req, res, next) => {
  const course = await Course.findByPk(req.params.id, {
    include: [
      { 
        model: Course, 
        as: 'prerequisite', // <--- DÜZELTİLDİ: 'prerequisites' değil 'prerequisite'
        attributes: ['id', 'code', 'name'] 
      },
      {
        model: Department,
        as: 'department',
        attributes: ['name']
      }
    ]
  });

  if (!course) {
    return next(new ErrorResponse(`Ders bulunamadı (ID: ${req.params.id})`, 404));
  }

  res.status(200).json({
    success: true,
    data: course
  });
});

// @desc    Yeni ders oluştur
// @route   POST /api/v1/courses
// @access  Private (Sadece Admin)
exports.createCourse = asyncHandler(async (req, res, next) => {
  const course = await Course.create(req.body);

  // Eğer ön koşul ders ID'leri gönderildiyse ekle
  if (req.body.prerequisites && Array.isArray(req.body.prerequisites)) {
    await course.setPrerequisites(req.body.prerequisites);
  }

  res.status(201).json({
    success: true,
    data: course
  });
});

// @desc    Ders güncelle
// @route   PUT /api/v1/courses/:id
// @access  Private (Sadece Admin)
exports.updateCourse = asyncHandler(async (req, res, next) => {
  let course = await Course.findByPk(req.params.id);

  if (!course) {
    return next(new ErrorResponse(`Ders bulunamadı (ID: ${req.params.id})`, 404));
  }

  course = await course.update(req.body);

  // Ön koşulları güncelle
  if (req.body.prerequisites && Array.isArray(req.body.prerequisites)) {
    await course.setPrerequisites(req.body.prerequisites);
  }

  res.status(200).json({
    success: true,
    data: course
  });
});

// @desc    Ders sil
// @route   DELETE /api/v1/courses/:id
// @access  Private (Sadece Admin)
exports.deleteCourse = asyncHandler(async (req, res, next) => {
  const course = await Course.findByPk(req.params.id);

  if (!course) {
    return next(new ErrorResponse(`Ders bulunamadı (ID: ${req.params.id})`, 404));
  }

  await course.destroy();

  res.status(200).json({
    success: true,
    data: {}
  });
});
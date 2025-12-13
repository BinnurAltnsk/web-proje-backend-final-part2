const db = require('../models');
const CourseSection = db.CourseSection;
const Course = db.Course;
const Faculty = db.Faculty;
const Classroom = db.Classroom;
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');

// @desc    Tüm şubeleri listele (Filtreleme ile)
// @route   GET /api/v1/sections
exports.getAllSections = asyncHandler(async (req, res, next) => {
  const { course_id, semester, year } = req.query;
  const whereClause = {};

  if (course_id) whereClause.courseId = course_id;
  if (semester) whereClause.semester = semester;
  if (year) whereClause.year = year;

  const sections = await CourseSection.findAll({
    where: whereClause,
    include: [
      { model: Course, as: 'course', attributes: ['name', 'code'] },
      { model: Faculty, as: 'instructor', include: [{ model: db.User, as: 'user', attributes: ['name'] }] },
      { model: Classroom, as: 'classroom' }
    ]
  });

  res.status(200).json({ success: true, count: sections.length, data: sections });
});

// @desc    Yeni şube oluştur
// @route   POST /api/v1/sections
// @access  Admin
exports.createSection = asyncHandler(async (req, res, next) => {
  // schedule_json örneği: [{ day: "Monday", start: "09:00", end: "12:00" }]
  const section = await CourseSection.create(req.body);
  res.status(201).json({ success: true, data: section });
});

// @desc    Şube güncelle
// @route   PUT /api/v1/sections/:id
// @access  Admin
exports.updateSection = asyncHandler(async (req, res, next) => {
  let section = await CourseSection.findByPk(req.params.id);
  if (!section) return next(new ErrorResponse('Şube bulunamadı', 404));

  section = await section.update(req.body);
  res.status(200).json({ success: true, data: section });
});

// @desc    Şube sil
// @route   DELETE /api/v1/sections/:id
// @access  Admin
exports.deleteSection = asyncHandler(async (req, res, next) => {
  const section = await CourseSection.findByPk(req.params.id);
  if (!section) return next(new ErrorResponse('Şube bulunamadı', 404));

  await section.destroy();
  res.status(200).json({ success: true, data: {} });
});
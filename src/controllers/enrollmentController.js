const db = require('../models');
const Enrollment = db.Enrollment;
const CourseSection = db.CourseSection;
const Student = db.Student;
const EnrollmentService = require('../services/enrollmentService');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const { sequelize } = require('../models');
const { Op } = require('sequelize');
const { ACTIVE_SEMESTER, ACTIVE_YEAR, MAX_ECTS_LIMIT } = require('../config/systemConfig'); // <--- YENİ IMPORT

// @desc    Derse Kayıt Ol (Öğrenci)
exports.enrollCourse = asyncHandler(async (req, res, next) => {
  const { sectionId } = req.body;
  const student = await Student.findOne({ where: { userId: req.user.id } });

  if (!student) return next(new ErrorResponse('Öğrenci profili bulunamadı.', 404));

  // 1. Yeni Seçilen Şubeyi (Section) Getir
  const newSection = await CourseSection.findByPk(sectionId, {
    include: [
      { 
        model: db.Course, 
        as: 'course',
        include: [{ model: db.Course, as: 'prerequisite' }]
      }
    ]
  });

  if (!newSection) return next(new ErrorResponse('Ders şubesi bulunamadı.', 404));

  // -----------------------------------------------------------------------
  // KONTROL 1: AKTİF DÖNEM KONTROLÜ
  // -----------------------------------------------------------------------
  // Öğrenci sadece sistemin izin verdiği dönemdeki dersleri seçebilir.
  if (newSection.year !== ACTIVE_YEAR || newSection.semester !== ACTIVE_SEMESTER) {
    return next(new ErrorResponse(
      `Sadece aktif dönem (${ACTIVE_YEAR} ${ACTIVE_SEMESTER}) derslerine kayıt olabilirsiniz. Seçilen ders: ${newSection.year} ${newSection.semester}`, 
      400
    ));
  }
  // -----------------------------------------------------------------------

  // 2. Kapasite Kontrolü
  if (newSection.enrolled_count >= newSection.capacity) {
    return next(new ErrorResponse('Bu dersin kontenjanı dolmuş.', 400));
  }

  // 3. Mükerrer Kayıt Kontrolü
// Öğrencinin bu DERS (Course) için geçmiş kayıtlarına bak (Şube farketmeksizin)
  // newSection.courseId verisini kullanıyoruz.
  const previousEnrollments = await Enrollment.findAll({
    where: { studentId: student.id },
    include: [{
      model: CourseSection,
      as: 'section',
      where: { courseId: newSection.courseId } // Aynı dersin herhangi bir şubesi
    }]
  });

  // Kontrol A: Öğrenci şu an bu dersi zaten alıyor mu? (Status: enrolled)
  const isCurrentlyEnrolled = previousEnrollments.find(e => e.status === 'enrolled');
  if (isCurrentlyEnrolled) {
    return next(new ErrorResponse(
      `Bu dersi (${newSection.course.code}) şu an zaten almaktasınız. Aynı anda iki kere alamazsınız.`, 
      400
    ));
  }

  // Kontrol B: Not Yükseltme veya Alttan Alma Durumu
  // Eğer listede 'passed' veya 'failed' varsa, sistem yeni kayda İZİN VERİR.
  // Ancak bilgi amaçlı log düşebiliriz veya client'a uyarı dönebiliriz.
  // Bizim senaryomuzda: Hata fırlatmıyoruz, devam ediyoruz.
  
  // (Opsiyonel): Eğer 'passed' ise ve notu AA ise tekrar almasını engelleyebilirsiniz.
  const passedWithAA = previousEnrollments.find(e => e.letter_grade === 'AA');
  if (passedWithAA) return next(new ErrorResponse('AA ile geçtiğiniz dersi tekrar alamazsınız.', 400));
  
  // 4. Ön Koşul Kontrolü (Mevcut kodunuz buradaydı, aynen kalıyor)
  if (newSection.course.prerequisiteId) {
    const passedPrerequisite = await Enrollment.findOne({
      where: { studentId: student.id, status: 'passed' },
      include: [{ model: CourseSection, as: 'section', where: { courseId: newSection.course.prerequisiteId } }]
    });
    if (!passedPrerequisite) {
      return next(new ErrorResponse(
        `Ön Koşul Hatası! Önce '${newSection.course.prerequisite.code}' dersini vermelisiniz.`, 400
      ));
    }
  }

  // -----------------------------------------------------------------------
  // KONTROL 2: AKTS (ECTS) LİMİT KONTROLÜ
  // -----------------------------------------------------------------------
  // Öğrencinin AKTİF dönemdeki kayıtlı derslerini bul
  const currentTermEnrollments = await Enrollment.findAll({
    where: { 
      studentId: student.id,
      status: 'enrolled' 
    },
    include: [{ 
      model: CourseSection, 
      as: 'section',
      where: { year: ACTIVE_YEAR, semester: ACTIVE_SEMESTER }, // Sadece bu dönemi topla
      include: [{ model: db.Course, as: 'course' }]
    }]
  });

  // Mevcut toplam AKTS'yi hesapla
  let totalECTS = 0;
  currentTermEnrollments.forEach(enr => {
    totalECTS += enr.section.course.ects;
  });

  const newCourseECTS = newSection.course.ects;

  // Kontrol Et
  if (totalECTS + newCourseECTS > MAX_ECTS_LIMIT) {
    return next(new ErrorResponse(
      `AKTS Limiti Aşıldı! Mevcut: ${totalECTS}, Yeni: ${newCourseECTS}, Toplam: ${totalECTS + newCourseECTS}. (Limit: ${MAX_ECTS_LIMIT})`, 
      400
    ));
  }
  // -----------------------------------------------------------------------

  // 5. Çakışma Kontrolü (Mevcut kodunuz buradaydı, aynen kalıyor)
  // (Burada activeEnrollments yerine currentTermEnrollments kullanabiliriz, performans artar)
  const newSchedule = newSection.schedule_json || [];
  
  for (const enrollment of currentTermEnrollments) { // activeEnrollments yerine currentTermEnrollments
    const existingSection = enrollment.section;
    const existingSchedule = existingSection.schedule_json || [];
    for (const newSlot of newSchedule) {
      for (const existingSlot of existingSchedule) {
        if (newSlot.day === existingSlot.day) {
          if (newSlot.start_time < existingSlot.end_time && existingSlot.start_time < newSlot.end_time) {
            return next(new ErrorResponse(
              `Ders Çakışması: ${newSection.course.code} ile ${existingSection.course.code} çakışıyor.`, 400
            ));
          }
        }
      }
    }
  }

  // 6. Kaydı Oluştur
  const enrollment = await Enrollment.create({
    studentId: student.id,
    sectionId,
    status: 'enrolled'
  });

  await newSection.increment('enrolled_count');

  res.status(201).json({
    success: true,
    message: 'Derse başarıyla kayıt oldunuz.',
    data: enrollment
  });
});

// @desc    Kayıtlı Dersleri Getir
// @route   GET /api/v1/enrollments/my-courses
exports.getMyCourses = asyncHandler(async (req, res, next) => {
  const student = await Student.findOne({ where: { userId: req.user.id } });
  if (!student) return next(new ErrorResponse('Öğrenci bulunamadı', 404));

  const enrollments = await Enrollment.findAll({
    where: { studentId: student.id },
    include: [{
      model: CourseSection,
      as: 'section',
      include: [
        { model: db.Course, as: 'course' },
        { model: db.Faculty, as: 'instructor', include: ['user'] },
        { model: db.Classroom, as: 'classroom' }
      ]
    }]
  });

  res.status(200).json({ success: true, count: enrollments.length, data: enrollments });
});

// @desc    Bir şubedeki öğrencileri getir (Hoca ve Admin için)
// @route   GET /api/v1/enrollments/section/:sectionId
exports.getStudentsBySection = asyncHandler(async (req, res, next) => {
  const { sectionId } = req.params;
  
  // Şubeye ait 'active' (kayıtlı) öğrencileri getir
  const enrollments = await Enrollment.findAll({
    where: { sectionId, status: 'enrolled' },
    include: [{ 
      model: Student, 
      as: 'student', 
      attributes: ['id', 'student_number', 'gpa', 'cgpa'], // Student alanlarını buradan çekiyoruz
      include: [{ 
        model: db.User, 
        as: 'user', 
        attributes: ['name', 'email'] // student_number BURADAN SİLİNDİ
      }] 
    }],
    // Sıralama: Öğrenci numarasına göre artan
    order: [[{ model: Student, as: 'student' }, 'student_number', 'ASC']]
  });

  res.status(200).json({
    success: true,
    count: enrollments.length,
    data: enrollments
  });
});

// @desc    Dersi Bırak (Drop)
// @route   DELETE /api/v1/enrollments/:id
exports.dropCourse = asyncHandler(async (req, res, next) => {
  const enrollmentId = req.params.id;
  
  const t = await sequelize.transaction();

  try {
    const enrollment = await Enrollment.findByPk(enrollmentId, { transaction: t });
    if (!enrollment) throw new Error('Kayıt bulunamadı.');

    // Sadece 'enrolled' statüsündeki dersler bırakılabilir
    if (enrollment.status !== 'enrolled') throw new Error('Bu ders zaten bırakılmış veya tamamlanmış.');

    // Status güncelle
    enrollment.status = 'dropped';
    await enrollment.save({ transaction: t });

    // Kontenjanı düşür
    const section = await CourseSection.findByPk(enrollment.sectionId, { transaction: t });
    await section.decrement('enrolled_count', { transaction: t });

    await t.commit();

    res.status(200).json({ success: true, message: 'Ders başarıyla bırakıldı.' });

  } catch (err) {
    await t.rollback();
    return next(new ErrorResponse(err.message, 400));
  }
});
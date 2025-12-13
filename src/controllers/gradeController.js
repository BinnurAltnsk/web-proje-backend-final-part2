const db = require('../models');
const Enrollment = db.Enrollment;
const CourseSection = db.CourseSection;
const Student = db.Student;
const Course = db.Course;
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const pdfService = require('../utils/pdfService');
const { recalculateGPA } = require('../utils/gradeHelper');

// Harf Notu Hesaplama Yardımcısı (40% Vize + 60% Final)
const calculateLetterGrade = (midterm, final) => {
  if (midterm === null || final === null) return { letter: null, point: null };

  const average = (midterm * 0.4) + (final * 0.6);
  
  if (average >= 90) return { letter: 'AA', point: 4.0 };
  if (average >= 85) return { letter: 'BA', point: 3.5 };
  if (average >= 80) return { letter: 'BB', point: 3.0 };
  if (average >= 75) return { letter: 'CB', point: 2.5 };
  if (average >= 70) return { letter: 'CC', point: 2.0 };
  if (average >= 65) return { letter: 'DC', point: 1.5 };
  if (average >= 60) return { letter: 'DD', point: 1.0 };
  if (average >= 50) return { letter: 'FD', point: 0.5 };
  return { letter: 'FF', point: 0.0 };
};

// @desc    Not Girişi Yap (Hoca)
exports.updateGrade = asyncHandler(async (req, res, next) => {
  const { midterm_grade, final_grade } = req.body;
  const { enrollmentId } = req.params;
  const instructorId = req.user.facultyProfile.id;

  let enrollment = await Enrollment.findByPk(enrollmentId, {
    include: [{ model: CourseSection, as: 'section' }]
  });

  if (!enrollment) return next(new ErrorResponse('Kayıt bulunamadı.', 404));

  if (enrollment.section.instructorId !== instructorId && req.user.role !== 'admin') {
    return next(new ErrorResponse('Bu dersin notunu girme yetkiniz yok.', 403));
  }

  if (midterm_grade !== undefined) enrollment.midterm_grade = midterm_grade;
  if (final_grade !== undefined) enrollment.final_grade = final_grade;

  if (enrollment.midterm_grade !== null && enrollment.final_grade !== null) {
    const result = calculateLetterGrade(enrollment.midterm_grade, enrollment.final_grade);
    enrollment.letter_grade = result.letter;
    enrollment.grade_point = result.point;
    
    if (result.letter === 'FF' || result.letter === 'FD') {
        enrollment.status = 'failed';
    } else {
        enrollment.status = 'passed';
    }
  }

  await enrollment.save();

  // 2. YENİ EKLENEN KISIM: GPA HESAPLA VE KAYDET
  // Not: enrollment.studentId veritabanında var
  await recalculateGPA(enrollment.studentId);

  res.status(200).json({
    success: true,
    message: 'Not güncellendi ve ortalama hesaplandı.',
    data: enrollment
  });
});

// @desc    Öğrenci Notlarını Getir
exports.getMyGrades = asyncHandler(async (req, res, next) => {
  const student = await Student.findOne({ where: { userId: req.user.id } });
  
  if (!student) return next(new ErrorResponse('Öğrenci profili bulunamadı.', 404));

  const grades = await Enrollment.findAll({
    where: { studentId: student.id },
    include: [{
      model: CourseSection,
      as: 'section',
      include: [{ model: Course, as: 'course', attributes: ['code', 'name', 'credits'] }]
    }]
  });

  // ARTIK HESAPLAMAYA GEREK YOK, DOĞRUDAN STUDENT TABLOSUNDAN ALABİLİRİZ
  // Ancak yine de grades listesini dönüyoruz.
  // İsterseniz res.json içine student.gpa'yı da ekleyebilirsiniz.

  res.status(200).json({
    success: true,
    data: grades,
    gpa: student.gpa // Artık veritabanından gelen gerçek değer
  });
});

// @desc    Öğrenci Notlarını Getir
// @route   GET /api/v1/grades/my-grades
// @access  Student
exports.getMyGrades = asyncHandler(async (req, res, next) => {
  const student = await Student.findOne({ where: { userId: req.user.id } });
  
  if (!student) {
    return next(new ErrorResponse('Öğrenci profili bulunamadı.', 404));
  }

  const grades = await Enrollment.findAll({
    where: { studentId: student.id },
    include: [{
      model: CourseSection,
      as: 'section',
      include: [{ model: Course, as: 'course', attributes: ['code', 'name', 'credits'] }]
    }]
  });

  // Basit GPA Hesabı (Sadece bu dönem için örnek)
  // Gerçek senaryoda tüm geçmiş dersler toplanıp hesaplanır.
  let totalPoints = 0;
  let totalCredits = 0;

  grades.forEach(g => {
    if (g.grade_point !== null) {
        totalPoints += (g.grade_point * g.section.course.credits);
        totalCredits += g.section.course.credits;
    }
  });

  const gpa = totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : 0.00;

  res.status(200).json({
    success: true,
    data: grades,
    gpa: gpa
  });
});

// @desc    Transkript PDF İndir
// @route   GET /api/v1/grades/transcript/pdf
exports.downloadTranscript = asyncHandler(async (req, res, next) => {
  const student = await Student.findOne({ 
    where: { userId: req.user.id },
    include: [
        { model: db.User, as: 'user', attributes: ['name'] },
        { model: db.Department, as: 'department', attributes: ['name'] }
    ]
  });

  if (!student) {
    return next(new ErrorResponse('Öğrenci profili bulunamadı.', 404));
  }

  const enrollments = await Enrollment.findAll({
    where: { studentId: student.id },
    include: [{
      model: CourseSection,
      as: 'section',
      include: [{ model: Course, as: 'course', attributes: ['code', 'name', 'credits'] }]
    }],
    order: [[{ model: CourseSection, as: 'section' }, 'year', 'ASC']]
  });

  // Dosya isminde boşluk veya Türkçe karakter olmaması daha güvenlidir
  const safeFilename = `Transkript-${student.student_number}.pdf`;

  try {
    // PDF'i oluştur ve Buffer olarak al
    const pdfBuffer = await pdfService.buildTranscript(student, enrollments);

    // Headerları ayarla
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${safeFilename}"`,
      'Content-Length': pdfBuffer.length // IDM ve tarayıcılar için dosya boyutu
    });

    // Veriyi gönder
    res.send(pdfBuffer);

  } catch (error) {
    console.error("PDF Oluşturma Hatası:", error);
    return next(new ErrorResponse('PDF oluşturulurken bir hata meydana geldi.', 500));
  }
});
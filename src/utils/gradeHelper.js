const db = require('../models');
const { Op } = require('sequelize');

/**
 * Öğrencinin GPA/CGPA'sını hesaplar (Tekrar alınan derslerde EN YÜKSEK notu baz alır).
 */
const recalculateGPA = async (studentId, transaction = null) => {
  try {
    // 1. Öğrencinin notu girilmiş tüm derslerini çek
    const enrollments = await db.Enrollment.findAll({
      where: { 
        studentId, 
        grade_point: { [Op.ne]: null } // Sadece notu olanlar
      },
      include: [{
        model: db.CourseSection,
        as: 'section',
        include: [{ model: db.Course, as: 'course', attributes: ['id', 'credits', 'code'] }]
      }],
      transaction
    });

    if (enrollments.length === 0) return 0.00;

    // 2. Ders Bazlı En Yüksek Notu Bul (Deduplication)
    // Aynı courseId'ye sahip birden fazla kayıt varsa, grade_point'i en yüksek olanı al.
    const uniqueCourses = {};

    enrollments.forEach(enr => {
      const courseId = enr.section.course.id;
      const currentPoints = enr.grade_point;

      // Eğer bu ders daha önce işlenmediyse VEYA şu anki not daha yüksekse güncelle
      if (!uniqueCourses[courseId]) {
        uniqueCourses[courseId] = {
          credits: enr.section.course.credits,
          points: currentPoints
        };
      } else {
        // Zaten var, notu karşılaştır
        if (currentPoints > uniqueCourses[courseId].points) {
          uniqueCourses[courseId].points = currentPoints;
        }
      }
    });

    // 3. Ortalamayı Hesapla
    let totalWeightedPoints = 0;
    let totalCredits = 0;

    Object.values(uniqueCourses).forEach(course => {
      totalWeightedPoints += (course.points * course.credits);
      totalCredits += course.credits;
    });

    const newGpa = totalCredits > 0 ? (totalWeightedPoints / totalCredits).toFixed(2) : 0.00;

    // 4. Güncelle
    await db.Student.update(
      { gpa: newGpa, cgpa: newGpa }, 
      { where: { id: studentId }, transaction }
    );
    
    console.log(`Öğrenci (ID: ${studentId}) not ortalaması güncellendi (Tekrarlı dersler süzüldü): ${newGpa}`);
    return newGpa;

  } catch (error) {
    console.error("GPA Hesaplama Hatası:", error);
    throw error;
  }
};

module.exports = { recalculateGPA };
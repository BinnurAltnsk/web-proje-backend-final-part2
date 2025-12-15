const db = require('../models');
const { Op } = require('sequelize');

class EnrollmentService {
  /**
   * 1. KONTROL: Ön koşul kontrolü (Recursive)
   * Model yapısı: Course belongsTo Course (as: prerequisite)
   */
  static async checkPrerequisites(studentId, courseId, visited = new Set()) {
    if (visited.has(courseId)) return true; // Döngüsel bağımlılık koruması
    visited.add(courseId);

    // 1. Dersin ön koşulunu bul (Tekil ilişki: prerequisite)
    const course = await db.Course.findByPk(courseId, {
      include: [{ 
        model: db.Course, 
        as: 'prerequisite' // DÜZELTİLDİ: prerequisites -> prerequisite
      }]
    });

    // Eğer ders yoksa veya ön koşulu yoksa sorun yok
    if (!course || !course.prerequisite) return true;

    const prereq = course.prerequisite;

    // 2. Öğrenci bu ön koşul dersini almış ve geçmiş mi?
    const passed = await db.Enrollment.findOne({
      where: {
        studentId: studentId,
        status: 'passed',
      },
      include: [{
        model: db.CourseSection,
        as: 'section',
        where: { courseId: prereq.id }
      }]
    });

    if (!passed) {
      throw new Error(`Ön koşul sağlanamadı: ${prereq.code} - ${prereq.name} dersini vermelisiniz.`);
    }

    // Recursive: Ön koşulun da ön koşulu olabilir
    await this.checkPrerequisites(studentId, prereq.id, visited);

    return true;
  }

  /**
   * 2. KONTROL: Ders Programı Çakışması
   */
  static async checkTimeConflict(studentId, newSectionSchedule, currentSemester) {
    if (!newSectionSchedule || newSectionSchedule.length === 0) return true;

    const activeEnrollments = await db.Enrollment.findAll({
      where: { studentId, status: 'enrolled' },
      include: [{ 
        model: db.CourseSection, 
        as: 'section',
        where: { semester: currentSemester }
      }]
    });

    for (const enrollment of activeEnrollments) {
      const existingSchedule = enrollment.section.schedule_json;
      if (!existingSchedule) continue;

      for (const newSlot of newSectionSchedule) {
        for (const existingSlot of existingSchedule) {
          if (newSlot.day === existingSlot.day) {
            const newStart = parseInt(newSlot.start_time.replace(':', ''));
            const newEnd = parseInt(newSlot.end_time.replace(':', ''));
            const existStart = parseInt(existingSlot.start_time.replace(':', ''));
            const existEnd = parseInt(existingSlot.end_time.replace(':', ''));

            if (newStart < existEnd && newEnd > existStart) {
              throw new Error(`Ders programı çakışması: ${enrollment.section.id} nolu şube ile çakışıyor.`);
            }
          }
        }
      }
    }
    return true;
  }

  static async checkCapacity(sectionId, transaction) {
    const section = await db.CourseSection.findByPk(sectionId, { transaction });
    if (section.enrolled_count >= section.capacity) {
      throw new Error('Ders kontenjanı dolu.');
    }
    return section;
  }
}

module.exports = EnrollmentService;
const db = require('../models');
const { Op } = require('sequelize');

class EnrollmentService {
  /**
   * 1. KONTROL: Ön koşul kontrolü (Recursive)
   * Öğrenci, bu dersin ön koşullarını geçmiş mi?
   */
  static async checkPrerequisites(studentId, courseId, visited = new Set()) {
    if (visited.has(courseId)) return true; // Döngüsel bağımlılık koruması
    visited.add(courseId);

    // 1. Dersin ön koşullarını bul
    const course = await db.Course.findByPk(courseId, {
      include: [{ model: db.Course, as: 'prerequisites' }]
    });

    if (!course || !course.prerequisites.length) return true;

    // 2. Her bir ön koşul için kontrol et
    for (const prereq of course.prerequisites) {
      // Öğrenci bu dersi almış ve geçmiş mi?
      const passed = await db.Enrollment.findOne({
        where: {
          studentId: studentId,
          status: 'passed',
          // Enrollment -> Section -> Course ilişkisinden courseId'yi bulmamız lazım
          // Ancak basitlik için şöyle yapıyoruz: Öğrencinin aldığı section'ları bulup courseId'si eşleşiyor mu bakarız
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
    }

    return true;
  }

  /**
   * 2. KONTROL: Ders Programı Çakışması
   * Öğrencinin mevcut dersleri ile yeni dersin saati çakışıyor mu?
   */
  static async checkTimeConflict(studentId, newSectionSchedule, currentSemester) {
    if (!newSectionSchedule || newSectionSchedule.length === 0) return true;

    // Öğrencinin o dönem aldığı diğer dersleri getir (status: enrolled)
    const activeEnrollments = await db.Enrollment.findAll({
      where: { studentId, status: 'enrolled' },
      include: [{ 
        model: db.CourseSection, 
        as: 'section',
        where: { semester: currentSemester } // Sadece bu dönemi kontrol et
      }]
    });

    for (const enrollment of activeEnrollments) {
      const existingSchedule = enrollment.section.schedule_json;
      if (!existingSchedule) continue;

      // Saat çakışması algoritması
      for (const newSlot of newSectionSchedule) {
        for (const existingSlot of existingSchedule) {
          if (newSlot.day === existingSlot.day) {
            // Saat aralıklarını karşılaştır (Örn: "09:00" -> 900 tamsayıya çevirerek)
            const newStart = parseInt(newSlot.start_time.replace(':', ''));
            const newEnd = parseInt(newSlot.end_time.replace(':', ''));
            const existStart = parseInt(existingSlot.start_time.replace(':', ''));
            const existEnd = parseInt(existingSlot.end_time.replace(':', ''));

            // Çakışma Mantığı: (StartA < EndB) ve (EndA > StartB)
            if (newStart < existEnd && newEnd > existStart) {
              throw new Error(`Ders programı çakışması: ${enrollment.section.id} nolu şube ile çakışıyor.`);
            }
          }
        }
      }
    }
    return true;
  }

  /**
   * 3. KONTROL: Kapasite Kontrolü
   */
  static async checkCapacity(sectionId, transaction) {
    const section = await db.CourseSection.findByPk(sectionId, { transaction });
    
    if (section.enrolled_count >= section.capacity) {
      throw new Error('Ders kontenjanı dolu.');
    }
    return section;
  }
}

module.exports = EnrollmentService;
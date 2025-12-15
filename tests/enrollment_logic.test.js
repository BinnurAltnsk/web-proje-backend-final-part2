const request = require('supertest');
const app = require('../src/app');
const db = require('../src/models');
const EnrollmentService = require('../src/services/enrollmentService');

let studentId;
let course1Id;
let course2Id; // course1'in ön koşulu olacak
let section1Id;

beforeAll(async () => {
  await db.sequelize.sync({ force: true });

  // Öğrenci Oluştur
  const user = await db.User.create({ name: 'Logic Student', email: 'logic@test.com', password_hash: 'pass', role: 'student' });
  const dept = await db.Department.create({ name: 'Logic Dept', code: 'LOG', faculty_name: 'Fac' });
  const student = await db.Student.create({ userId: user.id, departmentId: dept.id, student_number: 'L1', current_semester: 1 });
  studentId = student.id;

  // Ders 1 (Temel Ders)
  const c1 = await db.Course.create({ code: 'BASE101', name: 'Base Course', credits: 3, ects: 5, departmentId: dept.id });
  course1Id = c1.id;

  // Ders 2 (İleri Ders - BASE101 ön koşulu)
  const c2 = await db.Course.create({ code: 'ADV201', name: 'Advanced Course', credits: 3, ects: 5, departmentId: dept.id, prerequisiteId: c1.id });
  course2Id = c2.id;
  
  // Şube (Section) oluştur
  const classroom = await db.Classroom.create({ building: 'A', room_number: '1', capacity: 30, latitude: 0, longitude: 0 });
  
  const sec1 = await db.CourseSection.create({
    courseId: c1.id, semester: 'Fall', year: 2025, section_number: 1, capacity: 50,
    schedule_json: [{ day: "Monday", start_time: "09:00", end_time: "12:00" }]
  });
  section1Id = sec1.id;
});

describe('Enrollment Service Logic Tests', () => {

  it('should FAIL prerequisite check if base course is not passed', async () => {
    // BASE101'i geçmeden ADV201 almaya çalışıyoruz
    await expect(EnrollmentService.checkPrerequisites(studentId, course2Id))
      .rejects
      .toThrow(/Ön koşul sağlanamadı/);
  });

  it('should PASS prerequisite check if base course is passed', async () => {
    // Önce BASE101'i geçmiş gibi ekleyelim
    await db.Enrollment.create({ studentId, sectionId: section1Id, status: 'passed' });

    // Şimdi ADV201 kontrolü başarılı olmalı
    const result = await EnrollmentService.checkPrerequisites(studentId, course2Id);
    expect(result).toBe(true);
  });

  it('should detect time conflicts', async () => {
    // Öğrenci zaten Pazartesi 09:00-12:00 dersine kayıtlı (yukarıdaki testte eklendi)
    // Yeni bir ders ekleyelim: Pazartesi 10:00-11:00 (ÇAKIŞIYOR)
    const newSchedule = [{ day: "Monday", start_time: "10:00", end_time: "11:00" }];
    
    // Status 'enrolled' olmalı ki çakışma kontrolü yapılsın, yukarıda 'passed' yaptık, onu güncelleyelim
    await db.Enrollment.update({ status: 'enrolled' }, { where: { studentId } });

    await expect(EnrollmentService.checkTimeConflict(studentId, newSchedule, 'Fall'))
      .rejects
      .toThrow(/Ders programı çakışması/);
  });
});
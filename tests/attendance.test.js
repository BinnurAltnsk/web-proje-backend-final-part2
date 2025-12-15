const request = require('supertest');
const app = require('../src/app');
const db = require('../src/models');

// Değişkenleri en üstte tanımlıyoruz
let instructorToken;
let studentToken;
let createdSessionId;
let createdSectionId;
let createdStudentId;

beforeAll(async () => {
  // Her testten önce veritabanını temizle
  await db.sequelize.sync({ force: true });

  // 1. HOCA OLUŞTUR VE GİRİŞ YAP
  const facEmail = 'prof_att_final@test.com';
  await request(app).post('/api/v1/auth/register').send({
    name: 'Prof Attendance', email: facEmail, password: 'Password123!', role: 'student'
  });
  const facUser = await db.User.findOne({ where: { email: facEmail } });
  // Rolü force update ile faculty yap
  await db.User.update({ role: 'faculty', is_verified: true }, { where: { id: facUser.id } });
  
  const dept = await db.Department.create({ name: 'Attendance Dept', code: 'ATT', faculty_name: 'Eng' });
  const faculty = await db.Faculty.create({ 
    userId: facUser.id, 
    departmentId: dept.id, 
    title: 'Dr.', 
    office_number: 'B1', 
    employee_number: 'F99' 
  });

  const facLogin = await request(app).post('/api/v1/auth/login').send({ email: facEmail, password: 'Password123!' });
  instructorToken = facLogin.body.data.accessToken;

  // 2. ÖĞRENCİ OLUŞTUR VE GİRİŞ YAP
  const stuEmail = 'stu_att_final@test.com';
  await request(app).post('/api/v1/auth/register').send({
    name: 'Student Attendance', email: stuEmail, password: 'Password123!', role: 'student'
  });
  const stuUser = await db.User.findOne({ where: { email: stuEmail } });
  await db.User.update({ is_verified: true }, { where: { id: stuUser.id } });
  
  const student = await db.Student.create({ 
    userId: stuUser.id, 
    departmentId: dept.id, 
    student_number: 'S99', 
    gpa: 2.0, 
    current_semester: 1 
  });
  createdStudentId = student.id; // ID'yi sakla

  const stuLogin = await request(app).post('/api/v1/auth/login').send({ email: stuEmail, password: 'Password123!' });
  studentToken = stuLogin.body.data.accessToken;

  // 3. DERS, SINIF ve ŞUBE OLUŞTUR
  const classroom = await db.Classroom.create({ 
    building: 'Test Block', room_number: '101', capacity: 50,
    latitude: 41.0000, longitude: 40.0000 
  });

  const course = await db.Course.create({ 
    code: 'ATT101', name: 'Attendance Logic', credits: 3, ects: 5, departmentId: dept.id 
  });
  
  const section = await db.CourseSection.create({
    courseId: course.id, 
    section_number: 1, 
    semester: 'Spring', 
    year: 2025,
    instructorId: faculty.id, 
    classroomId: classroom.id, 
    capacity: 50
  });
  createdSectionId = section.id; // ID'yi sakla
});

describe('Attendance Controller Tests', () => {

  it('should allow instructor to create an attendance session', async () => {
    const res = await request(app)
      .post('/api/v1/attendance/sessions')
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({
        sectionId: createdSectionId,
        type: 'lecture',
        duration_minutes: 60,
        latitude: 41.0000, 
        longitude: 40.0000 
      });

    expect(res.statusCode).toEqual(201);
    createdSessionId = res.body.data.id;
  });

  it('should allow student to submit attendance', async () => {
    // ÖNEMLİ: Öğrenciyi derse burada, manuel olarak kaydediyoruz.
    // Bu sayede "Bu derse kayıtlı değilsiniz" hatasının önüne geçiyoruz.
    await db.Enrollment.create({
      studentId: createdStudentId,
      sectionId: createdSectionId,
      status: 'enrolled'
    });

    const res = await request(app)
      .post(`/api/v1/attendance/sessions/${createdSessionId}/checkin`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        latitude: 41.0001, // 10-15 metre fark (kabul edilmeli)
        longitude: 40.0001
      });

    // Hata durumunda konsola detay bas
    if (res.statusCode !== 200) {
      console.error("CheckIn Hata Detayı:", res.body);
    }

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
  });
});
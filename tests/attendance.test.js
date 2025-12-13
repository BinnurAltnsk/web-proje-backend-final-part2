const request = require('supertest');
const app = require('../src/app');
const db = require('../src/models');

let instructorToken;
let studentToken;
let sectionId;
let sessionId;

beforeAll(async () => {
  await db.sequelize.sync({ force: true });

  // 1. HOCA (Hibrit)
  const facEmail = 'prof_att@test.com';
  await request(app).post('/api/v1/auth/register').send({
    name: 'Prof Att', email: facEmail, password: 'Password123', role: 'student'
  });
  const facUser = await db.User.findOne({ where: { email: facEmail } });
  await db.User.update({ role: 'faculty', is_verified: true }, { where: { id: facUser.id } });
  
  const dept = await db.Department.create({ name: 'CENG', code: 'CENG', faculty_name: 'Eng' });
  const faculty = await db.Faculty.create({ userId: facUser.id, departmentId: dept.id, title: 'Dr.', office_number: 'B1', employee_number: 'F1' });

  const facLogin = await request(app).post('/api/v1/auth/login').send({ email: facEmail, password: 'Password123' });
  instructorToken = facLogin.body.data.accessToken;

  // 2. ÖĞRENCİ (Hibrit)
  const stuEmail = 'stu_att@test.com';
  await request(app).post('/api/v1/auth/register').send({
    name: 'Stu Att', email: stuEmail, password: 'Password123', role: 'student'
  });
  const stuUser = await db.User.findOne({ where: { email: stuEmail } });
  await db.User.update({ is_verified: true }, { where: { id: stuUser.id } });
  
  const student = await db.Student.create({ userId: stuUser.id, departmentId: dept.id, student_number: 'S1', gpa: 0, current_semester: 1 });

  const stuLogin = await request(app).post('/api/v1/auth/login').send({ email: stuEmail, password: 'Password123' });
  studentToken = stuLogin.body.data.accessToken;

  // 3. DERS ORTAMI
  const classroom = await db.Classroom.create({ 
    building: 'A', room_number: '101', capacity: 50, type: 'classroom',
    latitude: 41.0000, longitude: 40.0000 
  });

  const course = await db.Course.create({ code: 'ATT101', name: 'Attendance 101', credits: 3, ects: 5, departmentId: dept.id });
  
  const section = await db.CourseSection.create({
    courseId: course.id, section_number: 1, semester: 'Spring', year: 2025,
    instructorId: faculty.id, classroomId: classroom.id, capacity: 50
  });
  sectionId = section.id;

  await db.Enrollment.create({ studentId: student.id, sectionId: section.id, status: 'enrolled' });
});

describe('Attendance Controller Tests', () => {

  it('should allow instructor to create an attendance session', async () => {
    // Burada JSON verisi gönderiyoruz, sayılar float olmalı
    const res = await request(app)
      .post('/api/v1/attendance/sessions')
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({
        sectionId: sectionId,
        type: 'lecture',
        duration_minutes: 60,
        latitude: 41.0000, 
        longitude: 40.0000 
      });

    if (res.statusCode !== 201) console.error("Session Create Error Body:", res.body);
    expect(res.statusCode).toEqual(201);
    sessionId = res.body.data.id;
  });

  it('should allow student to submit attendance', async () => {
    const res = await request(app)
      .post(`/api/v1/attendance/sessions/${sessionId}/submit`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        latitude: 41.0001, 
        longitude: 40.0001
      });

    if (res.statusCode !== 200) console.error("Attendance Submit Error:", res.body);
    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
  });
});
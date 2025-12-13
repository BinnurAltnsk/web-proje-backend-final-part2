const request = require('supertest');
const app = require('../src/app'); // Bcrypt importuna gerek kalmadı
const db = require('../src/models');

let instructorToken;
let studentToken;
let enrollmentId;

beforeAll(async () => {
  // 1. Veritabanını Temizle
  await db.sequelize.sync({ force: true });

  // 2. Gerekli Yan Tablolar
  const dept = await db.Department.create({ 
    name: 'Computer Engineering', code: 'CENG', faculty_name: 'Engineering' 
  });
  
  const classroom = await db.Classroom.create({ 
    building: 'A', room_number: '101', capacity: 50, type: 'classroom',
    latitude: 41.0, longitude: 40.0
  });

  // -----------------------------------------------------------
  // 3. HOCA OLUŞTURMA (Register -> DB Update -> Login)
  // -----------------------------------------------------------
  const facEmail = 'prof@test.com';
  
  // A) Normal kayıt (Şifreleme backend'e emanet)
  await request(app).post('/api/v1/auth/register').send({
    name: 'Professor X',
    email: facEmail,
    password: 'Password123',
    role: 'student' // API kısıtlamasına takılmamak için student başlıyoruz
  });

  // B) DB'den Yükselt (Faculty yap ve Doğrula)
  const facUser = await db.User.findOne({ where: { email: facEmail } });
  await db.User.update(
    { role: 'faculty', is_verified: true }, 
    { where: { id: facUser.id } }
  );
  
  // Faculty tablosuna ekle
  await db.Faculty.create({
    userId: facUser.id,
    departmentId: dept.id,
    title: 'Prof.',
    office_number: 'A-1',
    employee_number: 'FAC001'
  });

  // C) Giriş Yap
  const facLogin = await request(app).post('/api/v1/auth/login').send({
    email: facEmail,
    password: 'Password123'
  });
  instructorToken = facLogin.body.data.accessToken;

  // -----------------------------------------------------------
  // 4. ÖĞRENCİ OLUŞTURMA (Register -> DB Update -> Login)
  // -----------------------------------------------------------
  const stuEmail = 'student@test.com';
  
  // A) Kayıt
  await request(app).post('/api/v1/auth/register').send({
    name: 'Student Y',
    email: stuEmail,
    password: 'Password123',
    role: 'student'
  });

  // B) DB'den Doğrula
  const stuUser = await db.User.findOne({ where: { email: stuEmail } });
  await db.User.update(
    { is_verified: true }, 
    { where: { id: stuUser.id } }
  );
  
  // Student tablosuna ekle
  await db.Student.create({
    userId: stuUser.id,
    departmentId: dept.id,
    student_number: 'STU001',
    gpa: 0, 
    current_semester: 1
  });

  // C) Giriş Yap
  const stuLogin = await request(app).post('/api/v1/auth/login').send({
    email: stuEmail,
    password: 'Password123'
  });
  studentToken = stuLogin.body.data.accessToken;

  // -----------------------------------------------------------
  // 5. DERS ve SECTION OLUŞTURMA
  // -----------------------------------------------------------
  const course = await db.Course.create({
    code: 'MATH101', name: 'Calculus', credits: 4, ects: 6, departmentId: dept.id
  });

  const section = await db.CourseSection.create({
    courseId: course.id,
    section_number: 1,
    semester: 'Spring', year: 2025,
    instructorId: 1, // Faculty ID (Sıfırlandığı için 1 olacaktır)
    classroomId: classroom.id,
    capacity: 30
  });

  // 6. ENROLLMENT (Kayıt)
  const enrollment = await db.Enrollment.create({
    studentId: 1, // Student ID (Sıfırlandığı için 1 olacaktır)
    sectionId: section.id,
    status: 'enrolled'
  });
  enrollmentId = enrollment.id;
});

describe('Grade Controller Tests', () => {

  it('should allow instructor to update grades for a student', async () => {
    const res = await request(app)
      .put(`/api/v1/grades/${enrollmentId}`)
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({
        midterm_grade: 80,
        final_grade: 90
      });

    if (res.statusCode !== 200) console.error("Grade Update Error:", res.body);

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    
    // Veritabanı Kontrolü
    const updatedEnrollment = await db.Enrollment.findByPk(enrollmentId);
    expect(updatedEnrollment.midterm_grade).toBe(80);
    expect(updatedEnrollment.final_grade).toBe(90);
  });

  it('should prevent student from updating their own grades', async () => {
    const res = await request(app)
      .put(`/api/v1/grades/${enrollmentId}`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        midterm_grade: 100,
        final_grade: 100
      });

    expect([401, 403]).toContain(res.statusCode);
  });
});
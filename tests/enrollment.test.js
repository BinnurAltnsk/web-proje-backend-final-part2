const request = require('supertest');
const app = require('../src/app');
const db = require('../src/models');

let adminToken;
let studentToken;
let course1Id, course2Id;
let section1Id, section2Id;
const rnd = Math.floor(Math.random() * 10000);

beforeAll(async () => {
  // 1. Veritabanını sıfırla
  await db.sequelize.sync({ force: true });

  // 2. Yan Tabloları Oluştur
  const dept = await db.Department.create({ 
    name: 'Computer Engineering', 
    code: 'CENG', 
    faculty_name: 'Engineering' 
  });
  
  await db.Classroom.create({ 
    building: 'A', room_number: '101', capacity: 50, type: 'classroom',
    latitude: 41.0, longitude: 40.0
  });
  
  await db.Classroom.create({ 
    building: 'A', room_number: '102', capacity: 50, type: 'classroom',
    latitude: 41.0, longitude: 40.0
  });

  // --------------------------------------------------------
  // 3. ADMIN OLUŞTURMA (GARANTİ YÖNTEM)
  // --------------------------------------------------------
  const adminEmail = 'admin_test@test.com';
  
  // A) Önce normal bir kullanıcı gibi API'den kayıt et (Şifreleme otomasyonu çalışsın)
  await request(app).post('/api/v1/auth/register').send({
    name: 'Admin User',
    email: adminEmail,
    password: 'Password123',
    role: 'student' // Geçici olarak student, veritabanından değiştireceğiz
  });

  // B) Veritabanından bu kullanıcıyı bul, Rolünü 'admin' yap ve Doğrula
  await db.User.update(
    { role: 'admin', is_verified: true }, 
    { where: { email: adminEmail } }
  );

  // C) Şimdi giriş yap
  const adminLogin = await request(app).post('/api/v1/auth/login').send({
    email: adminEmail,
    password: 'Password123'
  });
  
  if (!adminLogin.body.data) console.error("Admin Login Failed:", adminLogin.body);
  adminToken = adminLogin.body.data.accessToken; 


  // --------------------------------------------------------
  // 4. HOCA OLUŞTURMA
  // --------------------------------------------------------
  const facEmail = 'instructor@test.com';
  
  // A) Kayıt ol
  await request(app).post('/api/v1/auth/register').send({
    name: 'Dr. Instructor',
    email: facEmail,
    password: 'Password123',
    role: 'student' // API sadece student/faculty izin veriyorsa faculty seçilebilir, yoksa update ederiz.
  });

  // B) Yetki Yükselt ve Doğrula
  const facUser = await db.User.findOne({ where: { email: facEmail } });
  await db.User.update(
    { role: 'faculty', is_verified: true }, 
    { where: { id: facUser.id } }
  );
  
  // Faculty tablosuna detay ekle
  await db.Faculty.create({
    userId: facUser.id,
    departmentId: dept.id,
    title: 'Prof.',
    office_number: 'A-1',
    employee_number: 'FAC123'
  });


  // --------------------------------------------------------
  // 5. ÖĞRENCİ OLUŞTURMA
  // --------------------------------------------------------
  const studentEmail = `student_${rnd}@test.com`;
  
  // A) Kayıt ol
  await request(app).post('/api/v1/auth/register').send({
    name: 'Student User',
    email: studentEmail,
    password: 'Password123',
    role: 'student'
  });

  // B) Doğrula
  const stuUser = await db.User.findOne({ where: { email: studentEmail } });
  await db.User.update(
    { is_verified: true },
    { where: { id: stuUser.id } }
  );
  
  // Student tablosuna detay ekle
  await db.Student.create({
    userId: stuUser.id,
    departmentId: dept.id,
    student_number: `STU${rnd}`,
    gpa: 0,
    cgpa: 0,
    current_semester: 1
  });

  // C) Giriş Yap
  const studentLogin = await request(app).post('/api/v1/auth/login').send({
    email: studentEmail,
    password: 'Password123'
  });
  
  if (!studentLogin.body.data) console.error("Student Login Failed:", studentLogin.body);
  studentToken = studentLogin.body.data.accessToken;
});

describe('Part 2: Enrollment Logic Tests', () => {

  it('should allow admin to create courses and conflicting sections', async () => {
    // Ders 1
    const c1 = await request(app)
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: `MATH${rnd}`,
        name: 'Calculus',
        credits: 4,
        ects: 6,
        departmentId: 1
      });

    if(c1.statusCode !== 201) console.error("Create Course Error:", c1.body);
    course1Id = c1.body.data.id;

    const s1 = await request(app)
      .post('/api/v1/sections')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        courseId: course1Id,
        section_number: 1,
        semester: 'Spring', 
        year: 2025,
        instructorId: 1, // Faculty ID (Yukarıda oluşturulanın ID'si 1 olacaktır sıfırlandığı için)
        classroomId: 1,
        capacity: 50,
        schedule_json: [{ day: 'Monday', start_time: '09:00', end_time: '12:00' }]
      });
    section1Id = s1.body.data.id;

    // Ders 2 (Çakışan)
    const c2 = await request(app)
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: `PHYS${rnd}`,
        name: 'Physics',
        credits: 3,
        ects: 5,
        departmentId: 1
      });
    course2Id = c2.body.data.id;

    const s2 = await request(app)
      .post('/api/v1/sections')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        courseId: course2Id,
        section_number: 1,
        semester: 'Spring',
        year: 2025,
        instructorId: 1,
        classroomId: 2,
        capacity: 50,
        schedule_json: [{ day: 'Monday', start_time: '10:00', end_time: '13:00' }] 
      });
    section2Id = s2.body.data.id;

    expect(c1.statusCode).toEqual(201);
    expect(s1.statusCode).toEqual(201);
  });

  it('should enroll student to the first course', async () => {
    const res = await request(app)
      .post('/api/v1/enrollments')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ sectionId: section1Id });

    if(res.statusCode !== 201) console.error("Enrollment 1 Error:", res.body);
    expect(res.statusCode).toEqual(201);
  });

  it('should PREVENT enrollment to the second course due to time conflict', async () => {
    const res = await request(app)
      .post('/api/v1/enrollments')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ sectionId: section2Id });

    expect(res.statusCode).toEqual(400); // Çakışma hatası
    expect(JSON.stringify(res.body)).toMatch(/çakış/i);
  });
});
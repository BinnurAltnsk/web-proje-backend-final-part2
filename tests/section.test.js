const request = require('supertest');
const app = require('../src/app');
const db = require('../src/models');

let adminToken;
let courseId;
let facultyId; // Instructor ID
let classroomId;
let createdSectionId;

beforeAll(async () => {
  // Veritabanını sıfırla
  await db.sequelize.sync({ force: true });
  
  // -----------------------------------------------------------
  // 1. ADMIN OLUŞTUR VE TOKEN AL
  // -----------------------------------------------------------
  const adminEmail = 'admin@test.com';
  await request(app).post('/api/v1/auth/register').send({
    name: 'Admin User',
    email: adminEmail,
    password: 'Password123',
    role: 'student'
  });

  await db.User.update(
    { role: 'admin', is_verified: true },
    { where: { email: adminEmail } }
  );
  
  const login = await request(app).post('/api/v1/auth/login').send({
    email: adminEmail, 
    password: 'Password123'
  });
  adminToken = login.body.data.accessToken;

  // -----------------------------------------------------------
  // 2. GEREKLİ BAĞIMLILIKLARI OLUŞTUR (Bölüm, Ders, Hoca, Sınıf)
  // -----------------------------------------------------------
  
  // A) Bölüm Oluştur
  const dept = await db.Department.create({ 
    name: 'Computer Engineering', 
    code: 'CENG', 
    faculty_name: 'Engineering' 
  });

  // B) Ders Oluştur
  const course = await db.Course.create({
    code: 'CENG101',
    name: 'Intro to Programming',
    credits: 3,
    ects: 5,
    departmentId: dept.id
  });
  courseId = course.id;

  // C) Öğretim Üyesi (Faculty) Oluştur
  // Önce User
  const facultyUser = await db.User.create({
    name: 'Dr. Instructor',
    email: 'instructor@test.com',
    password_hash: '$2b$10$abcdefg...', // Dummy hash
    role: 'faculty',
    is_verified: true
  });
  // Sonra Faculty Tablosuna Ekle
  const faculty = await db.Faculty.create({
    employee_number: 'FAC001',
    title: 'Dr.',
    office_location: 'A-101',
    userId: facultyUser.id,
    departmentId: dept.id
  });
  facultyId = faculty.id;

  // D) Derslik (Classroom) Oluştur
  const classroom = await db.Classroom.create({
    building: 'Engineering Block A',
    room_number: '101',
    capacity: 50,
    latitude: 41.0,
    longitude: 29.0
  });
  classroomId = classroom.id;
});

describe('Section Controller Tests', () => {

  it('should create a new section', async () => {
    const res = await request(app)
      .post('/api/v1/sections')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        courseId: courseId,
        instructorId: facultyId,
        classroomId: classroomId,
        semester: 'Fall',
        year: 2024,
        section_number: 1,
        capacity: 40,
        schedule_json: [{ day: "Monday", start: "09:00", end: "12:00" }]
      });

    if(res.statusCode !== 201) console.error("Create Section Error:", res.body);

    expect(res.statusCode).toEqual(201);
    expect(res.body.data.year).toBe(2024);
    createdSectionId = res.body.data.id;
  });

  it('should get all sections', async () => {
    const res = await request(app)
      .get('/api/v1/sections')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    // İlişkilerin gelip gelmediğini kontrol et
    expect(res.body.data[0].course).toBeDefined();
    expect(res.body.data[0].instructor).toBeDefined();
  });

  it('should filter sections by course', async () => {
    const res = await request(app)
      .get(`/api/v1/sections?course_id=${courseId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.data.length).toBe(1);
  });

  it('should update a section', async () => {
    const res = await request(app)
      .put(`/api/v1/sections/${createdSectionId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        capacity: 60
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body.data.capacity).toBe(60);
  });

  it('should delete a section', async () => {
    const res = await request(app)
      .delete(`/api/v1/sections/${createdSectionId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toEqual(200);
    
    const check = await db.CourseSection.findByPk(createdSectionId);
    expect(check).toBeNull();
  });
});
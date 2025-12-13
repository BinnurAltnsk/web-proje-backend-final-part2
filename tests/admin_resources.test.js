const request = require('supertest');
const app = require('../src/app');
const db = require('../src/models');

let adminToken;
let deptId;
let courseId;
let classroomId;

beforeAll(async () => {
  await db.sequelize.sync({ force: true });

  const email = 'admin_res@test.com';
  // Hibrit Admin
  await request(app).post('/api/v1/auth/register').send({
    name: 'Resource Admin', email: email, password: 'Password123', role: 'student'
  });
  await db.User.update({ role: 'admin', is_verified: true }, { where: { email } });

  const login = await request(app).post('/api/v1/auth/login').send({ email, password: 'Password123' });
  adminToken = login.body.data.accessToken;
});

describe('Admin Resources Tests', () => {

  // DEPARTMENT TESTLERİ
  it('should create a department', async () => {
    const res = await request(app)
      .post('/api/v1/departments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Test Dept', code: 'TD', faculty_name: 'Test Fac' });

    expect(res.statusCode).toEqual(201);
    deptId = res.body.data.id;
  });

  // CLASSROOM TESTLERİ
  it('should create a classroom', async () => {
    const res = await request(app)
      .post('/api/v1/classrooms')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        building: 'B', room_number: '202', capacity: 40, type: 'lab',
        latitude: 41.1, longitude: 40.1
      });

    expect(res.statusCode).toEqual(201);
    classroomId = res.body.data.id;
  });

  // SECTION TESTLERİ
  // Section için önce Course ve Faculty lazım
  it('should create a section', async () => {
    // 1. Hazırlık: Course ve Faculty oluştur
    const course = await db.Course.create({ code: 'RES101', name: 'Resource Test', credits: 2, ects: 3, departmentId: deptId });
    courseId = course.id;
    
    // Geçici Hoca User'ı (Section oluştururken instructorId lazım)
    const facUser = await db.User.create({ name: 'Temp Fac', email: 'tf@t.com', password_hash: 'hash', role: 'faculty' });
    const faculty = await db.Faculty.create({ userId: facUser.id, departmentId: deptId, title: 'Dr.', office_number: '1', employee_number: '1' });

    // 2. Section Oluşturma İsteği
    const res = await request(app)
      .post('/api/v1/sections')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        courseId: courseId,
        section_number: 1,
        semester: 'Spring',
        year: 2025,
        instructorId: faculty.id,
        classroomId: classroomId,
        capacity: 40,
        schedule_json: []
      });

    expect(res.statusCode).toEqual(201);
  });
});
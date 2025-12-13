const request = require('supertest');
const app = require('../src/app');
const db = require('../src/models');

let adminToken;
let deptId;
let createdCourseId;

beforeAll(async () => {
  await db.sequelize.sync({ force: true });
  
  // -----------------------------------------------------------
  // ADMIN OLUŞTURMA (Register -> DB Update -> Login)
  // -----------------------------------------------------------
  const adminEmail = 'admin@test.com';
  
  // A) Kayıt (Normal kullanıcı gibi)
  await request(app).post('/api/v1/auth/register').send({
    name: 'Admin User',
    email: adminEmail,
    password: 'Password123',
    role: 'student'
  });

  // B) DB'den Admin Yap ve Doğrula
  await db.User.update(
    { role: 'admin', is_verified: true },
    { where: { email: adminEmail } }
  );
  
  // C) Giriş Yap
  const login = await request(app).post('/api/v1/auth/login').send({
    email: adminEmail, 
    password: 'Password123'
  });
  
  if (!login.body.data) console.error("Admin Login Failed:", login.body);
  adminToken = login.body.data.accessToken;

  // Bölüm Oluştur
  const dept = await db.Department.create({ 
    name: 'Test Dept', code: 'TEST', faculty_name: 'Test Faculty' 
  });
  deptId = dept.id;
});

describe('Course Controller Tests', () => {

  it('should create a new course', async () => {
    const res = await request(app)
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: 'TEST101',
        name: 'Test Course',
        credits: 3,
        ects: 5,
        departmentId: deptId
      });

    if(res.statusCode !== 201) console.error("Create Course Error:", res.body);

    expect(res.statusCode).toEqual(201);
    createdCourseId = res.body.data.id;
  });

  it('should get all courses', async () => {
    const res = await request(app)
      .get('/api/v1/courses')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('should update a course', async () => {
    const res = await request(app)
      .put(`/api/v1/courses/${createdCourseId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Updated Test Course'
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body.data.name).toBe('Updated Test Course');
  });

  it('should delete a course', async () => {
    const res = await request(app)
      .delete(`/api/v1/courses/${createdCourseId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toEqual(200);
    
    const check = await db.Course.findByPk(createdCourseId);
    expect(check).toBeNull();
  });
});
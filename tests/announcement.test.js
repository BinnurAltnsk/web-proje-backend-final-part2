const request = require('supertest');
const app = require('../src/app');
const db = require('../src/models');

let adminToken;
let studentToken;
let announcementId;

beforeAll(async () => {
  await db.sequelize.sync({ force: true });

  // 1. ADMIN OLUŞTUR (Hibrit)
  const adminEmail = 'admin_ann@test.com';
  await request(app).post('/api/v1/auth/register').send({
    name: 'Admin User', email: adminEmail, password: 'Password123', role: 'student'
  });
  await db.User.update({ role: 'admin', is_verified: true }, { where: { email: adminEmail } });
  
  const adminLogin = await request(app).post('/api/v1/auth/login').send({ email: adminEmail, password: 'Password123' });
  adminToken = adminLogin.body.data.accessToken;

  // 2. ÖĞRENCİ OLUŞTUR (Hibrit)
  const stuEmail = 'student_ann@test.com';
  await request(app).post('/api/v1/auth/register').send({
    name: 'Student User', email: stuEmail, password: 'Password123', role: 'student'
  });
  const stuUser = await db.User.findOne({ where: { email: stuEmail } });
  await db.User.update({ is_verified: true }, { where: { id: stuUser.id } });
  // Öğrenci profili şart olabilir (Dashboard için vs), basitçe ekleyelim
  await db.Student.create({ userId: stuUser.id, student_number: '123', gpa: 0, current_semester: 1 });

  const stuLogin = await request(app).post('/api/v1/auth/login').send({ email: stuEmail, password: 'Password123' });
  studentToken = stuLogin.body.data.accessToken;
});

describe('Announcement Controller Tests', () => {

  it('should allow Admin to create an announcement', async () => {
    const res = await request(app)
      .post('/api/v1/announcements')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Test Duyuru',
        content: 'Bu bir test duyurusudur.',
        target_role: 'all',
        priority: 'high'
      });

    expect(res.statusCode).toEqual(201);
    announcementId = res.body.data.id;
  });

  it('should allow Student to view announcements', async () => {
    const res = await request(app)
      .get('/api/v1/announcements')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].title).toBe('Test Duyuru');
  });

  it('should allow Admin to delete an announcement', async () => {
    const res = await request(app)
      .delete(`/api/v1/announcements/${announcementId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toEqual(200);
  });
});
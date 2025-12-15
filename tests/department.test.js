const request = require('supertest');
const app = require('../src/app');
const db = require('../src/models');

let adminToken;

beforeAll(async () => {
  await db.sequelize.sync({ force: true });
  
  // Admin Oluştur ve Token Al
  const adminEmail = 'admin_dept@test.com';
  await request(app).post('/api/v1/auth/register').send({
    name: 'Admin Dept',
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

  // Test Verisi Oluştur (Bölümler)
  await db.Department.bulkCreate([
    { name: 'Computer Engineering', code: 'CENG', faculty_name: 'Engineering' },
    { name: 'Electrical Engineering', code: 'EEE', faculty_name: 'Engineering' }
  ]);
});

describe('Department Controller Tests', () => {

  it('should get all departments', async () => {
    const res = await request(app)
      .get('/api/v1/departments')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toEqual(2);
    
    // Alfabetik sıralama kontrolü (Controller'da order: [['name', 'ASC']] var)
    expect(res.body.data[0].code).toBe('CENG');
    expect(res.body.data[1].code).toBe('EEE');
  });

});
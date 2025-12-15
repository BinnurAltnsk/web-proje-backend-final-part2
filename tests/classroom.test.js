const request = require('supertest');
const app = require('../src/app');
const db = require('../src/models');

let adminToken;

beforeAll(async () => {
  await db.sequelize.sync({ force: true });
  
  // Admin Oluştur ve Token Al
  const adminEmail = 'admin_class@test.com';
  await request(app).post('/api/v1/auth/register').send({
    name: 'Admin Class',
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

  // Test Verisi Oluştur (Derslikler)
  await db.Classroom.bulkCreate([
    { building: 'B Block', room_number: '101', capacity: 30, latitude: 40.0, longitude: 29.0 },
    { building: 'A Block', room_number: '202', capacity: 50, latitude: 40.1, longitude: 29.1 }
  ]);
});

describe('Classroom Controller Tests', () => {

  it('should get all classrooms', async () => {
    const res = await request(app)
      .get('/api/v1/classrooms')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.data.length).toEqual(2);
    
    // Sıralama kontrolü (Building ASC, Room Number ASC)
    // A Block önce gelmeli
    expect(res.body.data[0].building).toBe('A Block');
    expect(res.body.data[1].building).toBe('B Block');
  });

});
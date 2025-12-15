const request = require('supertest');
const app = require('../src/app');
const db = require('../src/models');

let userToken;
let userId;

beforeAll(async () => {
  await db.sequelize.sync({ force: true });

  const email = 'user_dash@test.com';
  // Hibrit Kayıt
  await request(app).post('/api/v1/auth/register').send({
    name: 'Dashboard User', email: email, password: 'Password123', role: 'student'
  });
  
  const user = await db.User.findOne({ where: { email } });
  await db.User.update({ is_verified: true }, { where: { id: user.id } });
  userId = user.id;
  
  await db.Student.create({ userId: user.id, student_number: 'DB123', gpa: 3.5, current_semester: 2 });

  const login = await request(app).post('/api/v1/auth/login').send({ email, password: 'Password123' });
  userToken = login.body.data.accessToken;
});

describe('User & Dashboard Tests', () => {

  it('should get current user profile', async () => {
    const res = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.data.email).toBe('user_dash@test.com');
  });

  it('should update user password', async () => {
    // DÜZELTME: Rota /api/v1/users/change-password olarak güncellendi
    const res = await request(app)
      .put('/api/v1/users/change-password') 
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        currentPassword: 'Password123',
        newPassword: 'NewPassword123'
      });

    if (res.statusCode !== 200) console.error("Update Password Error:", res.body);
    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
  });

  it('should get dashboard stats', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.data).toHaveProperty('gpa');
  });
});
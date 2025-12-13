const request = require('supertest');
const app = require('../src/app');
const db = require('../src/models');

// Testler başlamadan önce veritabanını temizle
beforeAll(async () => {
  await db.sequelize.sync({ force: true });
});

describe('Part 1: Authentication Tests', () => {
  
  const randomId = Math.floor(Math.random() * 10000);
  const testUser = {
    name: 'Test Student',
    email: `teststudent${randomId}@example.com`,
    password: 'Password123',
    role: 'student'
  };

  // 1. REGISTER TESTİ
  it('should register a new student without returning token immediately', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send(testUser);

    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('success', true);
    // Token dönmemeli
    expect(res.body).not.toHaveProperty('token'); 
    expect(res.body.message).toMatch(/kontrol edin/i);
  });

  // 2. LOGIN TESTİ (Başarılı)
  it('should login with valid credentials after verification', async () => {
    // MANUEL DOĞRULAMA
    await db.User.update(
      { is_verified: true },
      { where: { email: testUser.email } }
    );

    // Giriş Yap
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('success', true);
    
    // DÜZELTME: Token 'data' objesinin içinde 'accessToken' olarak geliyor
    expect(res.body.data).toHaveProperty('accessToken'); 
  });

  // 3. LOGIN TESTİ (Hatalı Şifre)
  it('should reject login with invalid password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testUser.email,
        password: 'WrongPassword123'
      });

    expect(res.statusCode).toEqual(401);
    expect(res.body).toHaveProperty('success', false);
  });
});
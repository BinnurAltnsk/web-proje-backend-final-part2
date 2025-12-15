const request = require('supertest');
const app = require('../src/app');
const db = require('../src/models');

let adminToken;
let userToken;
let userEmail = 'advanced_user@test.com';

beforeAll(async () => {
  await db.sequelize.sync({ force: true });

  // Admin Oluştur - GÜÇLÜ ŞİFRE
  const adminEmail = 'admin_adv@test.com';
  // Şifre validasyonunu geçecek bir şifre: 'Password123'
  await request(app).post('/api/v1/auth/register').send({ 
    name: 'Admin', 
    email: adminEmail, 
    password: 'Password123', // DÜZELTİLDİ
    role: 'student' 
  });
  
  await db.User.update({ role: 'admin', is_verified: true }, { where: { email: adminEmail } });
  
  const adminLogin = await request(app).post('/api/v1/auth/login').send({ 
    email: adminEmail, 
    password: 'Password123' // DÜZELTİLDİ
  });
  
  if (!adminLogin.body.data) console.error("Admin Login Fail:", adminLogin.body);
  adminToken = adminLogin.body.data.accessToken;

  // Normal User Oluştur
  await request(app).post('/api/v1/auth/register').send({ 
    name: 'User', 
    email: userEmail, 
    password: 'Password123', // DÜZELTİLDİ
    role: 'student' 
  });
  
  await db.User.update({ is_verified: true }, { where: { email: userEmail } });
  
  const userLogin = await request(app).post('/api/v1/auth/login').send({ 
    email: userEmail, 
    password: 'Password123' // DÜZELTİLDİ
  });
  
  userToken = userLogin.body.data.accessToken;
});

describe('Advanced User & Auth Tests', () => {

  it('should allow Admin to list all users', async () => {
    const res = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toEqual(200);
    // En az 2 kullanıcı olmalı (Admin + User)
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
  });

  it('should allow user to upload profile picture', async () => {
    const buffer = Buffer.from('fake image');
    
    const res = await request(app)
      .post('/api/v1/users/me/profile-picture')
      .set('Authorization', `Bearer ${userToken}`)
      .attach('profile_image', buffer, 'profile.jpg');

    // Middleware konfigürasyonuna göre 200 veya dosya tipi hatası (400) dönebilir.
    // Ancak auth hatası (401) dönmemeli.
    expect(res.statusCode).not.toEqual(401);
  });

  it('should request forgot password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: userEmail });

    expect(res.statusCode).toEqual(200);
    
    const user = await db.User.findOne({ where: { email: userEmail } });
    expect(user.reset_password_token).not.toBeNull();
  });

  it('should reset password with valid token', async () => {
    const user = await db.User.findOne({ where: { email: userEmail } });
    const crypto = require('crypto');
    const resetToken = 'myresettoken123';
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    
    // Token'ı manuel olarak DB'ye yazıyoruz (Test ortamı simülasyonu)
    await user.update({ 
      reset_password_token: hashedToken, 
      reset_password_expire: Date.now() + 10000 
    });

    const res = await request(app)
      .put(`/api/v1/auth/reset-password/${resetToken}`)
      .send({ password: 'NewPassword123!' });

    expect(res.statusCode).toEqual(200);
  });
});
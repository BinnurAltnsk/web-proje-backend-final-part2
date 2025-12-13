const { User, Student, Faculty, sequelize} = require('../models');
const { generateTokens } = require('../utils/jwtHelper');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { Op } = require('sequelize');
const sendEmail = require('../utils/emailService');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const { ROLES, TOKEN_EXPIRATION } = require('../config/constants');

// src/controllers/authController.js

exports.register = asyncHandler(async (req, res, next) => {
  const { email, password, role, student_number, department_id, employee_number, title, name } = req.body;

  const t = await sequelize.transaction();

  try {
    const verificationToken = crypto.randomBytes(20).toString('hex');

    const newUser = await User.create({
      name,
      email,
      password_hash: password,
      role,
      is_verified: false,
      verification_token: crypto.createHash('sha256').update(verificationToken).digest('hex')
    }, { transaction: t });

    // 2. Profil oluştur (Transaction içinde)
    if (role === ROLES.STUDENT) {
      await Student.create({
        userId: newUser.id,
        student_number: student_number || `ST-${Date.now()}`,
        departmentId: department_id || null,
        current_semester: 1
      }, { transaction: t }); // <--- t eklendi
    } else if (role === ROLES.FACULTY) {
      await Faculty.create({
        userId: newUser.id,
        employee_number: employee_number || `FAC-${Date.now()}`,
        title: title || 'Dr.',
        departmentId: department_id || null
      }, { transaction: t }); // <--- t eklendi
    }

    // 3. E-posta Gönder
    const verifyUrl = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;
    const message = `Hesabınızı doğrulamak için: \n\n${verifyUrl}`;

    await sendEmail({
      email: newUser.email,
      subject: 'Hesap Doğrulama',
      message
    });

    // Her şey başarılıysa veritabanına işle
    await t.commit();

    res.status(201).json({
      success: true,
      message: 'Kayıt başarılı. Lütfen e-postanızı kontrol edin.'
    });

  } catch (err) {
    // Hata varsa yapılan TÜM işlemleri geri al (User silinir)
    await t.rollback();
    
    // Hata logunu bas
    console.error("Register Hatası:", err);
    
    // Özel hata mesajı döndür
    if (err.name === 'SequelizeUniqueConstraintError') {
      return next(new ErrorResponse('Bu e-posta veya numara zaten kayıtlı.', 400));
    }
    
    return next(new ErrorResponse('Kayıt işlemi başarısız: ' + err.message, 500));
  }
});

// 2. YENİ FONKSİYON: VERIFY EMAIL
// POST /api/v1/auth/verify-email
exports.verifyEmail = asyncHandler(async (req, res, next) => {
  const { token } = req.body;

  if (!token) {
    return next(new ErrorResponse('Geçersiz istek.', 400));
  }

  // Gelen token'ı hashle ve DB'de ara
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    where: {
      verification_token: hashedToken,
      is_verified: false // Zaten doğrulanmışsa tekrar bulmasın
    }
  });

  if (!user) {
    return next(new ErrorResponse('Geçersiz veya zaten kullanılmış doğrulama tokenı.', 400));
  }

  // Hesabı aktif et
  user.is_verified = true;
  user.verification_token = null; // Token'ı temizle
  await user.save();

  // Opsiyonel: Direkt token da dönebilirsin ki kullanıcı hemen login olsun
  const tokens = generateTokens(user);

  res.status(200).json({
    success: true,
    message: 'E-posta başarıyla doğrulandı. Giriş yapabilirsiniz.',
    data: tokens // Kullanıcıya jest yapıp direkt login de ettirebiliriz
  });
});

// 3. LOGIN GÜNCELLEMESİ (Doğrulama Kontrolü)
exports.login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new ErrorResponse('Lütfen email ve şifre girin.', 400));
  }

  const user = await User.findOne({ where: { email } });
  if (!user) {
    return next(new ErrorResponse('Geçersiz kimlik bilgileri.', 401));
  }

  // YENİ EKLENEN KONTROL: Hesap doğrulanmış mı?
  if (!user.is_verified) {
    return next(new ErrorResponse('Lütfen önce e-posta adresinizi doğrulayın.', 401));
  }

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    return next(new ErrorResponse('Geçersiz kimlik bilgileri.', 401));
  }

  const tokens = generateTokens(user);

  res.status(200).json({
    success: true,
    data: { user: { id: user.id, email: user.email, role: user.role }, ...tokens }
  });
});

// POST /api/v1/auth/refresh
exports.refresh = asyncHandler(async (req, res, next) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return next(new ErrorResponse('Refresh token gereklidir.', 400));
  }

  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    
    const user = await User.findByPk(decoded.id);
    if (!user) {
      return next(new ErrorResponse('Kullanıcı bulunamadı.', 401));
    }

    // Sadece Access Token yenile
    const accessToken = jwt.sign(
      { id: user.id, role: user.role, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '15m' }
    );

    res.status(200).json({
      success: true,
      accessToken
    });

  } catch (err) {
    return next(new ErrorResponse('Geçersiz veya süresi dolmuş refresh token.', 401));
  }
});

// POST /api/v1/auth/logout
exports.logout = asyncHandler(async (req, res, next) => {
  res.status(200).json({
    success: true,
    message: 'Başarıyla çıkış yapıldı.'
  });
});

// POST /api/v1/auth/forgot-password
exports.forgotPassword = asyncHandler(async (req, res, next) => {
  const { email } = req.body;
  const user = await User.findOne({ where: { email } });

  if (!user) {
    return next(new ErrorResponse('Bu email ile kayıtlı kullanıcı yok.', 404));
  }

  const resetToken = crypto.randomBytes(20).toString('hex');

  user.reset_password_token = crypto.createHash('sha256').update(resetToken).digest('hex');
  user.reset_password_expire = Date.now() + TOKEN_EXPIRATION.RESET_PASSWORD;

  await user.save();

  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
  const message = `Şifrenizi sıfırlamak için lütfen aşağıdaki linke tıklayın:\n\n${resetUrl}`;

  try {
    await sendEmail({
      email: user.email,
      subject: 'Şifre Sıfırlama İsteği',
      message
    });

    res.status(200).json({ success: true, message: 'E-posta gönderildi.' });
  } catch (err) {
    user.reset_password_token = null;
    user.reset_password_expire = null;
    await user.save();
    return next(new ErrorResponse('E-posta gönderilemedi.', 500));
  }
});

// PUT /api/v1/auth/reset-password/:resettoken
exports.resetPassword = asyncHandler(async (req, res, next) => {
  const resetPasswordToken = crypto.createHash('sha256').update(req.params.resettoken).digest('hex');

  const user = await User.findOne({
    where: {
      reset_password_token: resetPasswordToken,
      reset_password_expire: { [Op.gt]: Date.now() }
    }
  });

  if (!user) {
    return next(new ErrorResponse('Geçersiz veya süresi dolmuş token.', 400));
  }

  user.password_hash = req.body.password; // Hook hash'leyecek
  user.reset_password_token = null;
  user.reset_password_expire = null;
  
  await user.save();

  res.status(200).json({ success: true, message: 'Şifre başarıyla güncellendi. Giriş yapabilirsiniz.' });
});
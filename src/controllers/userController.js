const db = require('../models');
const User = db.User;
const Student = db.Student;
const Faculty = db.Faculty;
const Department = db.Department;
const { Op } = require('sequelize');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const { ROLES } = require('../config/constants'); // Sabitleri import et
const bcrypt = require('bcrypt'); // Import ettiğinden emin ol

// Tekrar eden sorgu parçacığını (include) tek bir yerde tanımla
const userPopulateOptions = [
  { 
    model: Student, 
    as: 'studentProfile',
    include: [{ model: Department, as: 'department', attributes: ['id', 'name', 'code'] }]
  },
  { 
    model: Faculty, 
    as: 'facultyProfile',
    include: [{ model: Department, as: 'department', attributes: ['id', 'name', 'code'] }]
  }
];

// GET /api/v1/users/me - Profilimi Getir
exports.getMe = asyncHandler(async (req, res, next) => {
  const user = await User.findByPk(req.user.id, {
    attributes: { exclude: ['password_hash', 'verification_token', 'reset_password_token'] },
    include: userPopulateOptions
  });

  if (!user) {
    return next(new ErrorResponse('Kullanıcı bulunamadı.', 404));
  }

  res.status(200).json({
    success: true,
    data: user
  });
});

// PUT /api/v1/users/me - Profilimi Güncelle
exports.updateMe = asyncHandler(async (req, res, next) => {
  const { 
    phone_number, address, bio, // Ortak alanlar
    department_id, student_number, office_location // Role özel alanlar
  } = req.body;

  // 1. Kullanıcıyı ve ilişkili profillerini çek
  const user = await User.findByPk(req.user.id, {
    include: [
      { model: Student, as: 'studentProfile' },
      { model: Faculty, as: 'facultyProfile' }
    ]
  });

  if (!user) {
    return next(new ErrorResponse('Kullanıcı bulunamadı.', 404));
  }

  // 2. Ortak alanları güncelle (Sadece gelen veriyi güncelle)
  if (phone_number !== undefined) user.phone_number = phone_number;
  if (address !== undefined) user.address = address;
  if (bio !== undefined) user.bio = bio;
  
  await user.save();

  // 3. Rol bazlı dinamik güncelleme
  // Öğrenciyse
  if (user.role === ROLES.STUDENT && user.studentProfile) {
    const updates = {};
    if (department_id) updates.departmentId = department_id;
    if (student_number) updates.student_number = student_number;
    
    // Eğer güncellenecek veri varsa DB'ye yaz
    if (Object.keys(updates).length > 0) {
      await user.studentProfile.update(updates);
    }
  } 
  // Öğretim Üyesiyse
  else if (user.role === ROLES.FACULTY && user.facultyProfile) {
    const updates = {};
    if (department_id) updates.departmentId = department_id;
    if (office_location) updates.office_location = office_location;

    if (Object.keys(updates).length > 0) {
      await user.facultyProfile.update(updates);
    }
  }

  // 4. Güncel veriyi temiz bir şekilde döndür
  // getMe mantığıyla aynı include yapısını kullanıyoruz
  const updatedUser = await User.findByPk(req.user.id, {
    attributes: { exclude: ['password_hash', 'verification_token', 'reset_password_token'] },
    include: userPopulateOptions
  });

  res.status(200).json({
    success: true,
    message: 'Profil başarıyla güncellendi.',
    data: updatedUser
  });
});

// POST /api/v1/users/me/profile-picture
exports.uploadProfileImage = asyncHandler(async (req, res, next) => {
  if (!req.file) {
    return next(new ErrorResponse('Lütfen bir resim dosyası yükleyin.', 400));
  }

  const profilePictureUrl = req.file.path;

  // Sequelize update metodu ile daha kısa yazım
  await User.update(
    { profile_picture_url: profilePictureUrl },
    { where: { id: req.user.id } }
  );

  res.status(200).json({
    success: true,
    message: 'Profil fotoğrafı güncellendi.',
    data: { profilePictureUrl }
  });
});

// GET /api/v1/users - Admin Kullanıcı Listesi
exports.getAllUsers = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  const { search, role } = req.query;
  const whereClause = {};

  // Filtreleme
  if (role) whereClause.role = role;
  if (search) whereClause.email = { [Op.iLike]: `%${search}%` };

  const { count, rows } = await User.findAndCountAll({
    where: whereClause,
    limit,
    offset,
    attributes: { exclude: ['password_hash', 'verification_token'] },
    include: userPopulateOptions, // Ortak include yapısı
    order: [['created_at', 'DESC']]
  });

  res.status(200).json({
    success: true,
    data: rows,
    pagination: {
      total: count,
      page,
      totalPages: Math.ceil(count / limit)
    }
  });
});

// PUT /api/v1/users/change-password
exports.changePassword = asyncHandler(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  // Şifreli kullanıcı verisini al (password_hash dahil)
  const user = await User.findByPk(req.user.id);

  // 1. Mevcut şifre doğru mu?
  const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isMatch) {
    return next(new ErrorResponse('Mevcut şifreniz hatalı.', 400));
  }

  // 2. Yeni şifreyi kaydet (Model hook'u hashleyecek)
  user.password_hash = newPassword;
  await user.save();

  res.status(200).json({ success: true, message: 'Şifreniz başarıyla değiştirildi.' });
});
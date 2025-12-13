const jwt = require('jsonwebtoken');
const db = require('../models');
const User = db.User;

// Giriş yapmış kullanıcıyı doğrulama
exports.protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Bu işlem için giriş yapmalısınız.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // DEĞİŞİKLİK BURADA: include ile profilleri de çekiyoruz
    const currentUser = await User.findByPk(decoded.id, {
      include: [
        { model: db.Student, as: 'studentProfile' },
        { model: db.Faculty, as: 'facultyProfile' }
      ]
    });

    if (!currentUser) {
      return res.status(401).json({ success: false, message: 'Bu tokena ait kullanıcı artık yok.' });
    }

    req.user = currentUser;
    next();
  } catch (error) {
    console.error(error);
    return res.status(401).json({ success: false, message: 'Geçersiz token, lütfen tekrar giriş yapın.' });
  }
};

// Rol tabanlı yetkilendirme (Değişmedi)
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: `Bu işlem için yetkiniz yok. Gereken: ${roles.join(', ')}` 
      });
    }
    next();
  };
};
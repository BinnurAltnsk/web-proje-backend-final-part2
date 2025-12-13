const jwt = require('jsonwebtoken');

const generateTokens = (user) => {
  // Access Token: Kısa ömürlü (15 dk) - Güvenlik için
  const accessToken = jwt.sign(
    { id: user.id, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '15m' }
  );

  // Refresh Token: Uzun ömürlü (7 gün) - Oturumu tazelemek için
  const refreshToken = jwt.sign(
    { id: user.id },
    process.env.JWT_SECRET, // Normalde refresh secret ayrı olması daha güvenlidir ama proje için aynı olabilir
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
  );

  return { accessToken, refreshToken };
};

module.exports = { generateTokens };
module.exports = {
  ROLES: {
    STUDENT: 'student',
    FACULTY: 'faculty',
    ADMIN: 'admin'
  },
  TOKEN_EXPIRATION: {
    ACCESS: '15m',
    REFRESH: '7d',
    RESET_PASSWORD: 10 * 60 * 1000 // 10 dakika (ms)
  }
};
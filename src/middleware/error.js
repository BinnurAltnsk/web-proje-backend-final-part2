const ErrorResponse = require('../utils/errorResponse');
const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  
  // Error nesnesinin 'message' özelliği kopyalanmaz, elle alıyoruz.
  error.message = err.message; 

  // Debug için konsola basalım (Geliştirme aşamasında)
  console.log("Hata Yakalandı:", err.name, err.message); 
  
  // Winston ile logla
  logger.error(`${err.message} \n ${err.stack}`);

  // 1. Geçersiz ID (Örn: UUID yerine rastgele string)
  if (err.name === 'SequelizeDatabaseError' && err.parent && err.parent.code === '22P02') {
    const message = 'Geçersiz ID formatı';
    error = new ErrorResponse(message, 400);
  }

  // 2. Duplicate Key (Örn: Aynı email ile kayıt)
  if (err.name === 'SequelizeUniqueConstraintError') {
    const message = 'Bu veri zaten sistemde kayıtlı.';
    error = new ErrorResponse(message, 400);
  }

  // 3. Validation Error (Eksik alan vb.)
  if (err.name === 'SequelizeValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = new ErrorResponse(message, 400);
  }

  // Yanıtı Döndür
  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || 'Sunucu Hatası'
  });
};

module.exports = errorHandler;
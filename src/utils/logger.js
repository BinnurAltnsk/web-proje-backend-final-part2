const winston = require('winston');
const path = require('path');

// Log formatını belirle
const logFormat = winston.format.printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} [${level}]: ${stack || message}`;
});

const logger = winston.createLogger({
  level: 'info', // info ve üzeri (warn, error) kaydedilir
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }), // Hata stack trace'ini yakala
    winston.format.json() // Dosyaya JSON formatında kaydet
  ),
  defaultMeta: { service: 'smart-campus-backend' },
  transports: [
    // Hataları dosyaya yaz
    new winston.transports.File({ 
      filename: path.join(__dirname, '../../logs/error.log'), 
      level: 'error' 
    }),
    // Tüm logları dosyaya yaz
    new winston.transports.File({ 
      filename: path.join(__dirname, '../../logs/combined.log') 
    })
  ]
});

// Eğer geliştirme ortamındaysak konsola da yaz (Renkli)
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple() // Basit format: info: Mesaj
    )
  }));
}

module.exports = logger;
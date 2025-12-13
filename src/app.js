const express = require('express');
const dotenv = require('dotenv');
const { sequelize } = require('./models'); 
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const cors = require('cors');
const { swaggerUi, swaggerSpec } = require('./config/swagger');
const path = require('path');
const errorHandler = require('./middleware/error');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const xss = require('xss-clean');
const logger = require('./utils/logger'); // Import et
const courseRoutes = require('./routes/courseRoutes');
const sectionRoutes = require('./routes/sectionRoutes');
const enrollmentRoutes = require('./routes/enrollmentRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const gradeRoutes = require('./routes/gradeRoutes');
const departmentRoutes = require('./routes/departmentRoutes');
const classroomRoutes = require('./routes/classroomRoutes');
const announcementRoutes = require('./routes/announcementRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

dotenv.config();

const app = express();
app.set('trust proxy', 1);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors({
  origin: [
    'https://campus-management-system-frontend-production.up.railway.app',
    'http://campus-management-system-frontend-production.up.railway.app',
    'http://localhost:5173',
    process.env.FRONTEND_URL
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(xss());

const globalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', globalLimiter);


app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/courses', courseRoutes);
app.use('/api/v1/departments', departmentRoutes);
app.use('/api/v1/sections', sectionRoutes);
app.use('/api/v1/enrollments', enrollmentRoutes);
app.use('/api/v1/attendance', attendanceRoutes);
app.use('/api/v1/grades', gradeRoutes);
app.use('/api/v1/classrooms', classroomRoutes);
app.use('/api/v1/announcements', announcementRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await sequelize.authenticate();
    logger.info('Veritabanı bağlantısı başarılı.'); // console.log yerine

    await sequelize.sync({ alter: true });
    console.log('Tablolar senkronize edildi.');

   app.listen(PORT, () => {
      logger.info(`Sunucu ${process.env.NODE_ENV} modunda ${PORT} portunda çalışıyor.`);
    });
  } catch (error) {
    logger.error(`Sunucu başlatılamadı: ${error.message}`);
  }
};
startServer();
module.exports = app;
const db = require('../models');
const asyncHandler = require('../middleware/async');

// @desc    Dashboard İstatistiklerini Getir
// @route   GET /api/v1/dashboard
// @access  Private
exports.getDashboardStats = asyncHandler(async (req, res, next) => {
  const role = req.user.role;
  let stats = {};

  // 1. Son 3 Duyuruyu Herkes İçin Çek
  const recentAnnouncements = await db.Announcement.findAll({
    limit: 3,
    order: [['created_at', 'DESC']],
    attributes: ['id', 'title', 'created_at', 'priority']
  });

  stats.announcements = recentAnnouncements;

  // 2. Rol Bazlı Veriler
  if (role === 'student') {
    const student = await db.Student.findOne({ where: { userId: req.user.id } });
    if (student) {
      // GPA ve Kredi
      stats.gpa = student.gpa || 0;
      stats.studentNumber = student.student_number;
      
      // Kayıtlı Ders Sayısı
      const enrollmentCount = await db.Enrollment.count({ 
        where: { studentId: student.id, status: 'enrolled' } 
      });
      stats.activeCourses = enrollmentCount;

      // Toplam Devamsızlık (Flagged olmayan Attendance kayıtları)
      // Basit bir sayaç: Kaç derse katıldı?
      const attendanceCount = await db.AttendanceRecord.count({
        where: { studentId: student.id }
      });
      stats.totalAttendance = attendanceCount;
    }

  } else if (role === 'faculty') {
    const facultyId = req.user.facultyProfile?.id;
    if (facultyId) {
      // Verdiği Ders Sayısı (Section)
      const sectionCount = await db.CourseSection.count({
        where: { instructorId: facultyId }
      });
      stats.activeSections = sectionCount;

      // Toplam Öğrenci Sayısı (Bu hocadan ders alan tekil öğrenci sayısı)
      // Bu sorgu biraz ağır olabilir, basitçe section kapasitelerini toplayabiliriz veya enrollments sayabiliriz.
      // Hız için şimdilik kayıtlı enrollment sayısını alalım.
      // Karmaşık query yerine basit sayı:
      stats.totalStudents = 0; // İleride eklenebilir
    }

  } else if (role === 'admin') {
    // Sistem Geneli Sayılar
    stats.totalUsers = await db.User.count();
    stats.totalCourses = await db.Course.count();
    stats.totalStudents = await db.Student.count();
  }

  res.status(200).json({
    success: true,
    data: stats
  });
});
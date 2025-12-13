const db = require('../models');
const AttendanceSession = db.AttendanceSession;
const AttendanceRecord = db.AttendanceRecord;
const CourseSection = db.CourseSection;
const Classroom = db.Classroom;
const Student = db.Student;
const Enrollment = db.Enrollment;
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const { calculateDistance } = require('../utils/geoUtils');
const crypto = require('crypto');
const CAMPUS_IPS = require('../config/campusIPs');

// @desc    Yoklama Oturumu Başlat (Hoca veya Admin)
// @route   POST /api/v1/attendance/sessions
// @access  Faculty, Admin
exports.startSession = asyncHandler(async (req, res, next) => {
  const { sectionId, geofence_radius, duration_minutes, latitude, longitude } = req.body;
  
  // 1. Koordinat Kontrolü
  if (!latitude || !longitude) {
    return next(new ErrorResponse('Konum bilgisi eksik. Lütfen GPS izni verin.', 400));
  }

  // 2. Şubeyi Getir
  const section = await CourseSection.findByPk(sectionId);
  if (!section) {
    return next(new ErrorResponse('Ders şubesi bulunamadı.', 404));
  }

  // 3. Yetki Kontrolü
  let instructorId;
  if (req.user.role === 'admin') {
    instructorId = section.instructorId;
  } else if (req.user.role === 'faculty') {
    if (!req.user.facultyProfile) {
      return next(new ErrorResponse('Profil hatası.', 400));
    }
    instructorId = req.user.facultyProfile.id;
    if (section.instructorId !== instructorId) {
      return next(new ErrorResponse('Yetkisiz işlem.', 403));
    }
  } else {
    return next(new ErrorResponse('Yetkisiz işlem.', 403));
  }

  // 4. Aktif Oturum Kontrolü
  const existingSession = await AttendanceSession.findOne({
    where: { sectionId, status: 'active' }
  });
  if (existingSession) {
    return next(new ErrorResponse('Zaten açık bir yoklama var.', 400));
  }

  // 5. Oturumu Oluştur (Gelen koordinatlarla)
  const now = new Date();
  const endTime = new Date(now.getTime() + (duration_minutes || 30) * 60000);

  const session = await AttendanceSession.create({
    sectionId,
    instructorId,
    date: now,
    start_time: now.toLocaleTimeString('tr-TR', { hour12: false }),
    end_time: endTime.toLocaleTimeString('tr-TR', { hour12: false }),
    latitude: parseFloat(latitude),   // Hoca Konumu
    longitude: parseFloat(longitude), // Hoca Konumu
    geofence_radius: geofence_radius || 15,
    status: 'active',
    qr_code: crypto.randomBytes(16).toString('hex')
  });

  res.status(201).json({
    success: true,
    message: 'Yoklama oturumu konumunuzla başlatıldı.',
    data: session
  });
});

// @desc    Yoklama Ver (Öğrenci - Gelişmiş Güvenlikli)
// @route   POST /api/v1/attendance/sessions/:id/checkin
// @access  Student
exports.checkIn = asyncHandler(async (req, res, next) => {
  const sessionId = req.params.id;
  const { latitude, longitude } = req.body;
  const student = await Student.findOne({ where: { userId: req.user.id } });

  if (!student) {
    return next(new ErrorResponse('Öğrenci profili bulunamadı.', 404));
  }

  // 1. Oturumu Bul
  const session = await AttendanceSession.findByPk(sessionId);
  if (!session || session.status !== 'active') {
    return next(new ErrorResponse('Yoklama oturumu aktif değil.', 404));
  }

  // 2. Kayıt Kontrolü
  const isEnrolled = await Enrollment.findOne({
    where: { studentId: student.id, sectionId: session.sectionId, status: 'enrolled' }
  });
  if (!isEnrolled) return next(new ErrorResponse('Bu derse kayıtlı değilsiniz.', 403));

  // 3. Mükerrer Kayıt Kontrolü
  const existingRecord = await AttendanceRecord.findOne({
    where: { sessionId, studentId: student.id }
  });
  if (existingRecord) return next(new ErrorResponse('Zaten yoklama verdiniz.', 400));

  // --- GÜVENLİK KONTROLLERİ BAŞLIYOR ---
  let isFlagged = false;
  let flagReasons = [];

  // A) MESAFE KONTROLÜ (Geofence)
  const distance = calculateDistance(
    session.latitude, session.longitude, 
    parseFloat(latitude), parseFloat(longitude)
  );
  
  // Yarıçap + 20m GPS sapma toleransı
  const allowedDistance = session.geofence_radius + 20; 

  if (distance > allowedDistance) {
    isFlagged = true;
    flagReasons.push(`Konum Sınırı Aşıldı: ${Math.round(distance)}m (Limit: ${allowedDistance}m)`);
    
    // Çok aşırı uzaksa (örn: 500m) direkt reddet
    if (distance > 500) {
      return next(new ErrorResponse(`Sınıftan çok uzaktasınız! (${Math.round(distance)}m)`, 400));
    }
  }

  // B) IP ADRESİ KONTROLÜ
  // Proxy arkasında çalışıyorsa x-forwarded-for, yoksa socket adresi
  let clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  
  // IPv6 prefix temizliği (::ffff:)
  if (clientIp && clientIp.includes('::ffff:')) {
    clientIp = clientIp.split('::ffff:')[1];
  }

  if (!CAMPUS_IPS.includes(clientIp)) {
     isFlagged = true;
     flagReasons.push(`Kampüs Ağı Dışı IP: ${clientIp}`);
  }
  
  // Demo için sadece logluyoruz, production'da yukarıdaki yorumu açın.
  console.log(`User IP: ${clientIp} - Valid IPs: ${CAMPUS_IPS}`);


  // C) HIZ (VELOCITY) KONTROLÜ - "Impossible Travel"
  // Öğrencinin en son girdiği yoklama kaydını bul
  const lastRecord = await AttendanceRecord.findOne({
    where: { studentId: student.id },
    order: [['check_in_time', 'DESC']]
  });

  if (lastRecord) {
    const timeDiffMs = new Date() - new Date(lastRecord.check_in_time);
    const timeDiffMinutes = timeDiffMs / (1000 * 60); // Dakika cinsinden

    // Eğer son işlem 2 saatten kısa süre önce yapıldıysa kontrol et
    if (timeDiffMinutes < 120 && timeDiffMinutes > 0) {
      const distFromLastPoint = calculateDistance(
        lastRecord.latitude, lastRecord.longitude,
        parseFloat(latitude), parseFloat(longitude)
      );

      // Hız hesapla (km/saat)
      // distance (m) / 1000 = km
      // time (dk) / 60 = saat
      const speedKmH = (distFromLastPoint / 1000) / (timeDiffMinutes / 60);

      // Eğer hızı 120 km/s'den büyükse, insanüstü bir hızla yer değiştirmiştir (Spoofing)
      if (speedKmH > 120) {
        isFlagged = true;
        flagReasons.push(`İmkansız Seyahat: ${Math.round(speedKmH)} km/s hız tespit edildi.`);
      }
    }
  }

  // --- KAYIT ---
  const record = await AttendanceRecord.create({
    sessionId,
    studentId: student.id,
    latitude,
    longitude,
    distance_from_center: distance,
    is_flagged: isFlagged,
    flag_reason: flagReasons.join(', ') || null,
    check_in_time: new Date()
  });

  res.status(200).json({
    success: true,
    message: isFlagged 
      ? 'Yoklama şüpheli olarak kaydedildi. Hoca onayına düştü.' 
      : 'Yoklama başarıyla ve güvenli şekilde alındı.',
    data: record
  });
});

// @desc    Oturum Detaylarını Getir (QR ve Durum için)
// @route   GET /api/v1/attendance/sessions/:id
// @access  Authenticated
exports.getSession = asyncHandler(async (req, res, next) => {
  const session = await AttendanceSession.findByPk(req.params.id, {
    include: [
      { 
        model: CourseSection, 
        as: 'section',
        include: [{ model: db.Course, as: 'course', attributes: ['name', 'code'] }]
      }
    ]
  });

  if (!session) return next(new ErrorResponse('Oturum bulunamadı', 404));

  res.status(200).json({ success: true, data: session });
});

// @desc    Oturumu Kapat (Manuel)
// @route   PUT /api/v1/attendance/sessions/:id/close
// @access  Faculty
exports.closeSession = asyncHandler(async (req, res, next) => {
  const session = await AttendanceSession.findByPk(req.params.id);
  if (!session) return next(new ErrorResponse('Oturum bulunamadı', 404));

  session.status = 'closed';
  await session.save();

  res.status(200).json({ success: true, message: 'Oturum kapatıldı.', data: session });
});

// @desc    Öğrencinin Yoklama Durumu
// @route   GET /api/v1/attendance/my-attendance
// @access  Student
exports.getMyAttendance = asyncHandler(async (req, res, next) => {
  const student = await Student.findOne({ where: { userId: req.user.id } });
  
  // Öğrencinin tüm yoklama kayıtları
  const records = await AttendanceRecord.findAll({
    where: { studentId: student.id },
    include: [{
      model: AttendanceSession,
      as: 'session',
      include: [{ 
        model: CourseSection, 
        as: 'section',
        include: [{ model: db.Course, as: 'course', attributes: ['code', 'name'] }]
      }]
    }],
    order: [['check_in_time', 'DESC']]
  });

  res.status(200).json({ success: true, count: records.length, data: records });
});

// @desc    Yoklama Raporu (Ders Bazlı)
// @route   GET /api/v1/attendance/report/:sectionId
// @access  Faculty
exports.getAttendanceReport = asyncHandler(async (req, res, next) => {
  const { sectionId } = req.params;

  // Şubeye ait tüm oturumlar
  const sessions = await AttendanceSession.findAll({
    where: { sectionId },
    include: [{
      model: AttendanceRecord,
      as: 'records',
      include: [{ 
        model: Student, 
        as: 'student', 
        include: [{ model: db.User, as: 'user', attributes: ['name', 'email'] }] 
      }]
    }]
  });

  res.status(200).json({ success: true, data: sessions });
});

// @desc    Mazeret Bildir (Öğrenci)
// @route   POST /api/v1/attendance/excuse-requests
// @access  Student
exports.createExcuseRequest = asyncHandler(async (req, res, next) => {
  const { sessionId, reason } = req.body;
  const student = await Student.findOne({ where: { userId: req.user.id } });

  if (!req.file) {
    return next(new ErrorResponse('Lütfen bir mazeret belgesi (resim) yükleyin.', 400));
  }

  // 1. Öğrenci bu derse kayıtlı mı?
  const session = await AttendanceSession.findByPk(sessionId);
  if (!session) return next(new ErrorResponse('Oturum bulunamadı.', 404));

  const enrollment = await Enrollment.findOne({
    where: { studentId: student.id, sectionId: session.sectionId, status: 'enrolled' }
  });

  if (!enrollment) return next(new ErrorResponse('Bu derse kayıtlı değilsiniz.', 403));

  // 2. Zaten bu oturum için mazeret var mı?
  const existingExcuse = await db.ExcuseRequest.findOne({
    where: { studentId: student.id, sessionId }
  });

  if (existingExcuse) return next(new ErrorResponse('Bu oturum için zaten bir talebiniz var.', 400));

  // 3. Mazereti Oluştur
  const excuse = await db.ExcuseRequest.create({
    studentId: student.id,
    sessionId,
    reason,
    document_url: req.file.path, // Cloudinary URL
    status: 'pending'
  });

  res.status(201).json({
    success: true,
    message: 'Mazeret talebiniz alındı.',
    data: excuse
  });
});

// @desc    Mazeret Listesi (Rol Bazlı)
// @route   GET /api/v1/attendance/excuse-requests
// @access  Student, Faculty
exports.getExcuseRequests = asyncHandler(async (req, res, next) => {
  let whereClause = {};
  let includeOptions = [
    { 
      model: AttendanceSession, 
      as: 'session',
      include: [{ model: CourseSection, as: 'section', include: [{ model: db.Course, as: 'course', attributes: ['code', 'name'] }] }] 
    }
  ];

  if (req.user.role === 'student') {
    // Öğrenci sadece kendi taleplerini görür
    const student = await Student.findOne({ where: { userId: req.user.id } });
    whereClause.studentId = student.id;
  } else if (req.user.role === 'faculty') {
    // Hoca, KENDİ derslerine gelen talepleri görür
    const facultyId = req.user.facultyProfile.id;
    
    // İlişkili tablolarda filtreleme yapmak için include içine where eklenmeli
    // Ancak Sequelize'de iç içe sorgu performansı için önce hocanın sectionlarını bulup ID'lerini alabiliriz
    // Veya basitçe tüm requestleri çekip JS ile filtreleyebiliriz (Veri az ise).
    // Doğru yöntem: Include içinde filtreleme.
    
    // Şimdilik hocanın tüm mazeretleri görmesi için session->section->instructorId kontrolü yapan karmaşık bir query gerekir.
    // Basitlik adına: Tüm bekleyen talepleri getirip, sadece hocanın derslerine ait olanları filter ile döndürelim.
    // (Büyük veride performans sorunu olabilir ama proje için yeterli)
    
    includeOptions.push({ 
      model: Student, 
      as: 'student', 
      include: [{ model: db.User, as: 'user', attributes: ['name', 'email', 'student_number'] }] 
    });
  }

  const requests = await db.ExcuseRequest.findAll({
    where: whereClause,
    include: includeOptions,
    order: [['created_at', 'DESC']]
  });

  // Hoca için filtreleme (Sadece kendi dersleri)
  let data = requests;
  if (req.user.role === 'faculty') {
    data = requests.filter(req => req.session?.section?.instructorId === req.user.facultyProfile.id);
  }

  res.status(200).json({ success: true, count: data.length, data });
});

// @desc    Mazeret Onayla/Reddet (Hoca)
// @route   PUT /api/v1/attendance/excuse-requests/:id
// @access  Faculty
exports.updateExcuseStatus = asyncHandler(async (req, res, next) => {
  const { status, notes } = req.body; // status: 'approved' veya 'rejected'
  const { id } = req.params;

  const request = await db.ExcuseRequest.findByPk(id, {
    include: [{ model: AttendanceSession, as: 'session', include: ['section'] }]
  });

  if (!request) return next(new ErrorResponse('Talep bulunamadı.', 404));

  // Yetki Kontrolü
  if (request.session.section.instructorId !== req.user.facultyProfile.id && req.user.role !== 'admin') {
    return next(new ErrorResponse('Bu işlemi yapmaya yetkiniz yok.', 403));
  }

  request.status = status;
  request.notes = notes;
  request.reviewedBy = req.user.facultyProfile.id;
  request.reviewed_at = new Date();
  
  await request.save();

  // BONUS: Eğer onaylandıysa, AttendanceRecord tablosuna "Mazeretli" olarak işlenebilir.
  // Ancak şimdilik sadece talep statüsünü güncelliyoruz.

  res.status(200).json({ success: true, data: request });
});


// @desc    Yoklama Kaydını Güncelle (Hoca - Onayla/Reddet)
// @route   PUT /api/v1/attendance/records/:id
// @route   DELETE /api/v1/attendance/records/:id
// @access  Faculty
exports.manageAttendanceRecord = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { action } = req.body; // 'approve' (onayla)

  const record = await AttendanceRecord.findByPk(id, {
    include: [{ 
      model: AttendanceSession, 
      as: 'session',
      include: ['section'] 
    }]
  });

  if (!record) return next(new ErrorResponse('Kayıt bulunamadı.', 404));

  // Yetki Kontrolü: Bu dersin hocası mı?
  if (record.session.section.instructorId !== req.user.facultyProfile.id && req.user.role !== 'admin') {
    return next(new ErrorResponse('Bu işlem için yetkiniz yok.', 403));
  }

  // İşlem: Onayla (Approve)
  if (req.method === 'PUT' && action === 'approve') {
    record.is_flagged = false;
    // flag_reason'ı silmeyelim ki geçmişte ne olduğu belli olsun, 
    // ya da silebilirsiniz: record.flag_reason = null;
    await record.save();
    return res.status(200).json({ success: true, message: 'Yoklama onaylandı.', data: record });
  }

  // İşlem: Reddet (Delete) -> DELETE isteği gelirse
  if (req.method === 'DELETE') {
    await record.destroy();
    return res.status(200).json({ success: true, message: 'Yoklama kaydı silindi (Reddedildi).' });
  }

  return next(new ErrorResponse('Geçersiz işlem.', 400));
});
const db = require('../models');
const bcrypt = require('bcrypt');

// Bekleme fonksiyonu (Railway cold start için)
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Bağlantı deneme mekanizması
const connectWithRetry = async (retries = 5, delay = 5000) => {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`🔄 Veritabanına bağlanılıyor... (Deneme ${i + 1}/${retries})`);
      await db.sequelize.authenticate();
      console.log('✅ Veritabanı bağlantısı başarılı.');
      return true;
    } catch (err) {
      console.error(`❌ Bağlantı başarısız: ${err.message}`);
      if (i < retries - 1) {
        console.log(`⏳ ${delay / 1000} saniye bekleniyor...`);
        await wait(delay);
      }
    }
  }
  return false;
};

const seedDatabase = async () => {
  try {
    // 1. Bağlantıyı Garantile
    const isConnected = await connectWithRetry();
    if (!isConnected) {
      console.error('❌ Veritabanına bağlanılamadı, seed işlemi iptal edildi.');
      process.exit(1);
    }

    // 2. Tabloları Senkronize Et
    // alter: true -> Tablo yapısındaki değişiklikleri (örn: name kolonu) uygular
    await db.sequelize.sync({ alter: true });
    console.log('🔄 Veritabanı senkronize edildi.');

    // --- 1. BÖLÜMLER ---
    const departmentsList = [
      { name: 'Bilgisayar Mühendisliği', code: 'CENG', faculty_name: 'Mühendislik Fakültesi' },
      { name: 'Elektrik-Elektronik Müh.', code: 'EEE', faculty_name: 'Mühendislik Fakültesi' },
      { name: 'Mimarlık', code: 'ARCH', faculty_name: 'Mimarlık Fakültesi' },
      { name: 'İşletme', code: 'BUS', faculty_name: 'İİBF' }
    ];

    for (const dept of departmentsList) {
      await db.Department.findOrCreate({
        where: { code: dept.code },
        defaults: dept
      });
    }
    console.log('🏢 Bölümler kontrol edildi.');

    const cengDept = await db.Department.findOne({ where: { code: 'CENG' } });
    const eeeDept = await db.Department.findOne({ where: { code: 'EEE' } });
    const archDept = await db.Department.findOne({ where: { code: 'ARCH' } });

    // --- 2. DERSLİKLER ---
    const classroomsData = [
      { building: 'Mühendislik A Blok', room_number: 'A-101', capacity: 50, latitude: 41.0082, longitude: 28.9784 },
      { building: 'Mühendislik B Blok', room_number: 'B-Z05', capacity: 30, latitude: 41.0085, longitude: 28.9790 }
    ];

    for (const room of classroomsData) {
      await db.Classroom.findOrCreate({
        where: { room_number: room.room_number },
        defaults: room
      });
    }
    console.log('🏫 Derslikler kontrol edildi.');
    
    const roomA101 = await db.Classroom.findOne({ where: { room_number: 'A-101' } });

    // --- 3. KULLANICILAR (ADMIN, FACULTY, STUDENT) ---
    
    // Admin
    const adminEmail = 'admin@kampus.edu.tr';
    const adminExists = await db.User.findOne({ where: { email: adminEmail } });
    
    if (!adminExists) {
      console.log('🛡️ Admin oluşturuluyor...');
      await db.User.create({
        name: 'Sistem Yöneticisi', // EKLENDİ
        email: adminEmail,
        password_hash: 'Password123!',
        role: 'admin',
        is_verified: true,
        bio: 'Kampüs sistem yöneticisi.'
      });
    }

    // Faculty (Öğretim Üyeleri)
    const facultyData = [
      { email: 'mehmet.hoca@kampus.edu.tr', name: 'Dr. Mehmet Yılmaz', title: 'Dr. Öğr. Üyesi', deptId: cengDept?.id, empNo: 'FAC-001' },
      { email: 'ayse.prof@kampus.edu.tr', name: 'Prof. Dr. Ayşe Demir', title: 'Prof. Dr.', deptId: eeeDept?.id, empNo: 'FAC-002' }
    ];

    for (const fac of facultyData) {
      if (!fac.deptId) continue;

      const exists = await db.User.findOne({ where: { email: fac.email } });
      if (!exists) {
        console.log(`👨‍🏫 Öğretim üyesi ekleniyor: ${fac.name}`);
        const newUser = await db.User.create({
          name: fac.name, // EKLENDİ (Zaten veri setinde vardı)
          email: fac.email,
          password_hash: 'Password123!',
          role: 'faculty',
          is_verified: true,
          phone_number: '05551112233',
          address: 'Kampüs Lojmanları'
        });
        
        await db.Faculty.create({
          userId: newUser.id,
          employee_number: fac.empNo,
          title: fac.title,
          departmentId: fac.deptId,
          office_location: 'Mühendislik Binası A-Blok'
        });
      }
    }

    // Students (Öğrenciler) - İSİMLER EKLENDİ
    const studentData = [
      { email: 'ali.veli@ogrenci.edu.tr', name: 'Ali Veli', no: '2022001', deptId: cengDept?.id },
      { email: 'zeynep.kaya@ogrenci.edu.tr', name: 'Zeynep Kaya', no: '2022002', deptId: cengDept?.id },
      { email: 'can.türk@ogrenci.edu.tr', name: 'Can Türk', no: '2022003', deptId: eeeDept?.id },
      { email: 'elif.su@ogrenci.edu.tr', name: 'Elif Su', no: '2022004', deptId: archDept?.id },
      { email: 'burak.yilmaz@ogrenci.edu.tr', name: 'Burak Yılmaz', no: '2022005', deptId: cengDept?.id }
    ];

    for (const stu of studentData) {
      if (!stu.deptId) continue;

      const exists = await db.User.findOne({ where: { email: stu.email } });
      if (!exists) {
        console.log(`🎓 Öğrenci ekleniyor: ${stu.name}`);
        const newUser = await db.User.create({
          name: stu.name, // EKLENDİ
          email: stu.email,
          password_hash: 'Password123!',
          role: 'student',
          is_verified: true,
          bio: 'Merhaba ben bir öğrenciyim.'
        });

        await db.Student.create({
          userId: newUser.id,
          student_number: stu.no,
          departmentId: stu.deptId,
          gpa: (Math.random() * 2 + 2).toFixed(2),
          current_semester: 3
        });
      }
    }

    // ID'leri alalım
    const instructorMehmet = await db.Faculty.findOne({ where: { employee_number: 'FAC-001' } });
    const studentAli = await db.Student.findOne({ where: { student_number: '2022001' } });

    // --- 4. DERSLER (COURSES) ---
    console.log('📚 Dersler ve Şubeler kontrol ediliyor...');
    
    let algoCourse = await db.Course.findOne({ where: { code: 'CENG101' } });
    if (!algoCourse && cengDept) {
      algoCourse = await db.Course.create({
        code: 'CENG101',
        name: 'Algoritmalara Giriş',
        description: 'Temel programlama ve algoritma mantığı.',
        credits: 3,
        ects: 5,
        departmentId: cengDept.id
      });
    }

    let dataStructCourse = await db.Course.findOne({ where: { code: 'CENG201' } });
    if (!dataStructCourse && cengDept) {
      dataStructCourse = await db.Course.create({
        code: 'CENG201',
        name: 'Veri Yapıları',
        description: 'Stack, Queue, Tree, Graph yapıları.',
        credits: 4,
        ects: 6,
        departmentId: cengDept.id
      });
      if (algoCourse) {
        await dataStructCourse.addPrerequisite(algoCourse);
      }
    }

    // --- 5. DERS ŞUBELERİ VE KAYIT ---
    if (algoCourse && instructorMehmet && roomA101) {
      let section = await db.CourseSection.findOne({ 
        where: { courseId: algoCourse.id, section_number: 1, year: 2025 } 
      });

      if (!section) {
        section = await db.CourseSection.create({
          courseId: algoCourse.id,
          instructorId: instructorMehmet.id,
          section_number: 1,
          semester: 'Spring',
          year: 2025,
          capacity: 50,
          classroomId: roomA101.id,
          schedule_json: [
            { day: 'Monday', start_time: '09:00', end_time: '12:00' },
            { day: 'Wednesday', start_time: '14:00', end_time: '16:00' }
          ]
        });
        console.log('✅ CENG101 Section 1 oluşturuldu.');

        // Öğrenci Kaydı
        if (studentAli) {
          const existingEnrollment = await db.Enrollment.findOne({
            where: { studentId: studentAli.id, sectionId: section.id }
          });

          if (!existingEnrollment) {
            await db.Enrollment.create({
              studentId: studentAli.id,
              sectionId: section.id,
              status: 'enrolled'
            });
            await section.increment('enrolled_count');
            console.log('🎓 Öğrenci Ali Veli CENG101 dersine kaydedildi.');
          }
        }

        // Yoklama Oturumu (Test)
        const today = new Date().toISOString().split('T')[0];
        const existingSession = await db.AttendanceSession.findOne({
            where: { sectionId: section.id, date: today }
        });

        if (!existingSession) {
            await db.AttendanceSession.create({
                sectionId: section.id,
                instructorId: instructorMehmet.id,
                date: today,
                start_time: '09:00',
                end_time: '12:00',
                latitude: roomA101.latitude,
                longitude: roomA101.longitude,
                geofence_radius: 20,
                status: 'active',
                qr_code: 'random-qr-code-string-123'
            });
            console.log('📍 CENG101 için aktif yoklama oturumu oluşturuldu.');
        }
      }
    }

    console.log('✅ SEED İŞLEMİ BAŞARIYLA TAMAMLANDI.');
    console.log('👉 Admin: admin@kampus.edu.tr / Password123!');
    console.log('👉 Hoca: mehmet.hoca@kampus.edu.tr / Password123!');
    console.log('👉 Öğrenci: ali.veli@ogrenci.edu.tr / Password123!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed Hatası:', error);
    process.exit(1);
  }
};

seedDatabase();
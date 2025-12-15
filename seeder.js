const fs = require('fs');
const colors = require('colors');
const dotenv = require('dotenv');
// const bcrypt = require('bcryptjs'); // GEREK YOK: Model hook'u halledecek
const db = require('./src/models'); 

// Çevre değişkenlerini yükle
dotenv.config({ path: './src/config/config.env' });

// Veritabanı Modelleri
const User = db.User;
const Student = db.Student;
const Faculty = db.Faculty;
const Department = db.Department;
const Course = db.Course;
const CourseSection = db.CourseSection;
const Classroom = db.Classroom;
const Enrollment = db.Enrollment;
const Announcement = db.Announcement;

// SEED FONKSİYONU
const seedData = async () => {
  try {
    // 1. VERİTABANINI SIFIRLA
    await db.sequelize.sync({ force: true });
    console.log('Veritabanı sıfırlandı ve tablolar yeniden oluşturuldu...'.cyan.bold);

    // -----------------------------------------------------------------------
    // 2. BÖLÜMLER (DEPARTMENTS)
    // -----------------------------------------------------------------------
    const deptComputer = await Department.create({ 
      name: 'Bilgisayar Mühendisliği', 
      code: 'CENG',
      faculty_name: 'Mühendislik Fakültesi'
    });
    
    const deptElectrical = await Department.create({ 
      name: 'Elektrik-Elektronik Müh.', 
      code: 'EEE',
      faculty_name: 'Mühendislik Fakültesi'
    });
    
    const deptArchitecture = await Department.create({ 
      name: 'Mimarlık', 
      code: 'ARCH',
      faculty_name: 'Mimarlık ve Tasarım Fakültesi'
    });
    
    console.log('Bölümler eklendi...'.green);

    // -----------------------------------------------------------------------
    // 3. DERSLİKLER (CLASSROOMS)
    // -----------------------------------------------------------------------
    const room101 = await Classroom.create({ 
      building: 'Mühendislik A Blok', 
      room_number: '101', 
      capacity: 60, 
      type: 'classroom',
      latitude: 41.0255, 
      longitude: 40.5201
    });

    const labComp = await Classroom.create({ 
      building: 'Mühendislik B Blok', 
      room_number: 'LAB-1', 
      capacity: 30, 
      type: 'lab',
      latitude: 41.0258, 
      longitude: 40.5205
    });

    const roomArch = await Classroom.create({ 
      building: 'Mimarlık Fakültesi', 
      room_number: 'Z-10', 
      capacity: 45, 
      type: 'studio',
      latitude: 41.0260, 
      longitude: 40.5210
    });
    console.log('Derslikler eklendi...'.green);

    // -----------------------------------------------------------------------
    // 4. KULLANICILAR (ADMIN, HOCA, ÖĞRENCİ)
    // -----------------------------------------------------------------------
    
    // User modelindeki 'beforeCreate' hook'u sayesinde 
    // 'password_hash' alanına düz metin şifre verdiğimizde otomatik hashlenir.

    // --- Admin ---
    await User.create({
      name: 'Sistem Yöneticisi',
      email: 'admin@smartcampus.com',
      password_hash: 'Password123', // Doğrudan şifreyi veriyoruz, hook hashleyecek
      role: 'admin',
      is_verified: true
    });

    // --- Hocalar ---
    const userFac1 = await User.create({
      name: 'Dr. Ahmet Yılmaz',
      email: 'ahmet@smartcampus.com',
      password_hash: 'Password123',
      role: 'faculty',
      is_verified: true
    });
    const faculty1 = await Faculty.create({
      userId: userFac1.id,
      departmentId: deptComputer.id,
      title: 'Dr. Öğr. Üyesi',
      office_number: 'A-204',
      employee_number: 'FAC-001'
    });

    const userFac2 = await User.create({
      name: 'Prof. Dr. Zeynep Kaya',
      email: 'zeynep@smartcampus.com',
      password_hash: 'Password123',
      role: 'faculty',
      is_verified: true
    });
    const faculty2 = await Faculty.create({
      userId: userFac2.id,
      departmentId: deptArchitecture.id,
      title: 'Prof. Dr.',
      office_number: 'M-101',
      employee_number: 'FAC-002'
    });

    // --- Öğrenciler ---
    const userStu1 = await User.create({
      name: 'Ali Demir',
      email: 'ali@smartcampus.com',
      password_hash: 'Password123',
      role: 'student',
      is_verified: true
    });
    const student1 = await Student.create({
      userId: userStu1.id,
      departmentId: deptComputer.id,
      student_number: '2021001',
      gpa: 3.50,
      current_semester: 3
    });

    const userStu2 = await User.create({
      name: 'Ayşe Çelik',
      email: 'ayse@smartcampus.com',
      password_hash: 'Password123',
      role: 'student',
      is_verified: true
    });
    const student2 = await Student.create({
      userId: userStu2.id,
      departmentId: deptComputer.id,
      student_number: '2021002',
      gpa: 2.80,
      current_semester: 3
    });

    console.log('Kullanıcılar eklendi...'.green);

    // -----------------------------------------------------------------------
    // 5. DERSLER (COURSES) VE ÖN KOŞULLAR
    // -----------------------------------------------------------------------
    
    const courseAlgo = await Course.create({
      code: 'CENG101',
      name: 'Algoritma ve Programlamaya Giriş',
      description: 'Temel C++ eğitimi.',
      credits: 4,
      ects: 6,
      departmentId: deptComputer.id
    });

    const courseData = await Course.create({
      code: 'CENG102',
      name: 'Veri Yapıları',
      description: 'Linked List, Tree, Graph yapıları.',
      credits: 3,
      ects: 5,
      departmentId: deptComputer.id,
      prerequisiteId: courseAlgo.id
    });

    const courseArch = await Course.create({
      code: 'ARCH101',
      name: 'Mimari Tasarıma Giriş',
      description: 'Temel çizim teknikleri.',
      credits: 4,
      ects: 7,
      departmentId: deptArchitecture.id
    });

    console.log('Dersler ve ön koşullar eklendi...'.green);

    // -----------------------------------------------------------------------
    // 6. ŞUBELER (SECTIONS) VE DERS PROGRAMI
    // -----------------------------------------------------------------------

    // CENG101
    await CourseSection.create({
      courseId: courseAlgo.id,
      section_number: 1,
      semester: 'Spring',
      year: 2025,
      instructorId: faculty1.id,
      classroomId: labComp.id,
      capacity: 30,
      enrolled_count: 0,
      schedule_json: [
        { day: 'Monday', start_time: '09:00', end_time: '12:00' }
      ]
    });

    // CENG102
    await CourseSection.create({
      courseId: courseData.id,
      section_number: 1,
      semester: 'Spring',
      year: 2025,
      instructorId: faculty1.id,
      classroomId: room101.id,
      capacity: 60,
      enrolled_count: 0,
      schedule_json: [
        { day: 'Wednesday', start_time: '13:00', end_time: '16:00' }
      ]
    });

    // ARCH101
    await CourseSection.create({
      courseId: courseArch.id,
      section_number: 1,
      semester: 'Spring',
      year: 2025,
      instructorId: faculty2.id,
      classroomId: roomArch.id,
      capacity: 45,
      enrolled_count: 0,
      schedule_json: [
        { day: 'Tuesday', start_time: '09:00', end_time: '13:00' }
      ]
    });

    console.log('Şubeler ve ders programları eklendi...'.green);

    // -----------------------------------------------------------------------
    // 7. DUYURULAR (ANNOUNCEMENTS)
    // -----------------------------------------------------------------------
    // Not: Enum hatalarını önlemek için model tanımındaki enum değerlerine dikkat edilmeli.
    // Varsayılan olarak priority: 'normal', target_role: 'all' vb. olabilir.
    
    await Announcement.create({
      title: '2025 Bahar Dönemi Başlıyor',
      content: 'Tüm öğrencilerimize yeni dönemde başarılar dileriz. Ders kayıtları açılmıştır.',
      target_role: 'all',
      priority: 'high'
    });

    await Announcement.create({
      title: 'Kampüs Kart Dağıtımı',
      content: 'Yeni kayıt yaptıran öğrenciler kartlarını öğrenci işlerinden alabilir.',
      target_role: 'student',
      priority: 'normal'
    });

    await Announcement.create({
      title: 'Akademik Kurul Toplantısı',
      content: 'Cuma günü saat 14:00 da rektörlük binasında toplantı yapılacaktır.',
      target_role: 'faculty',
      priority: 'normal'
    });

    console.log('Duyurular eklendi...'.green);
    
    // -----------------------------------------------------------------------
    // 8. TEST İÇİN HAZIR KAYIT (ENROLLMENT)
    // -----------------------------------------------------------------------
    const sectionCeng101 = await CourseSection.findOne({ where: { courseId: courseAlgo.id } });
    
    if(sectionCeng101) {
        await Enrollment.create({
            studentId: student1.id,
            sectionId: sectionCeng101.id,
            status: 'passed',
            midterm_grade: 80,
            final_grade: 90,
            letter_grade: 'AA',
            grade_point: 4.0
        });
        
        await sectionCeng101.increment('enrolled_count');
        console.log('Ali CENG101 dersine kaydedildi ve AA ile geçti.'.yellow);
    }

    console.log('-------------------------------------------'.white);
    console.log('VERİ YÜKLEME İŞLEMİ BAŞARIYLA TAMAMLANDI!'.inverse.green);
    console.log('-------------------------------------------'.white);

    process.exit();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

seedData();
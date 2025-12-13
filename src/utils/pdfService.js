const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

const buildTranscript = (student, enrollments) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, bufferPages: true });
    const buffers = [];

    // Veri parçalarını topla
    doc.on('data', buffers.push.bind(buffers));
    
    // İşlem bitince birleştir ve döndür
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      resolve(pdfData);
    });

    doc.on('error', (err) => {
      reject(err);
    });

    // --- FONT AYARLARI ---
    // Font dosyasının src/fonts/Roboto-Regular.ttf yolunda olduğundan emin olun
    const fontPath = path.join(__dirname, '../fonts/Roboto-Regular.ttf');
    const boldFontPath = path.join(__dirname, '../fonts/Roboto-Bold.ttf');

    try {
      if (fs.existsSync(fontPath)) {
        doc.font(fontPath);
      } else {
        console.warn("UYARI: Türkçe font bulunamadı, standart font kullanılıyor.");
        doc.font('Helvetica'); 
      }
    } catch (e) {
      doc.font('Helvetica');
    }

    // --- PDF İÇERİĞİ ---
    
    // Başlık
    if (fs.existsSync(boldFontPath)) doc.font(boldFontPath);
    doc.fontSize(20).text('AKILLI KAMPÜS ÜNİVERSİTESİ', { align: 'center' });
    doc.moveDown();
    doc.fontSize(16).text('RESMİ TRANSKRİPT', { align: 'center', underline: true });
    doc.moveDown();

    // Öğrenci Bilgileri
    if (fs.existsSync(fontPath)) doc.font(fontPath);
    doc.fontSize(12);
    doc.text(`Sayın ${student.user.name},`);
    doc.text(`Öğrenci No: ${student.student_number}`);
    doc.text(`Bölüm: ${student.department?.name || '-'}`);
    doc.text(`Tarih: ${new Date().toLocaleDateString('tr-TR')}`);
    doc.moveDown();
    
    // Çizgi
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();

    // Tablo Başlıkları
    const startY = doc.y;
    if (fs.existsSync(boldFontPath)) doc.font(boldFontPath);
    doc.text('Kod', 50, startY);
    doc.text('Ders Adı', 150, startY);
    doc.text('Kredi', 350, startY);
    doc.text('Harf', 420, startY);
    doc.text('Puan', 480, startY);
    doc.moveDown();

    // Tablo İçeriği
    if (fs.existsSync(fontPath)) doc.font(fontPath);
    
    let totalCredits = 0;
    let totalPoints = 0;

    enrollments.forEach(enr => {
      const y = doc.y;
      const course = enr.section.course;
      const credits = course.credits;
      const gradePoint = enr.grade_point;

      // Hesaplama
      if (gradePoint !== null) {
        totalCredits += credits;
        totalPoints += (gradePoint * credits);
      }

      // Satır Yazdır
      doc.text(course.code, 50, y);
      
      // Uzun isimleri kısalt
      const courseName = course.name.length > 30 
        ? course.name.substring(0, 30) + '...' 
        : course.name;
      doc.text(courseName, 150, y);
      
      doc.text(credits.toString(), 350, y);
      doc.text(enr.letter_grade || '-', 420, y);
      doc.text(gradePoint !== null ? gradePoint.toFixed(1) : '-', 480, y);
      
      doc.moveDown();
    });

    // Alt Çizgi
    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();

    // Genel Ortalama
    const gpa = totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : '0.00';
    if (fs.existsSync(boldFontPath)) doc.font(boldFontPath);
    doc.fontSize(14);
    doc.text(`Genel Not Ortalaması (GPA): ${gpa}`, { align: 'right' });
    doc.text(`Toplam Kredi: ${totalCredits}`, { align: 'right' });

    doc.end();
  });
};

module.exports = { buildTranscript };
const SYSTEM_CONFIG = {
  // Aktif Akademik Dönem Ayarları
  ACTIVE_SEMESTER: 'Spring', // Seçenekler: 'Fall', 'Spring', 'Summer'
  ACTIVE_YEAR: 2025,         // Yıl

  // Ders Kayıt Kuralları
  MAX_ECTS_LIMIT: 45,        // Bir öğrenci en fazla kaç AKTS alabilir? (Normali 30, Üst sınır 45)
  MIN_ECTS_LIMIT: 0,         // Alt sınır (Opsiyonel)
};

module.exports = SYSTEM_CONFIG;
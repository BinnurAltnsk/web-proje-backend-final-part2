# Campus Management System - Backend

## Proje Tanımı
Kampüs yönetim sistemi için RESTful API servisi. Öğrenci, öğretim üyesi ve admin kullanıcıların yönetimi, kimlik doğrulama ve yetkilendirme işlemlerini sağlar.

## Teknoloji Stack'i
- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Database:** PostgreSQL
- **ORM:** Sequelize
- **Authentication:** JWT (jsonwebtoken)
- **Validation:** Joi
- **Documentation:** Swagger
- **File Upload:** Cloudinary
- **Email:** Nodemailer/Resend
- **Security:** Helmet, XSS-Clean, Rate Limiting
- **Testing:** Jest, Supertest

## Proje Yapısı
```
src/
├── app.js                 # Ana uygulama giriş noktası
├── config/                # Yapılandırma dosyaları
├── controllers/           # İstek işleyicileri
├── middleware/            # Express middleware'leri
├── models/                # Sequelize modelleri
├── routes/                # API rotaları
├── scripts/               # Yardımcı scriptler
└── utils/                 # Yardımcı fonksiyonlar
```

## Grup Üyeleri ve Görev Dağılımı
- **Backend Geliştirme:** API endpoint'leri, veritabanı modelleri
- **Güvenlik:** JWT authentication, middleware'ler
- **Test:** Unit testler, entegrasyon testleri


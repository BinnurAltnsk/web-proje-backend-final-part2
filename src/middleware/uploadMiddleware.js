const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// 1. Cloudinary Ayarları
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 2. Storage Motorunu Oluştur
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'kampus-profil-fotolari', // Cloudinary'de oluşacak klasör adı
    allowed_formats: ['jpg', 'png', 'jpeg'], // İzin verilen formatlar
    // transformation: [{ width: 500, height: 500, crop: 'limit' }] // İstersen boyutlandırabilirsin
  },
});

const upload = multer({ storage: storage });

module.exports = upload;
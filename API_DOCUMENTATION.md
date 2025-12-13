# API Documentation - Part 1

## Base URL
```
http://localhost:5000/api/v1
```

## Authentication Endpoints

### 1. Register
**POST** `/auth/register`

Yeni kullanıcı kaydı oluşturur.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "role": "student",
  "student_number": "2024001",
  "department_id": "uuid-here"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Kayıt başarılı. Lütfen e-postanızı kontrol edin."
}
```

### 2. Login
**POST** `/auth/login`

Kullanıcı girişi yapar.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "role": "student"
    },
    "accessToken": "jwt-token",
    "refreshToken": "refresh-token"
  }
}
```

### 3. Verify Email
**POST** `/auth/verify-email`

E-posta doğrulama token'ı ile hesabı aktifleştirir.

**Request Body:**
```json
{
  "token": "verification-token"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "E-posta başarıyla doğrulandı. Giriş yapabilirsiniz.",
  "data": {
    "accessToken": "jwt-token",
    "refreshToken": "refresh-token"
  }
}
```

### 4. Refresh Token
**POST** `/auth/refresh`

Access token'ı yeniler.

**Request Body:**
```json
{
  "refreshToken": "refresh-token"
}
```

**Response (200):**
```json
{
  "success": true,
  "accessToken": "new-jwt-token"
}
```

### 5. Logout
**POST** `/auth/logout`

Kullanıcı çıkışı yapar.

**Response (200):**
```json
{
  "success": true,
  "message": "Başarıyla çıkış yapıldı."
}
```

### 6. Forgot Password
**POST** `/auth/forgot-password`

Şifre sıfırlama e-postası gönderir.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "E-posta gönderildi."
}
```

### 7. Reset Password
**PUT** `/auth/reset-password/:resettoken`

Şifre sıfırlama token'ı ile yeni şifre belirler.

**Request Body:**
```json
{
  "password": "newpassword123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Şifre başarıyla güncellendi. Giriş yapabilirsiniz."
}
```

### 8. Change Password (Authenticated)
**PUT** `/users/change-password`

Mevcut şifre ile yeni şifre değiştirir. (Authentication gerekli)

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Request Body:**
```json
{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Şifreniz başarıyla değiştirildi."
}
```

## User Management Endpoints

### 1. Get Current User
**GET** `/users/me`

Giriş yapmış kullanıcının profil bilgilerini getirir.

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "student",
    "phone_number": "555-1234",
    "studentProfile": {
      "student_number": "2024001",
      "gpa": 3.5
    }
  }
}
```

### 2. Update Current User
**PUT** `/users/me`

Giriş yapmış kullanıcının profil bilgilerini günceller.

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Request Body:**
```json
{
  "phone_number": "555-5678",
  "address": "İstanbul",
  "bio": "Öğrenci"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Profil başarıyla güncellendi.",
  "data": { ... }
}
```

### 3. Upload Profile Picture
**POST** `/users/me/profile-picture`

Profil fotoğrafı yükler.

**Headers:**
```
Authorization: Bearer {accessToken}
Content-Type: multipart/form-data
```

**Request Body:**
```
Form Data:
- profile_image: (file)
```

**Response (200):**
```json
{
  "success": true,
  "message": "Profil fotoğrafı güncellendi.",
  "data": {
    "profilePictureUrl": "https://cloudinary.com/..."
  }
}
```

### 4. Get All Users (Admin Only)
**GET** `/users`

Tüm kullanıcıları listeler. Sadece admin erişebilir.

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Query Parameters:**
- `page`: Sayfa numarası (default: 1)
- `limit`: Sayfa başına kayıt (default: 10)
- `role`: Rol filtresi (student/faculty/admin)
- `search`: E-posta arama

**Response (200):**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "total": 100,
    "page": 1,
    "totalPages": 10
  }
}
```

## Error Codes

| Status Code | Açıklama |
|------------|----------|
| 400 | Bad Request - Geçersiz istek |
| 401 | Unauthorized - Kimlik doğrulama gerekli |
| 403 | Forbidden - Yetki yetersiz |
| 404 | Not Found - Kaynak bulunamadı |
| 409 | Conflict - Çakışma (örn: email zaten kayıtlı) |
| 500 | Internal Server Error - Sunucu hatası |

## Error Response Format
```json
{
  "success": false,
  "error": "Hata mesajı"
}
```


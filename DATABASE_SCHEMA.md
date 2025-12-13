# Database Schema

## ER Diagram
```
┌─────────────┐
│   users     │
├─────────────┤
│ id (PK)     │
│ email       │
│ password    │
│ role        │
│ is_verified │
│ ...         │
└──────┬──────┘
       │
       │ 1:1
       ├──────────────┐
       │              │
┌──────▼──────┐  ┌────▼──────┐
│  students   │  │  faculty  │
├─────────────┤  ├───────────┤
│ userId (FK) │  │ userId(FK)│
│ student_no  │  │ emp_no    │
│ gpa         │  │ title     │
│ dept_id(FK) │  │ dept_id(FK)│
└──────┬──────┘  └────┬───────┘
       │             │
       │             │
       └──────┬──────┘
              │
              │ N:1
       ┌──────▼──────┐
       │ departments │
       ├─────────────┤
       │ id (PK)     │
       │ name        │
       │ code        │
       └─────────────┘
```

## Tablolar

### users
Kullanıcı bilgilerini tutar.

| Sütun | Tip | Açıklama |
|-------|-----|----------|
| id | UUID (PK) | Benzersiz kullanıcı ID |
| email | STRING (UNIQUE) | E-posta adresi |
| phone_number | STRING | Telefon numarası |
| address | TEXT | Adres bilgisi |
| bio | TEXT | Kullanıcı hakkında bilgi |
| password_hash | STRING | Hash'lenmiş şifre |
| role | ENUM | student, faculty, admin, staff |
| is_verified | BOOLEAN | E-posta doğrulama durumu |
| profile_picture_url | STRING | Profil fotoğrafı URL |
| verification_token | STRING | E-posta doğrulama token |
| reset_password_token | STRING | Şifre sıfırlama token |
| reset_password_expire | DATE | Token son kullanma tarihi |
| created_at | TIMESTAMP | Oluşturulma tarihi |
| updated_at | TIMESTAMP | Güncellenme tarihi |

**Indexes:**
- `email` (UNIQUE)
- `verification_token`
- `reset_password_token`

### students
Öğrenci profili bilgileri.

| Sütun | Tip | Açıklama |
|-------|-----|----------|
| id | INTEGER (PK) | Benzersiz ID |
| userId | UUID (FK) | users tablosuna referans |
| student_number | STRING (UNIQUE) | Öğrenci numarası |
| gpa | FLOAT | Genel not ortalaması |
| cgpa | FLOAT | Kümülatif not ortalaması |
| current_semester | INTEGER | Mevcut dönem |
| departmentId | INTEGER (FK) | departments tablosuna referans |
| created_at | TIMESTAMP | Oluşturulma tarihi |
| updated_at | TIMESTAMP | Güncellenme tarihi |

**Indexes:**
- `userId` (UNIQUE, FK)
- `student_number` (UNIQUE)
- `departmentId` (FK)

### faculty
Öğretim üyesi profili bilgileri.

| Sütun | Tip | Açıklama |
|-------|-----|----------|
| id | INTEGER (PK) | Benzersiz ID |
| userId | UUID (FK) | users tablosuna referans |
| employee_number | STRING (UNIQUE) | Personel numarası |
| title | STRING | Unvan (Dr., Prof., vb.) |
| office_location | STRING | Ofis konumu |
| departmentId | INTEGER (FK) | departments tablosuna referans |
| created_at | TIMESTAMP | Oluşturulma tarihi |
| updated_at | TIMESTAMP | Güncellenme tarihi |

**Indexes:**
- `userId` (UNIQUE, FK)
- `employee_number` (UNIQUE)
- `departmentId` (FK)

### departments
Bölüm bilgileri.

| Sütun | Tip | Açıklama |
|-------|-----|----------|
| id | INTEGER (PK) | Benzersiz ID |
| name | STRING | Bölüm adı |
| code | STRING (UNIQUE) | Bölüm kodu (örn: CENG) |
| faculty_name | STRING | Fakülte adı |
| created_at | TIMESTAMP | Oluşturulma tarihi |
| updated_at | TIMESTAMP | Güncellenme tarihi |

**Indexes:**
- `code` (UNIQUE)

## İlişkiler (Foreign Keys)

1. **users → students** (1:1)
   - `students.userId` → `users.id`

2. **users → faculty** (1:1)
   - `faculty.userId` → `users.id`

3. **departments → students** (1:N)
   - `students.departmentId` → `departments.id`

4. **departments → faculty** (1:N)
   - `faculty.departmentId` → `departments.id`

## Indexes Özeti

- **Primary Keys:** Tüm tablolarda `id`
- **Unique Constraints:** 
  - `users.email`
  - `students.student_number`
  - `faculty.employee_number`
  - `departments.code`
- **Foreign Keys:**
  - `students.userId`, `students.departmentId`
  - `faculty.userId`, `faculty.departmentId`
- **Search Indexes:**
  - `users.verification_token`
  - `users.reset_password_token`


// src/config/campusIPs.js

// Kampüsün izin verilen IP Blokları (CIDR veya tekil IP)
// Geliştirme ortamı için ::1 ve 127.0.0.1 eklenmiştir.
const CAMPUS_IPS = [
    '79.123.128.0/17',
    '::1',          // IPv6 Localhost
    '127.0.0.1'     // IPv4 Localhost
   ];
   
   module.exports = CAMPUS_IPS;
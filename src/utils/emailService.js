const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // 1. Transporter oluştur (Brevo SMTP yapılandırması)
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST, // smtp-relay.brevo.com
    port: process.env.EMAIL_PORT, // 587
    secure: false, // 587 portu için false (TLS kullanır)
    auth: {
      user: process.env.EMAIL_USER, // Brevo kullanıcı e-postanız
      pass: process.env.EMAIL_PASS, // Brevo SMTP Anahtarı
    },
  });

  // 2. E-posta içeriğini hazırla
  const message = {
    // Brevo, gönderen adresinin doğrulanmış olmasını ister.
    // .env dosyasındaki FROM_EMAIL değişkenini kullanın.
    from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL || process.env.EMAIL_USER}>`,
    to: options.email,
    subject: options.subject,
    text: options.message, // Düz metin mesaj
    // html: options.html // İsterseniz HTML formatı da ekleyebilirsiniz
  };

  // 3. E-postayı gönder
  try {
    const info = await transporter.sendMail(message);
    console.log(`E-posta başarıyla gönderildi. ID: ${info.messageId}`);
  } catch (error) {
    console.error("E-posta gönderim hatası:", error);
    // Hatanın üst katmana fırlatılması, authController'ın hatayı yakalamasını sağlar
    throw error; 
  }
};

module.exports = sendEmail;
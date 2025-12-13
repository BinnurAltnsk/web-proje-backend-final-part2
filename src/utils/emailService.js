const sendEmail = async (options) => {
  
  console.log('---------------- E-POSTA GÖNDERİLDİ ----------------');
  console.log(`Kime: ${options.email}`);
  console.log(`Konu: ${options.subject}`);
  console.log(`Mesaj: \n${options.message}`);
  console.log('----------------------------------------------------');

  return true;
};

module.exports = sendEmail;
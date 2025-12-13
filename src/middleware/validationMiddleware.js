const ErrorResponse = require('../utils/errorResponse');

const validate = (schema) => (req, res, next) => {
  // abortEarly: false tüm hataları görmek için
  // allowUnknown: true (Opsiyonel) fazladan gönderilen alanlara izin verir
  // stripUnknown: true (Opsiyonel) şemada olmayan alanları temizler
  
  const options = {
    abortEarly: false, 
    allowUnknown: true, 
    stripUnknown: true 
  };

  const { error, value } = schema.validate(req.body, options);

  if (error) {
    const message = error.details.map(detail => detail.message).join(', ');
    return next(new ErrorResponse(message, 400));
  }

  // Temizlenmiş ve doğrulanmış veriyi req.body'ye ata
  Object.assign(req.body, value); 

  next();
};

module.exports = validate;
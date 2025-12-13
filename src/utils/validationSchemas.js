const Joi = require('joi');

const registerSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Geçerli bir email adresi giriniz.',
    'any.required': 'Email alanı zorunludur.'
  }),
  
  // Regex: En az 1 büyük harf, 1 küçük harf ve 1 rakam içermeli. Özel karakterlere izin ver.
  password: Joi.string()
    .min(8)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)[a-zA-Z\\d\\W_]{8,}$'))
    .required()
    .messages({
      'string.min': 'Şifre en az 8 karakter olmalıdır.',
      'string.pattern.base': 'Şifre en az bir büyük harf, bir küçük harf ve bir rakam içermelidir.',
      'any.required': 'Şifre alanı zorunludur.'
    }),
  role: Joi.string().valid('student', 'faculty').required(),
  student_number: Joi.string().optional(),
  department_id: Joi.number().optional(),
  employee_number: Joi.string().optional(),
  title: Joi.string().optional(),
  name: Joi.string().optional()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

module.exports = { registerSchema, loginSchema };
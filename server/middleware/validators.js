const Joi = require('joi');

const signupUserSchema = Joi.object({
  firstName: Joi.string().required(),
  lastName: Joi.string().required(),
  email: Joi.string().email().optional().allow('', null),
  password: Joi.string().min(6).required(),
  phone: Joi.string().required(),
  otp: Joi.string().optional().allow('', null)
});

const signupDoctorSchema = Joi.object({
  firstName: Joi.string().required(),
  lastName: Joi.string().required(),
  email: Joi.string().email().optional().allow('', null),
  password: Joi.string().min(6).required(),
  phone: Joi.string().required(),
  qualifications: Joi.string().max(140).required(),
  otp: Joi.string().optional().allow('', null)
});

const loginSchema = Joi.object({
  email: Joi.string().required(), // accepts either email address or phone number
  password: Joi.string().required()
});

const sendOtpSchema = Joi.object({
  phone: Joi.string().required(),
  purpose: Joi.string().valid('SIGNUP', 'LOGIN', 'RESET').default('LOGIN')
});

const loginOtpSchema = Joi.object({
  phone: Joi.string().required(),
  otp: Joi.string().required()
});

const requestSchema = Joi.object({
  description: Joi.string().max(400).required(),
  location: Joi.object({
    type: Joi.string().valid('Point').optional(),
    coordinates: Joi.array().items(Joi.number()).length(2).required()
  }).required().unknown(true),
  petId: Joi.string().optional().allow('', null),
  doctorId: Joi.string().optional().allow('', null)
}).unknown(true);

const validate = (schema) => (req, res, next) => {
  if (req.body && typeof req.body.location === 'string') {
    try {
      req.body.location = JSON.parse(req.body.location);
    } catch (e) {}
  }
  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }
  next();
};

module.exports = {
  validate,
  signupUserSchema,
  signupDoctorSchema,
  loginSchema,
  sendOtpSchema,
  loginOtpSchema,
  requestSchema
};

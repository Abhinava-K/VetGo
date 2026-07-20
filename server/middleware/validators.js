const Joi = require('joi');

const signupUserSchema = Joi.object({
  firstName: Joi.string().required(),
  lastName: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  phone: Joi.string().required()
});

const signupDoctorSchema = Joi.object({
  firstName: Joi.string().required(),
  lastName: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  phone: Joi.string().required(),
  qualifications: Joi.string().max(140).required()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
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
  requestSchema
};

const Joi = require('joi');

// User registration validation
const registerValidation = (req, res, next) => {
  const schema = Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
    password: Joi.string().min(6).required().messages({
      'string.min': 'Password must be at least 6 characters long',
      'any.required': 'Password is required'
    }),
    role: Joi.string().valid('customer', 'manager', 'staff', 'supplier').required().messages({
      'any.only': 'Role must be one of: customer, manager, staff, supplier',
      'any.required': 'Role is required'
    }),
    firstName: Joi.string().min(2).max(100).required().messages({
      'string.min': 'First name must be at least 2 characters long',
      'string.max': 'First name cannot exceed 100 characters',
      'any.required': 'First name is required'
    }),
    lastName: Joi.string().min(2).max(100).required().messages({
      'string.min': 'Last name must be at least 2 characters long',
      'string.max': 'Last name cannot exceed 100 characters',
      'any.required': 'Last name is required'
    }),
    phone: Joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/).allow('').messages({
      'string.pattern.base': 'Please provide a valid phone number'
    })
  });

  const { error } = schema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: error.details.map(detail => ({
        field: detail.path[0],
        message: detail.message
      }))
    });
  }

  next();
};

// User login validation
const loginValidation = (req, res, next) => {
  const schema = Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
    password: Joi.string().required().messages({
      'any.required': 'Password is required'
    }),
    role: Joi.string().valid('customer', 'manager', 'staff', 'supplier').optional().messages({
      'any.only': 'Role must be one of: customer, manager, staff, supplier'
    })
  });

  const { error } = schema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: error.details.map(detail => ({
        field: detail.path[0],
        message: detail.message
      }))
    });
  }

  next();
};

// User update validation
const updateUserValidation = (req, res, next) => {
  const schema = Joi.object({
    firstName: Joi.string().min(2).max(100).messages({
      'string.min': 'First name must be at least 2 characters long',
      'string.max': 'First name cannot exceed 100 characters'
    }),
    lastName: Joi.string().min(2).max(100).messages({
      'string.min': 'Last name must be at least 2 characters long',
      'string.max': 'Last name cannot exceed 100 characters'
    }),
    phone: Joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/).allow('').messages({
      'string.pattern.base': 'Please provide a valid phone number'
    })
  });

  const { error } = schema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: error.details.map(detail => ({
        field: detail.path[0],
        message: detail.message
      }))
    });
  }

  next();
};

// Generic validation middleware
const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => ({
          field: detail.path[0],
          message: detail.message
        }))
      });
    }

    next();
  };
};

module.exports = {
  registerValidation,
  loginValidation,
  updateUserValidation,
  validate
}; 
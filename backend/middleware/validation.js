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
    role: Joi.string().valid('customer', 'supplier').required().messages({
      'any.only': 'Role must be one of: customer, supplier. Manager and staff accounts can only be created by administrators.',
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
    }),
    storeIds: Joi.array().items(Joi.string()).when('role', {
      is: 'supplier',
      then: Joi.array().min(1).required().messages({
        'array.min': 'Please select at least one store for suppliers',
        'any.required': 'Store selection is required for suppliers'
      }),
      otherwise: Joi.forbidden()
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
    role: Joi.string().valid('customer', 'manager', 'staff', 'supplier', 'admin').optional().messages({
      'any.only': 'Role must be one of: customer, manager, staff, supplier, admin'
    }),
    staffType: Joi.string().valid('cashier', 'inventory').when('role', {
      is: 'staff',
      then: Joi.required().messages({
        'any.required': 'Staff type is required for staff login',
        'any.only': 'Staff type must be either cashier or inventory'
      }),
      otherwise: Joi.optional()
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

// Admin login validation
const adminLoginValidation = (req, res, next) => {
  const schema = Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
    password: Joi.string().required().messages({
      'any.required': 'Password is required'
    }),
    role: Joi.string().valid('admin').optional().messages({
      'any.only': 'Role must be admin for admin login'
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
  adminLoginValidation,
  updateUserValidation,
  validate
}; 
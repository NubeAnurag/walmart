const User = require('../models/User');
const Store = require('../models/Store');
const Supplier = require('../models/Supplier'); // Added Supplier model
const { generateEmployeeId, generateSecurePassword } = require('../utils/employeeIdGenerator');

// Create new employee (manager or staff)
const createEmployee = async (req, res) => {
  try {
    const { 
      email, 
      firstName, 
      lastName, 
      role, 
      storeId, 
      phone,
      password: customPassword,
      staffType
    } = req.body;

    // Validate required fields
    if (!email || !firstName || !lastName || !role || !storeId) {
      return res.status(400).json({
        success: false,
        message: 'Email, first name, last name, role, and store are required'
      });
    }

    // Validate staff type for staff role
    if (role === 'staff' && !staffType) {
      return res.status(400).json({
        success: false,
        message: 'Staff type is required for staff role'
      });
    }

    if (role === 'staff' && !['cashier', 'inventory'].includes(staffType)) {
      return res.status(400).json({
        success: false,
        message: 'Staff type must be either cashier or inventory'
      });
    }

    // Validate role
    if (!['manager', 'staff'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Role must be either manager or staff'
      });
    }

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email address'
      });
    }

    // Verify store exists
    const store = await Store.findById(storeId);
    if (!store || !store.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Selected store is not valid'
      });
    }

    // Check if a manager already exists for this store
    if (role === 'manager') {
      const existingManager = await User.findOne({
        storeId: storeId,
        role: 'manager',
        isActive: true
      });
      
      if (existingManager) {
        return res.status(400).json({
          success: false,
          message: `A manager already exists for this store (${existingManager.firstName} ${existingManager.lastName}). Each store can have only one manager.`
        });
      }
    }

    // Generate employee ID
    const employeeId = await generateEmployeeId(storeId, role, staffType);

    // Generate or use provided password
    const password = customPassword || generateSecurePassword();

    // Create new employee
    const employee = new User({
      email,
      password,
      firstName,
      lastName,
      role,
      storeId,
      employeeId,
      phone,
      authProvider: 'local',
      isActive: true,
      staffType: role === 'staff' ? staffType : undefined
    });

    await employee.save();

    // Return employee data (without password)
    const employeeData = employee.toJSON();
    
    // Populate store information
    await employee.populate('storeId');

    res.status(201).json({
      success: true,
      message: 'Employee created successfully',
      data: {
        employee: employee.toJSON(),
        generatedPassword: customPassword ? undefined : password // Only return if auto-generated
      }
    });

  } catch (error) {
    console.error('Create employee error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: messages
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while creating employee'
    });
  }
};

// Get all employees
const getEmployees = async (req, res) => {
  try {
    const { storeId, role, page = 1, limit = 10 } = req.query;
    
    const filter = { 
      role: { $in: ['manager', 'staff'] },
      isActive: true 
    };
    
    if (storeId) filter.storeId = storeId;
    if (role) filter.role = role;

    const employees = await User.find(filter)
      .populate('storeId')
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      message: 'Employees retrieved successfully',
      data: {
        employees,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      }
    });

  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while retrieving employees'
    });
  }
};

// Get employees grouped by store
const getEmployeesByStore = async (req, res) => {
  try {
    const employees = await User.find({
      role: { $in: ['manager', 'staff'] },
      isActive: true
    })
    .populate('storeId')
    .select('-password')
    .sort({ 'storeId.name': 1, role: 1, createdAt: -1 });

    // Group employees by store
    const groupedEmployees = {};
    
    employees.forEach(employee => {
      const storeKey = employee.storeId ? employee.storeId._id.toString() : 'unassigned';
      const storeName = employee.storeId ? employee.storeId.name : 'Unassigned';
      const storeCode = employee.storeId ? employee.storeId.storeCode : 'N/A';
      
      if (!groupedEmployees[storeKey]) {
        groupedEmployees[storeKey] = {
          store: {
            id: employee.storeId ? employee.storeId._id : null,
            name: storeName,
            code: storeCode,
            address: employee.storeId ? employee.storeId.address : null
          },
          employees: []
        };
      }
      
      groupedEmployees[storeKey].employees.push(employee);
    });

    res.json({
      success: true,
      message: 'Employees grouped by store retrieved successfully',
      data: Object.values(groupedEmployees)
    });

  } catch (error) {
    console.error('Get employees by store error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while retrieving employees by store'
    });
  }
};

// Get single employee
const getEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    
    const employee = await User.findById(id)
      .populate('storeId')
      .select('-password');

    if (!employee || !['manager', 'staff'].includes(employee.role)) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    res.json({
      success: true,
      message: 'Employee retrieved successfully',
      data: employee
    });

  } catch (error) {
    console.error('Get employee error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while retrieving employee'
    });
  }
};

// Update employee
const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, phone, email, storeId, isActive, staffType } = req.body;

    const employee = await User.findById(id);
    
    if (!employee || !['manager', 'staff'].includes(employee.role)) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Validate staff type if provided
    if (staffType && employee.role === 'staff') {
      if (!['cashier', 'inventory'].includes(staffType)) {
        return res.status(400).json({
          success: false,
          message: 'Staff type must be either cashier or inventory'
        });
      }
    }

    // Update allowed fields
    if (firstName) employee.firstName = firstName;
    if (lastName) employee.lastName = lastName;
    if (phone) employee.phone = phone;
    if (email) employee.email = email;
    if (typeof isActive === 'boolean') employee.isActive = isActive;
    if (staffType && employee.role === 'staff') employee.staffType = staffType;
    
    // If store is being changed, regenerate employee ID
    if (storeId && storeId !== employee.storeId.toString()) {
      const newStore = await Store.findById(storeId);
      if (!newStore || !newStore.isActive) {
        return res.status(400).json({
          success: false,
          message: 'Selected store is not valid'
        });
      }
      
      // Check if a manager already exists for the new store
      if (employee.role === 'manager') {
        const existingManager = await User.findOne({
          storeId: storeId,
          role: 'manager',
          isActive: true,
          _id: { $ne: employee._id } // Exclude current employee
        });
        
        if (existingManager) {
          return res.status(400).json({
            success: false,
            message: `A manager already exists for this store (${existingManager.firstName} ${existingManager.lastName}). Each store can have only one manager.`
          });
        }
      }
      
      employee.storeId = storeId;
      employee.employeeId = await generateEmployeeId(storeId, employee.role, employee.staffType);
    }

    await employee.save();
    await employee.populate('storeId');

    res.json({
      success: true,
      message: 'Employee updated successfully',
      data: employee.toJSON()
    });

  } catch (error) {
    console.error('Update employee error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: messages
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while updating employee'
    });
  }
};

// Delete employee (soft delete)
const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    
    const employee = await User.findById(id);
    
    if (!employee || !['manager', 'staff'].includes(employee.role)) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    employee.isActive = false;
    await employee.save();

    res.json({
      success: true,
      message: 'Employee deactivated successfully'
    });

  } catch (error) {
    console.error('Delete employee error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting employee'
    });
  }
};

// Reset employee password
const resetEmployeePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { password: newPassword } = req.body;
    
    const employee = await User.findById(id);
    
    if (!employee || !['manager', 'staff'].includes(employee.role)) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Generate new password if not provided
    const password = newPassword || generateSecurePassword();
    employee.password = password;
    
    await employee.save();

    res.json({
      success: true,
      message: 'Password reset successfully',
      data: {
        generatedPassword: newPassword ? undefined : password
      }
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while resetting password'
    });
  }
};

// Get dashboard stats
const getDashboardStats = async (req, res) => {
  try {
    const totalEmployees = await User.countDocuments({ 
      role: { $in: ['manager', 'staff'] }, 
      isActive: true 
    });
    
    const totalManagers = await User.countDocuments({ 
      role: 'manager', 
      isActive: true 
    });
    
    const totalStaff = await User.countDocuments({ 
      role: 'staff', 
      isActive: true 
    });
    
    const totalStores = await Store.countDocuments({ isActive: true });
    
    // Get employees by store
    const employeesByStore = await User.aggregate([
      { 
        $match: { 
          role: { $in: ['manager', 'staff'] }, 
          isActive: true 
        } 
      },
      { 
        $lookup: {
          from: 'stores',
          localField: 'storeId',
          foreignField: '_id',
          as: 'store'
        }
      },
      { $unwind: '$store' },
      {
        $group: {
          _id: '$storeId',
          storeName: { $first: '$store.name' },
          storeCode: { $first: '$store.storeCode' },
          totalEmployees: { $sum: 1 },
          managers: { 
            $sum: { $cond: [{ $eq: ['$role', 'manager'] }, 1, 0] } 
          },
          staff: { 
            $sum: { $cond: [{ $eq: ['$role', 'staff'] }, 1, 0] } 
          }
        }
      },
      { $sort: { storeCode: 1 } }
    ]);

    res.json({
      success: true,
      message: 'Dashboard stats retrieved successfully',
      data: {
        overview: {
          totalEmployees,
          totalManagers,
          totalStaff,
          totalStores
        },
        employeesByStore
      }
    });

  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while retrieving dashboard stats'
    });
  }
};

// Get all suppliers
const getAllSuppliers = async (req, res) => {
  try {
    const suppliers = await Supplier.find({})
      .populate('userId', 'firstName lastName email')
      .populate('assignedStores', 'name storeCode')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      suppliers,
      count: suppliers.length
    });
  } catch (error) {
    console.error('Get all suppliers error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching suppliers'
    });
  }
};

// Approve a supplier
const approveSupplier = async (req, res) => {
  try {
    const { supplierId } = req.params;

    const supplier = await Supplier.findByIdAndUpdate(
      supplierId,
      { 
        isApproved: true,
        approvedBy: req.user._id,
        approvedDate: new Date()
      },
      { new: true }
    ).populate('userId', 'firstName lastName email')
     .populate('assignedStores', 'name storeCode');

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    res.json({
      success: true,
      message: 'Supplier approved successfully',
      supplier
    });
  } catch (error) {
    console.error('Approve supplier error:', error);
    res.status(500).json({
      success: false,
      message: 'Error approving supplier'
    });
  }
};

// Update supplier status (active/inactive)
const updateSupplierStatus = async (req, res) => {
  try {
    const { supplierId } = req.params;
    const { isActive } = req.body;

    const supplier = await Supplier.findByIdAndUpdate(
      supplierId,
      { isActive },
      { new: true }
    ).populate('userId', 'firstName lastName email')
     .populate('assignedStores', 'name storeCode');

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    res.json({
      success: true,
      message: `Supplier ${isActive ? 'activated' : 'deactivated'} successfully`,
      supplier
    });
  } catch (error) {
    console.error('Update supplier status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating supplier status'
    });
  }
};

module.exports = {
  // Dashboard
  getDashboardStats,
  
  // Employee Management
  createEmployee,
  getEmployees,
  getEmployeesByStore,
  getEmployee,
  updateEmployee,
  deleteEmployee,
  resetEmployeePassword,
  
  // Supplier Management
  getAllSuppliers,
  approveSupplier,
  updateSupplierStatus
}; 
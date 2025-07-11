const User = require('../models/User');
const Store = require('../models/Store');

/**
 * Generate unique employee ID in format: EMP-<StoreCode>-<RoleCode>-<SequentialNumber>
 * Example: EMP-STR01-MGR-001, EMP-STR02-STF-005
 * 
 * @param {string} storeId - MongoDB ObjectId of the store
 * @param {string} role - Employee role ('manager' or 'staff')
 * @returns {Promise<string>} Generated employee ID
 */
const generateEmployeeId = async (storeId, role) => {
  try {
    // Get store information
    const store = await Store.findById(storeId);
    if (!store) {
      throw new Error('Store not found');
    }

    // Get role code
    const roleCode = role === 'manager' ? 'MGR' : 'STF';
    
    // Find the highest sequential number for this store and role
    const pattern = `^EMP-${store.storeCode}-${roleCode}-`;
    const existingEmployees = await User.find({
      employeeId: { $regex: pattern },
      isActive: true
    }).sort({ employeeId: -1 });

    let nextSequentialNumber = 1;
    
    if (existingEmployees.length > 0) {
      // Extract the sequential number from the latest employee ID
      const latestEmployeeId = existingEmployees[0].employeeId;
      const sequentialPart = latestEmployeeId.split('-')[3];
      nextSequentialNumber = parseInt(sequentialPart) + 1;
    }

    // Format sequential number with leading zeros (3 digits)
    const formattedSequentialNumber = nextSequentialNumber.toString().padStart(3, '0');
    
    // Generate the employee ID
    const employeeId = `EMP-${store.storeCode}-${roleCode}-${formattedSequentialNumber}`;
    
    // Double-check uniqueness
    const existingEmployee = await User.findOne({ employeeId });
    if (existingEmployee) {
      // If somehow the ID already exists, recursively try the next number
      return generateEmployeeId(storeId, role);
    }

    return employeeId;
    
  } catch (error) {
    console.error('Error generating employee ID:', error);
    throw new Error('Failed to generate employee ID');
  }
};

/**
 * Generate a secure random password
 * @param {number} length - Length of password (default: 12)
 * @returns {string} Generated password
 */
const generateSecurePassword = (length = 12) => {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  const allChars = uppercase + lowercase + numbers + symbols;
  let password = '';
  
  // Ensure at least one character from each set
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  // Fill the rest randomly
  for (let i = 4; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

/**
 * Validate employee ID format
 * @param {string} employeeId - Employee ID to validate
 * @returns {boolean} True if valid format
 */
const validateEmployeeId = (employeeId) => {
  const pattern = /^EMP-STR\d{2}-(MGR|STF)-\d{3}$/;
  return pattern.test(employeeId);
};

module.exports = {
  generateEmployeeId,
  generateSecurePassword,
  validateEmployeeId
}; 
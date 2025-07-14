import React, { useState, useEffect } from 'react';
import { X, Eye, EyeOff, Loader2, Mail, Lock, User, Phone, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { storeAPI } from '../services/api';
import { toast } from 'react-hot-toast';

const RegisterModal = ({ isOpen, onClose, selectedRole, onSwitchToLogin }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
    role: selectedRole || 'customer',
    storeIds: [], // Changed from storeId to storeIds array
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [stores, setStores] = useState([]);
  const [loadingStores, setLoadingStores] = useState(false);
  
  const { register, isLoading } = useAuth();
  const navigate = useNavigate();

  // Update role when selectedRole prop changes
  useEffect(() => {
    if (selectedRole) {
      setFormData(prev => ({
        ...prev,
        role: selectedRole
      }));
    }
  }, [selectedRole]);

  // Fetch stores when component mounts
  useEffect(() => {
    const fetchStores = async () => {
      setLoadingStores(true);
      try {
        const response = await storeAPI.getStores();
        if (response.success) {
          setStores(response.data);
        }
      } catch (error) {
        console.error('Error fetching stores:', error);
      } finally {
        setLoadingStores(false);
      }
    };

    fetchStores();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters long';
    }
    
    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    // First name validation
    if (!formData.firstName) {
      newErrors.firstName = 'First name is required';
    } else if (formData.firstName.length < 2) {
      newErrors.firstName = 'First name must be at least 2 characters long';
    }
    
    // Last name validation
    if (!formData.lastName) {
      newErrors.lastName = 'Last name is required';
    } else if (formData.lastName.length < 2) {
      newErrors.lastName = 'Last name must be at least 2 characters long';
    }
    
    // Phone validation (required for suppliers, optional for customers)
    if (formData.role === 'supplier' && !formData.phone) {
      newErrors.phone = 'Phone number is required for suppliers';
    } else if (formData.phone && !/^[+]?[\d\s\-()]{10,15}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Please enter a valid phone number';
    }
    
    // Role validation
    if (!formData.role) {
      newErrors.role = 'Please select a role';
    }
    
    // Store validation for supplier role
    if (formData.role === 'supplier') {
      if (formData.storeIds.length === 0) {
        newErrors.storeIds = 'Please select at least one store for suppliers';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log('🚀 Registration form submitted');
    console.log('📝 Form data:', formData);
    console.log('📡 API Base URL:', process.env.REACT_APP_API_URL || 'https://walmart-pdji.onrender.com/api');
    
    if (!validateForm()) {
      console.log('❌ Form validation failed');
      console.log('❌ Validation errors:', errors);
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      console.log('📤 Calling register function...');
      const result = await register({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        role: formData.role,
        storeIds: formData.storeIds,
      });
      
      console.log('📥 Registration result:', result);
      
      if (result.success) {
        console.log('✅ Registration successful, closing modal and redirecting');
        // Show success message
        toast.success(`Welcome ${result.user.firstName}! Account created successfully.`);
        setIsRedirecting(true);
        onClose();
        // Small delay to let user see the success message
        setTimeout(() => {
          navigate(`/dashboard/${result.user.role}`);
        }, 1000);
      } else {
        console.log('❌ Registration failed:', result.error);
        console.log('❌ Registration errors:', result.errors);
        // Show error message to user
        if (result.error) {
          // Handle specific error types
          if (result.error.includes('User already exists') || result.error.includes('duplicate key')) {
            setErrors({ 
              email: 'An account with this email already exists. Please try logging in instead.',
              general: 'Registration failed - email already in use.'
            });
          } else if (result.errors && Array.isArray(result.errors)) {
            // Handle field-specific validation errors
            const fieldErrors = {};
            result.errors.forEach(error => {
              if (error.field) {
                fieldErrors[error.field] = error.message;
              }
            });
            setErrors(fieldErrors);
          } else {
            setErrors({ general: result.error });
          }
        }
      }
    } catch (error) {
      console.error('💥 Registration error:', error);
      console.error('💥 Error details:', error.response?.data);
      console.error('💥 Error status:', error.response?.status);
      console.error('💥 Error message:', error.message);
      
      // Show more specific error messages
      let errorMessage = 'An unexpected error occurred. Please try again.';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message.includes('Network Error')) {
        errorMessage = 'Cannot connect to server. Please check if the backend is running.';
      } else if (error.code === 'ECONNREFUSED') {
        errorMessage = 'Connection refused. Backend server may be down.';
      }
      
      setErrors({ general: errorMessage });
      
      // Also show a toast for immediate feedback
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting && !isRedirecting) {
      setFormData({
        email: '',
        password: '',
        confirmPassword: '',
        firstName: '',
        lastName: '',
        phone: '',
        role: selectedRole || 'customer',
        storeIds: [],
      });
      setErrors({});
      setIsRedirecting(false);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 animate-slide-up max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Create Account</h2>
            <p className="text-sm text-gray-600">
              Join as {selectedRole ? (
                <span className="font-medium text-walmart-blue capitalize">{selectedRole}</span>
              ) : (
                'a user'
              )}
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={isSubmitting || isRedirecting}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* General Error Display */}
          {errors.general && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <X className="h-5 w-5 text-red-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{errors.general}</p>
                </div>
              </div>
            </div>
          )}

          {/* Success Message */}
          {isRedirecting && (
            <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-green-700">
                    Account created successfully! Redirecting to your dashboard...
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Name Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label text-gray-700 mb-2 block">
                First Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className={`input pl-10 ${errors.firstName ? 'input-error' : ''}`}
                  placeholder="First name"
                  disabled={isSubmitting}
                />
              </div>
              {errors.firstName && (
                <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>
              )}
            </div>

            <div>
              <label className="label text-gray-700 mb-2 block">
                Last Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className={`input pl-10 ${errors.lastName ? 'input-error' : ''}`}
                  placeholder="Last name"
                  disabled={isSubmitting}
                />
              </div>
              {errors.lastName && (
                <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>
              )}
            </div>
          </div>

          {/* Email Field */}
          <div>
            <label className="label text-gray-700 mb-2 block">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`input pl-10 ${errors.email ? 'input-error' : ''}`}
                placeholder="Enter your email"
                disabled={isSubmitting}
              />
            </div>
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">{errors.email}</p>
            )}
            {errors.email && errors.email.includes('already exists') && (
              <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-blue-700 text-sm">
                  <strong>Already have an account?</strong>{' '}
                  <button
                    type="button"
                    onClick={onSwitchToLogin}
                    className="text-walmart-blue hover:text-walmart-blue/80 font-medium underline"
                  >
                    Sign in here
                  </button>
                </p>
              </div>
            )}
          </div>

          {/* Phone Field */}
          <div>
            <label className="label text-gray-700 mb-2 block">
              Phone Number {formData.role === 'supplier' ? (
                <span className="text-red-500">*</span>
              ) : (
                <span className="text-gray-400">(Optional)</span>
              )}
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className={`input pl-10 ${errors.phone ? 'input-error' : ''}`}
                placeholder="Enter your phone number"
                disabled={isSubmitting}
              />
            </div>
            {errors.phone && (
              <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
            )}
          </div>

          {/* Role Selection */}
          <div>
            <label className="label text-gray-700 mb-2 block">
              Role
            </label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className={`input ${errors.role ? 'input-error' : ''}`}
              disabled={isSubmitting}
            >
              <option value="customer">Customer</option>
              <option value="supplier">Supplier</option>
            </select>
            {errors.role && (
              <p className="text-red-500 text-sm mt-1">{errors.role}</p>
            )}
            <p className="text-sm text-gray-500 mt-1">
              Manager and staff accounts are created by administrators only.
            </p>
          </div>

          {/* Store Selection for Suppliers */}
          {formData.role === 'supplier' && (
            <div>
              <label className="label text-gray-700 mb-2 block">
                Stores <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                {stores.map((store) => (
                  <div key={store.id} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`store-${store.id}`}
                      value={store.id}
                      checked={formData.storeIds.includes(store.id)}
                      onChange={() => {
                        setFormData(prev => ({
                          ...prev,
                          storeIds: prev.storeIds.includes(store.id)
                            ? prev.storeIds.filter(id => id !== store.id)
                            : [...prev.storeIds, store.id]
                        }));
                        if (errors.storeIds) {
                          setErrors(prev => ({
                            ...prev,
                            storeIds: ''
                          }));
                        }
                      }}
                      className="mr-2 h-4 w-4 text-walmart-blue focus:ring-walmart-blue border-gray-300 rounded"
                      disabled={isSubmitting}
                    />
                    <label htmlFor={`store-${store.id}`} className="text-sm text-gray-700">
                      {store.storeCode} - {store.name}
                    </label>
                  </div>
                ))}
              </div>
              {formData.storeIds.length > 0 && (
                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-sm text-blue-800">
                    <strong>Selected stores ({formData.storeIds.length}):</strong>
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {stores
                      .filter(store => formData.storeIds.includes(store.id))
                      .map(store => (
                        <span key={store.id} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                          {store.storeCode}
                        </span>
                      ))}
                  </div>
                </div>
              )}
              {errors.storeIds && (
                <p className="text-red-500 text-sm mt-1">{errors.storeIds}</p>
              )}
              {loadingStores && (
                <p className="text-gray-500 text-sm mt-1">Loading stores...</p>
              )}
            </div>
          )}

          {/* Password Fields */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="label text-gray-700 mb-2 block">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`input pl-10 pr-10 ${errors.password ? 'input-error' : ''}`}
                  placeholder="Create a password"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  disabled={isSubmitting}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-500 text-sm mt-1">{errors.password}</p>
              )}
            </div>

            <div>
              <label className="label text-gray-700 mb-2 block">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`input pl-10 pr-10 ${errors.confirmPassword ? 'input-error' : ''}`}
                  placeholder="Confirm your password"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  disabled={isSubmitting}
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || isLoading || isRedirecting}
            className="btn btn-primary btn-lg w-full"
          >
            {isRedirecting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Redirecting to Dashboard...
              </>
            ) : isSubmitting || isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating Account...
              </>
            ) : (
              'Create Account'
            )}
          </button>

          {/* Login Link */}
          <div className="text-center pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <button
                type="button"
                onClick={onSwitchToLogin}
                className="text-walmart-blue hover:text-walmart-blue/80 font-medium"
                disabled={isSubmitting}
              >
                Sign In
              </button>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterModal; 
import React from 'react';
import { Shield, Building2, BarChart3, Headphones } from 'lucide-react';
import { Link } from 'react-router-dom';

const AdminLoginInfo = () => {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
      <div className="flex items-center mb-4">
        <Shield className="h-6 w-6 text-blue-600 mr-2" />
        <h3 className="text-lg font-semibold text-blue-900">Admin Access</h3>
      </div>
      
      <div className="space-y-3 text-sm">
        <div className="flex items-center">
          <Building2 className="h-4 w-4 text-blue-600 mr-2" />
          <span className="text-blue-800">
            <strong>Access:</strong> Admin Panel for Employee Management
          </span>
        </div>
      </div>
      
      <div className="mt-4 p-3 bg-blue-100 rounded-md">
        <p className="text-blue-800 text-sm mb-3">
          <strong>Note:</strong> Admin login required to access the admin panel at <code>/dashboard/admin</code> 
          where you can create and manage staff and manager accounts.
        </p>
        
        <div className="flex justify-center">
          <Link 
            to="/login/admin"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Go to Admin Login
          </Link>
        </div>
      </div>
      
      {/* Additional Login Options */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <BarChart3 className="h-5 w-5 text-green-600 mr-2" />
            <h4 className="font-semibold text-green-900">Manager Login</h4>
          </div>
          <p className="text-green-800 text-sm mb-3">
            For managers created by admin
          </p>
          <Link 
            to="/login/manager"
            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
          >
            Manager Login
          </Link>
        </div>
        
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <Headphones className="h-5 w-5 text-orange-600 mr-2" />
            <h4 className="font-semibold text-orange-900">Staff Login</h4>
          </div>
          <p className="text-orange-800 text-sm mb-3">
            For staff created by admin
          </p>
          <Link 
            to="/login/staff"
            className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
          >
            Staff Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminLoginInfo; 
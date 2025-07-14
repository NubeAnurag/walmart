import React, { useState } from 'react';
import { Shield, Globe, Award, Heart, LogOut, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import WelcomeSection from '../components/WelcomeSection';
import UserTypeSelector from '../components/UserTypeSelector';
import LoginModal from '../components/LoginModal';
import RegisterModal from '../components/RegisterModal';
import AdminLoginInfo from '../components/AdminLoginInfo';

const HomePage = () => {
  const [selectedRole, setSelectedRole] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleSelectUserType = (userType) => {
    setSelectedRole(userType);
    setShowLoginModal(true);
  };

  const handleCloseModals = () => {
    setShowLoginModal(false);
    setShowRegisterModal(false);
    setSelectedRole(null);
  };

  const handleSwitchToRegister = () => {
    setShowLoginModal(false);
    setShowRegisterModal(true);
  };

  const handleSwitchToLogin = () => {
    setShowRegisterModal(false);
    setShowLoginModal(true);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleGoToDashboard = () => {
    navigate(`/dashboard/${user.role}`);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header with Authentication Status */}
      {isAuthenticated && user && (
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                {/* Walmart Logo */}
                <div className="w-32 h-16 bg-white rounded-lg flex items-center justify-center p-2 shadow-md">
                  <img 
                    src="/walmart-logo.png" 
                    alt="Walmart Digital Revolution" 
                    className="w-full h-full object-contain"
                  />
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-walmart-blue to-walmart-lightblue rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Welcome back,</p>
                    <p className="font-semibold text-gray-900">{user.firstName} {user.lastName}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleGoToDashboard}
                  className="btn btn-primary btn-sm"
                >
                  Go to Dashboard
                </button>
                <button
                  onClick={handleLogout}
                  className="btn btn-secondary btn-sm flex items-center space-x-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        </header>
      )}

      {/* Main Content */}
      <main>
        {/* Welcome Section (includes hero, features, stats, CTA) */}
        <WelcomeSection />
        
        {/* User Type Selector and Admin Info (for login/role selection) */}
        <section className="py-20 bg-white">
          <div className="max-w-4xl mx-auto px-4">
            <AdminLoginInfo />
            <UserTypeSelector onSelectUserType={handleSelectUserType} />
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Company Info */}
            <div className="md:col-span-2">
              <div className="flex items-center mb-4">
                <img 
                  src="/walmart-logo.png" 
                  alt="Walmart" 
                  className="h-8 mr-3"
                />
                <h3 className="text-xl font-bold">Walmart Digital</h3>
              </div>
              <p className="text-gray-300 mb-4 max-w-md">
                Leading the digital transformation of retail with comprehensive management solutions.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-lg font-bold mb-4 text-walmart-yellow">Solutions</h4>
              <ul className="space-y-2">
                {['For Customers', 'For Managers', 'For Staff', 'For Suppliers'].map((link, index) => (
                  <li key={index}>
                    <button className="text-gray-300 hover:text-walmart-yellow transition-colors">
                      {link}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-lg font-bold mb-4 text-walmart-yellow">Support</h4>
              <div className="space-y-2 text-gray-300">
                <div>support@walmartdigital.com</div>
                <div>1-800-WALMART</div>
                <div>24/7 Customer Service</div>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-gray-700 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm mb-4 md:mb-0">
              © 2024 Walmart Digital. All rights reserved.
            </p>
            <div className="flex space-x-6 text-sm">
              <button className="text-gray-400 hover:text-walmart-yellow transition-colors">Privacy Policy</button>
              <button className="text-gray-400 hover:text-walmart-yellow transition-colors">Terms of Service</button>
            </div>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={handleCloseModals}
        selectedRole={selectedRole}
        onSwitchToRegister={handleSwitchToRegister}
      />
      
      <RegisterModal
        isOpen={showRegisterModal}
        onClose={handleCloseModals}
        selectedRole={selectedRole}
        onSwitchToLogin={handleSwitchToLogin}
      />
    </div>
  );
};

export default HomePage; 
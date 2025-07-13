import React, { useState } from 'react';
import { Shield, Globe, Award, Heart, Facebook, Twitter, Instagram, Linkedin, Mail, Phone, MapPin, LogOut, User } from 'lucide-react';
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

  const features = [
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Enterprise Security",
      description: "Bank-level encryption and security protocols protect your data"
    },
    {
      icon: <Globe className="w-8 h-8" />,
      title: "Global Reach",
      description: "Available in 500+ locations worldwide with 24/7 support"
    },
    {
      icon: <Award className="w-8 h-8" />,
      title: "Award Winning",
      description: "Recognized as the #1 retail technology platform in 2024"
    },
    {
      icon: <Heart className="w-8 h-8" />,
      title: "Customer First",
      description: "10M+ satisfied customers trust our platform daily"
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header with Authentication Status */}
      {isAuthenticated && user && (
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                {/* Walmart Logo */}
                <div className="w-24 h-12 bg-white rounded-lg flex items-center justify-center p-2">
                  <svg 
                    viewBox="0 0 200 80" 
                    className="w-full h-full"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <text 
                      x="20" 
                      y="35" 
                      fill="#0071ce" 
                      fontSize="20" 
                      fontWeight="bold" 
                      fontFamily="Arial, sans-serif"
                    >
                      Walmart
                    </text>
                    <g transform="translate(150, 15)">
                      <path 
                        d="M25 5 L30 20 L45 20 L33 30 L38 45 L25 35 L12 45 L17 30 L5 20 L20 20 Z" 
                        fill="#ffc220" 
                        stroke="#ffc220" 
                        strokeWidth="1"
                      />
                      <circle cx="25" cy="25" r="2" fill="#ffc220"/>
                      <circle cx="15" cy="15" r="1.5" fill="#ffc220"/>
                      <circle cx="35" cy="15" r="1.5" fill="#ffc220"/>
                      <circle cx="15" cy="35" r="1.5" fill="#ffc220"/>
                      <circle cx="35" cy="35" r="1.5" fill="#ffc220"/>
                    </g>
                  </svg>
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
        {/* Welcome Section */}
        <WelcomeSection />
        
        {/* User Type Selector */}
        <section className="py-20 bg-white">
          <div className="max-w-4xl mx-auto px-4">
            <AdminLoginInfo />
            <UserTypeSelector onSelectUserType={handleSelectUserType} />
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-800 mb-4">
                Why Choose <span className="bg-gradient-to-r from-walmart-blue to-walmart-lightblue bg-clip-text text-transparent">Walmart Digital</span>?
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Experience the future of retail with our cutting-edge technology and unmatched reliability
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {features.map((feature, index) => (
                <div 
                  key={index}
                  className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border border-gray-100"
                  style={{animationDelay: `${index * 0.1}s`}}
                >
                  <div className="w-16 h-16 bg-gradient-to-br from-walmart-blue to-walmart-lightblue rounded-xl flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform duration-300">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-4 group-hover:text-walmart-blue transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-gradient-to-r from-walmart-blue to-walmart-lightblue">
          <div className="max-w-4xl mx-auto text-center px-4">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to Transform Your Business?
            </h2>
            <p className="text-xl text-blue-100 mb-10 leading-relaxed">
              Join millions of users who are already experiencing the future of retail technology
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="bg-walmart-yellow text-walmart-blue px-10 py-4 rounded-full font-bold text-lg hover:bg-yellow-300 transition-all duration-300 transform hover:scale-105 shadow-lg">
                Start Free Trial
              </button>
              <button className="border-2 border-white text-white px-10 py-4 rounded-full font-bold text-lg hover:bg-white hover:text-walmart-blue transition-all duration-300 transform hover:scale-105">
                Schedule Demo
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Enhanced Footer */}
      <footer className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
            {/* Company Info */}
            <div className="lg:col-span-2">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-walmart-blue to-walmart-lightblue rounded-xl flex items-center justify-center mr-4">
                  <span className="text-white font-bold text-xl">W</span>
                </div>
                <h3 className="text-2xl font-bold">Walmart Digital</h3>
              </div>
              <p className="text-gray-300 mb-6 leading-relaxed max-w-md">
                Revolutionizing retail through innovative technology. We're building the future of shopping, 
                one digital solution at a time.
              </p>
              
              {/* Contact Info */}
              <div className="space-y-3">
                <div className="flex items-center text-gray-300">
                  <Phone className="w-5 h-5 mr-3 text-walmart-yellow" />
                  <span>1-800-WALMART</span>
                </div>
                <div className="flex items-center text-gray-300">
                  <Mail className="w-5 h-5 mr-3 text-walmart-yellow" />
                  <span>support@walmartdigital.com</span>
                </div>
                <div className="flex items-center text-gray-300">
                  <MapPin className="w-5 h-5 mr-3 text-walmart-yellow" />
                  <span>Bentonville, Arkansas</span>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-lg font-bold mb-6">Solutions</h4>
              <ul className="space-y-3">
                {['For Customers', 'For Managers', 'For Staff', 'For Suppliers', 'Enterprise', 'API Access'].map((link, index) => (
                  <li key={index}>
                    <a href="#" className="text-gray-300 hover:text-walmart-yellow transition-colors duration-300 flex items-center group">
                      <span className="w-1 h-1 bg-walmart-yellow rounded-full mr-3 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="text-lg font-bold mb-6">Resources</h4>
              <ul className="space-y-3">
                {['Documentation', 'Help Center', 'Community', 'Blog', 'Case Studies', 'Webinars'].map((link, index) => (
                  <li key={index}>
                    <a href="#" className="text-gray-300 hover:text-walmart-yellow transition-colors duration-300 flex items-center group">
                      <span className="w-1 h-1 bg-walmart-yellow rounded-full mr-3 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Social Links & Newsletter */}
          <div className="border-t border-gray-800 mt-12 pt-12">
            <div className="flex flex-col lg:flex-row justify-between items-center">
              <div className="mb-8 lg:mb-0">
                <h4 className="text-lg font-bold mb-4">Stay Connected</h4>
                <div className="flex space-x-4">
                  {[
                    { icon: <Facebook className="w-5 h-5" />, name: 'Facebook' },
                    { icon: <Twitter className="w-5 h-5" />, name: 'Twitter' },
                    { icon: <Instagram className="w-5 h-5" />, name: 'Instagram' },
                    { icon: <Linkedin className="w-5 h-5" />, name: 'LinkedIn' }
                  ].map((social, index) => (
                    <a 
                      key={index}
                      href="#" 
                      className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center text-gray-300 hover:bg-walmart-blue hover:text-white transition-all duration-300 transform hover:scale-110"
                      title={social.name}
                    >
                      {social.icon}
                    </a>
                  ))}
                </div>
              </div>

              {/* Newsletter */}
              <div className="max-w-md">
                <h4 className="text-lg font-bold mb-4">Subscribe to Updates</h4>
                <div className="flex">
                  <input 
                    type="email" 
                    placeholder="Enter your email" 
                    className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-l-full text-white placeholder-gray-400 focus:outline-none focus:border-walmart-blue"
                  />
                  <button className="bg-walmart-blue hover:bg-walmart-lightblue px-6 py-3 rounded-r-full text-white font-semibold transition-colors duration-300">
                    Subscribe
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm mb-4 md:mb-0">
              © 2024 Walmart Digital Revolution. All rights reserved.
            </p>
            <div className="flex flex-wrap gap-6 text-sm">
              {['Privacy Policy', 'Terms of Service', 'Cookie Policy', 'Accessibility'].map((link, index) => (
                <a key={index} href="#" className="text-gray-400 hover:text-walmart-yellow transition-colors duration-300">
                  {link}
                </a>
              ))}
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
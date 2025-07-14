import React from 'react';
import { Sparkles, ShoppingCart, Users, ArrowRight, TrendingUp, Shield } from 'lucide-react';

const WelcomeSection = () => {
  
  const features = [
    {
      icon: <Sparkles className="w-6 h-6" />,
      title: "Smart Shopping Experience",
      description: "QR code entry, barcode scanning, and contactless checkout for a seamless shopping journey"
    },
    {
      icon: <TrendingUp className="w-6 h-6" />,
      title: "Real-time Analytics",
      description: "Live inventory tracking, sales insights, and performance metrics at your fingertips"
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "Connected Ecosystem",
      description: "Seamless integration connecting customers, staff, managers, and suppliers"
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Enterprise Security",
      description: "Bank-level security with advanced encryption and compliance standards"
    }
  ];

  const stats = [
    { number: "10M+", label: "Happy Customers" },
    { number: "500+", label: "Store Locations" },
    { number: "99.9%", label: "Uptime Guarantee" }
  ];

  return (
    <div className="relative bg-white min-h-screen">
      {/* Walmart-style header */}
      <div className="bg-walmart-blue text-white py-4">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <img 
                src="/walmart-logo.png" 
                alt="Walmart" 
                className="h-8 object-contain"
              />
              <div className="hidden md:flex space-x-6 text-sm">
                <a href="#" className="hover:text-walmart-yellow transition-colors">Departments</a>
                <a href="#" className="hover:text-walmart-yellow transition-colors">Services</a>
                <a href="#" className="hover:text-walmart-yellow transition-colors">Account</a>
                <a href="#" className="hover:text-walmart-yellow transition-colors">Cart</a>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button className="bg-walmart-yellow text-walmart-blue px-4 py-2 rounded font-semibold text-sm hover:bg-yellow-300 transition-colors">
                Sign In
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          {/* Main Branding */}
          <div className="mb-10">
            <div className="flex items-center justify-center mb-6">
              <div className="w-40 h-24 bg-white rounded-lg flex items-center justify-center shadow-md p-3">
                <img 
                  src="/walmart-logo.png" 
                  alt="Walmart Digital" 
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
            
            <h1 className="text-3xl md:text-5xl font-bold mb-4 text-gray-900">
              Walmart Digital Platform
            </h1>
            
            <div className="inline-block bg-walmart-yellow text-walmart-blue px-6 py-2 rounded-md text-lg font-semibold mb-6">
              Retail Management Solutions
            </div>
          </div>

          {/* Main Headline */}
          <h2 className="text-2xl md:text-4xl font-bold text-gray-800 mb-6 leading-tight">
            Streamline Your Retail Operations
          </h2>
          
          <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed mb-8">
            Manage inventory, track sales, coordinate staff, and connect with suppliers 
            all in one integrated platform. Built for modern retail businesses.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <button className="bg-walmart-blue text-white px-8 py-3 rounded font-semibold text-lg hover:bg-blue-700 transition-colors duration-200 flex items-center">
              Start Managing
              <ArrowRight className="w-5 h-5 ml-2" />
            </button>
            <button className="border-2 border-walmart-blue text-walmart-blue px-8 py-3 rounded font-semibold text-lg hover:bg-walmart-blue hover:text-white transition-colors duration-200">
              View Demo
            </button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mb-16">
          <h3 className="text-2xl md:text-3xl font-bold text-center text-gray-800 mb-10">
            Platform Features
          </h3>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-lg hover:border-walmart-blue transition-all duration-200"
              >
                <div className="w-12 h-12 bg-walmart-blue rounded-lg flex items-center justify-center text-white mb-4">
                  {feature.icon}
                </div>
                
                <h4 className="text-lg font-semibold text-gray-800 mb-3">
                  {feature.title}
                </h4>
                
                <p className="text-gray-600 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Stats Section */}
        <div className="bg-walmart-blue rounded-lg p-8 mb-16">
          <h3 className="text-2xl font-bold text-center text-white mb-8">Trusted by Retailers</h3>
          
          <div className="grid md:grid-cols-3 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl font-bold text-walmart-yellow mb-2">
                  {stat.number}
                </div>
                <div className="text-white opacity-90">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Call to Action Section */}
        <div className="text-center bg-walmart-yellow rounded-lg p-8">
          <h3 className="text-2xl font-bold text-walmart-blue mb-4">
            Ready to Transform Your Business?
          </h3>
          
          <p className="text-walmart-blue mb-6 max-w-2xl mx-auto">
            Choose your role below to access the platform and begin managing your retail operations.
          </p>
        </div>
      </div>
    </div>
  );
};

export default WelcomeSection; 
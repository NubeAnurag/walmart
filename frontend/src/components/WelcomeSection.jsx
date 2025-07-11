import React, { useState, useEffect } from 'react';
import { Sparkles, ShoppingCart, Users, Truck, ArrowRight, Star, TrendingUp, Shield } from 'lucide-react';

const WelcomeSection = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  
  const features = [
    {
      icon: <Sparkles className="w-8 h-8" />,
      title: "Smart Shopping Experience",
      description: "QR code entry, barcode scanning, and contactless checkout for a seamless shopping journey",
      color: "from-blue-500 to-purple-600"
    },
    {
      icon: <TrendingUp className="w-8 h-8" />,
      title: "Real-time Analytics",
      description: "Live inventory tracking, sales insights, and performance metrics at your fingertips",
      color: "from-green-500 to-teal-600"
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "Connected Ecosystem",
      description: "Seamless integration connecting customers, staff, managers, and suppliers",
      color: "from-orange-500 to-red-600"
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Enterprise Security",
      description: "Bank-level security with advanced encryption and compliance standards",
      color: "from-indigo-500 to-blue-600"
    }
  ];

  const stats = [
    { number: "10M+", label: "Happy Customers", icon: <Users className="w-6 h-6" /> },
    { number: "500+", label: "Store Locations", icon: <ShoppingCart className="w-6 h-6" /> },
    { number: "99.9%", label: "Uptime Guarantee", icon: <TrendingUp className="w-6 h-6" /> }
  ];

  useEffect(() => {
    setIsVisible(true);
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % features.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-gray-50 via-white to-blue-50 min-h-screen">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-walmart-blue/20 to-walmart-lightblue/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-walmart-yellow/20 to-walmart-orange/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-walmart-green/10 to-walmart-lightblue/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '4s'}}></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className={`text-center mb-20 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          {/* Logo and Brand */}
          <div className="mb-8">
            <div className="flex items-center justify-center mb-6">
              <div className="relative">
                <div className="w-20 h-20 bg-gradient-to-br from-walmart-blue to-walmart-lightblue rounded-2xl flex items-center justify-center shadow-2xl transform hover:scale-110 transition-transform duration-300">
                  <ShoppingCart className="w-10 h-10 text-white" />
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-walmart-yellow rounded-full flex items-center justify-center">
                  <Sparkles className="w-3 h-3 text-walmart-blue" />
                </div>
              </div>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-4">
              <span className="bg-gradient-to-r from-walmart-blue via-walmart-lightblue to-walmart-blue bg-clip-text text-transparent">
                Walmart Digital
              </span>
            </h1>
            
            <div className="inline-block bg-gradient-to-r from-walmart-yellow to-walmart-orange text-walmart-blue px-6 py-2 rounded-full text-lg font-semibold shadow-lg mb-6">
              🚀 The Future of Retail is Here
            </div>
          </div>

          {/* Main Headline */}
          <h2 className="text-3xl md:text-5xl font-bold text-gray-800 mb-6 leading-tight">
            Welcome to the
            <span className="block bg-gradient-to-r from-walmart-blue to-walmart-lightblue bg-clip-text text-transparent">
              Digital Revolution
            </span>
          </h2>
          
          <p className="text-xl md:text-2xl text-gray-600 max-w-4xl mx-auto leading-relaxed mb-10">
            Experience seamless shopping with QR code entry, contactless payments, 
            real-time inventory, and intelligent management systems. Join millions 
            of satisfied customers, managers, staff, and suppliers.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <button className="group bg-gradient-to-r from-walmart-blue to-walmart-lightblue text-white px-8 py-4 rounded-full font-semibold text-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 flex items-center">
              Get Started Today
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </button>
            <button className="border-2 border-walmart-blue text-walmart-blue px-8 py-4 rounded-full font-semibold text-lg hover:bg-walmart-blue hover:text-white transition-all duration-300 transform hover:scale-105">
              Watch Demo
            </button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mb-20">
          <h3 className="text-3xl md:text-4xl font-bold text-center text-gray-800 mb-12">
            Powerful Features That Transform Business
          </h3>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index}
                className={`group relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:scale-105 hover:-translate-y-2 border border-gray-100 ${
                  currentSlide === index ? 'ring-2 ring-walmart-yellow shadow-2xl scale-105' : ''
                }`}
                style={{
                  animationDelay: `${index * 0.2}s`
                }}
              >
                <div className={`w-16 h-16 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  {feature.icon}
                </div>
                
                <h4 className="text-xl font-bold text-gray-800 mb-4 group-hover:text-walmart-blue transition-colors">
                  {feature.title}
                </h4>
                
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>

                {/* Hover effect overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-walmart-blue/5 to-walmart-lightblue/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
            ))}
          </div>

          {/* Feature Indicators */}
          <div className="flex justify-center mt-8 space-x-3">
            {features.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  currentSlide === index ? 'bg-walmart-blue w-8' : 'bg-gray-300 hover:bg-gray-400'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Stats Section */}
        <div className="bg-gradient-to-r from-walmart-blue to-walmart-lightblue rounded-3xl p-12 text-white mb-20">
          <h3 className="text-3xl font-bold text-center mb-12">Trusted by Millions Worldwide</h3>
          
          <div className="grid md:grid-cols-3 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center group">
                <div className="flex justify-center mb-4">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center group-hover:bg-walmart-yellow group-hover:text-walmart-blue transition-all duration-300">
                    {stat.icon}
                  </div>
                </div>
                <div className="text-4xl md:text-5xl font-bold text-walmart-yellow mb-2 group-hover:scale-110 transition-transform duration-300">
                  {stat.number}
                </div>
                <div className="text-lg opacity-90">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Call to Action Section */}
        <div className="text-center bg-white rounded-3xl p-12 shadow-2xl border border-gray-100">
          <div className="flex justify-center mb-6">
            <div className="flex space-x-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-6 h-6 text-walmart-yellow fill-current" />
              ))}
            </div>
          </div>
          
          <h3 className="text-3xl font-bold text-gray-800 mb-4">
            Ready to Transform Your Experience?
          </h3>
          
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Join the digital revolution and experience the future of retail today. 
            Choose your role below to get started.
          </p>
          
          <div className="inline-block bg-gradient-to-r from-walmart-yellow to-walmart-orange text-walmart-blue px-6 py-2 rounded-full font-semibold">
            ⭐ Rated #1 Retail Platform 2024
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeSection; 
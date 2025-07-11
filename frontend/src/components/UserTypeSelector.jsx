import React, { useState } from 'react';
import { 
  ShoppingCart, 
  Settings, 
  Users, 
  Truck, 
  ArrowRight,
  Smartphone,
  BarChart3,
  Headphones,
  Package,
  Star,
  CheckCircle,
  Zap
} from 'lucide-react';

const UserTypeSelector = ({ onSelectUserType }) => {
  const [hoveredCard, setHoveredCard] = useState(null);

  const userTypes = [
    {
      id: 'customer',
      title: 'Customer',
      subtitle: 'Shop Smart, Shop Fast',
      description: 'Experience the future of shopping with QR codes, contactless payments, and instant checkout.',
      icon: ShoppingCart,
      color: 'from-emerald-500 to-teal-600',
      hoverColor: 'hover:from-emerald-600 hover:to-teal-700',
      features: ['QR Code Shopping', 'Contactless Payment', 'Digital Receipts', 'Real-time Inventory'],
      bgGradient: 'from-emerald-50 to-teal-50',
      iconBg: 'from-emerald-500 to-teal-600',
      badge: 'Most Popular',
      badgeColor: 'bg-emerald-500',
      stats: '10M+ Users'
    },
    {
      id: 'manager',
      title: 'Manager',
      subtitle: 'Command Center Dashboard',
      description: 'Powerful analytics and AI-driven insights to optimize operations and boost performance.',
      icon: BarChart3,
      color: 'from-blue-500 to-indigo-600',
      hoverColor: 'hover:from-blue-600 hover:to-indigo-700',
      features: ['Sales Analytics', 'AI Recommendations', 'Staff Management', 'Inventory Alerts'],
      bgGradient: 'from-blue-50 to-indigo-50',
      iconBg: 'from-blue-500 to-indigo-600',
      badge: 'Enterprise',
      badgeColor: 'bg-blue-500',
      stats: '500+ Stores'
    },
    {
      id: 'staff',
      title: 'Staff',
      subtitle: 'Efficient Operations',
      description: 'Streamlined tools for enhanced productivity, customer service, and performance tracking.',
      icon: Headphones,
      color: 'from-orange-500 to-red-600',
      hoverColor: 'hover:from-orange-600 hover:to-red-700',
      features: ['Smart Scheduling', 'Customer Assistance', 'Auto Attendance', 'Performance Metrics'],
      bgGradient: 'from-orange-50 to-red-50',
      iconBg: 'from-orange-500 to-red-600',
      badge: 'Team Favorite',
      badgeColor: 'bg-orange-500',
      stats: '50K+ Staff'
    },
    {
      id: 'supplier',
      title: 'Supplier',
      subtitle: 'Performance Tracking',
      description: 'Advanced analytics for supply chain optimization and competitive business intelligence.',
      icon: Package,
      color: 'from-purple-500 to-pink-600',
      hoverColor: 'hover:from-purple-600 hover:to-pink-700',
      features: ['Performance Dashboard', 'Supply Analytics', 'Quality Ratings', 'Market Insights'],
      bgGradient: 'from-purple-50 to-pink-50',
      iconBg: 'from-purple-500 to-pink-600',
      badge: 'Professional',
      badgeColor: 'bg-purple-500',
      stats: '1K+ Partners'
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-16">
      {/* Header Section */}
      <div className="text-center mb-16">
        <div className="inline-block bg-gradient-to-r from-walmart-blue to-walmart-lightblue text-white px-6 py-2 rounded-full text-sm font-semibold mb-6">
          🎯 Choose Your Journey
        </div>
        
        <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
          Select Your <span className="bg-gradient-to-r from-walmart-blue to-walmart-lightblue bg-clip-text text-transparent">Role</span>
        </h2>
        
        <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
          Access personalized dashboards, features, and tools designed specifically for your role in the digital ecosystem
        </p>
      </div>

      {/* User Type Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
        {userTypes.map((type, index) => {
          const IconComponent = type.icon;
          const isHovered = hoveredCard === type.id;
          
          return (
            <div
              key={type.id}
              onClick={() => onSelectUserType(type.id)}
              onMouseEnter={() => setHoveredCard(type.id)}
              onMouseLeave={() => setHoveredCard(null)}
              className={`
                relative group cursor-pointer transform transition-all duration-500 
                hover:scale-105 hover:shadow-2xl hover:-translate-y-2
                bg-gradient-to-br ${type.bgGradient} 
                border-2 border-gray-100 hover:border-gray-200 rounded-2xl p-8
                ${isHovered ? 'shadow-2xl scale-105 -translate-y-2' : 'shadow-lg'}
              `}
              style={{
                animationDelay: `${index * 0.1}s`
              }}
            >
              {/* Badge */}
              <div className={`absolute -top-3 left-1/2 transform -translate-x-1/2 ${type.badgeColor} text-white px-4 py-1 rounded-full text-xs font-semibold shadow-lg`}>
                {type.badge}
              </div>

              {/* Icon with Gradient Background */}
              <div className="relative mb-6">
                <div className={`w-20 h-20 bg-gradient-to-br ${type.iconBg} rounded-2xl flex items-center justify-center mx-auto group-hover:scale-110 transition-all duration-300 shadow-lg`}>
                  <IconComponent className="w-10 h-10 text-white" />
                </div>
                
                {/* Pulse Effect */}
                <div className={`absolute inset-0 w-20 h-20 bg-gradient-to-br ${type.iconBg} rounded-2xl mx-auto opacity-0 group-hover:opacity-20 animate-ping`}></div>
              </div>

              {/* Content */}
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-800 mb-2 group-hover:text-gray-900 transition-colors">
                  {type.title}
                </h3>
                
                <p className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wide">
                  {type.subtitle}
                </p>
                
                <p className="text-gray-600 mb-6 leading-relaxed">
                  {type.description}
                </p>

                {/* Stats */}
                <div className="mb-6">
                  <div className="inline-flex items-center bg-white/70 rounded-full px-4 py-2 text-sm font-semibold text-gray-700">
                    <Star className="w-4 h-4 text-yellow-500 mr-2" />
                    {type.stats}
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-3 mb-8">
                  {type.features.map((feature, featureIndex) => (
                    <div 
                      key={featureIndex} 
                      className="flex items-center text-sm text-gray-700 bg-white/50 rounded-lg px-3 py-2"
                      style={{
                        animationDelay: `${(index * 0.1) + (featureIndex * 0.05)}s`
                      }}
                    >
                      <CheckCircle className="w-4 h-4 text-green-500 mr-3 flex-shrink-0" />
                      <span className="font-medium">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* Action Button */}
                <div className={`
                  relative overflow-hidden
                  bg-gradient-to-r ${type.color} text-white rounded-xl
                  group-hover:shadow-xl transition-all duration-300
                  ${type.hoverColor}
                `}>
                  <div className="relative z-10 flex items-center justify-center py-4 px-6 font-semibold">
                    <Zap className="w-5 h-5 mr-2" />
                    Get Started
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-300" />
                  </div>
                  
                  {/* Button Shine Effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                </div>
              </div>

              {/* Card Glow Effect */}
              <div className={`absolute inset-0 bg-gradient-to-br ${type.color} rounded-2xl opacity-0 group-hover:opacity-10 transition-opacity duration-300 -z-10`}></div>
              
              {/* Hover Border Glow */}
              <div className={`absolute inset-0 bg-gradient-to-br ${type.color} rounded-2xl opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-300 -z-20`}></div>
            </div>
          );
        })}
      </div>

      {/* Bottom Section */}
      <div className="text-center space-y-6">
        {/* Trust Indicators */}
        <div className="flex flex-wrap justify-center items-center gap-8 text-sm text-gray-500">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
            <span>Secure & Encrypted</span>
          </div>
          <div className="flex items-center">
            <Star className="w-5 h-5 text-yellow-500 mr-2" />
            <span>4.9/5 Rating</span>
          </div>
          <div className="flex items-center">
            <Users className="w-5 h-5 text-blue-500 mr-2" />
            <span>10M+ Active Users</span>
          </div>
        </div>

        {/* Call to Action */}
        <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl p-8 border border-gray-100">
          <h3 className="text-2xl font-bold text-gray-800 mb-3">
            New to Walmart Digital?
          </h3>
          <p className="text-gray-600 mb-4">
            Join millions of users experiencing the future of retail technology
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button className="bg-gradient-to-r from-walmart-blue to-walmart-lightblue text-white px-8 py-3 rounded-full font-semibold hover:shadow-lg transition-all duration-300 transform hover:scale-105">
              Create Free Account
            </button>
            <button className="text-walmart-blue font-semibold hover:text-walmart-lightblue transition-colors">
              Learn More →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserTypeSelector; 
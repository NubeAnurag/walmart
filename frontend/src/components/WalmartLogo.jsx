import React from 'react';

const WalmartLogo = ({ 
  width = "w-24", 
  height = "h-12", 
  className = "",
  showBackground = true 
}) => {
  return (
    <div className={`${width} ${height} ${showBackground ? 'bg-white rounded-lg shadow-sm' : ''} flex items-center justify-center p-2 ${className}`}>
      <img 
        src="/walmart-logo.png" 
        alt="Walmart Digital Revolution" 
        className="w-full h-full object-contain"
      />
    </div>
  );
};

export default WalmartLogo; 
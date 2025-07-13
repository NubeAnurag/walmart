import React from 'react';

const WalmartLogo = ({ 
  width = "w-24", 
  height = "h-12", 
  textSize = "20", 
  sparkSize = "2", 
  className = "",
  showBackground = true 
}) => {
  return (
    <div className={`${width} ${height} ${showBackground ? 'bg-white rounded-lg shadow-sm' : ''} flex items-center justify-center p-2 ${className}`}>
      <svg 
        viewBox="0 0 200 80" 
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Walmart Text */}
        <text 
          x="20" 
          y="35" 
          fill="#0071ce" 
          fontSize={textSize} 
          fontWeight="bold" 
          fontFamily="Arial, sans-serif"
        >
          Walmart
        </text>
        
        {/* Walmart Spark/Star Icon */}
        <g transform="translate(150, 15)">
          {/* Main star shape */}
          <path 
            d="M25 5 L30 20 L45 20 L33 30 L38 45 L25 35 L12 45 L17 30 L5 20 L20 20 Z" 
            fill="#ffc220" 
            stroke="#ffc220" 
            strokeWidth="1"
          />
          
          {/* Center and corner dots */}
          <circle cx="25" cy="25" r={sparkSize} fill="#ffc220"/>
          <circle cx="15" cy="15" r={sparkSize * 0.75} fill="#ffc220"/>
          <circle cx="35" cy="15" r={sparkSize * 0.75} fill="#ffc220"/>
          <circle cx="15" cy="35" r={sparkSize * 0.75} fill="#ffc220"/>
          <circle cx="35" cy="35" r={sparkSize * 0.75} fill="#ffc220"/>
          
          {/* Edge dots */}
          <circle cx="25" cy="8" r={sparkSize * 0.5} fill="#ffc220"/>
          <circle cx="25" cy="42" r={sparkSize * 0.5} fill="#ffc220"/>
          <circle cx="8" cy="25" r={sparkSize * 0.5} fill="#ffc220"/>
          <circle cx="42" cy="25" r={sparkSize * 0.5} fill="#ffc220"/>
        </g>
      </svg>
    </div>
  );
};

export default WalmartLogo; 
import React, { useState, useEffect } from 'react';
import { staffAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { BarChart3, TrendingUp, TrendingDown, Star, AlertCircle, Target, Award } from 'lucide-react';

const StaffPerformanceInsights = ({ onClose }) => {
  const { user, isAuthenticated } = useAuth();
  const [performanceData, setPerformanceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log('📊 StaffPerformanceInsights: Component mounted/updated');
    console.log('📊 Authentication state:', { isAuthenticated, user: user?.email });
    
    // Check authentication before fetching data
    if (!isAuthenticated) {
      console.log('❌ User not authenticated, cannot fetch performance data');
      setError('User not authenticated. Please log in again.');
      setLoading(false);
      return;
    }

    if (!user) {
      console.log('❌ User object is null, cannot fetch performance data');
      setError('User information not available. Please log in again.');
      setLoading(false);
      return;
    }

    // Check if user has staff role
    if (user.role !== 'staff') {
      console.log('❌ User is not a staff member, role:', user.role);
      setError('Access denied. Only staff members can view performance data.');
      setLoading(false);
      return;
    }

    console.log('✅ Authentication checks passed, fetching performance data...');
    fetchPerformanceData();
  }, [isAuthenticated, user]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchPerformanceData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('📊 StaffPerformanceInsights: Fetching performance data...');
      console.log('📊 User info:', { 
        id: user?.id, 
        email: user?.email, 
        role: user?.role,
        staffType: user?.staffType 
      });

      // Check if token exists in localStorage
      const token = localStorage.getItem('authToken');
      console.log('📊 Token exists:', !!token);
      if (token) {
        console.log('📊 Token preview:', token.substring(0, 20) + '...');
      }

      const response = await staffAPI.getMyPerformanceInsights();
      console.log('📊 StaffPerformanceInsights: Received response:', response);
      
      if (response.success && response.data) {
        setPerformanceData(response.data);
        console.log('✅ Performance data set successfully');
      } else {
        console.error('❌ Invalid response format:', response);
        setError('Invalid response format from server');
      }
    } catch (err) {
      console.error('❌ StaffPerformanceInsights: Error fetching performance data:', err);
      console.error('❌ Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        stack: err.stack
      });
      
      // Provide more specific error messages
      if (err.response?.status === 401) {
        setError('Authentication failed. Please log in again.');
      } else if (err.response?.status === 403) {
        setError('Access denied. You do not have permission to view this data.');
      } else if (err.response?.status === 500) {
        setError('Server error. Please try again later.');
      } else if (err.message.includes('Network Error')) {
        setError('Network error. Please check your connection and try again.');
      } else {
        setError(`Failed to load performance data: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const getStarRating = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />);
    }
    
    if (hasHalfStar) {
      stars.push(<Star key="half" className="w-5 h-5 text-yellow-400 fill-current opacity-50" />);
    }
    
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<Star key={`empty-${i}`} className="w-5 h-5 text-gray-300" />);
    }
    
    return stars;
  };

  const getLevelColor = (level) => {
    switch (level) {
      case 'Excellent': return 'text-green-600 bg-green-100';
      case 'Very Good': return 'text-blue-600 bg-blue-100';
      case 'Good': return 'text-indigo-600 bg-indigo-100';
      case 'Satisfactory': return 'text-yellow-600 bg-yellow-100';
      case 'Needs Improvement': return 'text-orange-600 bg-orange-100';
      case 'Poor': return 'text-red-600 bg-red-100';
      case 'Unsatisfactory': return 'text-red-800 bg-red-200';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getMotivationalMessage = (level) => {
    switch (level) {
      case 'Excellent': return "Outstanding work! You're setting a great example for your colleagues.";
      case 'Very Good': return "Great job! Your dedication and consistency are commendable.";
      case 'Good': return "Good work! Keep up the momentum and continue improving.";
      case 'Satisfactory': return "You're doing well. Focus on consistency to reach the next level.";
      case 'Needs Improvement': return "There's room for growth. Small improvements can make a big difference.";
      case 'Poor': return "Let's work together to improve. Every step forward counts.";
      case 'Unsatisfactory': return "Don't give up! With commitment and support, you can turn things around.";
      default: return "Keep working towards your goals!";
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-lg">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">Loading performance insights...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-lg">
        <div className="text-center py-8">
          <div className="text-red-600 mb-4">Error: {error}</div>
          <button
            onClick={fetchPerformanceData}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg p-6 shadow-lg">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center">
          <BarChart3 className="w-6 h-6 mr-2" />
          My Performance Insights
        </h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        )}
      </div>

      {performanceData && (
        <div className="space-y-6">
          {/* Overall Rating */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Overall Performance Rating</h3>
                <div className="flex items-center space-x-3">
                  <div className="flex items-center">
                    {getStarRating(performanceData.rating)}
                  </div>
                  <span className="text-2xl font-bold text-gray-800">{performanceData.rating}/5.0</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getLevelColor(performanceData.level)}`}>
                    {performanceData.level}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-2 italic">
                  {getMotivationalMessage(performanceData.level)}
                </p>
              </div>
              <div className="text-right">
                <Award className="w-16 h-16 text-blue-500 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Based on Attendance</p>
              </div>
            </div>
          </div>

          {/* Strengths */}
          {performanceData.strengths && performanceData.strengths.length > 0 && (
            <div className="bg-green-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-green-800 mb-4 flex items-center">
                <Target className="w-5 h-5 mr-2" />
                Your Strengths
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {performanceData.strengths.map((strength, index) => (
                  <div key={index} className="flex items-center bg-white rounded-lg p-3">
                    <TrendingUp className="w-5 h-5 text-green-600 mr-3" />
                    <span className="text-gray-800">{strength}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Areas for Improvement */}
          {performanceData.improvements && performanceData.improvements.length > 0 && (
            <div className="bg-orange-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-orange-800 mb-4 flex items-center">
                <AlertCircle className="w-5 h-5 mr-2" />
                Areas for Growth
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {performanceData.improvements.map((improvement, index) => (
                  <div key={index} className="flex items-center bg-white rounded-lg p-3">
                    <TrendingDown className="w-5 h-5 text-orange-600 mr-3" />
                    <span className="text-gray-800">{improvement}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {performanceData.recommendations && performanceData.recommendations.length > 0 && (
            <div className="bg-blue-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center">
                <Award className="w-5 h-5 mr-2" />
                Recommendations for You
              </h3>
              <div className="space-y-3">
                {performanceData.recommendations.map((recommendation, index) => (
                  <div key={index} className="flex items-start bg-white rounded-lg p-4">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3"></div>
                    <span className="text-gray-800">{recommendation}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Performance Rating Scale */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Performance Rating Scale</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">4.5 - 5.0</div>
                <div className="text-sm text-gray-600">Excellent</div>
                <div className="text-xs text-gray-500">98%+ attendance</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">4.0 - 4.4</div>
                <div className="text-sm text-gray-600">Very Good</div>
                <div className="text-xs text-gray-500">95-97% attendance</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-indigo-600">3.5 - 3.9</div>
                <div className="text-sm text-gray-600">Good</div>
                <div className="text-xs text-gray-500">90-94% attendance</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">3.0 - 3.4</div>
                <div className="text-sm text-gray-600">Satisfactory</div>
                <div className="text-xs text-gray-500">85-89% attendance</div>
              </div>
            </div>
          </div>

          {/* Motivational Quote */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-6">
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-800 mb-2">Remember</div>
              <div className="text-gray-600 italic">
                "Success is the sum of small efforts repeated day in and day out."
              </div>
              <div className="text-sm text-gray-500 mt-2">- Robert Collier</div>
            </div>
          </div>

          {/* Note */}
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <div className="flex">
              <AlertCircle className="w-5 h-5 text-yellow-400 mr-3 mt-0.5" />
              <div>
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> Your performance rating is automatically calculated based on your attendance patterns over the last 3 months. 
                  The rating considers both your attendance rate (70% weight) and consistency (30% weight). 
                  If you have questions about your rating, please speak with your manager.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffPerformanceInsights; 
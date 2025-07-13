import React, { useState, useEffect } from 'react';
import { managerAPI } from '../services/api';
import { Star, TrendingUp, TrendingDown, Award, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';

const PerformanceInsights = ({ staffId, staffName, onClose }) => {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (staffId) {
      fetchInsights();
    }
  }, [staffId]);

  const fetchInsights = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await managerAPI.getStaffPerformanceInsights(staffId);
      setInsights(response.data);
    } catch (err) {
      console.error('Error fetching performance insights:', err);
      setError('Failed to load performance insights');
    } finally {
      setLoading(false);
    }
  };

  const updatePerformance = async () => {
    try {
      setUpdating(true);
      await managerAPI.updateStaffPerformance(staffId);
      // Refresh insights after update
      await fetchInsights();
    } catch (err) {
      console.error('Error updating performance:', err);
      alert('Failed to update performance rating');
    } finally {
      setUpdating(false);
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

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-4xl">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Loading performance insights...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-4xl">
          <div className="text-center py-8">
            <div className="text-red-600 mb-4">Error: {error}</div>
            <button
              onClick={onClose}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            Performance Insights - {staffName}
          </h2>
          <div className="flex items-center space-x-3">
            <button
              onClick={updatePerformance}
              disabled={updating}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50 flex items-center"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${updating ? 'animate-spin' : ''}`} />
              {updating ? 'Updating...' : 'Update Rating'}
            </button>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        {insights && (
          <div className="space-y-6">
            {/* Overall Rating */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Overall Performance Rating</h3>
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center">
                      {getStarRating(insights.rating)}
                    </div>
                    <span className="text-2xl font-bold text-gray-800">{insights.rating}/5.0</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getLevelColor(insights.level)}`}>
                      {insights.level}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <Award className="w-16 h-16 text-blue-500 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Based on Attendance</p>
                </div>
              </div>
            </div>

            {/* Strengths */}
            {insights.strengths && insights.strengths.length > 0 && (
              <div className="bg-green-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-green-800 mb-4 flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Strengths
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {insights.strengths.map((strength, index) => (
                    <div key={index} className="flex items-center bg-white rounded-lg p-3">
                      <TrendingUp className="w-5 h-5 text-green-600 mr-3" />
                      <span className="text-gray-800">{strength}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Areas for Improvement */}
            {insights.improvements && insights.improvements.length > 0 && (
              <div className="bg-orange-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-orange-800 mb-4 flex items-center">
                  <AlertCircle className="w-5 h-5 mr-2" />
                  Areas for Improvement
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {insights.improvements.map((improvement, index) => (
                    <div key={index} className="flex items-center bg-white rounded-lg p-3">
                      <TrendingDown className="w-5 h-5 text-orange-600 mr-3" />
                      <span className="text-gray-800">{improvement}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {insights.recommendations && insights.recommendations.length > 0 && (
              <div className="bg-blue-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center">
                  <Award className="w-5 h-5 mr-2" />
                  Recommendations
                </h3>
                <div className="space-y-3">
                  {insights.recommendations.map((recommendation, index) => (
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

            {/* Note */}
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <div className="flex">
                <AlertCircle className="w-5 h-5 text-yellow-400 mr-3 mt-0.5" />
                <div>
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> Performance ratings are automatically calculated based on attendance patterns over the last 3 months. 
                    The rating considers both attendance rate (70% weight) and consistency (30% weight).
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PerformanceInsights; 
import React, { useState, useEffect } from 'react';
import { staffAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Calendar, Clock, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

const StaffAttendanceCalendar = ({ onClose }) => {
  const { user, isAuthenticated } = useAuth();
  const [attendanceData, setAttendanceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  useEffect(() => {
    console.log('📅 StaffAttendanceCalendar: Component mounted/updated');
    console.log('📅 Authentication state:', { isAuthenticated, user: user?.email });
    console.log('📅 Current date:', { currentMonth, currentYear });
    
    // Check authentication before fetching data
    if (!isAuthenticated) {
      console.log('❌ User not authenticated, cannot fetch attendance data');
      setError('User not authenticated. Please log in again.');
      setLoading(false);
      return;
    }

    if (!user) {
      console.log('❌ User object is null, cannot fetch attendance data');
      setError('User information not available. Please log in again.');
      setLoading(false);
      return;
    }

    // Check if user has staff role
    if (user.role !== 'staff') {
      console.log('❌ User is not a staff member, role:', user.role);
      setError('Access denied. Only staff members can view attendance data.');
      setLoading(false);
      return;
    }

    console.log('✅ Authentication checks passed, fetching attendance data...');
    fetchAttendanceData();
  }, [currentMonth, currentYear, isAuthenticated, user]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchAttendanceData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('📅 StaffAttendanceCalendar: Fetching attendance data...');
      console.log('📅 Current year:', currentYear, 'Current month:', currentMonth);
      console.log('📅 User info:', { 
        id: user?.id, 
        email: user?.email, 
        role: user?.role,
        staffType: user?.staffType 
      });

      // Check if token exists in localStorage
      const token = localStorage.getItem('authToken');
      console.log('📅 Token exists:', !!token);
      if (token) {
        console.log('📅 Token preview:', token.substring(0, 20) + '...');
      }

      const response = await staffAPI.getMyAttendance(currentYear, currentMonth);
      console.log('📅 StaffAttendanceCalendar: Received response:', response);
      
      if (response.success && response.data) {
        setAttendanceData(response.data);
        console.log('✅ Attendance data set successfully');
      } else {
        console.error('❌ Invalid response format:', response);
        setError('Invalid response format from server');
      }
    } catch (err) {
      console.error('❌ StaffAttendanceCalendar: Error fetching attendance data:', err);
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
        setError(`Failed to load attendance data: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const getDateStyle = (dayData) => {
    const baseStyle = 'w-10 h-10 flex items-center justify-center text-sm font-medium rounded-lg transition-colors';
    
    if (dayData.isBeforeHireDate) {
      return `${baseStyle} bg-gray-100 text-gray-400`;
    }
    
    if (dayData.isWeekend) {
      return `${baseStyle} bg-gray-200 text-gray-500`;
    }
    
    if (dayData.attendance) {
      switch (dayData.attendance.status) {
        case 'present':
          return `${baseStyle} bg-green-500 text-white`;
        case 'absent':
          return `${baseStyle} bg-red-500 text-white`;
        case 'halfday':
          return `${baseStyle} bg-yellow-500 text-white`;
        default:
          return `${baseStyle} bg-gray-100 text-gray-700`;
      }
    }
    
    return `${baseStyle} bg-gray-100 text-gray-700`;
  };

  const navigateMonth = (direction) => {
    if (direction === 'prev') {
      if (currentMonth === 1) {
        setCurrentMonth(12);
        setCurrentYear(currentYear - 1);
      } else {
        setCurrentMonth(currentMonth - 1);
      }
    } else {
      if (currentMonth === 12) {
        setCurrentMonth(1);
        setCurrentYear(currentYear + 1);
      } else {
        setCurrentMonth(currentMonth + 1);
      }
    }
  };

  const renderCalendar = () => {
    if (!attendanceData) return null;

    const { calendar } = attendanceData;
    const firstDay = new Date(currentYear, currentMonth - 1, 1).getDay();
    
    // Create calendar grid
    const calendarDays = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      calendarDays.push(
        <div key={`empty-${i}`} className="w-10 h-10"></div>
      );
    }
    
    // Add days of the month
    calendar.forEach((dayData, index) => {
      const dayNumber = new Date(dayData.date).getDate();
      calendarDays.push(
        <div
          key={dayData.date}
          className={getDateStyle(dayData)}
          title={dayData.attendance ? 
            `${dayData.attendance.status.charAt(0).toUpperCase() + dayData.attendance.status.slice(1)}${dayData.attendance.notes ? ` - ${dayData.attendance.notes}` : ''}` : 
            'Not marked'
          }
        >
          {dayNumber}
        </div>
      );
    });

    return calendarDays;
  };

  const getAttendanceIcon = (rate) => {
    if (rate >= 95) return <TrendingUp className="w-5 h-5 text-green-500" />;
    if (rate >= 85) return <Clock className="w-5 h-5 text-blue-500" />;
    if (rate >= 75) return <TrendingDown className="w-5 h-5 text-yellow-500" />;
    return <AlertCircle className="w-5 h-5 text-red-500" />;
  };

  const getAttendanceColor = (rate) => {
    if (rate >= 95) return 'text-green-600 bg-green-100';
    if (rate >= 85) return 'text-blue-600 bg-blue-100';
    if (rate >= 75) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-lg">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">Loading attendance data...</span>
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
            onClick={fetchAttendanceData}
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
          <Calendar className="w-6 h-6 mr-2" />
          My Attendance Calendar
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

      {/* Staff Info */}
      {attendanceData?.staff && (
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-semibold">Employee ID:</span>
              <div>{attendanceData.staff.employeeId}</div>
            </div>
            <div>
              <span className="font-semibold">Position:</span>
              <div>{attendanceData.staff.position}</div>
            </div>
            <div>
              <span className="font-semibold">Department:</span>
              <div>{attendanceData.staff.department}</div>
            </div>
            <div>
              <span className="font-semibold">Hire Date:</span>
              <div>{new Date(attendanceData.staff.hireDate).toLocaleDateString()}</div>
            </div>
          </div>
        </div>
      )}

      {/* Month Navigation */}
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={() => navigateMonth('prev')}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          ← Previous
        </button>
        <h3 className="text-xl font-semibold">
          {monthNames[currentMonth - 1]} {currentYear}
        </h3>
        <button
          onClick={() => navigateMonth('next')}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Next →
        </button>
      </div>

      {/* Summary Stats */}
      {attendanceData?.summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{attendanceData.summary.totalWorkingDays}</div>
            <div className="text-sm text-gray-600">Working Days</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{attendanceData.summary.presentDays}</div>
            <div className="text-sm text-gray-600">Present</div>
          </div>
          <div className="bg-red-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{attendanceData.summary.absentDays}</div>
            <div className="text-sm text-gray-600">Absent</div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{attendanceData.summary.halfDays}</div>
            <div className="text-sm text-gray-600">Half Days</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-gray-600">{attendanceData.summary.unmarkedDays}</div>
            <div className="text-sm text-gray-600">Unmarked</div>
          </div>
        </div>
      )}

      {/* Attendance Rate */}
      {attendanceData?.summary && (
        <div className="mb-6">
          <div className={`inline-flex items-center px-4 py-2 rounded-full ${getAttendanceColor(attendanceData.summary.attendanceRate)}`}>
            {getAttendanceIcon(attendanceData.summary.attendanceRate)}
            <span className="ml-2 font-semibold">
              Attendance Rate: {attendanceData.summary.attendanceRate}%
            </span>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex justify-center mb-6">
        <div className="flex space-x-6 text-sm">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
            <span>Present</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-red-500 rounded mr-2"></div>
            <span>Absent</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-yellow-500 rounded mr-2"></div>
            <span>Half Day</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-gray-200 rounded mr-2"></div>
            <span>Weekend</span>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-lg border">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 p-4 bg-gray-50 rounded-t-lg">
          {dayNames.map(day => (
            <div key={day} className="text-center text-sm font-semibold text-gray-700 py-2">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-1 p-4">
          {renderCalendar()}
        </div>
      </div>
    </div>
  );
};

export default StaffAttendanceCalendar; 
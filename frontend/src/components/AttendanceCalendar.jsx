import React, { useState, useEffect } from 'react';
import { managerAPI } from '../services/api';

const AttendanceCalendar = ({ staffId, onClose }) => {
  const [attendanceData, setAttendanceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [showMarkModal, setShowMarkModal] = useState(false);
  const [markingAttendance, setMarkingAttendance] = useState(false);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  useEffect(() => {
    fetchAttendanceData();
  }, [staffId, currentMonth, currentYear]);

  const fetchAttendanceData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await managerAPI.getStaffAttendance(staffId, currentYear, currentMonth);
      setAttendanceData(response.data);
    } catch (err) {
      console.error('Error fetching attendance data:', err);
      setError('Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  const handleDateClick = (dayData) => {
    if (dayData.isWeekend || dayData.isBeforeHireDate) return;
    setSelectedDate(dayData);
    setShowMarkModal(true);
  };

  const handleMarkAttendance = async (status, notes = '') => {
    try {
      setMarkingAttendance(true);
      await managerAPI.markAttendance(staffId, {
        date: selectedDate.date,
        status,
        notes
      });
      
      // Refresh attendance data
      await fetchAttendanceData();
      setShowMarkModal(false);
      setSelectedDate(null);
    } catch (err) {
      console.error('Error marking attendance:', err);
      alert('Failed to mark attendance');
    } finally {
      setMarkingAttendance(false);
    }
  };

  const getDateStyle = (dayData) => {
    const baseStyle = 'w-10 h-10 flex items-center justify-center text-sm font-medium rounded-lg cursor-pointer transition-colors';
    
    if (dayData.isBeforeHireDate) {
      return `${baseStyle} bg-gray-100 text-gray-400 cursor-not-allowed`;
    }
    
    if (dayData.isWeekend) {
      return `${baseStyle} bg-gray-200 text-gray-500 cursor-not-allowed`;
    }
    
    if (dayData.attendance) {
      switch (dayData.attendance.status) {
        case 'present':
          return `${baseStyle} bg-green-500 text-white hover:bg-green-600`;
        case 'absent':
          return `${baseStyle} bg-red-500 text-white hover:bg-red-600`;
        case 'halfday':
          return `${baseStyle} bg-yellow-500 text-white hover:bg-yellow-600`;
        default:
          return `${baseStyle} bg-gray-100 text-gray-700 hover:bg-gray-200`;
      }
    }
    
    return `${baseStyle} bg-gray-100 text-gray-700 hover:bg-gray-200`;
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
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    
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
          onClick={() => handleDateClick(dayData)}
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

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-4xl">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Loading attendance data...</span>
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
            Attendance Calendar - {attendanceData?.staff?.name}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
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
              <span>Sunday/Weekend</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-gray-100 rounded mr-2"></div>
              <span>Not Marked</span>
            </div>
          </div>
        </div>

        {/* Calendar */}
        <div className="mb-6">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map(day => (
              <div key={day} className="text-center text-sm font-semibold text-gray-600 py-2">
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {renderCalendar()}
          </div>
        </div>

        {/* Statistics */}
        {attendanceData?.statistics && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold mb-3">Monthly Statistics</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {attendanceData.statistics.present}
                </div>
                <div className="text-gray-600">Present</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {attendanceData.statistics.absent}
                </div>
                <div className="text-gray-600">Absent</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {attendanceData.statistics.halfday}
                </div>
                <div className="text-gray-600">Half Day</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">
                  {attendanceData.statistics.total}
                </div>
                <div className="text-gray-600">Total Days</div>
              </div>
            </div>
          </div>
        )}

        {/* Mark Attendance Modal */}
        {showMarkModal && selectedDate && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">
                Mark Attendance for {new Date(selectedDate.date).toLocaleDateString()}
              </h3>
              
              <div className="space-y-3">
                <button
                  onClick={() => handleMarkAttendance('present')}
                  disabled={markingAttendance}
                  className="w-full bg-green-500 text-white py-2 rounded hover:bg-green-600 disabled:opacity-50"
                >
                  Present
                </button>
                <button
                  onClick={() => handleMarkAttendance('absent')}
                  disabled={markingAttendance}
                  className="w-full bg-red-500 text-white py-2 rounded hover:bg-red-600 disabled:opacity-50"
                >
                  Absent
                </button>
                <button
                  onClick={() => handleMarkAttendance('halfday')}
                  disabled={markingAttendance}
                  className="w-full bg-yellow-500 text-white py-2 rounded hover:bg-yellow-600 disabled:opacity-50"
                >
                  Half Day
                </button>
                <button
                  onClick={() => setShowMarkModal(false)}
                  disabled={markingAttendance}
                  className="w-full bg-gray-500 text-white py-2 rounded hover:bg-gray-600 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceCalendar; 
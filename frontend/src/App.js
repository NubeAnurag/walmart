import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import AdminPage from './pages/AdminPage';
import AdminLoginPage from './pages/AdminLoginPage';
import ManagerLoginPage from './pages/ManagerLoginPage';
import StaffLoginPage from './pages/StaffLoginPage';
import SupplierLoginPage from './pages/SupplierLoginPage';
import ManagerDashboard from './components/ManagerDashboard';
import SupplierDashboard from './components/SupplierDashboard';
import StaffDashboard from './components/StaffDashboard';
import './index.css';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-walmart-blue mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    // Redirect to the user's correct dashboard instead of unauthorized page
    return <Navigate to={`/dashboard/${user.role}`} replace />;
  }

  return children;
};

// Public Route Component (redirect if already authenticated, except for home page)
const PublicRoute = ({ children, allowAuthenticated = false }) => {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-walmart-blue mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated && user && !allowAuthenticated) {
    return <Navigate to={`/dashboard/${user.role}`} replace />;
  }

  return children;
};

// Placeholder Dashboard Components
const CustomerDashboard = () => {
  const { user, logout } = useAuth();
  
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Customer Dashboard</h1>
          <button 
            onClick={logout}
            className="btn btn-secondary"
          >
            Logout
          </button>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600">Welcome, {user.firstName} {user.lastName}! 🛒</p>
          <p className="text-sm text-walmart-blue font-medium mb-2">Role: Customer</p>
          <p className="text-sm text-gray-500 mt-2">
            Phase 1 Complete: Authentication System ✅<br/>
            Coming Soon: QR Code Shopping, Barcode Scanning, Digital Cart
          </p>
        </div>
      </div>
    </div>
  );
  };
  
// StaffDashboard is now imported from components

// 404 Page
const NotFound = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center">
      <h1 className="text-4xl font-bold text-gray-800 mb-4">404</h1>
      <p className="text-gray-600 mb-6">Page not found</p>
      <a href="/" className="btn btn-primary">
        Go Home
      </a>
    </div>
  </div>
);

// Unauthorized Page
const Unauthorized = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center">
      <h1 className="text-4xl font-bold text-gray-800 mb-4">403</h1>
      <p className="text-gray-600 mb-6">Access denied</p>
      <a href="/" className="btn btn-primary">
        Go Home
      </a>
    </div>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* Public Routes */}
            <Route 
              path="/" 
              element={
                <PublicRoute allowAuthenticated={true}>
                  <HomePage />
                </PublicRoute>
              } 
            />
            <Route 
              path="/login" 
              element={
                <PublicRoute>
                  <LoginPage />
                </PublicRoute>
              } 
            />
            <Route 
              path="/login/admin" 
              element={
                <PublicRoute>
                  <AdminLoginPage />
                </PublicRoute>
              } 
            />
            <Route 
              path="/login/manager" 
              element={
                <PublicRoute>
                  <ManagerLoginPage />
                </PublicRoute>
              } 
            />
            <Route 
              path="/login/staff" 
              element={
                <PublicRoute>
                  <StaffLoginPage />
                </PublicRoute>
              } 
            />
            <Route 
              path="/login/supplier" 
              element={
                <PublicRoute>
                  <SupplierLoginPage />
                </PublicRoute>
              } 
            />

            {/* Protected Dashboard Routes */}
            <Route 
              path="/dashboard/customer" 
              element={
                <ProtectedRoute allowedRoles={['customer']}>
                  <CustomerDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/dashboard/manager" 
              element={
                <ProtectedRoute allowedRoles={['manager']}>
                  <ManagerDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/dashboard/staff" 
              element={
                <ProtectedRoute allowedRoles={['staff']}>
                  <StaffDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/dashboard/supplier" 
              element={
                <ProtectedRoute allowedRoles={['supplier']}>
                  <SupplierDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/dashboard/admin" 
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminPage />
                </ProtectedRoute>
              } 
            />

            {/* Error Routes */}
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route path="*" element={<NotFound />} />
          </Routes>

          {/* Toast Notifications */}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                style: {
                  background: '#10B981',
                },
              },
              error: {
                style: {
                  background: '#EF4444',
                },
              },
            }}
          />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App; 
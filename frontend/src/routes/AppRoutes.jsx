import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute.jsx';
import DashboardLayout from '../components/layouts/DashboardLayout.jsx';

// Pages imports
import Login from '../pages/Login.jsx';
import Dashboard from '../pages/Dashboard.jsx';
import Coupons from '../pages/Coupons.jsx';
import Meals from '../pages/Meals.jsx';
import Users from '../pages/Users.jsx';
import AuditLogs from '../pages/AuditLogs.jsx';
import CafeScanner from '../pages/CafeScanner.jsx';
import SelfCheck from '../pages/SelfCheck.jsx';
import Employees from '../pages/Employees.jsx';

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route
        path="/self-check/:employeeId?"
        element={
          <ProtectedRoute>
            <SelfCheck />
          </ProtectedRoute>
        }
      />

      {/* Protected Routes Panel Wrapper */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        {/* Child Pages */}
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="coupons" element={<Coupons />} />
        
        <Route 
          path="meals" 
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'FINANCE']}>
              <Meals />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="users" 
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'HR']}>
              <Users />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="employees" 
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'HR']}>
              <Employees />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="cafe-scanner" 
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'CAFE_STAFF']}>
              <CafeScanner />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="audit-logs" 
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AuditLogs />
            </ProtectedRoute>
          } 
        />
      </Route>

      {/* Fallback Catch */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default AppRoutes;

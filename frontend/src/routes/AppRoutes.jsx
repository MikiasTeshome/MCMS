import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute.jsx';
import DashboardLayout from '../components/layouts/DashboardLayout.jsx';

const Login = lazy(() => import('../pages/Login.jsx'));
const Dashboard = lazy(() => import('../pages/Dashboard.jsx'));
const Coupons = lazy(() => import('../pages/Coupons.jsx'));
const Meals = lazy(() => import('../pages/Meals.jsx'));
const Users = lazy(() => import('../pages/Users.jsx'));
const AuditLogs = lazy(() => import('../pages/AuditLogs.jsx'));
const CafeScanner = lazy(() => import('../pages/CafeScanner.jsx'));
const SelfCheck = lazy(() => import('../pages/SelfCheck.jsx'));
const Employees = lazy(() => import('../pages/Employees.jsx'));
const Reports = lazy(() => import('../pages/Reports.jsx'));

const AppRoutes = () => {
  return (
    <Suspense fallback={<div className="page-shell"><div className="surface-card">Loading...</div></div>}>
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
        
        <Route 
          path="reports" 
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'HR', 'FINANCE', 'CAFE_STAFF']}>
              <Reports />
            </ProtectedRoute>
          } 
        />
      </Route>

      {/* Fallback Catch */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
    </Suspense>
  );
};

export default AppRoutes;

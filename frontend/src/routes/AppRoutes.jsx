import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute.jsx';
import DashboardLayout from '../components/layouts/DashboardLayout.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { homePathForRole } from '../utils/roleHome.js';

const Login = lazy(() => import('../pages/Login.jsx'));
const Dashboard = lazy(() => import('../pages/Dashboard.jsx'));
const Users = lazy(() => import('../pages/Users.jsx'));
const AuditLogs = lazy(() => import('../pages/AuditLogs.jsx'));
const CafeScanner = lazy(() => import('../pages/CafeScanner.jsx'));
const Employees = lazy(() => import('../pages/Employees.jsx'));
const Cafes = lazy(() => import('../pages/Cafes.jsx'));
const OffDays = lazy(() => import('../pages/OffDays.jsx'));
const Reports = lazy(() => import('../pages/Reports.jsx'));

const HomeRedirect = () => {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Navigate to={homePathForRole(user?.role)} replace />;
};

const AppRoutes = () => {
  return (
    <Suspense fallback={<div className="page-shell"><div className="surface-card">Loading...</div></div>}>
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<HomeRedirect />} />
        <Route path="dashboard" element={<DashboardGate />} />

        <Route
          path="users"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <Users />
            </ProtectedRoute>
          }
        />

        <Route
          path="employees"
          element={
            <ProtectedRoute allowedRoles={['HR']}>
              <Employees />
            </ProtectedRoute>
          }
        />

        <Route
          path="cafes"
          element={
            <ProtectedRoute allowedRoles={['HR']}>
              <Cafes />
            </ProtectedRoute>
          }
        />

        <Route
          path="off-days"
          element={
            <ProtectedRoute allowedRoles={['HR']}>
              <OffDays />
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

      <Route path="*" element={<HomeRedirect />} />
    </Routes>
    </Suspense>
  );
};

const DashboardGate = () => {
  const { user } = useAuth();
  if (user?.role === 'CAFE_STAFF') {
    return <Navigate to="/cafe-scanner" replace />;
  }
  return <Dashboard />;
};

export default AppRoutes;

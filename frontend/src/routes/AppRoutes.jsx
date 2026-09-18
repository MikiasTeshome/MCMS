import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute.jsx';
import DashboardLayout from '../components/layouts/DashboardLayout.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { homePathForRole } from '../utils/roleHome.js';

const RoleRoute = ({ children, allowedRoles = [] }) => {
  const { user } = useAuth();
  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    return <Navigate to={homePathForRole(user?.role)} replace />;
  }
  return children;
};

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
  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-app-bg">
        <div className="spinner h-9 w-9" />
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Navigate to={homePathForRole(user?.role)} replace />;
};

const loginFallback = (
  <div className="h-screen w-screen flex items-center justify-center bg-app-bg text-app-secondary">
    <div className="spinner h-9 w-9" />
  </div>
);

const AppRoutes = () => {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <Suspense fallback={loginFallback}>
            <Login />
          </Suspense>
        }
      />

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
        <Route path="users" element={<RoleRoute allowedRoles={['ADMIN']}><Users /></RoleRoute>} />
        <Route path="employees" element={<RoleRoute allowedRoles={['HR']}><Employees /></RoleRoute>} />
        <Route path="cafes" element={<RoleRoute allowedRoles={['HR']}><Cafes /></RoleRoute>} />
        <Route path="off-days" element={<RoleRoute allowedRoles={['HR']}><OffDays /></RoleRoute>} />
        <Route
          path="cafe-scanner"
          element={<RoleRoute allowedRoles={['ADMIN', 'CAFE_STAFF']}><CafeScanner /></RoleRoute>}
        />
        <Route path="audit-logs" element={<RoleRoute allowedRoles={['ADMIN']}><AuditLogs /></RoleRoute>} />
        <Route
          path="reports"
          element={
            <RoleRoute allowedRoles={['ADMIN', 'HR', 'FINANCE', 'CAFE_STAFF']}>
              <Reports />
            </RoleRoute>
          }
        />
      </Route>

      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  );
};

const DashboardGate = () => {
  const { user } = useAuth();
  if (user?.role === 'CAFE_STAFF') {
    return <Navigate to="/cafe-scanner" replace />;
  }
  if (user?.role === 'FINANCE') {
    return <Navigate to="/reports" replace />;
  }
  return <Dashboard />;
};

export default AppRoutes;

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useTranslation } from 'react-i18next';

/**
 * Guards routes from unauthenticated sessions and screens by role privileges
 */
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { isAuthenticated, user, loading } = useAuth();
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-dark-950 text-brand-500">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  // Redirect to login if user session is inactive
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Restrict access if active role is not in allowed list
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-dark-950 text-slate-200">
        <h1 className="text-3xl font-bold text-red-500 mb-2">{t('common.unauthorized')}</h1>
        <p className="text-slate-400 mb-6">{t('common.insufficientClearance')}</p>
        <Navigate to="/dashboard" replace />
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;

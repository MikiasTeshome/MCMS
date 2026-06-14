import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useTranslation } from 'react-i18next';
import { ShieldAlert } from 'lucide-react';
import { PageLoader } from '../components/ui/Page.jsx';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { isAuthenticated, user, loading } = useAuth();
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-app-bg">
        <PageLoader />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-app-bg text-app-primary px-4">
        <div className="surface-card p-8 max-w-md text-center animate-fade-in">
          <ShieldAlert className="w-12 h-12 text-status-error mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-status-error mb-2">{t('common.unauthorized')}</h1>
          <p className="text-app-secondary text-sm mb-4">{t('common.insufficientClearance')}</p>
          <Navigate to="/dashboard" replace />
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;

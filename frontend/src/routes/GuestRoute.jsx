import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { homePathForRole } from '../utils/roleHome.js';
import { PageLoader } from '../components/ui/Page.jsx';

/** Sends already-signed-in users away from /login so Back cannot sit on the login form. */
const GuestRoute = ({ children }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-app-bg">
        <PageLoader />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={homePathForRole(user?.role)} replace />;
  }

  return children;
};

export default GuestRoute;

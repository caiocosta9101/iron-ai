import { useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';

export const PublicRoute = () => {
  const [isAuthenticated] = useState(() => {
    const token = localStorage.getItem('token');
    const expiry = localStorage.getItem('token_expiry');
    return token && expiry && Date.now() < Number(expiry);
  });

  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Outlet />;
};
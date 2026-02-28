import { Navigate, Outlet } from 'react-router-dom';

export const PublicRoute = () => {
  const token = localStorage.getItem('token');
  const expiry = localStorage.getItem('token_expiry');

  const isAuthenticated = token && expiry && Date.now() < Number(expiry);

  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Outlet />;
};
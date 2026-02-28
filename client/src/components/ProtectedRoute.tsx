import { Navigate, Outlet } from 'react-router-dom';

export const ProtectedRoute = () => {
  const token = localStorage.getItem('token');
  const expiry = localStorage.getItem('token_expiry');

  const isAuthenticated = token && expiry && Date.now() < Number(expiry);

  if (!isAuthenticated) {
    // Limpa dados inválidos/expirados
    localStorage.removeItem('token');
    localStorage.removeItem('token_expiry');
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};
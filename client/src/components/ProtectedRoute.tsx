import { useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';

export const ProtectedRoute = () => {
  const [isAuthenticated] = useState(() => {
    const token = localStorage.getItem('token');
    const expiry = localStorage.getItem('token_expiry');
    return token && expiry && Date.now() < Number(expiry);
  });

  if (!isAuthenticated) {
    // Limpa dados inválidos/expirados
    localStorage.removeItem('token');
    localStorage.removeItem('token_expiry');
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};
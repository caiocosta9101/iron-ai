// client/src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner'; // ou o toast que você estiver usando
import Login from './pages/Login';
import Register from './pages/Register';
import { Dashboard } from './pages/Dashboard'; // Importação da Dashboard

function App() {
  return (
    <BrowserRouter>
      <Toaster richColors position="top-right" />
      <Routes>
        {/* Rota raiz redireciona para login ou dashboard dependendo da auth (futuramente) */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* AQUI ESTÁ A MÁGICA PARA A TELA PRETA SUMIR */}
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
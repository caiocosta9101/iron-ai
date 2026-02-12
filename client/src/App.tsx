import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner'; // Importar o Toaster
import Login from './pages/Login';
import Register from './pages/Register';

function App() {
  return (
    <BrowserRouter>
      {/* Configuração global dos Toasts (Notificações) */}
      <Toaster position="top-right" richColors theme="dark" />
      
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
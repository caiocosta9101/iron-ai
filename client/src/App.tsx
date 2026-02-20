import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';

// Importações das Páginas
import Login from './pages/Login';
import Register from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import NewWorkout from './pages/NewWorkout';
import AiSetup from './pages/AiSetup'; 
import MyWorkouts from './pages/MyWorkouts';
import WorkoutDetails from './pages/WorkoutDetails'; // <--- IMPORTAÇÃO DA NOVA TELA
import { AppLayout } from './layouts/AppLayout';

function App() {
  return (
    <BrowserRouter>
      <Toaster richColors position="top-right" />
      <Routes>
        {/* Rotas Públicas */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* ROTAS PRIVADAS (Com Sidebar/Layout) */}
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          
          <Route path="/meus-treinos" element={<MyWorkouts />} />
          
          {/* <--- ROTA ADICIONADA: O ":id" é dinâmico e vai pegar o UUID do banco ---> */}
          <Route path="/treino/:id" element={<WorkoutDetails />} />
          
          {/* Página de Escolha (Manual vs IA) */}
          <Route path="/novo-treino" element={<NewWorkout />} />
          
          {/* Página do Wizard da IA (Formulário Passo-a-Passo) */}
          <Route path="/novo-treino/ia" element={<AiSetup />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App;
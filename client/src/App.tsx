// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';

// Importações das Páginas
import Login from './pages/Login';
import Register from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import NewWorkout from './pages/NewWorkout';
import AiSetup from './pages/AiSetup'; 
import MyWorkouts from './pages/MyWorkouts';
import WorkoutDetails from './pages/WorkoutDetails';
import ActiveWorkout from './pages/ActiveWorkout';
import RedirectToActive from './pages/RedirectToActive'; // <--- IMPORT NOVO
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
          
          {/* Listagem de Treinos */}
          <Route path="/my-workouts" element={<MyWorkouts />} />
          
          {/* Visualização de Detalhes do Treino */}
          <Route path="/workout/:id" element={<WorkoutDetails />} />

          {/* Tela de Execução (Modo Ativo / Checklist) */}
          <Route path="/workout/active/:id" element={<ActiveWorkout />} />
          
          {/* <--- NOVA ROTA MÁGICA ---> */}
          {/* Ao acessar /active, o sistema calcula qual é o treino de hoje e redireciona */}
          <Route path="/active" element={<RedirectToActive />} />
          
          {/* Página de Escolha (Manual vs IA) */}
          <Route path="/new-workout" element={<NewWorkout />} />
          
          {/* Página do Wizard da IA */}
          <Route path="/new-workout/ai" element={<AiSetup />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App;
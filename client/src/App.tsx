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
import RedirectToActive from './pages/RedirectToActive';
import { AppLayout } from './layouts/AppLayout';
import History from './pages/History';
import { Progress } from './pages/Progress';
// Guards de Rota
import { ProtectedRoute } from './components/ProtectedRoute';
import { PublicRoute } from './components/PublicRoute';

function App() {
  return (
    <BrowserRouter>
      <Toaster richColors position="top-right" />
      <Routes>
        {/* Rota raiz */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Rotas Públicas */}
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>

        {/* Rotas Privadas */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/my-workouts" element={<MyWorkouts />} />
            <Route path="/workout/:id" element={<WorkoutDetails />} />
            <Route path="/workout/active/:id" element={<ActiveWorkout />} />
            <Route path="/active" element={<RedirectToActive />} />
            <Route path="/new-workout" element={<NewWorkout />} />
            <Route path="/new-workout/ai" element={<AiSetup />} />
            <Route path="/history" element={<History />} /> 
            <Route path="/progress" element={<Progress />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App;
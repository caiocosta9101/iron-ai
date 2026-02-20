import { Router } from 'express';
import { login, register } from './controllers/authController';
import { getDashboardData } from './controllers/dashboardController';

// === IMPORTAÇÕES NOVAS ===
import { generateWorkout } from './controllers/AiController';
// Adicionamos o 'getUserWorkouts' e o novo 'getWorkoutById' aqui na importação
import { createWorkout, getUserWorkouts, getWorkoutById } from './controllers/workoutController';

const router = Router();

// === ROTAS DE AUTH ===
router.post('/auth/register', register);
router.post('/auth/login', login);

// === ROTAS DE DASHBOARD ===
// Dica: Futuramente, adicione o middleware 'authenticate' aqui para proteger
router.get('/dashboard', getDashboardData);

// === ROTAS DE TREINO & IA ===

// 1. IA: Gera a sugestão (mas não salva no banco ainda)
router.post('/workouts/generate', generateWorkout); 

// 2. BANCO: Salva o treino aprovado pelo usuário
router.post('/workouts', createWorkout);

// 3. BANCO: Lista os treinos para a tela "Meus Treinos" (ESSENCIAL)
router.get('/workouts', getUserWorkouts);

// 4. BANCO: Lista os detalhes de UM treino específico (A ROTA NOVA AQUI!)
router.get('/workouts/:id', getWorkoutById);

export default router;
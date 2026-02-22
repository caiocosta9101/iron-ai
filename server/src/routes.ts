// routes.ts
import { Router } from 'express';
import { login, register } from './controllers/authController';
import { getDashboardData } from './controllers/dashboardController';
import { getExercises } from './controllers/exerciseController';

// === IMPORTAÇÕES DE TREINO ===
import { generateWorkout } from './controllers/AiController';
import { 
  createWorkout, 
  getUserWorkouts, 
  getWorkoutById,
  updateWorkout,
  deleteWorkout,
  updateExercise,
  removeExercise
} from './controllers/workoutController';

//IMPORTAÇÃO DO SEU NOVO SEGURANÇA 
import { authMiddleware } from './middlewares/authMiddleware';

const router = Router(); 

// ==========================================
// 🟢 ÁREA PÚBLICA (Qualquer um pode acessar)
// ==========================================

// === ROTAS DE AUTH ===
router.post('/auth/register', register);
router.post('/auth/login', login); 

// ÁREA RESTRITA (Exige Token JWT Válido)

// Esse comando aplica o middleware em TODAS as rotas que estiverem abaixo dele.
// Se não tiver token ou estiver expirado, a requisição morre aqui e nem chega nos controllers.
router.use(authMiddleware); 

// === ROTAS DE DASHBOARD ===
router.get('/dashboard', getDashboardData);

// === ROTAS DE EXERCÍCIOS (MODO MANUAL) ===
router.get('/exercises', getExercises);

// === ROTAS DE TREINO & IA ===
router.post('/workouts/generate', generateWorkout);
router.post('/workouts', createWorkout); 
router.get('/workouts', getUserWorkouts);
router.get('/workouts/:id', getWorkoutById);

// === NOVAS ROTAS DE EDIÇÃO/EXCLUSÃO (AUTONOMIA DO USUÁRIO) ===
router.put('/workouts/:id', updateWorkout);
router.delete('/workouts/:id', deleteWorkout); 
router.put('/workouts/exercises/:id', updateExercise);
router.delete('/workouts/exercises/:id', removeExercise); 

export default router;
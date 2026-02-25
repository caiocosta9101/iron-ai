// server/src/routes.ts
import { saveWorkoutSession } from './controllers/historyController';
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
  removeExercise,
  getWorkoutDayDetails // <--- NOVO IMPORT AQUI
} from './controllers/workoutController';

// IMPORTAÇÃO DO SEU NOVO SEGURANÇA 
import { authMiddleware } from './middlewares/authMiddleware';

const router = Router(); 

// ==========================================
// 🟢 ÁREA PÚBLICA (Qualquer um pode acessar)
// ==========================================

// === ROTAS DE AUTH ===
router.post('/auth/register', register);
router.post('/auth/login', login); 

// ==========================================
// 🔴 ÁREA RESTRITA (Exige Token JWT Válido)
// ==========================================

// Esse comando aplica o middleware em TODAS as rotas que estiverem abaixo dele.
// Se não tiver token ou estiver expirado, a requisição morre aqui e nem chega nos controllers.
router.use(authMiddleware); 

// === ROTAS DE DASHBOARD ===
router.get('/dashboard', getDashboardData);

// === ROTAS DE EXERCÍCIOS (MODO MANUAL) ===
router.get('/exercises', getExercises);

// === ROTAS DE TREINO & IA ===
router.post('/workouts/generate', generateWorkout); // Gera JSON via Gemini
router.post('/workouts', createWorkout);            // Salva o treino no banco
router.get('/workouts', getUserWorkouts);           // Lista resumo dos treinos
router.get('/workouts/:id', getWorkoutById);        // Detalhes de um treino completo (todos os dias)

// === NOVA ROTA: MODO ACTIVE (Execução do Treino) ===
// Busca apenas os exercícios de um dia específico (ex: Treino A)
router.get('/workouts/day/:id', getWorkoutDayDetails); 

// === ROTAS DE EDIÇÃO/EXCLUSÃO (AUTONOMIA DO USUÁRIO) ===
router.put('/workouts/:id', updateWorkout);              // Edita nome/descrição do treino
router.delete('/workouts/:id', deleteWorkout);           // Apaga treino inteiro
router.put('/workouts/exercises/:id', updateExercise);   // Edita metas de um exercício
router.delete('/workouts/exercises/:id', removeExercise);// Remove exercício de um dia

// === ROTA DE HISTÓRICO (Salvar Treino Realizado) ===
router.post('/history', saveWorkoutSession);
export default router;
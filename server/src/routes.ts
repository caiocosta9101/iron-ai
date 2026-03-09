//
import { getGeneralStats, getExerciseProgression, getUserExercisesByWorkout, getWeeklyMuscleStats } from './controllers/ProgressController';
import { 
  saveWorkoutSession, 
  getWorkoutDates, 
  getWorkoutDetailsByDate 
} from './controllers/historyController';
import { Router } from 'express';
import { login, register } from './controllers/authController';
import { getDashboardData } from './controllers/dashboardController';
import { getExercises } from './controllers/exerciseController';

// === IMPORTAÇÕES DE TREINO ===
import { generateWorkout, generatePeriodicReports, getUserReports } from './controllers/AiController';
import { 
  createWorkout, 
  getUserWorkouts, 
  getWorkoutById,
  updateWorkout,
  deleteWorkout,
  updateExercise,
  removeExercise,
  getWorkoutDayDetails,
  addDayToWorkout,     
  addExerciseToDay,
  deleteWorkoutDay  
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

//ROTA DO VERCEL CRON (Execução Automática) 
// Ela fica na área "pública" do Express, mas é protegida internamente por um Secret Key
router.get('/cron/generate-reports', generatePeriodicReports); // Vercel usa método GET para Crons


// ==========================================
// 🔴 ÁREA RESTRITA (Exige Token JWT Válido)
// ==========================================

// Esse comando aplica o middleware em TODAS as rotas que estiverem abaixo dele.
// Se não tiver token ou estiver expirado, a requisição morre aqui e nem chega nos controllers.
router.use(authMiddleware); 

// === ROTAS DE RELATÓRIOS IA ===
router.get('/reports', getUserReports);

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
// Busca apenas os exercícios de um dia específico (ex: Treino A)==
router.get('/workouts/day/:id', getWorkoutDayDetails); 

// === ROTAS DE EDIÇÃO/EXCLUSÃO (AUTONOMIA DO USUÁRIO) ===
router.put('/workouts/:id', updateWorkout);              // Edita nome/descrição do treino
router.delete('/workouts/:id', deleteWorkout);           // Apaga treino inteiro
router.put('/workouts/exercises/:id', updateExercise);   // Edita metas de um exercício
router.delete('/workouts/exercises/:id', removeExercise);// Remove exercício de um dia
router.post('/workouts/:id/days', addDayToWorkout);
router.delete('/workouts/days/:id', deleteWorkoutDay);     
router.post('/workouts/days/:id/exercises', addExerciseToDay); 

//ROTA DE HISTÓRICO (Salvar Treino Realizado) 
router.post('/history', saveWorkoutSession);

//NOVAS ROTAS: CALENDÁRIO DE HISTÓRICO 
router.get('/history/dates', getWorkoutDates); 
router.get('/history/details/:date', getWorkoutDetailsByDate);

//NOVAS ROTAS: PROGRESSO 
router.get('/progress/stats', getGeneralStats);
router.get('/progress/exercise/:exerciseId', getExerciseProgression);
router.get('/progress/exercises-by-workout', getUserExercisesByWorkout);
router.get('/progress/muscle-stats', getWeeklyMuscleStats);


export default router;


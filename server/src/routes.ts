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

const router = Router(); // Declarado logo no início para ser usado abaixo

// === ROTAS DE AUTH ===
router.post('/auth/register', register); 
router.post('/auth/login', login); 

// === ROTAS DE DASHBOARD ===
router.get('/dashboard', getDashboardData); 

// === ROTAS DE EXERCÍCIOS (MODO MANUAL) ===
// Rota que alimenta a busca da biblioteca central
router.get('/exercises', getExercises);

// === ROTAS DE TREINO & IA ===

// 1. IA: Gera a sugestão via Gemini
router.post('/workouts/generate', generateWorkout); 

// 2. BANCO: Salva o treino (Manual ou IA)
router.post('/workouts', createWorkout);

// 3. BANCO: Lista os resumos para "Meus Treinos"
router.get('/workouts', getUserWorkouts);

// 4. BANCO: Detalhes completos via UUID
router.get('/workouts/:id', getWorkoutById);


// === NOVAS ROTAS DE EDIÇÃO/EXCLUSÃO (AUTONOMIA DO USUÁRIO) ===

// 5. BANCO: Atualizar informações do treino (nome, descrição, objetivo)
router.put('/workouts/:id', updateWorkout);

// 6. BANCO: Deletar treino inteiro e tudo associado a ele (Cascata)
router.delete('/workouts/:id', deleteWorkout);

// 7. BANCO: Atualizar as metas de um exercício específico (séries, reps, descanso)
router.put('/workouts/exercises/:id', updateExercise);

// 8. BANCO: Remover um exercício específico da lista de um dia
router.delete('/workouts/exercises/:id', removeExercise);

export default router;
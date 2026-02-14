// server/src/routes.ts
import { Router } from 'express';
import { login, register } from './controllers/authController';
import { getDashboardData } from './controllers/dashboardController'; // <--- Nova importação

const router = Router();

// Rotas de Auth
router.post('/auth/register', register);
router.post('/auth/login', login);

// Rotas de Dashboard
router.get('/dashboard', getDashboardData); // <--- Nova rota

export default router;
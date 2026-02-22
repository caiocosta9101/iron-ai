// server/src/server.ts

// 1. CARREGAMENTO DAS VARIÁVEIS DE AMBIENTE (Deve ser a primeira coisa)
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet'; // <-- Adicionado para segurança de cabeçalhos HTTP
import rateLimit from 'express-rate-limit'; // <-- Adicionado para proteção contra força bruta na autenticação

import { pool } from './db'; 
import routes from './routes'; 

const app = express();

// 2. AJUSTE DA PORTA: Definida como 3333 para alinhar com o Frontend (Dossiê Técnico)
const PORT = process.env.PORT || 3333; 

// --- PROTEÇÃO COM HELMET (Deve vir antes das outras configurações) ---
app.use(helmet());
// ---------------------------------------------------------------------

// --- CONFIGURAÇÃO DO CORS ---
app.use(cors({
  origin: [
    'http://localhost:5173',               // Localhost (Vite)
    'https://iron-ai-web.vercel.app',      // Site Oficial na Vercel
    process.env.FRONTEND_URL               // Variável de ambiente (opcional)
  ].filter(Boolean) as string[],
  
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'], 
  credentials: true
}));
// ----------------------------

app.use(express.json());

// --- LIMITADOR DE REQUISIÇÕES (Rate Limiting para Login) ---
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // Limita a 5 tentativas por IP
  message: { error: 'Muitas tentativas de acesso. Por favor, tente novamente em 15 minutos.' },
  standardHeaders: true, // Retorna os headers de rate limit no padrão `RateLimit-*`
  legacyHeaders: false, // Desabilita os headers antigos `X-RateLimit-*`
});

// Aplica a proteção de força bruta apenas na rota de login ANTES de carregar o routes.ts
app.use('/auth/login', loginLimiter);
// -----------------------------------------------------------

// 3. USO DAS ROTAS (Definidas em routes.ts)
app.use(routes); 

// Rota de teste (Health Check)
app.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ 
      status: 'Online', 
      env: process.env.NODE_ENV || 'development',
      message: 'Iron AI API rodando com sucesso! 🚀', 
      db_time: result.rows[0] 
    });
  } catch (error) {
    console.error("Erro no Health Check:", error);
    res.status(500).json({ error: 'Erro ao conectar no banco' });
  }
});

// 4. LÓGICA DE EXECUÇÃO (Local vs Vercel)
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🔥 Servidor Iron AI rodando localmente na porta ${PORT}`);
  });
}

// Exportação necessária para a Vercel
export default app;
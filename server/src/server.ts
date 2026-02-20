// server/src/server.ts

// 1. CARREGAMENTO DAS VARIÁVEIS DE AMBIENTE (Deve ser a primeira coisa)
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { pool } from './db'; // [cite: 31]
import routes from './routes'; // [cite: 30, 31]

const app = express();

// 2. AJUSTE DA PORTA: Definida como 3333 para alinhar com o Frontend (Dossiê Técnico)
const PORT = process.env.PORT || 3333; // 

// --- CONFIGURAÇÃO DO CORS ---
app.use(cors({
  origin: [
    'http://localhost:5173',               // Localhost (Vite)
    'https://iron-ai-web.vercel.app',      // Site Oficial na Vercel
    process.env.FRONTEND_URL               // Variável de ambiente (opcional)
  ].filter(Boolean) as string[],
  
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'], // Essencial para evitar o erro 401 [cite: 17]
  credentials: true
}));
// ----------------------------

app.use(express.json());

// 3. USO DAS ROTAS (Definidas em routes.ts)
app.use(routes); // [cite: 31]

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
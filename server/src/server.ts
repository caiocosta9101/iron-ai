import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { pool } from './db';
import routes from './routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// --- CONFIGURAÇÃO DO CORS---
app.use(cors({
  origin: [
    'http://localhost:5173',                  // Localhost (Vite)
    'https://iron-ai-web.vercel.app',         // Site Oficial na Vercel
    process.env.FRONTEND_URL                  // Variável de ambiente (opcional, como backup)
  ].filter(Boolean) as string[],              // O filtro remove valores vazios/nulos para não dar erro
  
  methods: ['GET', 'POST', 'PUT', 'DELETE'],  // Métodos permitidos
  allowedHeaders: ['Content-Type', 'Authorization'], // Cabeçalhos essenciais
  credentials: true                           // Permite cookies/sessões se precisar
}));
// -----------------------------------------------------------

app.use(express.json());

// Usa as rotas
app.use(routes);

// Rota de teste (Health Check)
app.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ 
      status: 'Online', 
      env: process.env.NODE_ENV || 'development',
      message: 'Iron AI API rodando na Vercel! 🚀', 
      db_time: result.rows[0] 
    });
  } catch (error) {
    console.error("Erro no Health Check:", error);
    res.status(500).json({ error: 'Erro ao conectar no banco' });
  }
});

// Se estiver rodando localmente (NODE_ENV não é production), iniciamos o servidor na porta.
// Se for na Vercel, nós NÃO rodamos o listen, apenas exportamos o app.
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🔥 Servidor rodando localmente na porta ${PORT}`);
  });
}

// Exportamos o app para que a Vercel possa "assumir o controle"
export default app;
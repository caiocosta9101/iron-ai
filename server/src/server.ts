import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { pool } from './db';
import routes from './routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// --- CONFIGURAÇÃO BLINDADA DO CORS ---
// Define quem tem permissão para acessar sua API
const allowedOrigins = [
  'http://localhost:5173',            // Seu Frontend Local
  process.env.FRONTEND_URL            // URL do Frontend na Vercel (Vamos configurar isso lá)
];

app.use(cors({
  origin: (origin, callback) => {
    // Permite requisições sem origem (como Postman/Insomnia ou Apps Mobile)
    if (!origin) return callback(null, true);
    
    // Verifica se a origem está na lista permitida
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log("Bloqueado pelo CORS:", origin);
      callback(new Error('Não permitido pelo CORS'));
    }
  },
  credentials: true // Permite envio de cookies/headers de autorização
}));
// -------------------------------------

app.use(express.json());

// Usa as rotas
app.use(routes);

// Rota de teste
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
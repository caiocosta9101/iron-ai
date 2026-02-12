import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL não definida no .env');
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Mensagem ao conectar
pool.on('connect', () => {
  console.log('📦 Base de dados conectada com sucesso!');
});
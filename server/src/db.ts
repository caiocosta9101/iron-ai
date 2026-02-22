import { Pool } from 'pg';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// --- Conexão 1: Pool Nativo (pg) para Queries SQL Diretas ---
if (!process.env.DATABASE_URL) {
  console.warn('⚠️ DATABASE_URL não definida. A conexão via Pool pode falhar.');
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('connect', () => {
  // Comentado para não poluir o log, mas você pode descomentar se quiser debugar
  // console.log('📦 Base de dados conectada com sucesso (Pool)!');
});

// --- Conexão 2: Cliente Supabase (Para Auth e funções do SDK) ---
const supabaseUrl = process.env.SUPABASE_URL;

// SEGURANÇA: Exigindo a Service Role Key no lugar da Anon Key
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios no .env');
}

// Inicializa o cliente com a chave administrativa
export const supabase = createClient(supabaseUrl, supabaseServiceKey);
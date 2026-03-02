// server/src/controllers/exerciseController.ts
import { Response } from 'express';
import { supabase } from '../db'; 
import { AuthRequest } from '../middlewares/authMiddleware';

export const getExercises = async (req: AuthRequest, res: Response) => {
  try {
    // Busca todos os exercícios e faz o join com a tabela equipamentos
    const { data, error } = await supabase
      .from('exercicios')
      .select(`
        *,
        equipamentos (
          id,
          nome,
          peso_livre
        )
      `)
      .order('nome', { ascending: true });

    if (error) throw error;

    return res.json(data);
  } catch (error) {
    console.error("Erro ao buscar biblioteca de exercícios:", error);
    return res.status(500).json({ error: 'Erro ao carregar a biblioteca de exercícios.' });
  }
};
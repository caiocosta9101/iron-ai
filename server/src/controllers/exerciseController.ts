import { Request, Response } from 'express';
import { supabase } from '../db'; // [cite: 52, 69]

export const getExercises = async (req: Request, res: Response) => {
  try {
    // Busca todos os exercícios ordenados por nome para facilitar no frontend [cite: 109]
    const { data, error } = await supabase
      .from('exercicios')
      .select('*')
      .order('nome', { ascending: true });

    if (error) throw error;

    return res.json(data);
  } catch (error) {
    console.error("Erro ao buscar biblioteca de exercícios:", error);
    return res.status(500).json({ error: 'Erro ao carregar a biblioteca de exercícios.' });
  }
};
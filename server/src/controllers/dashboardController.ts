// server/src/controllers/dashboardController.ts
import { Response } from 'express';
import { supabase } from '../db';
import { AuthRequest } from '../middlewares/authMiddleware';

// Alteramos de Request para AuthRequest
export const getDashboardData = async (req: AuthRequest, res: Response) => {
  try {
    // 1. O middleware já fez o trabalho duro e nos entregou o ID validado!
    const userId = req.userId;

    // 2. Busca o nome na tabela 'users' usando o ID extraído do token
    const { data: userData, error: dbError } = await supabase
      .from('users') 
      .select('name') 
      .eq('id', userId)
      .single();

    if (dbError || !userData) {
      console.error('Erro ao buscar dados do usuário:', dbError);
      return res.json({ name: 'Campeão' }); // Fallback se não achar
    }

    // Retorna o nome real
    return res.json({
      name: userData.name || 'Campeão'
    });

  } catch (error) {
    console.error('Erro interno:', error);
    return res.status(500).json({ error: 'Erro no servidor' });
  }
};
// server/src/controllers/dashboardController.ts
import { Request, Response } from 'express';
import { supabase } from '../db';
import jwt from 'jsonwebtoken';

export const getDashboardData = async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    let userId;

    // 1. Verifica quem é o usuário logado usando o JWT customizado
    try {
      // Valida o token usando a mesma chave secreta do authController.ts
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
      userId = decoded.id; // Pega o ID que foi guardado no token
    } catch (err) {
      return res.status(401).json({ error: 'Sessão inválida ou expirada. Faça login novamente.' });
    }

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
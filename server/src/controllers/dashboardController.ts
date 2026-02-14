// server/src/controllers/dashboardController.ts
import { Request, Response } from 'express';
import { supabase } from '../db';

export const getDashboardData = async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    // 1. Verifica quem é o usuário logado
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      // Se falhar no Supabase Auth, tenta decodificar ou retorna erro
      return res.status(401).json({ error: 'Sessão inválida' });
    }

    // 2. Busca o nome na tabela 'users' (JEITO PROFISSIONAL: Usar a tabela existente)
    // Estamos buscando pelo email, pois é o vínculo seguro entre o Login e o Banco
    const { data: userData, error: dbError } = await supabase
      .from('users') 
      .select('name') 
      .eq('email', user.email)
      .single();

    if (dbError || !userData) {
      console.error('Erro ao buscar dados do usuário:', dbError);
      return res.json({ name: 'Campeão' }); // Fallback se não achar
    }

    // Retorna o nome real (Ex: "Caio")
    return res.json({
      name: userData.name || 'Campeão'
    });

  } catch (error) {
    console.error('Erro interno:', error);
    return res.status(500).json({ error: 'Erro no servidor' });
  }
};
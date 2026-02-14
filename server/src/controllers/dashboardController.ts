// server/src/controllers/dashboardController.ts
import { Request, Response } from 'express';
import { supabase } from '../db';

export const getDashboardData = async (req: Request, res: Response) => {
  try {
    // O ID do usuário vem do middleware de autenticação (req.user)
    // Se você ainda não tem middleware, vamos assumir que o ID vem no header por enquanto ou pegar do body.
    // MAS, para simplificar e funcionar com o que você já tem no /auth/me:
    
    // Vamos pegar o token do header Authorization
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    // Pega o usuário logado no Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    // Busca o perfil na tabela que criamos (profiles)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name, subscription_tier')
      .eq('id', user.id)
      .single();

    if (profileError) {
      // Se não achar perfil, retorna dados básicos
      return res.json({ 
        name: user.user_metadata.full_name || 'Atleta', 
        tier: 'free' 
      });
    }

    return res.json({
      name: profile.full_name || 'Campeão',
      tier: profile.subscription_tier
    });

  } catch (error) {
    console.error('Erro no dashboard:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};
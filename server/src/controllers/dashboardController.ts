// server/src/controllers/dashboardController.ts
import { Response } from 'express';
import { supabase } from '../db';
import { AuthRequest } from '../middlewares/authMiddleware';

export const getDashboardData = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    // --- 1. Buscas Iniciais (Paralelizadas para performance) ---
    // Buscamos o User e o Último Programa criado ao mesmo tempo
    const [userResponse, programResponse, historyResponse] = await Promise.all([
      // A: Dados do Usuário
      supabase
        .from('users')
        .select('name')
        .eq('id', userId)
        .single(),

      // B: Último Programa Criado (O ativo)
      supabase
        .from('treinos')
        .select('id, nome')
        .eq('usuario_id', userId)
        .order('criado_em', { ascending: false }) // Pega o mais recente
        .limit(1)
        .single(),
        
      // C: Última sessão FINALIZADA (Para saber onde parou)
      supabase
        .from('historico_sessoes')
        .select('dia_treino_id, data_treino')
        .eq('usuario_id', userId)
        .eq('finalizado', true)
        .order('data_treino', { ascending: false })
        .limit(1)
        .single()
    ]);

    const userName = userResponse.data?.name || 'Campeão';
    const activeProgram = programResponse.data;
    const lastSession = historyResponse.data;

    // Se o usuário não tem nenhum programa criado, retornamos apenas o nome
    // e nextSession null para o front tratar (ex: mostrar botão "Criar Treino")
    if (!activeProgram) {
      return res.json({
        name: userName,
        nextSession: null
      });
    }

    // --- 2. Buscar os dias do programa ativo (A, B, C...) ---
    const { data: workoutDays, error: daysError } = await supabase
      .from('dias_treino')
      .select('id, nome, foco, ordem_dia')
      .eq('treino_id', activeProgram.id)
      .order('ordem_dia', { ascending: true });

    if (daysError || !workoutDays || workoutDays.length === 0) {
      return res.json({ name: userName, nextSession: null });
    }

    // --- 3. A Lógica da Sequência (O "Cérebro") ---
    let nextIndex = 0; // Padrão: Começa do primeiro (Dia A)

    if (lastSession) {
      // Procuramos o índice do último treino realizado dentro da lista atual
      const lastDayIndex = workoutDays.findIndex(d => d.id === lastSession.dia_treino_id);

      // Se achamos o último treino na lista (ex: usuário fez o B), o próximo é o C
      if (lastDayIndex !== -1) {
        // Usa operador % (módulo) para criar o loop infinito (A -> B -> C -> A...)
        nextIndex = (lastDayIndex + 1) % workoutDays.length;
      }
      // Se lastDayIndex for -1 (ex: ele fez um treino de um programa antigo que não existe mais),
      // mantemos o nextIndex = 0 para reiniciar o ciclo no programa novo.
    }

    const nextWorkoutDay = workoutDays[nextIndex];

    // --- 4. Resposta Final Formatada ---
    return res.json({
      name: userName,
      nextSession: {
        id: nextWorkoutDay.id,           // ID vital para o link do botão
        programName: activeProgram.nome, // Ex: "Hipertrofia 2026"
        name: nextWorkoutDay.nome,       // Ex: "Treino A"
        focus: nextWorkoutDay.foco,      // Ex: "Peito e Tríceps"
        // Como essas colunas não existem na tabela 'dias_treino', 
        // enviamos valores padrão ou calculados para a UI não quebrar
        estimatedTime: 60,               
        intensity: "Alta"                
      }
    });

  } catch (error) {
    console.error('Erro no Dashboard Controller:', error);
    return res.status(500).json({ error: 'Erro interno ao carregar dashboard' });
  }
};
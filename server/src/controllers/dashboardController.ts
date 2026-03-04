import { Response } from 'express';
import { supabase } from '../db';
import { AuthRequest } from '../middlewares/authMiddleware';

export const getDashboardData = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    const [userResponse, programResponse] = await Promise.all([
      supabase.from('users').select('name').eq('id', userId).single(),
      supabase
        .from('treinos')
        .select('id, nome')
        .eq('usuario_id', userId)
        .order('criado_em', { ascending: false })
        .limit(1)
        .single()
    ]);

    const userName = userResponse.data?.name || 'Campeão';
    const activeProgram = programResponse.data;

    if (!activeProgram) {
      return res.json({ name: userName, suggestedSessionId: null, sessions: [], history: [] });
    }

    // Busca os dias e já faz um JOIN para trazer os exercícios daquele dia
    const { data: workoutDays, error: daysError } = await supabase
      .from('dias_treino')
      .select(`
        id, nome, foco, ordem_dia,
        exercicios_treino (
          exercicios ( nome )
        )
      `)
      .eq('treino_id', activeProgram.id)
      .order('ordem_dia', { ascending: true });

    if (daysError || !workoutDays || workoutDays.length === 0) {
      return res.json({ name: userName, suggestedSessionId: null, sessions: [], history: [] });
    }

    // Busca o histórico real do usuário
    const { data: history } = await supabase
      .from('historico_sessoes')
      .select(`
        id, dia_treino_id, data_treino, duracao_real_minutos,
        dias_treino ( nome )
      `)
      .eq('usuario_id', userId)
      .eq('finalizado', true)
      .order('data_treino', { ascending: false })
      .limit(15); // Traz as últimas 15 sessões

    // Lógica do Treino Mais Atrasado
    const ultimasExecucoes: Record<string, number> = {};
    workoutDays.forEach(day => { ultimasExecucoes[day.id] = 0; });

    history?.forEach(sessao => {
      const timestamp = new Date(sessao.data_treino).getTime();
      if (timestamp > ultimasExecucoes[sessao.dia_treino_id]) {
        ultimasExecucoes[sessao.dia_treino_id] = timestamp;
      }
    });

    let suggestedSessionId = workoutDays[0].id;
    let tempoMaisAntigo = Infinity;

    workoutDays.forEach(day => {
      const tempo = ultimasExecucoes[day.id];
      if (tempo < tempoMaisAntigo) {
        tempoMaisAntigo = tempo;
        suggestedSessionId = day.id;
      }
    });

    // Formata as sessões embutindo as sugestões de carga dinâmicas
    const formattedSessions = workoutDays.map(day => {
      // Pega o nome dos dois primeiros exercícios reais deste treino
      const exercicios = day.exercicios_treino?.map((et: any) => et.exercicios?.nome) || [];
      
      return {
        id: day.id,
        programName: activeProgram.nome,
        name: day.nome,
        focus: day.foco,
        estimatedTime: 60,
        intensity: "Alta",
        loadSuggestions: [
          { exercise: exercicios[0] || 'Exercício Principal', weight: 'Última: --', gain: 'IA Ativa' },
          { exercise: exercicios[1] || 'Exercício Secundário', weight: 'Última: --', gain: 'IA Ativa' }
        ]
      };
    });

    // Formata o histórico
    const formattedHistory = history?.map(h => {
      const dataObj = new Date(h.data_treino);
      return {
        id: h.id,
        dia_treino_id: h.dia_treino_id,
        name: (h.dias_treino as any)?.nome || 'Treino',
        date: dataObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        duration: h.duracao_real_minutos ? `${h.duracao_real_minutos} min` : '--',
        volume: 'Em cálculo', 
        statusColor: 'bg-[#13ec6a]'
      };
    }) || [];

    return res.json({
      name: userName,
      suggestedSessionId,
      sessions: formattedSessions,
      history: formattedHistory
    });

  } catch (error) {
    console.error('Erro no Dashboard Controller:', error);
    return res.status(500).json({ error: 'Erro interno' });
  }
};
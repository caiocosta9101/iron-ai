// server/src/controllers/dashboardController.ts
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

    // Busca os dias, os exercícios vinculados e OBRIGATORIAMENTE o exercicio_id para fazermos o match das cargas
    const { data: workoutDays, error: daysError } = await supabase
      .from('dias_treino')
      .select(`
        id, nome, foco, ordem_dia,
        exercicios_treino (
          exercicio_id,
          exercicios ( nome )
        )
      `)
      .eq('treino_id', activeProgram.id)
      .order('ordem_dia', { ascending: true });

    if (daysError || !workoutDays || workoutDays.length === 0) {
      return res.json({ name: userName, suggestedSessionId: null, sessions: [], history: [] });
    }

    // Busca o histórico real de sessões e as execuções vinculadas para calcular os PRs
    const { data: history } = await supabase
      .from('historico_sessoes')
      .select(`
        id, dia_treino_id, data_treino, duracao_real_minutos,
        dias_treino ( nome ),
        historico_execucao_exercicio (
          exercicio_id,
          cargas_kg
        )
      `)
      .eq('usuario_id', userId)
      .eq('finalizado', true)
      .order('data_treino', { ascending: false })
      .limit(15); 

    // --- LÓGICA DE CÁLCULO DE CARGAS MÁXIMAS (PRs) ---
    const maxLoadsMap: Record<string, number> = {};

    history?.forEach(sessao => {
      // Como cargas_kg é um array numérico no PostgreSQL, precisamos varrê-lo
      sessao.historico_execucao_exercicio?.forEach(exec => {
        const cargas = exec.cargas_kg || [];
        // Encontra a maior carga levantada nesta execução específica
        const maxInExec = cargas.length > 0 ? Math.max(...cargas) : 0;
        
        // Atualiza o dicionário global se for o maior valor já visto para este exercício
        if (!maxLoadsMap[exec.exercicio_id] || maxInExec > maxLoadsMap[exec.exercicio_id]) {
          maxLoadsMap[exec.exercicio_id] = maxInExec;
        }
      });
    });

    // --- LÓGICA DO TREINO MAIS ATRASADO ---
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

    // Formata as sessões embutindo as cargas máximas reais de TODOS os exercícios do dia
    const formattedSessions = workoutDays.map(day => {
      const maxLoads = day.exercicios_treino?.map((et: any) => {
        const exName = et.exercicios?.nome || 'Exercício';
        const pr = maxLoadsMap[et.exercicio_id];
        
        return {
          exercise: exName,
          maxWeight: pr ? `${pr} kg` : '--' // Se não houver PR registrado, mostra '--'
        };
      }) || [];
      
      return {
        id: day.id,
        programName: activeProgram.nome,
        name: day.nome,
        focus: day.foco,
        estimatedTime: 60, // Pode ser dinâmico no futuro
        intensity: "Alta",
        maxLoads: maxLoads // Substituímos loadSuggestions por maxLoads
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
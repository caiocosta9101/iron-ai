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

    // --- NOVA LÓGICA: O PRÓXIMO DA FILA (CARROSSEL) ---
    // Padrão de segurança: se não houver histórico, sugere o primeiro treino (ordem_dia mais baixo)
    let suggestedSessionId = workoutDays[0].id; 

    // Só calculamos o próximo se ele já tiver feito algum treino antes
    if (history && history.length > 0) {
      
      // 1. Pega o ID do último treino salvo. (Como a query do history tem ORDER BY data_treino DESC, o índice 0 é sempre o mais recente)
      const ultimoDiaTreinoId = history[0].dia_treino_id;

      // 2. Encontra a posição (índice) desse último treino dentro da lista de dias da ficha atual.
      // (workoutDays já vem ordenado do banco pelo ordem_dia ASC, então a fila está pronta)
      const ultimoIndex = workoutDays.findIndex(day => day.id === ultimoDiaTreinoId);

      // 3. Se achou o treino no array, pega o próximo. O operador % (módulo) garante que, se ele 
      // fizer o último treino da ficha, a conta zera e ele volta pro índice 0 (Treino A).
      if (ultimoIndex !== -1) {
        const proximoIndex = (ultimoIndex + 1) % workoutDays.length;
        suggestedSessionId = workoutDays[proximoIndex].id;
      }
    }

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
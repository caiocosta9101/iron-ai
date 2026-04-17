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

    // Busca o histórico real de sessões e "atravessa" para a tabela filha de força
    const { data: history, error: historyError } = await supabase
      .from('historico_sessoes')
      .select(`
        id, dia_treino_id, data_treino, duracao_real_minutos,
        dias_treino ( nome ),
        historico_execucao_exercicio (
          exercicio_id,
          execucao_forca_detalhes ( cargas_kg )
        )
      `)
      .eq('usuario_id', userId)
      .eq('finalizado', true)
      .order('data_treino', { ascending: false })
      .limit(15); 

    if (historyError) {
      console.error("Erro no Supabase ao buscar histórico:", historyError);
    }

    // --- LÓGICA DE CÁLCULO DE CARGAS MÁXIMAS (PRs) ---
    const maxLoadsMap: Record<string, number> = {};

    history?.forEach(sessao => {
      sessao.historico_execucao_exercicio?.forEach((exec: any) => {
        
        // Dependendo de como a Foreign Key está configurada, o Supabase pode retornar um array ou objeto
        // @ts-ignore - Ignorando erro de tipagem temporário caso o TS reclame da tabela aninhada
        const detalhes = exec.execucao_forca_detalhes;
        const cargas = Array.isArray(detalhes) ? detalhes[0]?.cargas_kg : detalhes?.cargas_kg;
        const cargasArray = cargas || [];
        
        // Encontra a maior carga levantada
        const maxInExec = cargasArray.length > 0 ? Math.max(...cargasArray) : 0;
        
        if (!maxLoadsMap[exec.exercicio_id] || maxInExec > maxLoadsMap[exec.exercicio_id]) {
          maxLoadsMap[exec.exercicio_id] = maxInExec;
        }
      });
    });

    // --- NOVA LÓGICA: O PRÓXIMO DA FILA (CARROSSEL) ---
    let suggestedSessionId = workoutDays[0].id; 

    if (history && history.length > 0) {
      
      // 1. Procura a sessão mais recente que OBRIGATORIAMENTE faça parte dos dias da ficha atual.
      const ultimaSessaoDaFicha = history.find(sessao => 
        workoutDays.some(day => String(day.id) === String(sessao.dia_treino_id))
      );

      // Se encontrou alguma sessão desta ficha específica que já foi feita...
      if (ultimaSessaoDaFicha) {
        
        // 2. Acha a posição na lista (usando String para evitar erros de tipo)
        const ultimoIndex = workoutDays.findIndex(
          day => String(day.id) === String(ultimaSessaoDaFicha.dia_treino_id)
        );

        // 3. Calcula o próximo e garante o carrossel (módulo)
        if (ultimoIndex !== -1) {
          const proximoIndex = (ultimoIndex + 1) % workoutDays.length;
          suggestedSessionId = workoutDays[proximoIndex].id;
        }
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
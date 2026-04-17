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

    const { data: history, error: historyError } = await supabase
      .from('historico_sessoes')
      .select(`
        id, dia_treino_id, data_treino, duracao_real_minutos,
        dias_treino ( nome ),
        historico_execucao_exercicio (
          exercicio_id,
          execucao_forca_detalhes ( cargas_kg ),
          execucao_isometrico_detalhes ( tempos_reais_segundos )
        )
      `)
      .eq('usuario_id', userId)
      .eq('finalizado', true)
      .order('data_treino', { ascending: false })
      .limit(15); 

    if (historyError) {
      console.error("Erro no Supabase ao buscar histórico:", historyError);
    }

    const bestMetricsMap: Record<string, { maxVal: number, label: string }> = {};

    history?.forEach(sessao => {
      sessao.historico_execucao_exercicio?.forEach((exec: any) => {
        
        const detForca = exec.execucao_forca_detalhes;
        const cargas = detForca ? (Array.isArray(detForca) ? detForca[0]?.cargas_kg : detForca?.cargas_kg) : [];
        const cargasArray = cargas || [];
        
        if (cargasArray.length > 0) {
          const maxCarga = Math.max(...cargasArray);
          if (!bestMetricsMap[exec.exercicio_id] || maxCarga > (bestMetricsMap[exec.exercicio_id]?.maxVal || 0)) {
            bestMetricsMap[exec.exercicio_id] = { maxVal: maxCarga, label: `${maxCarga} kg` };
          }
        }

        const detIso = exec.execucao_isometrico_detalhes;
        const tempos = detIso ? (Array.isArray(detIso) ? detIso[0]?.tempos_reais_segundos : detIso?.tempos_reais_segundos) : [];
        const temposArray = tempos || [];

        if (temposArray.length > 0) {
          const maxTempo = Math.max(...temposArray);
          if (!bestMetricsMap[exec.exercicio_id] || maxTempo > (bestMetricsMap[exec.exercicio_id]?.maxVal || 0)) {
            bestMetricsMap[exec.exercicio_id] = { maxVal: maxTempo, label: `${maxTempo}s` };
          }
        }

      });
    });

    let suggestedSessionId = workoutDays[0].id; 

    if (history && history.length > 0) {
      
      const ultimaSessaoDaFicha = history.find(sessao => 
        workoutDays.some(day => String(day.id) === String(sessao.dia_treino_id))
      );

      if (ultimaSessaoDaFicha) {
        
        const ultimoIndex = workoutDays.findIndex(
          day => String(day.id) === String(ultimaSessaoDaFicha.dia_treino_id)
        );

        if (ultimoIndex !== -1) {
          const proximoIndex = (ultimoIndex + 1) % workoutDays.length;
          suggestedSessionId = workoutDays[proximoIndex].id;
        }
      }
    }

    const formattedSessions = workoutDays.map(day => {
      const maxLoads = day.exercicios_treino?.map((et: any) => {
        const exName = et.exercicios?.nome || 'Exercício';
        
        const prData = bestMetricsMap[et.exercicio_id];
        
        return {
          exercise: exName,
          maxWeight: prData ? prData.label : '--' 
        };
      }) || [];
      
      return {
        id: day.id,
        programName: activeProgram.nome,
        name: day.nome,
        focus: day.foco,
        estimatedTime: 60, 
        intensity: "Alta",
        maxLoads: maxLoads 
      };
    });

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
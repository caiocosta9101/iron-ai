// server/src/controllers/historyController.ts
import { Response } from 'express';
import { supabase } from '../db';
import { AuthRequest } from '../middlewares/authMiddleware';

export const saveWorkoutSession = async (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  const { diaTreinoId, duracaoSegundos, exerciciosRealizados } = req.body;

  try {
    // 1. CRIAR A SESSÃO (Cabeçalho do Histórico)
    const { data: sessaoResult, error: sessaoError } = await supabase
      .from('historico_sessoes')
      .insert([{
        usuario_id: userId,
        dia_treino_id: diaTreinoId,
        data_treino: new Date().toISOString(),
        duracao_real_minutos: Math.round(duracaoSegundos / 60), 
        finalizado: true
      }])
      .select()
      .single();

    if (sessaoError || !sessaoResult) {
        throw sessaoError || new Error("Falha ao criar sessão de histórico.");
    }
    
    // Acessa o ID retornado corretamente
    const sessaoId = sessaoResult.id;

    // 2. SALVAR CADA EXERCÍCIO EXECUTADO
    const exerciciosPayload = exerciciosRealizados.map((ex: any) => {
        const isCardio = ex.categoria === 'cardio';

        // Lógica para Cardio: Só salva se o aluno preencheu algum tempo ou distância
        if (isCardio) {
            if (!ex.tempoRealMinutos && !ex.distanciaRealKm) return null; // Ignora se não fez nada

            return {
                sessao_id: sessaoId,
                exercicio_id: ex.id,
                observacoes: ex.observacoes || "",
                // Campos exclusivos de cardio:
                tempo_real_minutos: ex.tempoRealMinutos || null,
                distancia_real_km: ex.distanciaRealKm || null,
                // Array vazios para não quebrar restrições de força (se houver)
                cargas_kg: [], 
                repeticoes: [],
                descansos_segundos: []
            };
        }

        // Lógica para Força (Musculação): 
        const seriesFeitas = ex.seriesFeitas?.filter((s: any) => s.concluido) || [];
        if (seriesFeitas.length === 0) return null; // Ignora se não fez nenhuma série

        const cargas = seriesFeitas.map((s: any) => parseFloat(s.peso) || 0);
        const reps = seriesFeitas.map((s: any) => parseInt(s.reps) || 0);
        const descansos = seriesFeitas.map((s: any) => s.descansoRealizado || 0);

        return {
            sessao_id: sessaoId,
            exercicio_id: ex.id, 
            observacoes: ex.observacoes || "", 
            // Campos exclusivos de força:
            cargas_kg: cargas,   
            repeticoes: reps,
            descansos_segundos: descansos,     
            // Campos de cardio ficam nulos
            tempo_real_minutos: null,
            distancia_real_km: null
        };
    }).filter((item: any) => item !== null); // Remove os nulos (exercícios pulados)

    // Só faz o insert se tiver dados válidos
    if (exerciciosPayload.length > 0) {
        const { error: execError } = await supabase
            .from('historico_execucao_exercicio')
            .insert(exerciciosPayload);

        if (execError) throw execError;
    }

    return res.status(201).json({ message: 'Treino salvo com sucesso!', sessaoId: sessaoId });

  } catch (error) {
    console.error('Erro ao salvar histórico:', error);
    return res.status(500).json({ error: 'Falha ao registrar treino.' });
  }
};

// --- BUSCAR DATAS PARA O CALENDÁRIO ---
export const getWorkoutDates = async (req: AuthRequest, res: Response) => {
  const userId = req.userId;

  try {
    const { data, error } = await supabase
      .from('historico_sessoes')
      .select('data_treino')
      .eq('usuario_id', userId)
      .eq('finalizado', true);

    if (error) throw error;

    const dates = data.map(sessao => sessao.data_treino.split('T')[0]);
    const uniqueDates = [...new Set(dates)];

    return res.status(200).json(uniqueDates);
  } catch (error) {
    console.error('Erro ao buscar datas do histórico:', error);
    return res.status(500).json({ error: 'Falha ao carregar calendário.' });
  }
};

// --- BUSCAR DETALHES DE UM DIA ESPECÍFICO ---
export const getWorkoutDetailsByDate = async (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  const { date } = req.params; // Formato esperado: YYYY-MM-DD

  try {
    const { data: sessoes, error: sessaoError } = await supabase
      .from('historico_sessoes')
      .select('id, data_treino, duracao_real_minutos, dias_treino(nome)')
      .eq('usuario_id', userId)
      .gte('data_treino', `${date}T00:00:00.000Z`)
      .lte('data_treino', `${date}T23:59:59.999Z`)
      .eq('finalizado', true);

    if (sessaoError) throw sessaoError;
    if (!sessoes || sessoes.length === 0) {
      return res.status(404).json({ message: 'Nenhum treino encontrado nesta data.' });
    }

    const sessaoId = sessoes[0].id;

    // NOVO: Adicionadas as colunas de tempo e distancia na query
    const { data: exercicios, error: execError } = await supabase
      .from('historico_execucao_exercicio')
      .select(`
        cargas_kg,
        repeticoes,
        descansos_segundos,
        tempo_real_minutos,
        distancia_real_km,
        observacoes,
        exercicios (nome, grupo_pai, musculo_primario, categoria)
      `)
      .eq('sessao_id', sessaoId);

    if (execError) throw execError;

    return res.status(200).json({
      sessao: sessoes[0],
      exercicios: exercicios
    });

  } catch (error) {
    console.error('Erro ao buscar detalhes do treino:', error);
    return res.status(500).json({ error: 'Falha ao carregar detalhes do treino.' });
  }
};
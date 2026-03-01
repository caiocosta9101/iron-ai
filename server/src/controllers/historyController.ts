// server/src/controllers/historyController.ts
import { Response } from 'express';
import { supabase } from '../db';
import { AuthRequest } from '../middlewares/authMiddleware';

export const saveWorkoutSession = async (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  // Recebe o ID do dia treinado, duração, e a lista de exercícios com as novas infos (descansos e obs)
  const { diaTreinoId, duracaoSegundos, exerciciosRealizados } = req.body;

  try {
    // 1. CRIAR A SESSÃO (Cabeçalho do Histórico)
    const { data: sessao, error: sessaoError } = await supabase
      .from('historico_sessoes')
      .insert([{
        usuario_id: userId,
        dia_treino_id: diaTreinoId,
        data_treino: new Date().toISOString(),
        duracao_real_minutos: Math.round(duracaoSegundos / 60), // Converte para minutos
        finalizado: true
      }])
      .select()
      .single();

    if (sessaoError) throw sessaoError;

    // 2. SALVAR CADA EXERCÍCIO EXECUTADO
    const exerciciosPayload = exerciciosRealizados.map((ex: any) => {
        // Filtra apenas as séries que foram marcadas como concluídas
        const seriesFeitas = ex.seriesFeitas.filter((s: any) => s.concluido);

        // Se o exercício não teve nenhuma série feita, ignoramos ele
        if (seriesFeitas.length === 0) return null;

        // Extrai os arrays para salvar no Postgres
        const cargas = seriesFeitas.map((s: any) => parseFloat(s.peso) || 0);
        const reps = seriesFeitas.map((s: any) => parseInt(s.reps) || 0);
        
        // NOVO: Extrai o descanso realizado de cada série (ou 0 se não tiver)
        const descansos = seriesFeitas.map((s: any) => s.descansoRealizado || 0);

        return {
            sessao_id: sessao.id,
            exercicio_id: ex.id, // ID original do exercício
            cargas_kg: cargas,   
            repeticoes: reps,
            descansos_segundos: descansos,     // <--- Campo Novo
            observacoes: ex.observacoes || ""  // <--- Campo Novo (Feedback do usuário)
        };
    }).filter((item: any) => item !== null); // Remove os nulos (exercícios pulados)

    // Só faz o insert se tiver dados
    if (exerciciosPayload.length > 0) {
        const { error: execError } = await supabase
            .from('historico_execucao_exercicio')
            .insert(exerciciosPayload);

        if (execError) throw execError;
    }

    return res.status(201).json({ message: 'Treino salvo com sucesso!', sessaoId: sessao.id });

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

    // Mapeia para retornar apenas um array de strings com as datas (YYYY-MM-DD)
    const dates = data.map(sessao => sessao.data_treino.split('T')[0]);
    
    // Remove duplicatas (caso tenha treinado duas vezes no mesmo dia)
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
    // Busca a sessão do dia (início do dia até o fim do dia)
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

    // Pega a primeira sessão do dia (assumindo 1 treino por dia na maioria dos casos)
    const sessaoId = sessoes[0].id;

    // Busca os exercícios daquela sessão específica
    const { data: exercicios, error: execError } = await supabase
      .from('historico_execucao_exercicio')
      .select(`
        cargas_kg,
        repeticoes,
        descansos_segundos,
        observacoes,
        exercicios (nome, grupo_muscular)
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
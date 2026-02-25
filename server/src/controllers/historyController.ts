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
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
    
    const sessaoId = sessaoResult.id;

    // --- 💡 A ABORDAGEM PROFISSIONAL: BULK FETCH ---
    // Extrai todos os IDs de relação que o frontend enviou
    const idsRelacao = exerciciosRealizados.map((ex: any) => ex.id);

    // Faz APENAS UMA consulta ao banco para trazer todas as traduções
    const { data: relacoesGlobais, error: erroRelacoes } = await supabase
      .from('exercicios_treino')
      .select('id, exercicio_id')
      .in('id', idsRelacao); // Busca todos que estão nesta lista

    if (erroRelacoes || !relacoesGlobais) {
       throw new Error("Falha ao buscar as referências globais dos exercícios.");
    }

    // Cria um dicionário em memória (Hash Map) para busca instantânea no loop
    // Ex: { 977: 15, 978: 42 }
    const mapaExercicios = relacoesGlobais.reduce((acc, atual) => {
      acc[atual.id] = atual.exercicio_id;
      return acc;
    }, {} as Record<number, number>);
    // ------------------------------------------------

    // 2. ROTEAMENTO DE SALVAMENTO
    for (const ex of exerciciosRealizados) {
      
      const exercicioGlobalId = mapaExercicios[ex.id];

      if (!exercicioGlobalId) {
        console.error(`⚠️ Exercício da relação ${ex.id} não encontrado no mapa. Pulando...`);
        continue;
      }

      // A. Salva na Tabela Pai
      const { data: execData, error: execError } = await supabase
        .from('historico_execucao_exercicio')
        .insert([{
          sessao_id: sessaoId,
          exercicio_id: exercicioGlobalId, // <--- Uso instantâneo da memória, sem consulta!
          observacoes: ex.observacoes || "",
          tipo: ex.categoria
        }])
        .select('id')
        .single();

      if (execError) {
        console.error(`❌ Erro na Tabela Pai (${ex.categoria}):`, execError);
        throw execError;
      }

      const execucaoId = execData.id;
      let childError = null;

      // B. Distribui para as Tabelas Filhas
      switch (ex.categoria) {
        case 'forca': {
          const series = ex.seriesFeitas || [];
          const { error } = await supabase.from('execucao_forca_detalhes').insert([{
            execucao_id: execucaoId,
            cargas_kg: series.map((s: any) => parseFloat(s.peso) || 0),
            repeticoes: series.map((s: any) => parseInt(s.reps) || 0),
            descansos_segundos: series.map((s: any) => parseInt(s.descansoRealizado) || 0)
          }]);
          childError = error;
          break;
        }
        case 'isometrico': {
          const series = ex.seriesFeitas || [];
          const { error } = await supabase.from('execucao_isometrico_detalhes').insert([{
            execucao_id: execucaoId,
            series_completadas: series.length,
            tempos_reais_segundos: series.map((s: any) => parseInt(s.reps) || 0), 
            descansos_segundos: series.map((s: any) => parseInt(s.descansoRealizado) || 0)
          }]);
          childError = error;
          break;
        }
        case 'hiit': {
          const series = ex.seriesFeitas || [];
          const { error } = await supabase.from('execucao_hiit_detalhes').insert([{
            execucao_id: execucaoId,
            rounds_completados: series.length,
            velocidades_estimulo_real: series.map((s: any) => parseFloat(s.hiitVelAlta) || 0),
            velocidades_descanso_real: series.map((s: any) => parseFloat(s.hiitVelBaixa) || 0),
            tempos_estimulo_real: series.map((s: any) => parseInt(s.hiitTempoAlta) || 0),
            tempos_descanso_real: series.map((s: any) => parseInt(s.hiitTempoBaixa) || 0)
          }]);
          childError = error;
          break;
        }
        case 'cardio': {
          const { error } = await supabase.from('execucao_cardio_detalhes').insert([{
            execucao_id: execucaoId,
            tempo_real_minutos: ex.tempoRealMinutos ? parseFloat(ex.tempoRealMinutos) : null,
            distancia_real_km: ex.distanciaRealKm ? parseFloat(ex.distanciaRealKm) : null
          }]);
          childError = error;
          break;
        }
      }

      if (childError) {
         console.error(`❌ Erro na Tabela Filha (${ex.categoria}):`, childError);
         throw childError;
      }
    }

    return res.status(201).json({ message: 'Treino salvo com sucesso!', sessaoId: sessaoId });

  } catch (error) {
    console.error('🚨 ERRO FATAL AO SALVAR HISTÓRICO:', error);
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
  const { date } = req.params; 

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

    // Ajustado para buscar de todas as tabelas filhas simultaneamente
    const { data: exercicios, error: execError } = await supabase
  .from('historico_execucao_exercicio')
  .select(`
    id,
    observacoes,
    tipo,
    exercicios (nome, grupo_pai, musculo_primario, categoria),
    execucao_forca_detalhes (cargas_kg, repeticoes, descansos_segundos),
    execucao_cardio_detalhes (tempo_real_minutos, distancia_real_km),
    execucao_isometrico_detalhes (series_completadas, tempos_reais_segundos, descansos_segundos),
    execucao_hiit_detalhes (rounds_completados, velocidades_estimulo_real, velocidades_descanso_real, tempos_estimulo_real, tempos_descanso_real)
  `)
  .eq('sessao_id', sessaoId);

    if (execError) throw execError;

    // "Achatando" o objeto para mandar pro Front
    const exerciciosAchatados = exercicios.map((ex: any) => {
      const detalhesForca = Array.isArray(ex.execucao_forca_detalhes) ? ex.execucao_forca_detalhes[0] : ex.execucao_forca_detalhes;
      const detalhesCardio = Array.isArray(ex.execucao_cardio_detalhes) ? ex.execucao_cardio_detalhes[0] : ex.execucao_cardio_detalhes;
      const detalhesIso = Array.isArray(ex.execucao_isometrico_detalhes) ? ex.execucao_isometrico_detalhes[0] : ex.execucao_isometrico_detalhes;
      const detalhesHiit = Array.isArray(ex.execucao_hiit_detalhes) ? ex.execucao_hiit_detalhes[0] : ex.execucao_hiit_detalhes;

      return {
        id: ex.id,
        nome: ex.exercicios.nome,
        grupo_pai: ex.exercicios.grupo_pai,           
        musculo_primario: ex.exercicios.musculo_primario, 
        categoria: ex.tipo,
        observacoes: ex.observacoes,
        ...(ex.tipo === 'forca' && detalhesForca),
        ...(ex.tipo === 'cardio' && detalhesCardio),
        ...(ex.tipo === 'isometrico' && detalhesIso),
        ...(ex.tipo === 'hiit' && detalhesHiit)
      };
    });

    return res.status(200).json({
      sessao: sessoes[0],
      exercicios: exerciciosAchatados
    });

  } catch (error) {
    console.error('Erro ao buscar detalhes do treino:', error);
    return res.status(500).json({ error: 'Falha ao carregar detalhes do treino.' });
  }
};
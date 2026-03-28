// server/src/controllers/workoutController.ts
import { Response } from 'express';
import { supabase } from '../db';
import { AuthRequest } from '../middlewares/authMiddleware';

const parseRepeticoes = (repString: string | number | undefined) => {
  if (!repString) return { min: 8, max: 12 };
  if (typeof repString === 'number') return { min: repString, max: repString };
  const nums = repString.toString().match(/\d+/g);
  if (!nums) return { min: 0, max: 0 };
  if (nums.length >= 2) return { min: parseInt(nums[0]), max: parseInt(nums[1]) };
  return { min: parseInt(nums[0]), max: parseInt(nums[0]) };
};

const parseDescanso = (descString: string | number | undefined) => {
  if (!descString) return 60;
  if (typeof descString === 'number') return descString;
  const nums = descString.toString().match(/\d+/g);
  return nums ? parseInt(nums[0]) : 60; 
};

export const createWorkout = async (req: AuthRequest, res: Response) => {
  const { nome, descricao, perfil, dias, gerado_por_ia, objetivo, data_inicio, data_fim, duracao_semanas } = req.body; 
  const userId = req.userId; 

  try {
    if (perfil && Object.keys(perfil).length > 0) {
      const { data: existingProfile } = await supabase
        .from('perfil_usuario')
        .select('id')
        .eq('usuario_id', userId)
        .single();

      const perfilData = {
        usuario_id: userId,
        objetivo: perfil.objetivo,
        sexo: perfil.sexo,
        idade: parseInt(perfil.idade),
        peso: parseFloat(perfil.peso),
        altura: parseInt(perfil.altura),
        limitacoes: perfil.limitacoes || null,
        dias_por_semana: perfil.dias,
        tempo_treino_minutos: perfil.tempo,
        nivel_experiencia: perfil.nivel,
        acesso_academia: perfil.acesso_academia,
        equipamentos_casa: perfil.equipamentos || null,
        atualizado_em: new Date().toISOString()
      };

      if (existingProfile) {
        await supabase.from('perfil_usuario').update(perfilData).eq('id', existingProfile.id);
      } else {
        await supabase.from('perfil_usuario').insert([perfilData]);
      }
    }

    const objFinal = objetivo || (perfil ? perfil.objetivo : 'Geral');
    const isIA = gerado_por_ia !== undefined ? gerado_por_ia : true;

    let dataInicioFinal = data_inicio || new Date().toISOString().split('T')[0];
    let dataFimFinal = data_fim; 

    if (!dataFimFinal && duracao_semanas) {
      const dataCalculo = new Date(`${dataInicioFinal}T00:00:00`);
      dataCalculo.setDate(dataCalculo.getDate() + (duracao_semanas * 7));
      dataFimFinal = dataCalculo.toISOString().split('T')[0];
    }

    const { data: treinoData, error: treinoError } = await supabase
      .from('treinos')
      .insert([{ 
        usuario_id: userId, 
        nome, 
        descricao, 
        objetivo: objFinal, 
        gerado_por_ia: isIA,
        data_inicio: dataInicioFinal,
        data_fim: dataFimFinal || null 
      }])
      .select()
      .single();

    if (treinoError) throw treinoError;
    const treinoId = treinoData.id;

    for (const [index, dia] of dias.entries()) {
      const { data: diaData, error: diaError } = await supabase
        .from('dias_treino')
        .insert([{ treino_id: treinoId, nome: dia.nome, ordem_dia: index + 1, foco: dia.foco }]) 
        .select()
        .single();

      if (diaError) throw diaError;

      for (const [i, exercicio] of dia.exercicios.entries()) {
        
        let exercicioId = exercicio.exercicio_id;

        if (!exercicioId) {
          const { data: existingEx } = await supabase
            .from('exercicios')
            .select('id')
            .ilike('nome', exercicio.nome)
            .single();

          if (existingEx) {
            exercicioId = existingEx.id;
          } else {
            const { data: newEx, error: newExError } = await supabase
              .from('exercicios')
              .insert([{ 
                nome: exercicio.nome, 
                grupo_pai: dia.foco || 'Geral',
                musculo_primario: 'Geral',
                equipamento_id: null 
              }])
              .select()
              .single();
            
            if (newExError) throw newExError;
            exercicioId = newEx.id;
          }
        }

        const repMin = exercicio.repeticoes_min !== null && exercicio.repeticoes_min !== undefined ? exercicio.repeticoes_min : (exercicio.repeticoes ? parseRepeticoes(exercicio.repeticoes).min : null);
        const repMax = exercicio.repeticoes_max !== null && exercicio.repeticoes_max !== undefined ? exercicio.repeticoes_max : (exercicio.repeticoes ? parseRepeticoes(exercicio.repeticoes).max : null);
        const descanso = exercicio.descanso_segundos !== null && exercicio.descanso_segundos !== undefined ? exercicio.descanso_segundos : (exercicio.descanso ? parseDescanso(exercicio.descanso) : null);
        const series = exercicio.series !== null && exercicio.series !== undefined ? parseInt(exercicio.series) : null;

        const payloadExercicio = {
          dia_treino_id: diaData.id, 
          exercicio_id: exercicioId, 
          ordem_execucao: i + 1, 
          series: series, 
          repeticoes_min: repMin, 
          repeticoes_max: repMax, 
          descanso_segundos: descanso, 
          tempo_meta_minutos: exercicio.tempo_meta_minutos || null, 
          distancia_meta_km: exercicio.distancia_meta_km || null, 
          observacoes: exercicio.observacao || exercicio.observacoes || ""
        };

        console.log("🔥 TENTANDO INSERIR EXERCÍCIO:", payloadExercicio);

        const { error: ligacaoError } = await supabase
          .from('exercicios_treino')
          .insert([payloadExercicio]);

        if (ligacaoError) {
          console.error("❌ ERRO DO SUPABASE AO SALVAR EXERCÍCIO:", ligacaoError);
          throw ligacaoError;
        }
      }
    }

    return res.status(201).json({ message: 'Treino salvo com sucesso!', treinoId });

  } catch (error: any) {
    console.error("❌ CATCH DISPARADO NO CONTROLLER:", error);
    return res.status(500).json({ error: 'Erro interno ao persistir dados.', detalhes: error });
  }
};

export const getUserWorkouts = async (req: AuthRequest, res: Response) => {
    const userId = req.userId;
  
    try {
      const { data, error } = await supabase
        .from('treinos')
        .select('*') 
        .eq('usuario_id', userId)
        .order('criado_em', { ascending: false });
  
      if (error) throw error;
      return res.status(200).json(data);
    } catch (error: any) {
      return res.status(500).json({ error: 'Erro ao buscar dados.' });
    }
};

export const getWorkoutById = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.userId;

  try {
    const { data, error } = await supabase
      .from('treinos')
      .select(`
        id, nome, descricao, objetivo, criado_em, data_inicio, data_fim,
        dias_treino (
          id, nome, ordem_dia, observacoes, foco,
          exercicios_treino (
            id, series, repeticoes_min, repeticoes_max, descanso_segundos, tempo_meta_minutos, distancia_meta_km, observacoes, ordem_execucao,
            exercicios ( nome, categoria, equipamentos ( nome ) )
          )
        )
      `)
      .eq('id', id)
      .eq('usuario_id', userId) 
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Treino não encontrado' });

    const treinoFormatado = {
      id: data.id,
      nome: data.nome,
      descricao: data.descricao,
      objetivo: data.objetivo,
      criado_em: data.criado_em,
      data_inicio: data.data_inicio, 
      data_fim: data.data_fim,       
      dias: data.dias_treino
        .sort((a: any, b: any) => a.ordem_dia - b.ordem_dia) 
        .map((dia: any) => ({
          id: dia.id,
          nome: dia.nome,
          ordem_dia: dia.ordem_dia,
          observacoes: dia.observacoes,
          foco: dia.foco,
          exercicios: dia.exercicios_treino
            .sort((a: any, b: any) => a.ordem_execucao - b.ordem_execucao) 
            .map((ex: any) => ({
              id: ex.id,
              nome: ex.exercicios.nome, 
              categoria: ex.exercicios.categoria,
              equipamento: ex.exercicios?.equipamentos?.nome || 'Peso do Corpo',
              series: ex.series,
              repeticoes_min: ex.repeticoes_min,
              repeticoes_max: ex.repeticoes_max,
              descanso_segundos: ex.descanso_segundos,
              tempo_meta_minutos: ex.tempo_meta_minutos,
              distancia_meta_km: ex.distancia_meta_km,
              observacoes: ex.observacoes
            }))
        }))
    };

    return res.status(200).json(treinoFormatado);

  } catch (error: any) {
    return res.status(500).json({ error: 'Erro ao buscar detalhes.' });
  }
};

export const updateWorkout = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { nome, descricao, objetivo } = req.body;
  const userId = req.userId;

  try {
    const { data, error } = await supabase
      .from('treinos')
      .update({ nome, descricao, objetivo })
      .eq('id', id)
      .eq('usuario_id', userId)
      .select()
      .single();

    if (error) throw error;
    return res.status(200).json({ message: 'Treino atualizado com sucesso', data });
  } catch (error: any) {
    return res.status(500).json({ error: 'Erro ao atualizar dados.' });
  }
};

export const deleteWorkout = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.userId;

  try {
    const { error } = await supabase
      .from('treinos')
      .delete()
      .eq('id', id)
      .eq('usuario_id', userId); 

    if (error) throw error;
    return res.status(200).json({ message: 'Treino deletado com sucesso' });
  } catch (error: any) {
    return res.status(500).json({ error: 'Erro ao deletar treino.' });
  }
};

export const updateExercise = async (req: AuthRequest, res: Response) => {
  const { id } = req.params; 
  let { series, repeticoes_min, repeticoes_max, descanso_segundos, tempo_meta_minutos, distancia_meta_km, exercicio_id } = req.body;
  const userId = req.userId; 

  try {
    // --- BLINDAGEM DE DADOS (NOVA REGRA) ---
    // Se veio tempo ou distância, é cardio. Forçamos a limpeza dos dados de força.
    const isCardio = (tempo_meta_minutos && tempo_meta_minutos > 0) || (distancia_meta_km && distancia_meta_km > 0);

    if (isCardio) {
      series = null;
      repeticoes_min = null;
      repeticoes_max = null;
      descanso_segundos = null;
    } else {
      tempo_meta_minutos = null;
      distancia_meta_km = null;
    }
    // ---------------------------------------

    const { data: authCheck, error: authError } = await supabase
      .from('exercicios_treino')
      .select(`
        id,
        dias_treino (
          treinos (
            usuario_id
          )
        )
      `)
      .eq('id', id)
      .single();

    if (authError || !authCheck) {
      return res.status(404).json({ error: 'Exercício não encontrado.' });
    }

    const donoId = (authCheck as any)?.dias_treino?.treinos?.usuario_id;
    
    if (donoId !== userId) {
      return res.status(403).json({ error: 'Acesso negado. Você não tem permissão para alterar este exercício.' });
    }

    const { data, error } = await supabase
      .from('exercicios_treino')
      .update({ series, repeticoes_min, repeticoes_max, descanso_segundos, tempo_meta_minutos, distancia_meta_km, exercicio_id })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return res.status(200).json({ message: 'Exercício atualizado com sucesso', data });
  } catch (error: any) {
    return res.status(500).json({ error: 'Erro interno ao atualizar exercício.' });
  }
};

export const removeExercise = async (req: AuthRequest, res: Response) => {
  const { id } = req.params; 
  const userId = req.userId; 

  try {
    const { data: authCheck, error: authError } = await supabase
      .from('exercicios_treino')
      .select(`
        id,
        dias_treino (
          treinos (
            usuario_id
          )
        )
      `)
      .eq('id', id)
      .single();

    if (authError || !authCheck) {
      return res.status(404).json({ error: 'Exercício não encontrado.' });
    }

    const donoId = (authCheck as any)?.dias_treino?.treinos?.usuario_id;
    
    if (donoId !== userId) {
      return res.status(403).json({ error: 'Acesso negado. Você não tem permissão para remover este exercício.' });
    }

    const { error } = await supabase
      .from('exercicios_treino')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return res.status(200).json({ message: 'Exercício removido com sucesso' });
  } catch (error: any) {
    return res.status(500).json({ error: 'Erro interno ao remover exercício.' });
  }
};

export const getWorkoutDayDetails = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const { data: dayDetails, error } = await supabase
      .from('dias_treino')
      .select(`
        id,
        nome,
        foco,
        observacoes,
        exercicios_treino (
          id,
          series,
          repeticoes_min,
          repeticoes_max,
          descanso_segundos,
          tempo_meta_minutos,
          distancia_meta_km,
          observacoes,
          ordem_execucao,
          exercicios (
            id,
            nome,
            categoria,
            grupo_pai,
            musculo_primario,
            equipamentos (
              nome
            )
          )
        ) 
      `)
      .eq('id', id)
      .single();

    if (error || !dayDetails) {
      return res.status(404).json({ error: 'Dia de treino não encontrado' });
    }

    const sortedExercises = dayDetails.exercicios_treino.sort((a: any, b: any) => 
      a.ordem_execucao - b.ordem_execucao
    );

    return res.json({
      ...(dayDetails as any),
      exercicios_treino: sortedExercises
    });

  } catch (error) {
    return res.status(500).json({ error: 'Erro interno' });
  }
};

export const addDayToWorkout = async (req: AuthRequest, res: Response) => {
  const { id } = req.params; 
  const { nome, foco } = req.body;
  const userId = req.userId;

  try {
    const { data: treino } = await supabase
      .from('treinos')
      .select('id')
      .eq('id', id)
      .eq('usuario_id', userId)
      .single();

    if (!treino) return res.status(403).json({ error: 'Acesso negado.' });

    const { data: maxDia } = await supabase
      .from('dias_treino')
      .select('ordem_dia')
      .eq('treino_id', id)
      .order('ordem_dia', { ascending: false })
      .limit(1)
      .single();

    const nextOrdem = maxDia ? maxDia.ordem_dia + 1 : 1;

    const { data: novoDia, error } = await supabase
      .from('dias_treino')
      .insert([{ treino_id: id, nome, foco, ordem_dia: nextOrdem }])
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({ ...novoDia, exercicios: [] });
  } catch (error: any) {
    return res.status(500).json({ error: 'Erro interno ao adicionar dia.' });
  }
};

export const addExerciseToDay = async (req: AuthRequest, res: Response) => {
  const { id } = req.params; 
  let { exercicio_id, series, repeticoes_min, repeticoes_max, descanso_segundos, tempo_meta_minutos, distancia_meta_km, observacoes } = req.body;
  
  try {
    // --- BLINDAGEM DE DADOS (NOVA REGRA) ---
    const isCardio = (tempo_meta_minutos && tempo_meta_minutos > 0) || (distancia_meta_km && distancia_meta_km > 0);

    if (isCardio) {
      series = null;
      repeticoes_min = null;
      repeticoes_max = null;
      descanso_segundos = null;
    } else {
      tempo_meta_minutos = null;
      distancia_meta_km = null;
    }
    // ---------------------------------------

    const { data: maxEx } = await supabase
      .from('exercicios_treino')
      .select('ordem_execucao')
      .eq('dia_treino_id', id)
      .order('ordem_execucao', { ascending: false })
      .limit(1)
      .single();

    const nextOrdem = maxEx ? maxEx.ordem_execucao + 1 : 1;

    const { data: novaRelacao, error } = await supabase
      .from('exercicios_treino')
      .insert([{
        dia_treino_id: id, 
        exercicio_id, 
        ordem_execucao: nextOrdem, 
        series, 
        repeticoes_min, 
        repeticoes_max, 
        descanso_segundos,
        tempo_meta_minutos,
        distancia_meta_km,
        observacoes: observacoes || ""
      }])
      .select(`
        id, series, repeticoes_min, repeticoes_max, descanso_segundos, tempo_meta_minutos, distancia_meta_km, observacoes, ordem_execucao,
        exercicios ( nome, categoria, equipamentos ( nome ) )
      `)
      .single();

    if (error) throw error;

    const formatado = {
      id: novaRelacao.id,
      nome: (novaRelacao.exercicios as any).nome,
      categoria: (novaRelacao.exercicios as any).categoria,
      equipamento: (novaRelacao.exercicios as any)?.equipamentos?.nome || 'Peso do Corpo',
      series: novaRelacao.series,
      repeticoes_min: novaRelacao.repeticoes_min,
      repeticoes_max: novaRelacao.repeticoes_max,
      descanso_segundos: novaRelacao.descanso_segundos,
      tempo_meta_minutos: novaRelacao.tempo_meta_minutos,
      distancia_meta_km: novaRelacao.distancia_meta_km,
      observacoes: novaRelacao.observacoes
    };

    return res.status(201).json(formatado);
  } catch (error: any) {
    return res.status(500).json({ error: 'Erro interno ao adicionar exercício.' });
  }
};

export const deleteWorkoutDay = async (req: AuthRequest, res: Response) => {
  const { id } = req.params; 
  const userId = req.userId;

  try {
    const { data: authCheck, error: authError } = await supabase
      .from('dias_treino')
      .select(`
        id,
        treinos ( usuario_id )
      `)
      .eq('id', id)
      .single();

    if (authError || !authCheck) {
      return res.status(404).json({ error: 'Dia de treino não encontrado.' });
    }

    const donoId = (authCheck as any)?.treinos?.usuario_id;
    
    if (donoId !== userId) {
      return res.status(403).json({ error: 'Acesso negado. Você não tem permissão para remover este dia.' });
    }

    const { error } = await supabase
      .from('dias_treino')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return res.status(200).json({ message: 'Dia de treino removido com sucesso' });
  } catch (error: any) {
    return res.status(500).json({ error: 'Erro interno ao remover dia de treino.' });
  }
};
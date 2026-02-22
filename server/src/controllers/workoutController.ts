import { Response } from 'express';
import { supabase } from '../db';
import { AuthRequest } from '../middlewares/authMiddleware';

// === HELPER: Função para limpar e converter dados da IA para o Banco ===
const parseRepeticoes = (repString: string | number | undefined) => {
  if (!repString) return { min: 8, max: 12 }; // Fallback de segurança
  if (typeof repString === 'number') return { min: repString, max: repString };
  const nums = repString.toString().match(/\d+/g);
  if (!nums) return { min: 0, max: 0 };
  if (nums.length >= 2) return { min: parseInt(nums[0]), max: parseInt(nums[1]) };
  return { min: parseInt(nums[0]), max: parseInt(nums[0]) };
};

const parseDescanso = (descString: string | number | undefined) => {
  if (!descString) return 60; // Fallback de segurança
  if (typeof descString === 'number') return descString;
  const nums = descString.toString().match(/\d+/g);
  return nums ? parseInt(nums[0]) : 60; 
};

// ===================================================================

// 1. CRIAR TREINO (Salva o JSON da IA ou Manual no Banco)
export const createWorkout = async (req: AuthRequest, res: Response) => {
  const { nome, descricao, perfil, dias, gerado_por_ia, objetivo } = req.body; 
  
  // O middleware já validou e nos entregou o ID aqui!
  const userId = req.userId; 

  try {
    // =========================================================
    // SALVAR / ATUALIZAR O PERFIL DO USUÁRIO (Apenas se vier da IA)
    // =========================================================
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
    // =========================================================

    const objFinal = objetivo || (perfil ? perfil.objetivo : 'Geral');
    const isIA = gerado_por_ia !== undefined ? gerado_por_ia : true;

    // Salva o Cabeçalho do Treino
    const { data: treinoData, error: treinoError } = await supabase
      .from('treinos')
      .insert([{ usuario_id: userId, nome, descricao, objetivo: objFinal, gerado_por_ia: isIA }])
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
                grupo_muscular: dia.foco || 'Geral',
                equipamento: exercicio.equipamento || 'Não especificado' 
              }])
              .select()
              .single();
            
            if (newExError) throw newExError;
            exercicioId = newEx.id;
          }
        }

        const repMin = exercicio.repeticoes_min !== undefined ? exercicio.repeticoes_min : parseRepeticoes(exercicio.repeticoes).min;
        const repMax = exercicio.repeticoes_max !== undefined ? exercicio.repeticoes_max : parseRepeticoes(exercicio.repeticoes).max;
        const descanso = exercicio.descanso_segundos !== undefined ? exercicio.descanso_segundos : parseDescanso(exercicio.descanso);

        const { error: ligacaoError } = await supabase
          .from('exercicios_treino')
          .insert([{
            dia_treino_id: diaData.id, 
            exercicio_id: exercicioId, 
            ordem_execucao: i + 1, 
            series: parseInt(exercicio.series) || 3, 
            repeticoes_min: repMin, 
            repeticoes_max: repMax, 
            descanso_segundos: descanso, 
            observacoes: exercicio.observacao || exercicio.observacoes
          }]);

        if (ligacaoError) throw ligacaoError;
      }
    }

    return res.status(201).json({ message: 'Treino salvo com sucesso!', treinoId });

  } catch (error: any) {
    console.error('Erro ao salvar treino:', error);
    return res.status(500).json({ error: 'Erro interno ao persistir dados.' });
  }
};

// 2. LISTAR TREINOS
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
      console.error('Erro ao buscar treinos:', error);
      return res.status(500).json({ error: 'Erro ao buscar dados.' });
    }
};

// 3. BUSCAR DETALHES DE UM TREINO ESPECÍFICO
export const getWorkoutById = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.userId;

  try {
    const { data, error } = await supabase
      .from('treinos')
      .select(`
        id, nome, descricao, objetivo, criado_em,
        dias_treino (
          id, nome, ordem_dia, observacoes, foco,
          exercicios_treino (
            id, series, repeticoes_min, repeticoes_max, descanso_segundos, observacoes, ordem_execucao,
            exercicios ( nome, equipamento ) 
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
              equipamento: ex.exercicios.equipamento,
              series: ex.series,
              repeticoes_min: ex.repeticoes_min,
              repeticoes_max: ex.repeticoes_max,
              descanso_segundos: ex.descanso_segundos,
              observacoes: ex.observacoes
            }))
        }))
    };

    return res.status(200).json(treinoFormatado);

  } catch (error: any) {
    console.error('Erro ao buscar detalhes do treino:', error);
    return res.status(500).json({ error: 'Erro ao buscar detalhes.' });
  }
};

// 4. ATUALIZAR INFORMAÇÕES DO TREINO (Nome, Descrição, Objetivo)
export const updateWorkout = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { nome, descricao, objetivo } = req.body;
  const userId = req.userId;

  try {
    const { data, error } = await supabase
      .from('treinos')
      .update({ nome, descricao, objetivo })
      .eq('id', id)
      .eq('usuario_id', userId) // Segurança: só atualiza se for o dono
      .select()
      .single();

    if (error) throw error;
    return res.status(200).json({ message: 'Treino atualizado com sucesso', data });
  } catch (error: any) {
    console.error('Erro ao atualizar treino:', error);
    return res.status(500).json({ error: 'Erro ao atualizar dados.' });
  }
};

// 5. DELETAR TREINO INTEIRO (E cascata)
export const deleteWorkout = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.userId;

  try {
    const { error } = await supabase
      .from('treinos')
      .delete()
      .eq('id', id)
      .eq('usuario_id', userId); // Segurança: só apaga se for o dono

    if (error) throw error;
    return res.status(200).json({ message: 'Treino deletado com sucesso' });
  } catch (error: any) {
    console.error('Erro ao deletar treino:', error);
    return res.status(500).json({ error: 'Erro ao deletar treino.' });
  }
};

// 6. ATUALIZAR EXERCÍCIO ESPECÍFICO (Séries, Reps, Descanso e Substituição)
export const updateExercise = async (req: AuthRequest, res: Response) => {
  const { id } = req.params; 
  const { series, repeticoes_min, repeticoes_max, descanso_segundos, exercicio_id } = req.body;
  const userId = req.userId; // Pegando o ID do usuário autenticado

  try {
    // 1. VALIDAÇÃO DE POSSE (Anti-IDOR)
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

    // Navega pelas relações para checar o dono
    const donoId = (authCheck as any)?.dias_treino?.treinos?.usuario_id;
    
    if (donoId !== userId) {
      return res.status(403).json({ error: 'Acesso negado. Você não tem permissão para alterar este exercício.' });
    }

    // 2. UPDATE SEGURO
    const { data, error } = await supabase
      .from('exercicios_treino')
      .update({ series, repeticoes_min, repeticoes_max, descanso_segundos, exercicio_id })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return res.status(200).json({ message: 'Exercício atualizado com sucesso', data });
  } catch (error: any) {
    console.error('Erro ao atualizar exercício:', error);
    return res.status(500).json({ error: 'Erro interno ao atualizar exercício.' }); // Mensagem genérica
  }
};

// 7. REMOVER EXERCÍCIO ESPECÍFICO DE UM DIA
export const removeExercise = async (req: AuthRequest, res: Response) => {
  const { id } = req.params; 
  const userId = req.userId; // Pegando o ID do usuário autenticado

  try {
    // 1. VALIDAÇÃO DE POSSE (Anti-IDOR)
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

    // 2. DELETE SEGURO
    const { error } = await supabase
      .from('exercicios_treino')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return res.status(200).json({ message: 'Exercício removido com sucesso' });
  } catch (error: any) {
    console.error('Erro ao remover exercício:', error);
    return res.status(500).json({ error: 'Erro interno ao remover exercício.' }); // Mensagem genérica
  }
};
import { Request, Response } from 'express';
import { supabase } from '../db';
import jwt from 'jsonwebtoken';

// === HELPER: Função para limpar e converter dados da IA para o Banco ===
const parseRepeticoes = (repString: string | number) => {
  if (typeof repString === 'number') return { min: repString, max: repString };
  const nums = repString.toString().match(/\d+/g);
  if (!nums) return { min: 0, max: 0 };
  if (nums.length >= 2) return { min: parseInt(nums[0]), max: parseInt(nums[1]) };
  return { min: parseInt(nums[0]), max: parseInt(nums[0]) };
};

const parseDescanso = (descString: string | number) => {
  if (typeof descString === 'number') return descString;
  const nums = descString.toString().match(/\d+/g);
  return nums ? parseInt(nums[0]) : 60; 
};

// ===================================================================

// 1. CRIAR TREINO (Salva o JSON da IA no Banco e atualiza o Perfil)
export const createWorkout = async (req: Request, res: Response) => {
  // Recebemos o "perfil" completo enviado pelo frontend
  const { nome, descricao, perfil, dias } = req.body; 
  
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Token não fornecido. Acesso negado.' });

  const token = authHeader.split(' ')[1];
  let userId;
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
    userId = decoded.id; 
  } catch (err) {
    return res.status(401).json({ error: 'Sessão inválida ou expirada. Faça login novamente.' });
  }

  try {
    // =========================================================
    // NOVO: SALVAR / ATUALIZAR O PERFIL DO USUÁRIO
    // =========================================================
    if (perfil) {
      // 1. Verifica se o usuário já tem um perfil salvo
      const { data: existingProfile } = await supabase
        .from('perfil_usuario')
        .select('id')
        .eq('usuario_id', userId)
        .single();

      // 2. Prepara os dados formatados conforme sua tabela
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
        // Atualiza se já existir
        await supabase.from('perfil_usuario').update(perfilData).eq('id', existingProfile.id);
      } else {
        // Cria se for a primeira vez
        await supabase.from('perfil_usuario').insert([perfilData]);
      }
    }
    // =========================================================

    // Continua salvando o treino normalmente (usando perfil.objetivo)
    const { data: treinoData, error: treinoError } = await supabase
      .from('treinos')
      .insert([{ usuario_id: userId, nome, descricao, objetivo: perfil.objetivo, gerado_por_ia: true }])
      .select()
      .single();

    if (treinoError) throw treinoError;
    const treinoId = treinoData.id;

    for (const [index, dia] of dias.entries()) {
      const { data: diaData, error: diaError } = await supabase
        .from('dias_treino')
        .insert([{ treino_id: treinoId, nome: dia.nome, ordem_dia: index + 1, foco: dia.foco }]) // Correção do foco aplicada aqui
        .select()
        .single();

      if (diaError) throw diaError;

      for (const [i, exercicio] of dia.exercicios.entries()) {
        let exercicioId;

        const { data: existingEx } = await supabase
          .from('exercicios')
          .select('id')
          .ilike('nome', exercicio.nome)
          .single();

        if (existingEx) {
          exercicioId = existingEx.id;
        } else {
          // Correção do equipamento aplicada aqui (Evita o erro "violates not-null constraint")
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

        const reps = parseRepeticoes(exercicio.repeticoes);
        const descanso = parseDescanso(exercicio.descanso);

        const { error: ligacaoError } = await supabase
          .from('exercicios_treino')
          .insert([{
            dia_treino_id: diaData.id, exercicio_id: exercicioId, ordem_execucao: i + 1, 
            series: parseInt(exercicio.series) || 3, repeticoes_min: reps.min, 
            repeticoes_max: reps.max, descanso_segundos: descanso, observacoes: exercicio.observacao
          }]);

        if (ligacaoError) throw ligacaoError;
      }
    }

    return res.status(201).json({ message: 'Treino e perfil salvos com sucesso!', treinoId });

  } catch (error: any) {
    console.error('Erro ao salvar treino:', error);
    return res.status(500).json({ error: 'Erro ao persistir dados.', details: error.message });
  }
};

// 2. LISTAR TREINOS (Para a tela "Meus Treinos")
export const getUserWorkouts = async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Token não fornecido.' });
    
    const token = authHeader.split(' ')[1];
    let userId;
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
      userId = decoded.id; 
    } catch (err) {
      return res.status(401).json({ error: 'Sessão inválida ou expirada.' });
    }
  
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
export const getWorkoutById = async (req: Request, res: Response) => {
  const { id } = req.params;
  
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Acesso negado.' });
  
  const token = authHeader.split(' ')[1];
  let userId;
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
    userId = decoded.id;
  } catch (err) {
    return res.status(401).json({ error: 'Sessão inválida.' });
  }

  try {
    const { data, error } = await supabase
      .from('treinos')
      .select(`
        id, nome, descricao, objetivo, criado_em,
        dias_treino (
          id, nome, ordem_dia, observacoes, foco,
          exercicios_treino (
            id, series, repeticoes_min, repeticoes_max, descanso_segundos, observacoes, ordem_execucao,
            exercicios ( nome )
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
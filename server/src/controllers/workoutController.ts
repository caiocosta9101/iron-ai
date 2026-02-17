import { Request, Response } from 'express';
import { supabase } from '../db'; // Sua instância configurada

export const createWorkout = async (req: Request, res: Response) => {
  const { nome, objetivo, nivel, dias } = req.body; 
  // 'dias' é um array de objetos: { nome: 'Treino A', exercicios: [...] }
  
  // Pegar ID do usuário autenticado (injetado pelo middleware de auth)
  const userId = (req as any).user.id; 

  try {
    // 1. Criar o Treino (Cabeçalho)
    const { data: treinoData, error: treinoError } = await supabase
      .from('treinos')
      .insert([{
        usuario_id: userId,
        nome,
        objetivo,
        nivel_dificuldade: nivel,
        gerado_por_ia: true // ou false se for manual
      }])
      .select()
      .single();

    if (treinoError) throw treinoError;

    const treinoId = treinoData.id;

    // 2. Iterar sobre os dias
    for (const [index, dia] of dias.entries()) {
      const { data: diaData, error: diaError } = await supabase
        .from('dias_treino')
        .insert([{
          treino_id: treinoId,
          nome: dia.nome, // Ex: "Treino A - Peito"
          ordem_dia: index + 1
        }])
        .select()
        .single();

      if (diaError) throw diaError;

      // 3. Iterar sobre os exercícios de cada dia
      const exerciciosParaInserir = dia.exercicios.map((ex: any, i: number) => ({
        dia_treino_id: diaData.id,
        exercicio_id: ex.id, // ID vindo da tabela 'exercicios'
        series: ex.series,
        repeticoes_min: ex.reps_min,
        repeticoes_max: ex.reps_max,
        ordem_execucao: i + 1,
        observacoes: ex.dicas
      }));

      const { error: exError } = await supabase
        .from('exercicios_treino')
        .insert(exerciciosParaInserir);

      if (exError) throw exError;
    }

    return res.status(201).json({ message: 'Treino criado com sucesso!', treinoId });

  } catch (error: any) {
    console.error('Erro ao salvar treino:', error);
    return res.status(500).json({ error: error.message });
  }
};
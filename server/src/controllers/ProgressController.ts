//
import { Response } from 'express';
import { supabase } from '../db'; // Ajuste o caminho do seu db.ts se necessário
import { AuthRequest } from '../middlewares/authMiddleware';

// 1. Estatísticas Gerais (Treinos totais e horas focadas)
export const getGeneralStats = async (req: AuthRequest, res: Response) => {
  const userId = req.userId;

  try {
    const { data: sessoes, error } = await supabase
      .from('historico_sessoes')
      .select('duracao_real_minutos')
      .eq('usuario_id', userId)
      .eq('finalizado', true);

    if (error) throw error;

    const totalTreinos = sessoes.length;
    const tempoTotalMinutos = sessoes.reduce((acc, sessao) => acc + (sessao.duracao_real_minutos || 0), 0);
    const tempoTotalHoras = Math.floor(tempoTotalMinutos / 60);

    return res.status(200).json({ 
      totalTreinos, 
      tempoTotalHoras,
      tempoTotalMinutos
    });
  } catch (error) {
    console.error('Erro ao buscar stats:', error);
    return res.status(500).json({ error: 'Erro ao buscar estatísticas gerais.' });
  }
};

// 2. Progressão de um Exercício Específico (Carga Máxima e Volume Total)
export const getExerciseProgression = async (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  const { exerciseId } = req.params;

  try {
    // Busca as execuções fazendo um INNER JOIN com a tabela de sessões para pegar a data e filtrar pelo usuário
    const { data, error } = await supabase
      .from('historico_execucao_exercicio')
      .select(`
        cargas_kg,
        repeticoes,
        historico_sessoes!inner ( data_treino, usuario_id )
      `)
      .eq('historico_sessoes.usuario_id', userId)
      .eq('exercicio_id', exerciseId);

    if (error) throw error;

    // Descompacta os arrays para calcular a carga máxima e o volume (peso x reps) de cada dia
    const progression = data.map((exec: any) => {
      const maxCarga = Math.max(...exec.cargas_kg, 0);
      
      let volumeTotal = 0;
      for (let i = 0; i < exec.cargas_kg.length; i++) {
        volumeTotal += (exec.cargas_kg[i] || 0) * (exec.repeticoes[i] || 0);
      }

      return {
        data: exec.historico_sessoes.data_treino.split('T')[0],
        maxCarga,
        volumeTotal
      };
    }).sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime()); // Ordena da data mais antiga para a mais nova

    return res.status(200).json(progression);
  } catch (error) {
    console.error('Erro ao buscar progressão:', error);
    return res.status(500).json({ error: 'Erro ao buscar progressão do exercício.' });
  }
};
// 3. Busca apenas os exercícios que estão nos treinos do usuário (Para o Select)
export const getUserExercisesByWorkout = async (req: AuthRequest, res: Response): Promise<any> => {
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ error: 'Usuário não autenticado.' });
  }

  try {
    // Busca os treinos, os dias (Treino A, B) e os exercícios vinculados a eles
    const { data: treinos, error } = await supabase
      .from('treinos')
      .select(`
        nome,
        dias_treino (
          nome,
          exercicios_treino (
            exercicios (
              id,
              nome
            )
          )
        )
      `)
      .eq('usuario_id', userId);

    if (error) throw error;

    // Molda os dados para facilitar a renderização no frontend com <optgroup>
    const formattedData = treinos.flatMap((treino: any) => 
      treino.dias_treino.map((dia: any) => ({
        treinoNome: treino.nome,
        diaNome: dia.nome,
        // Remove nulos e extrai apenas id e nome do exercício
        exercicios: dia.exercicios_treino
          .filter((et: any) => et.exercicios)
          .map((et: any) => ({
            id: et.exercicios.id,
            nome: et.exercicios.nome
          }))
      }))
    );

    return res.status(200).json(formattedData);
  } catch (error) {
    console.error('Erro ao buscar exercícios por treino:', error);
    return res.status(500).json({ error: 'Erro ao buscar lista de exercícios.' });
  }
};
// 4. Resumo de Volume por Grupo Muscular (Últimos 7 dias)
export const getWeeklyMuscleStats = async (req: AuthRequest, res: Response): Promise<any> => {
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ error: 'Usuário não autenticado.' });
  }

  try {
    // Define a data de corte para os últimos 7 dias
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Busca os dados fazendo os JOINs necessários para pegar o grupo muscular (agora grupo_pai)
    const { data, error } = await supabase
      .from('historico_execucao_exercicio')
      .select(`
        cargas_kg,
        repeticoes,
        historico_sessoes!inner ( usuario_id, data_treino ),
        exercicios!inner ( nome, grupo_pai )
      `)
      .eq('historico_sessoes.usuario_id', userId)
      .gte('historico_sessoes.data_treino', sevenDaysAgo.toISOString());

    if (error) throw error;

    // Objeto para acumular os cálculos
    const statsPorGrupo: Record<string, any> = {};

    data.forEach((row: any) => {
      const grupo = row.exercicios.grupo_pai; // <-- Atualizado aqui
      const exercicio = row.exercicios.nome;
      const cargas = row.cargas_kg || [];
      const reps = row.repeticoes || [];

      // Se o grupo muscular ainda não existe no objeto, inicializa ele
      if (!statsPorGrupo[grupo]) {
        statsPorGrupo[grupo] = {
          grupo_pai: grupo, // <-- Atualizado aqui
          totalSeries: 0,
          totalReps: 0,
          volumeTotal: 0,
          detalhesExercicios: {} 
        };
      }

      if (!statsPorGrupo[grupo].detalhesExercicios[exercicio]) {
        statsPorGrupo[grupo].detalhesExercicios[exercicio] = { maxCarga: 0 };
      }

      // Calcula a sessão atual
      const seriesConcluidas = cargas.length;
      let repsNesteExercicio = 0;
      let volumeNesteExercicio = 0;
      let maxCargaNesteExercicio = 0;

      for (let i = 0; i < seriesConcluidas; i++) {
        repsNesteExercicio += reps[i];
        volumeNesteExercicio += (cargas[i] * reps[i]);
        if (cargas[i] > maxCargaNesteExercicio) {
          maxCargaNesteExercicio = cargas[i];
        }
      }

      // Acumula os totais no grupo
      statsPorGrupo[grupo].totalSeries += seriesConcluidas;
      statsPorGrupo[grupo].totalReps += repsNesteExercicio;
      statsPorGrupo[grupo].volumeTotal += volumeNesteExercicio;

      // Atualiza a carga máxima geral do exercício se a atual for maior
      if (maxCargaNesteExercicio > statsPorGrupo[grupo].detalhesExercicios[exercicio].maxCarga) {
        statsPorGrupo[grupo].detalhesExercicios[exercicio].maxCarga = maxCargaNesteExercicio;
      }
    });

    // Converte o objeto de volta para um array para o frontend conseguir renderizar
    const arrayFormatado = Object.values(statsPorGrupo).map((g: any) => ({
      grupo_pai: g.grupo_pai, // <-- Atualizado aqui
      totalSeries: g.totalSeries,
      totalReps: g.totalReps,
      volumeTotal: g.volumeTotal,
      exercicios: Object.entries(g.detalhesExercicios).map(([nome, dados]: any) => ({
        nome,
        maxCarga: dados.maxCarga
      }))
    })).sort((a, b) => b.totalSeries - a.totalSeries); 

    return res.status(200).json(arrayFormatado);
  } catch (error) {
    console.error('Erro ao calcular volume muscular:', error);
    return res.status(500).json({ error: 'Erro ao processar estatísticas semanais.' });
  }
};
import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';
import { supabase } from '../db';

// =============================================================
// SINGLETON DO GEMINI
// =============================================================
const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// =============================================================
// SCHEMA DE VALIDAÇÃO (Zod)
// =============================================================
const generateSchema = z.object({
  objetivo: z.string().min(1).max(100),
  idade: z.number().int().min(10).max(100),
  peso: z.number().min(20).max(300),
  altura: z.number().min(100).max(250),
  limitacoes: z.string().max(500).optional(),
  dias: z.number().int().min(1).max(7),
  tempo: z.number().int().min(15).max(180),
  nivel: z.enum(['Iniciante', 'Intermediário', 'Avançado']),
});

// =============================================================
// HELPER: SANITIZAÇÃO DE TEXTO LIVRE
// =============================================================
const sanitize = (str: string) => str.replace(/[<>"]/g, '').trim();

export const generateWorkout = async (req: AuthRequest, res: Response) => {
  
  // GUARDA 1: VERIFICAÇÃO DE CONFIGURAÇÃO
  if (!apiKey || !genAI) {
    console.error('GEMINI_API_KEY não configurada no ambiente!');
    return res.status(500).json({ error: 'Erro de configuração do servidor.' });
  }

  // GUARDA 2: VALIDAÇÃO DO BODY
  const parsed = generateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error!.issues });
  }

  const { objetivo, idade, peso, altura, limitacoes, dias, tempo, nivel } = parsed.data;

  // GUARDA 3: RATE LIMIT POR USUÁRIO
  const hoje = new Date().toISOString().split('T')[0];

  const { count, error: countError } = await supabase
    .from('treinos')
    .select('*', { count: 'exact', head: true })
    .eq('usuario_id', req.userId)
    .eq('gerado_por_ia', true)
    .gte('criado_em', hoje);

  if (countError) {
    console.error('Erro ao verificar limite de geração:', countError);
    return res.status(500).json({ error: 'Erro interno ao verificar limite.' });
  }

  if ((count ?? 0) >= 3) {
    return res.status(429).json({
      error: 'Limite diário de geração de treinos atingido. Tente novamente amanhã.',
    });
  }

  // =============================================================
  // GUARDA 4: BUSCAR BIBLIOTECA PARA LIMITAR A IA
  // =============================================================
  const { data: exerciciosDB, error: dbError } = await supabase
    .from('exercicios')
    .select('id, nome, grupo_pai, musculo_primario, equipamentos(nome)');

  if (dbError) {
    console.error('Erro ao buscar biblioteca para a IA:', dbError);
    return res.status(500).json({ error: 'Erro ao conectar com a base de exercícios.' });
  }

  // Formata os exercícios numa lista de texto para a IA ler, incluindo o ID invisível para o usuário final
  const bibliotecaContext = exerciciosDB && exerciciosDB.length > 0
    ? exerciciosDB.map((ex: any) => `- [ID: ${ex.id}] ${ex.nome} (Foco: ${ex.musculo_primario} | Equipamento: ${ex.equipamentos?.nome || 'Peso Corporal'})`).join('\n')
    : 'Nenhum exercício encontrado.';

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-3-flash-preview",
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.7,
      }
    });

    const limitacoesSafe = limitacoes
      ? sanitize(limitacoes)
      : 'Nenhuma restrição declarada.';

    const prompt = `
      Atue como um Personal Trainer de elite e fisiologista.
      Crie um plano de treino de musculação completo e seguro.

      DADOS DO ALUNO:
      - Perfil: ${idade} anos, ${peso}kg, ${altura}cm.
      - Nível de Experiência: ${nivel}
      - Objetivo Principal: ${objetivo}
      - Disponibilidade: ${dias} dias por semana, ${tempo} minutos por treino.
      
      ⚠️ RESTRIÇÕES MÉDICAS / LESÕES:
      "${limitacoesSafe}"

      📚 BIBLIOTECA DE EXERCÍCIOS PERMITIDOS (CRÍTICO):
      Você é OBRIGADO a montar o treino utilizando EXCLUSIVAMENTE os exercícios listados abaixo.
      NÃO invente exercícios novos, não use sinônimos e copie o nome exatamente como está na lista:
      
      ${bibliotecaContext}
      
      DIRETRIZES DE SEGURANÇA (CRÍTICO):
      1. Se houver lesões citadas acima, você DEVE excluir exercícios que sobrecarreguem a região afetada.
      2. Substitua movimentos perigosos por variantes biomecanicamente seguras da Biblioteca.

      FORMATO DE RESPOSTA (JSON OBRIGATÓRIO):
      Responda apenas com um objeto JSON seguindo estritamente esta estrutura (atenção aos campos numéricos):
      {
        "nome": "Nome criativo e motivador do programa",
        "descricao": "Explicação técnica resumida do foco da periodização",
        "duracao_semanas": 6, // Estipule entre 4 a 8 semanas para a duração ideal deste ciclo
        "dias": [
          {
            "nome": "Treino A - [Foco]",
            "foco": "Empurrar/Puxar/Pernas/Fullbody",
            "exercicios": [
              {
                "exercicio_id": "O ID exato copiado da tag [ID: ...] da biblioteca",
                "nome": "Nome EXATO do Exercício copiado da biblioteca",
                "grupo_pai": "Categoria principal",
                "musculo_primario": "Músculo alvo",
                "series": 4,
                "repeticoes_min": 8,
                "repeticoes_max": 12,
                "descanso_segundos": 60,
                "observacao": "Dica de segurança ou técnica"
              }
            ]
          }
        ]
      }
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const treinoGerado = JSON.parse(responseText);

    console.log(`Treino gerado com sucesso: ${treinoGerado.nome}`);

    return res.json(treinoGerado);

  } catch (error: any) {
    console.error('Erro ao gerar treino com Gemini:', error);
    return res.status(500).json({
      error: 'Falha na inteligência artificial. Tente novamente em instantes.',
    });
  }
};


// =============================================================
// CRON JOB: GERAÇÃO AUTOMÁTICA DE RELATÓRIOS (SEMANAL/FINAL)
// =============================================================
export const generatePeriodicReports = async (req: Request, res: Response) => {
  try {
    // GUARDA 1: SEGURANÇA DO VERCEL CRON
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.warn('Tentativa de acesso não autorizada ao Cron Job.');
      return res.status(401).json({ error: 'Não autorizado.' });
    }

    if (!genAI) {
      return res.status(500).json({ error: 'Gemini não configurado.' });
    }
    //modo teste
    //const hoje = '2026-03-10'
    const hoje = new Date().toISOString().split('T')[0];

    // Busca todos os treinos ativos
    const { data: treinosAtivos, error: treinosError } = await supabase
      .from('treinos')
      .select('id, usuario_id, data_inicio, data_fim, nome')
      .eq('status', 'ativo')
      .not('data_inicio', 'is', null)
      .not('data_fim', 'is', null);

    if (treinosError || !treinosAtivos) {
      throw new Error('Erro ao buscar treinos ativos no banco.');
    }

    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
    let relatoriosGerados = 0;

    for (const treino of treinosAtivos) {
      
      const dataInicio = new Date(treino.data_inicio);
      const dataFim = new Date(treino.data_fim);
      const dataHoje = new Date(hoje);

      const diffTime = Math.abs(dataHoje.getTime() - dataInicio.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let tipoRelatorio: 'semanal' | 'final' | null = null;

      if (hoje === treino.data_fim) {
        tipoRelatorio = 'final';
      } else if (diffDays > 0 && diffDays % 7 === 0) {
        tipoRelatorio = 'semanal';
      }

      if (tipoRelatorio) {
        
        // ====================================================================
        // 1. COLETA DE DADOS REAIS DA SEMANA OU PERÍODO (O "TREINO REAL")
        // ====================================================================
        const dataFimBusca = hoje;
        const dataInicioBusca = treino.data_inicio;

        const { data: sessoes, error: sessoesError } = await supabase
          .from('historico_sessoes')
          .select(`
            id,
            duracao_real_minutos,
            historico_execucao_exercicio (
              observacoes,
              cargas_kg,
              exercicios ( nome )
            )
          `)
          .eq('usuario_id', treino.usuario_id)
          .eq('finalizado', true)
          .gte('data_treino', dataInicioBusca)
          .lte('data_treino', dataFimBusca);

        if (sessoesError) {
          console.error(`Erro ao buscar sessões do treino ${treino.id}:`, sessoesError);
          continue; 
        }

        // PROCESSAMENTO DE DADOS
        const totalTreinosConcluidos = sessoes?.length || 0;
        let tempoTotal = 0;
        const observacoesArray: string[] = [];
        const evoluçãoCargasMap: Record<string, number[]> = {};

        sessoes?.forEach(sessao => {
          tempoTotal += sessao.duracao_real_minutos || 0;

          sessao.historico_execucao_exercicio?.forEach((exec: any) => {
            // Verifica se a relação retornou como array ou objeto único
            const nomeExercicio = Array.isArray(exec.exercicios) 
                ? exec.exercicios[0]?.nome 
                : exec.exercicios?.nome || 'Exercício Desconhecido';

            if (exec.observacoes && exec.observacoes.trim() !== '') {
              observacoesArray.push(`- ${nomeExercicio}: ${exec.observacoes}`);
            }

            if (exec.cargas_kg && exec.cargas_kg.length > 0) {
              const cargaMaxDoDia = Math.max(...exec.cargas_kg);
              if (!evoluçãoCargasMap[nomeExercicio]) evoluçãoCargasMap[nomeExercicio] = [];
              evoluçãoCargasMap[nomeExercicio].push(cargaMaxDoDia);
            }
          });
        });

        const tempoMedioTreino = totalTreinosConcluidos > 0 
          ? Math.round(tempoTotal / totalTreinosConcluidos) + " minutos" 
          : "Nenhum treino registrado no período.";

        const observacoesUsuario = observacoesArray.length > 0 
          ? observacoesArray.join('\n') 
          : "Nenhuma dor, facilidade ou observação registrada pelo usuário.";

        const destaquesCarga = Object.entries(evoluçãoCargasMap)
          .map(([nome, cargas]) => {
            if (cargas.length < 2) return null; 
            const cargaInicial = cargas[0];
            const cargaFinal = cargas[cargas.length - 1];
            
            if (cargaInicial === cargaFinal) return null; 
            
            const tendencia = cargaFinal > cargaInicial ? '📈 Evoluiu' : '📉 Regrediu';
            return `- ${nome}: de ${cargaInicial}kg para ${cargaFinal}kg (${tendencia})`;
          })
          .filter(Boolean)
          .join('\n') || "Cargas mantidas constantes ou dados insuficientes.";

        // ====================================================================
        // 2. CONSTRUÇÃO DO PROMPT
        // ====================================================================
        let prompt = `
          Atue como um Personal Trainer de Elite e Fisiologista do Exercício.
          O aluno está executando o programa de treinamento "${treino.nome}".
        `;

        if (tipoRelatorio === 'semanal') {
          prompt += `
            OBJETIVO: Avaliar o desempenho da semana e fazer micro-ajustes para a próxima semana.

            DADOS REAIS DA SEMANA:
            - Treinos concluídos: ${totalTreinosConcluidos}
            - Tempo médio de treino: ${tempoMedioTreino}
            - Evolução/Estagnação de Cargas (Comparativo início vs fim da semana): 
            ${destaquesCarga}
            - Feedback do Aluno: 
            ${observacoesUsuario}

            DIRETRIZES DO RELATÓRIO (Formato Markdown):
            1. Análise de Aderência e Volume: Comente sobre a frequência e o tempo.
            2. Análise de Cargas: Avalie a progressão relatada baseada nos dados.
            3. Resposta ao Feedback: Se houver relato de dor ou dificuldade, sugira adaptações técnicas.
            4. Meta da Próxima Semana: Dê uma instrução clara e única para os próximos 7 dias.
            
            Tom: Direto, técnico e profissional.
          `;
        } else if (tipoRelatorio === 'final') {
          prompt += `
            OBJETIVO: Fechamento da periodização (mesociclo) e diretrizes para o próximo ciclo.

            DADOS GERAIS DO CICLO:
            - Total de treinos realizados: ${totalTreinosConcluidos}
            - Evolução Geral de Cargas no período: 
            ${destaquesCarga}
            - Dificuldades recorrentes relatadas: 
            ${observacoesUsuario}

            DIRETRIZES DO RELATÓRIO FINAL (Formato Markdown):
            
            ## 📊 Raio-X da Periodização
            Balanço técnico do que foi alcançado com base nos treinos concluídos e cargas.

            ## ⚠️ Pontos de Atenção
            Liste falhas mecânicas ou estagnações notadas nos dados e como corrigir.

            ## 🎯 Prescrição para o Próximo Ciclo (CRÍTICO)
            Determine O QUE DEVE SER FEITO na próxima periodização com base nos resultados. Seja específico.
          `;
        }

        const result = await model.generateContent(prompt);
        const conteudoIA = result.response.text();

        // Salva o relatório no banco de dados
        await supabase.from('relatorios_ia').insert({
          usuario_id: treino.usuario_id,
          treino_id: treino.id,
          tipo: tipoRelatorio,
          conteudo: conteudoIA
        });

        // Se for final, conclui o treino
        if (tipoRelatorio === 'final') {
          await supabase
            .from('treinos')
            .update({ status: 'concluida' })
            .eq('id', treino.id);
        }

        relatoriosGerados++;
      }
    }

    return res.status(200).json({ 
      message: 'Rotina de análise concluída com sucesso.',
      relatoriosGerados: relatoriosGerados 
    });

  } catch (error: any) {
    console.error('Erro no processamento do Cron:', error);
    return res.status(500).json({ error: 'Falha interna na geração de relatórios.' });
  }
};

// =============================================================
// BUSCAR RELATÓRIOS DO USUÁRIO (FRONTEND)
// =============================================================
export const getUserReports = async (req: AuthRequest, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('relatorios_ia')
      .select('*, treinos(nome)') // Traz os dados do relatório e o nome do treino vinculado
      .eq('usuario_id', req.userId)
      .order('data_geracao', { ascending: false });

    if (error) throw error;

    return res.status(200).json(data);
  } catch (error: any) {
    console.error('Erro ao buscar relatórios da IA:', error);
    return res.status(500).json({ error: 'Erro ao carregar seus relatórios.' });
  }
};
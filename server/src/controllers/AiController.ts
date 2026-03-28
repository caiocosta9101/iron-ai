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
  incluir_cardio: z.boolean().optional().default(true), // Novo campo de Cardio
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

  const { objetivo, idade, peso, altura, limitacoes, dias, tempo, nivel, incluir_cardio } = parsed.data;

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
  // INCLUINDO A COLUNA CATEGORIA
  const { data: exerciciosDB, error: dbError } = await supabase
    .from('exercicios')
    .select('id, nome, categoria, grupo_pai, musculo_primario, equipamentos(nome)');

  if (dbError) {
    console.error('Erro ao buscar biblioteca para a IA:', dbError);
    return res.status(500).json({ error: 'Erro ao conectar com a base de exercícios.' });
  }

  // Formata os exercícios numa lista de texto para a IA ler
  const bibliotecaContext = exerciciosDB && exerciciosDB.length > 0
    ? exerciciosDB.map((ex: any) => `- [ID: ${ex.id} | Tipo: ${ex.categoria.toUpperCase()}] ${ex.nome} (Foco: ${ex.musculo_primario} | Equipamento: ${ex.equipamentos?.nome || 'Peso Corporal'})`).join('\n')
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

    // Adiciona diretriz de cardio dinamicamente
    const diretrizCardio = incluir_cardio 
      ? `O aluno deseja INCLUIR exercícios da categoria CARDIO. Use sua expertise para distribuí-los adequadamente. Para os exercícios de cardio, você DEVE preencher os campos "tempo_meta_minutos" (ex: 20, 30) e "distancia_meta_km" (ex: 3.5, 5.0) com metas factíveis, e deixar "series", "repeticoes_min", "repeticoes_max" e "descanso_segundos" como null.`
      : `O aluno NÃO DESEJA cardio. Foque EXCLUSIVAMENTE em exercícios da categoria FORCA.`;

    const prompt = `
      Atue como um Personal Trainer de elite e fisiologista.
      Crie um plano de treino completo e seguro.

      DADOS DO ALUNO:
      - Perfil: ${idade} anos, ${peso}kg, ${altura}cm.
      - Nível de Experiência: ${nivel}
      - Objetivo Principal: ${objetivo}
      - Disponibilidade: ${dias} dias por semana, ${tempo} minutos por treino.
      
      ⚠️ RESTRIÇÕES MÉDICAS / LESÕES:
      "${limitacoesSafe}"

      🏃 DIRETRIZ DE CARDIO:
      ${diretrizCardio}

      📚 BIBLIOTECA DE EXERCÍCIOS PERMITIDOS (CRÍTICO):
      Você é OBRIGADO a montar o treino utilizando EXCLUSIVAMENTE os exercícios listados abaixo.
      NÃO invente exercícios novos, não use sinônimos e copie o nome exatamente como está na lista:
      
      ${bibliotecaContext}
      
      DIRETRIZES DE SEGURANÇA (CRÍTICO):
      1. Se houver lesões citadas acima, você DEVE excluir exercícios que sobrecarreguem a região afetada.
      2. Substitua movimentos perigosos por variantes biomecanicamente seguras da Biblioteca.

      FORMATO DE RESPOSTA (JSON OBRIGATÓRIO):
      Responda apenas com um objeto JSON seguindo estritamente esta estrutura (atenção às colunas nulas para cardio):
      {
        "nome": "Nome criativo e motivador do programa",
        "descricao": "Explicação técnica resumida do foco da periodização",
        "duracao_semanas": 6, 
        "dias": [
          {
            "nome": "Treino A - [Foco]",
            "foco": "Empurrar/Puxar/Pernas/Fullbody/Cardio",
            "exercicios": [
              {
                "exercicio_id": "O ID exato copiado da tag [ID: ...] da biblioteca",
                "nome": "Nome EXATO do Exercício",
                "grupo_pai": "Categoria principal",
                "musculo_primario": "Músculo alvo",
                "series": 4, // NULO se o exercício for do tipo CARDIO
                "repeticoes_min": 8, // NULO se o exercício for do tipo CARDIO
                "repeticoes_max": 12, // NULO se o exercício for do tipo CARDIO
                "descanso_segundos": 60, // NULO se o exercício for do tipo CARDIO
                "tempo_meta_minutos": null, // Preencha APENAS se for CARDIO (ex: 30)
                "distancia_meta_km": null, // Preencha APENAS se for CARDIO (ex: 5.5)
                "observacao": "Dica de segurança, técnica ou pace alvo"
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
    
    const hoje = new Date().toISOString().split('T')[0];

    const { data: treinosAtivos, error: treinosError } = await supabase
      .from('treinos')
      .select('id, usuario_id, data_inicio, data_fim, nome')
      .eq('status', 'ativo')
      .not('data_inicio', 'is', null)
      .not('data_fim', 'is', null);

    if (treinosError || !treinosAtivos) {
      throw new Error('Erro ao buscar treinos ativos no banco.');
    }

    const activeTreinoIds = treinosAtivos.map(t => t.id);
    const { data: relatoriosExistentes } = await supabase
      .from('relatorios_ia')
      .select('treino_id')
      .in('treino_id', activeTreinoIds)
      .eq('tipo', 'semanal');

    const contagemRelatorios: Record<number, number> = {};
    relatoriosExistentes?.forEach(rel => {
      contagemRelatorios[rel.treino_id] = (contagemRelatorios[rel.treino_id] || 0) + 1;
    });

    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
    let relatoriosGerados = 0;

    for (const treino of treinosAtivos) {
      
      const dataHoje = new Date(hoje + 'T00:00:00');
      const dataInicioTreino = new Date(treino.data_inicio + 'T00:00:00');

      const diffTime = Math.abs(dataHoje.getTime() - dataInicioTreino.getTime());
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      
      const semanasDecorridas = Math.floor(diffDays / 7);
      const qtdJaGerada = contagemRelatorios[treino.id] || 0;

      let tipoRelatorio: 'semanal' | 'final' | null = null;
      let semanaSendoAnalisada = 0;

      if (hoje >= treino.data_fim) {
        tipoRelatorio = 'final';
      } else if (semanasDecorridas > qtdJaGerada) {
        tipoRelatorio = 'semanal';
        semanaSendoAnalisada = qtdJaGerada + 1; 
      }

      if (tipoRelatorio) {
        
        const dataInicioBusca = treino.data_inicio;
        
        const dataCorte = new Date(treino.data_inicio + 'T00:00:00');
        dataCorte.setDate(dataCorte.getDate() + (semanaSendoAnalisada * 7));
        
        const dataFimBusca = tipoRelatorio === 'semanal' 
          ? dataCorte.toISOString().split('T')[0] 
          : hoje;

        // INCLUINDO DADOS DE CARDIO NA QUERY
        const { data: sessoes, error: sessoesError } = await supabase
          .from('historico_sessoes')
          .select(`
            id,
            duracao_real_minutos,
            historico_execucao_exercicio (
              observacoes,
              cargas_kg,
              tempo_real_minutos,
              distancia_real_km,
              exercicios ( nome, categoria )
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

        const totalTreinosConcluidos = sessoes?.length || 0;
        let tempoTotal = 0;
        const observacoesArray: string[] = [];
        const evoluçãoCargasMap: Record<string, number[]> = {};

        sessoes?.forEach(sessao => {
          tempoTotal += sessao.duracao_real_minutos || 0;

          sessao.historico_execucao_exercicio?.forEach((exec: any) => {
            const nomeExercicio = Array.isArray(exec.exercicios) 
                ? exec.exercicios[0]?.nome 
                : exec.exercicios?.nome || 'Exercício Desconhecido';
            
            const categoria = Array.isArray(exec.exercicios) 
                ? exec.exercicios[0]?.categoria 
                : exec.exercicios?.categoria;

            // ==========================================
            // LÓGICA DE CARDIO (Cálculo de Pace)
            // ==========================================
            let textoCardio = "";
            if (categoria === 'cardio' && (exec.tempo_real_minutos || exec.distancia_real_km)) {
              if (exec.tempo_real_minutos && exec.distancia_real_km) {
                const paceDecimal = exec.tempo_real_minutos / exec.distancia_real_km;
                const paceMinutos = Math.floor(paceDecimal);
                const paceSegundos = Math.round((paceDecimal - paceMinutos) * 60);
                const paceFormatado = `${paceMinutos}:${paceSegundos.toString().padStart(2, '0')}`;
                textoCardio = ` [Desempenho: ${exec.distancia_real_km}km em ${exec.tempo_real_minutos}min | Pace: ${paceFormatado}/km]`;
              } else {
                textoCardio = ` [Desempenho: ${exec.tempo_real_minutos ? exec.tempo_real_minutos + 'min ' : ''}${exec.distancia_real_km ? exec.distancia_real_km + 'km' : ''}]`;
              }
            }

            // Agrupa observações com o desempenho de cardio (se houver)
            if (exec.observacoes && exec.observacoes.trim() !== '') {
              observacoesArray.push(`- ${nomeExercicio}${textoCardio}: ${exec.observacoes}`);
            } else if (textoCardio !== "") {
              observacoesArray.push(`- ${nomeExercicio}${textoCardio}`);
            }

            // ==========================================
            // LÓGICA DE FORÇA (Picos de Carga)
            // ==========================================
            if (categoria !== 'cardio' && exec.cargas_kg && exec.cargas_kg.length > 0) {
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

        let prompt = `
          Atue como um Personal Trainer de Elite e Fisiologista do Exercício.
          O aluno está executando o programa de treinamento "${treino.nome}".
        `;

        if (tipoRelatorio === 'semanal') {
          prompt += `
            OBJETIVO: Avaliar o progresso ACUMULADO até a Semana ${semanaSendoAnalisada} (Período analisado: ${dataInicioBusca} a ${dataFimBusca}) e fazer micro-ajustes para a próxima semana.

            DADOS DE TODO O HISTÓRICO ATÉ O MOMENTO:
            - Total de treinos concluídos no ciclo: ${totalTreinosConcluidos}
            - Tempo médio geral de treino: ${tempoMedioTreino}
            - Evolução/Estagnação de Cargas (Comparativo desde o Dia 1 até hoje): 
            ${destaquesCarga}
            - Histórico completo de Feedback do Aluno: 
            ${observacoesUsuario}

            DIRETRIZES DO RELATÓRIO (Formato Markdown):
            1. Análise de Consistência: Avalie o volume total acumulado.
            2. Análise de Cargas e Cardio: Avalie a progressão de cargas e o Pace/Tempo nos exercícios aeróbicos.
            3. Resposta ao Feedback: Adapte baseado nas dores ou facilidades acumuladas.
            4. Meta da Próxima Semana: Dê uma instrução clara e única para os próximos 7 dias.
            
            Tom: Direto, técnico e profissional. Evite introduções genéricas.
          `;
        } else if (tipoRelatorio === 'final') {
          const totalSemanasDoCiclo = Math.floor(diffDays / 7);
          prompt += `
            OBJETIVO: Fechamento da periodização completa de ${totalSemanasDoCiclo} semanas (Período: ${treino.data_inicio} a ${hoje}) e diretrizes para o próximo ciclo.

            DADOS GERAIS DO CICLO COMPLETO:
            - Total de treinos realizados no período: ${totalTreinosConcluidos}
            - Evolução Geral de Cargas desde o dia 1: 
            ${destaquesCarga}
            - Dificuldades recorrentes relatadas no ciclo e Desempenho Aeróbico: 
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

        await supabase.from('relatorios_ia').insert({
          usuario_id: treino.usuario_id,
          treino_id: treino.id,
          tipo: tipoRelatorio,
          conteudo: conteudoIA
        });

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
      .select('*, treinos(nome)')
      .eq('usuario_id', req.userId)
      .order('data_geracao', { ascending: false });

    if (error) throw error;

    return res.status(200).json(data);
  } catch (error: any) {
    console.error('Erro ao buscar relatórios da IA:', error);
    return res.status(500).json({ error: 'Erro ao carregar seus relatórios.' });
  }
};
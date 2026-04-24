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
      // Limpando a data para não gerar bugs com timestamps do Supabase
      const dataInicioLimpa = treino.data_inicio.split('T')[0].split(' ')[0];
      const dataInicioTreino = new Date(dataInicioLimpa + 'T00:00:00');

      const diffTime = Math.abs(dataHoje.getTime() - dataInicioTreino.getTime());
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      
      const semanasDecorridas = Math.floor(diffDays / 7);
      const qtdJaGerada = contagemRelatorios[treino.id] || 0;

      // --- LOG PARA DEBUG ---
      console.log(`Treino ID: ${treino.id} | Dias: ${diffDays} | Semanas Decorridas: ${semanasDecorridas} | Já Gerados: ${qtdJaGerada}`);

      let tipoRelatorio: 'semanal' | 'final' | null = null;
      let semanaSendoAnalisada = 0;

      if (hoje >= treino.data_fim) {
        tipoRelatorio = 'final';
      } else if (semanasDecorridas > qtdJaGerada) {
        tipoRelatorio = 'semanal';
        semanaSendoAnalisada = qtdJaGerada + 1; 
      }

      if (tipoRelatorio) {
        
        const dataInicioBusca = dataInicioLimpa;
        
        const dataCorte = new Date(dataInicioLimpa + 'T00:00:00');
        dataCorte.setDate(dataCorte.getDate() + (semanaSendoAnalisada * 7));
        
        const dataFimBusca = tipoRelatorio === 'semanal' 
          ? dataCorte.toISOString().split('T')[0] 
          : hoje;

        // INCLUINDO A BUSCA PELO NOME DO TREINO (dias_treino)
        const { data: sessoes, error: sessoesError } = await supabase
          .from('historico_sessoes')
          .select(`
            id,
            data_treino,
            duracao_real_minutos,
            dias_treino ( nome ),
            historico_execucao_exercicio (
              observacoes,
              tipo,
              exercicios ( nome, categoria, musculo_primario ),
              execucao_forca_detalhes ( cargas_kg, repeticoes, descansos_segundos ),
              execucao_cardio_detalhes ( tempo_real_minutos, distancia_real_km),
              execucao_isometrico_detalhes ( tempos_reais_segundos, descansos_segundos ),
              execucao_hiit_detalhes ( rounds_completados )
            )
          `)
          .eq('usuario_id', treino.usuario_id)
          .eq('finalizado', true)
          .gte('data_treino', dataInicioBusca)
          .lte('data_treino', dataFimBusca)
          .order('data_treino', { ascending: true });

        if (sessoesError) {
          console.error(`Erro ao buscar sessões do treino ${treino.id}:`, sessoesError);
          continue; 
        }

        const totalTreinosConcluidos = sessoes?.length || 0;
        let tempoTotal = 0;

        const dadosMapeados = (sessoes || []).map(sessao => {
          tempoTotal += sessao.duracao_real_minutos || 0;
          
          // Extraindo o nome do split de treino de forma segura
          const nomeDiaTreino = sessao.dias_treino ? (Array.isArray(sessao.dias_treino) ? sessao.dias_treino[0]?.nome : (sessao.dias_treino as any).nome) : `Treino do dia ${sessao.data_treino}`;

          const exerciciosProcessados = (sessao.historico_execucao_exercicio || []).map((exec: any) => {
            const exercicioRef = Array.isArray(exec.exercicios) ? exec.exercicios[0] : exec.exercicios;
            const nomeExercicio = exercicioRef?.nome || 'Desconhecido';
            const categoria = exercicioRef?.categoria || 'forca';
            const musculo = exercicioRef?.musculo_primario || 'N/A';

            let detalhesProcessados = {};

            const forcaData = Array.isArray(exec.execucao_forca_detalhes) ? exec.execucao_forca_detalhes[0] : exec.execucao_forca_detalhes;
            const cardioData = Array.isArray(exec.execucao_cardio_detalhes) ? exec.execucao_cardio_detalhes[0] : exec.execucao_cardio_detalhes;
            const isoData = Array.isArray(exec.execucao_isometrico_detalhes) ? exec.execucao_isometrico_detalhes[0] : exec.execucao_isometrico_detalhes;
            const hiitData = Array.isArray(exec.execucao_hiit_detalhes) ? exec.execucao_hiit_detalhes[0] : exec.execucao_hiit_detalhes;

            if (exec.tipo === 'forca' && forcaData) {
              const cargas = forcaData.cargas_kg || [];
              const reps = forcaData.repeticoes || [];
              const descansos = forcaData.descansos_segundos || [];

              const carga_maxima = cargas.length > 0 ? Math.max(...cargas) : 0;
              let volume_total = 0;
              for (let i = 0; i < Math.min(cargas.length, reps.length); i++) {
                volume_total += (cargas[i] * reps[i]);
              }
              const descanso_medio = descansos.length > 0 ? Math.round(descansos.reduce((a:number,b:number)=>a+b,0)/descansos.length) : 0;

              // FIX: Formatando a string de séries (Ex: "12x12x10 reps / 39kg")
              let series_formatadas = "N/A";
              if (reps.length > 0) {
                series_formatadas = `${reps.join('x')} reps / ${carga_maxima}kg`;
              }

              detalhesProcessados = { 
                series_formatadas: series_formatadas,
                carga_maxima_kg: carga_maxima, 
                volume_total_kg: volume_total, 
                descanso_medio_segundos: descanso_medio 
              };
            
            } else if (exec.tipo === 'cardio' && cardioData) {
              let paceFormatado = null;
              if (cardioData.tempo_real_minutos && cardioData.distancia_real_km) {
                 const paceDecimal = cardioData.tempo_real_minutos / cardioData.distancia_real_km;
                 const pMin = Math.floor(paceDecimal);
                 const pSeg = Math.round((paceDecimal - pMin) * 60);
                 paceFormatado = `${pMin}:${pSeg.toString().padStart(2, '0')}`;
              }
              detalhesProcessados = { 
                tempo_minutos: cardioData.tempo_real_minutos, 
                distancia_km: cardioData.distancia_real_km, 
                pace: paceFormatado 
              };
            
            } else if (exec.tipo === 'isometrico' && isoData) {
              const tempos = isoData.tempos_reais_segundos || [];
              const tempo_total_tensao = tempos.reduce((a:number,b:number)=>a+b,0);
              detalhesProcessados = { tempo_total_tensao_segundos: tempo_total_tensao };
            
            } else if (exec.tipo === 'hiit' && hiitData) {
              detalhesProcessados = { rounds_completados: hiitData.rounds_completados };
            }

            return {
              nome: nomeExercicio,
              categoria: categoria,
              musculo_primario: musculo,
              tipo_tabela: exec.tipo,
              feedback_aluno: exec.observacoes || "",
              ...detalhesProcessados
            };
          });

          return { 
            data: sessao.data_treino, 
            nome_treino: nomeDiaTreino, // Enviando o agrupamento
            duracao_sessao_minutos: sessao.duracao_real_minutos, 
            exercicios: exerciciosProcessados 
          };
        });

        const jsonParaIA = JSON.stringify(dadosMapeados);
        const tempoMedioTreino = totalTreinosConcluidos > 0 ? Math.round(tempoTotal / totalTreinosConcluidos) + " minutos" : "0 minutos";

        let prompt = `
Você é o "Treinador Virtual" da plataforma Iron AI, especialista sênior em análise de dados esportivos.

## REGRAS ABSOLUTAS DE FORMATAÇÃO (CRÍTICO)
1. Responda ESTRITAMENTE em Markdown limpo, sem saudações.
2. NUNCA use sintaxe LaTeX (como cifrões ou a barra invertida times). Escreva as repetições apenas com a letra 'x' minúscula (exemplo: 12x12x10).
3. Todas as tabelas devem usar a formatação padrão Markdown com quebras de linha claras.
4. Na seção de Força, você deve calcular e mostrar a evolução em porcentagem baseada no 'volume_total_kg', mas NÃO imprima o volume total na tabela final. A tabela deve mostrar apenas a propriedade 'series_formatadas'.

## DADOS DO CICLO
- Período: ${dataInicioBusca} a ${dataFimBusca}
- Treinos concluídos: ${totalTreinosConcluidos}
- Tempo médio: ${tempoMedioTreino}

## JSON DE EXECUÇÃO:
${jsonParaIA}

## ESTRUTURA OBRIGATÓRIA DO RELATÓRIO

### 1. Diagnóstico Geral
Parágrafo único com o panorama do período: tendência geral de progressão, ponto mais forte e principal ponto de atenção.

### 2. Evolução por Treino (Hipertrofia)
Agrupe os exercícios de força pelo 'nome_treino' fornecido no JSON (Ex: Treino A, Treino B). Para cada treino diferente, crie um subtítulo e gere uma tabela comparando a primeira data que o exercício apareceu com a última. Formato exato:

#### [Nome do Treino]
| Exercício | Semana Inicial (Data) | Semana Final (Data) | Var. Volume |
|-----------|-----------------------|---------------------|-------------|
| Nome | [Valor exato de series_formatadas] | [Valor exato de series_formatadas] | +X% |

### 3. Condicionamento Cardiovascular
| Data | Distância | Duração | Pace (min/km) |
Adicione um parágrafo "Tendência:" apontando evolução ou estagnação baseada no pace.

### 4. Condicionamento Específico (HIIT/Isometria)
Avalie a progressão de tempo sob tensão ou rounds, se houver dados.

### 5. Análise por Grupamento Muscular
Liste o status dos músculos em bullet points com base no volume/carga:
- **Em progressão:** (Justificativa)
- **Próximo do teto:** (Justificativa)
- **Atenção técnica:** (Justificativa)

### 6. Anomalias e Inconsistências
Liste em bullets qualquer queda drástica de carga/volume, durações absurdas ou dados faltando, com sua hipótese.

### 7. Análise Comportamental
Avalie a consistência, impacto de feedbacks registrados ('feedback_aluno') como jejum/dores, e variações de tempo de descanso.

### 8. Micro-ajustes para a Próxima Ficha
Lista numerada (1, 2, 3) com diretrizes claras de aumento de carga exata ou ajuste de técnica para os exercícios que estagnaram ou progrediram muito.`;

        if (tipoRelatorio === 'final') {
          prompt += `\n\n### 9. Prescrição para o Próximo Ciclo\nDetermine o foco para a próxima periodização.`;
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
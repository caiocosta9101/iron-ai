import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';
import { supabase } from '../db';

// =============================================================
// SINGLETON DO GEMINI
// Instancio o cliente uma única vez quando o servidor sobe,
// em vez de criar uma nova instância a cada requisição.
// Isso evita overhead desnecessário e possíveis problemas de
// rate limit sob carga.
// =============================================================
const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// =============================================================
// SCHEMA DE VALIDAÇÃO (Zod)
// Valido e tipar tudo que vem do body antes de usar.
// Mesmo padrão que já uso no authController — consistência.
// Isso garante que tipos errados, campos ausentes ou valores
// absurdos (ex: idade: 999) nunca cheguem no prompt.
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
// O campo "limitacoes" é texto livre digitado pelo usuário e
// vai direto para dentro do prompt. Removo caracteres que
// poderiam ser usados para injetar instruções na IA (Prompt Injection).
// =============================================================
const sanitize = (str: string) => str.replace(/[<>"]/g, '').trim();

export const generateWorkout = async (req: AuthRequest, res: Response) => {
  
  // GUARDA 1: VERIFICAÇÃO DE CONFIGURAÇÃO
  // Antes de qualquer coisa, verifico se a chave da API existe.
  // Mesmo padrão que já uso com o JWT_SECRET no authController —
  // falha explícita e controlada, sem crash obscuro do SDK.
  // =============================================================
  if (!apiKey || !genAI) {
    console.error('GEMINI_API_KEY não configurada no ambiente!');
    return res.status(500).json({ error: 'Erro de configuração do servidor.' });
  }

  // =============================================================
  // GUARDA 2: VALIDAÇÃO DO BODY
  // Uso safeParse para não lançar exceção — retorno 400 com os
  // erros detalhados se algo vier errado, sem precisar de try/catch
  // só pra isso.
  // =============================================================
  const parsed = generateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error!.issues });
  }

  // Desestrutura já tipado e validado
  const { objetivo, idade, peso, altura, limitacoes, dias, tempo, nivel } = parsed.data;

  // GUARDA 3: RATE LIMIT POR USUÁRIO
  // Conto quantos treinos gerados por IA o usuário já salvou hoje.
  // Uso a tabela 'treinos' que já existe — sem precisar de nada novo.
  // O limite é 3 gerações por dia. Atrelado ao usuário autenticado,
  // então não adianta trocar de IP ou usar VPN para burlar.
  // Se o limite for atingido, a requisição morre aqui e o Gemini
  // nunca é chamado — sem gastar crédito da API.
  const hoje = new Date().toISOString().split('T')[0]; // ex: "2025-01-15"

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

  try {
    // Pego o modelo do singleton já criado no topo do arquivo
    const model = genAI.getGenerativeModel({
      model: "gemini-3-flash-preview",
      generationConfig: {
        // Força o Gemini a responder APENAS com JSON válido.
        // Evita que ele adicione texto antes ou depois do objeto.
        responseMimeType: "application/json",
        temperature: 0.7,
      }
    });

    // =============================================================
    // SANITIZAÇÃO ANTES DE INTERPOLAR NO PROMPT
    // Aplico a sanitização apenas no campo de texto livre (limitacoes).
    // Os outros campos (idade, peso, etc.) já são números validados
    // pelo Zod, então não há risco de injeção neles.
    // =============================================================
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
      
      DIRETRIZES DE SEGURANÇA (CRÍTICO):
      1. Se houver lesões citadas acima, você DEVE excluir exercícios que sobrecarreguem a região afetada.
      2. Substitua movimentos perigosos por variantes biomecanicamente seguras.

      FORMATO DE RESPOSTA (JSON OBRIGATÓRIO):
      Responda apenas com um objeto JSON seguindo estritamente esta estrutura:
      {
        "nome": "Nome criativo e motivador do programa",
        "descricao": "Explicação técnica resumida do foco da periodização",
        "dias": [
          {
            "nome": "Treino A - [Foco]",
            "foco": "Empurrar/Puxar/Pernas/Fullbody",
            "exercicios": [
              {
                "nome": "Nome do Exercício (em Português)",
                "equipamento": "Halteres, Barra, Máquina, ou Peso Corporal",
                "series": 4,
                "repeticoes": "10-12",
                "descanso": "60s",
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

    // Log interno com informação útil para debug — sem expor pro cliente
    console.log(`Treino gerado com sucesso: ${treinoGerado.nome}`);

    return res.json(treinoGerado);

  } catch (error: any) {
    // =============================================================
    // TRATAMENTO DE ERRO SEGURO
    // Logo o erro completo no servidor para debug,
    // mas retorno apenas uma mensagem genérica para o cliente.
    // O "details: error.message" foi removido — ele expunha
    // informações internas do SDK do Gemini na resposta.
    // =============================================================
    console.error('Erro ao gerar treino com Gemini:', error);
    return res.status(500).json({
      error: 'Falha na inteligência artificial. Tente novamente em instantes.',
    });
  }
};
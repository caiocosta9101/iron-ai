import { Response } from 'express';
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
      model: "gemini-3.1-pro-preview",
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
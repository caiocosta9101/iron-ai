import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Trocamos Request por AuthRequest para manter o padrão de rotas protegidas
export const generateWorkout = async (req: AuthRequest, res: Response) => {
  const { objetivo, idade, peso, altura, limitacoes, dias, tempo, nivel } = req.body;

  // Se no futuro você quiser atrelar a geração ao usuário (para limite de uso, por exemplo),
  // o ID já está disponível aqui, entregue com segurança pelo middleware!
  // const userId = req.userId;

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
    
    // === ATUALIZADO PARA O GEMINI 3 FLASH PREVIEW ===
    const model = genAI.getGenerativeModel({ 
      model: "gemini-3-flash-preview", 
      generationConfig: {
        responseMimeType: "application/json", 
        temperature: 0.7, 
      }
    });

    const prompt = `
      Atue como um Personal Trainer de elite e fisiologista.
      Crie um plano de treino de musculação completo e seguro.

      DADOS DO ALUNO:
      - Perfil: ${idade} anos, ${peso}kg, ${altura}cm.
      - Nível de Experiência: ${nivel}
      - Objetivo Principal: ${objetivo}
      - Disponibilidade: ${dias} dias por semana, ${tempo} minutos por treino.
      
      ⚠️ RESTRIÇÕES MÉDICAS / LESÕES:
      "${limitacoes ? limitacoes : "Nenhuma restrição declarada."}"
      
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

    console.log(`Treino gerado com Gemini 3: ${treinoGerado.nome}`);

    return res.json(treinoGerado);

  } catch (error: any) {
    console.error('Erro ao gerar treino com Gemini 3:', error);
    return res.status(500).json({ 
      error: 'Falha na inteligência artificial. Tente novamente em instantes.',
      details: error.message 
    });
  }
};
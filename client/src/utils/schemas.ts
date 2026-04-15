import { z } from "zod";

// --- REGRAS DE AUTENTICAÇÃO ---
export const loginSchema = z.object({
  email: z.string().min(1, "O e-mail é obrigatório").email("Formato de e-mail inválido"),
  password: z.string().min(1, "A senha é obrigatória"),
});

export const registerSchema = z.object({
  name: z.string().min(3, "O nome deve ter pelo menos 3 letras"),
  email: z.string().email("Digite um e-mail válido"),
  password: z.string().min(6, "A senha deve ter no mínimo 6 caracteres"),
});

export type LoginForm = z.infer<typeof loginSchema>;
export type RegisterForm = z.infer<typeof registerSchema>;

// --- SCHEMAS DE PLANEAMENTO DE TREINO HÍBRIDO ---

// 1. A Base (campos que todos os exercícios têm)
const baseExercicioSchema = z.object({
  exercicio_id: z.number().min(1, "O ID do exercício é obrigatório"),
  ordem_execucao: z.number().int().min(1),
  observacoes: z.string().optional(),
});

// 2. Os Tipos Específicos (Filhos)
export const exercicioForcaSchema = baseExercicioSchema.extend({
  tipo: z.literal("forca"),
  series: z.number().int().min(1, "Deve ter pelo menos 1 série"),
  repeticoes_min: z.number().int().min(1),
  repeticoes_max: z.number().int().min(1),
  descanso_segundos: z.number().int().min(0),
});

export const exercicioCardioSchema = baseExercicioSchema.extend({
  tipo: z.literal("cardio"),
  tempo_meta_minutos: z.number().min(0).optional(),
  distancia_meta_km: z.number().min(0).optional(),
});

export const exercicioIsometricoSchema = baseExercicioSchema.extend({
  tipo: z.literal("isometrico"),
  series: z.number().int().min(1),
  tempo_segundos: z.number().int().min(1),
  descanso_segundos: z.number().int().min(0),
});

export const exercicioHiitSchema = baseExercicioSchema.extend({
  tipo: z.literal("hiit"),
  rounds: z.number().int().min(1),
  tempos_estimulo_segundos: z.array(z.number().int().min(1)),
  tempos_descanso_segundos: z.array(z.number().int().min(0)),
});

// 3. A União Discriminada (O "Polícia" de Trânsito)
export const exercicioTreinoSchema = z.discriminatedUnion("tipo", [
  exercicioForcaSchema,
  exercicioCardioSchema,
  exercicioIsometricoSchema,
  exercicioHiitSchema,
]);

export type ExercicioForcaForm = z.infer<typeof exercicioForcaSchema>;
export type ExercicioCardioForm = z.infer<typeof exercicioCardioSchema>;
export type ExercicioHiitForm = z.infer<typeof exercicioHiitSchema>;
export type ExercicioTreinoPayload = z.infer<typeof exercicioTreinoSchema>;
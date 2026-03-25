// client/src/pages/ActiveWorkout.tsx
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Timer,
  CircleCheck,
  Circle,
  Play,
  Save,
  Loader2,
  Clock,
  Dumbbell,
  MessageSquarePlus,
  Square,
  Zap,
  Activity // Ícone novo para o Cardio
} from "lucide-react";
import { toast } from "sonner";
import api from "../services/api";

// --- TIPAGEM ---
interface SerieExecucao {
  id: number;
  peso: string;
  reps: string;
  concluido: boolean;
  descansoRealizado?: number;
}

interface ExercicioExecucao {
  id: string;
  nome: string;
  categoria: string; // NOVO: 'forca' ou 'cardio'
  equipamento: string;
  seriesAlvo: number | null;
  repsAlvo: string | null;
  descansoSegundos: number | null;
  tempoMetaMinutos: number | null; // NOVO
  distanciaMetaKm: number | null;  // NOVO
  seriesFeitas: SerieExecucao[];
  observacoesUsuario: string;
  // Campos de execução do Cardio
  tempoRealMinutos: string; 
  distanciaRealKm: string;
  cardioConcluido: boolean;
}

export default function ActiveWorkout() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Estados Gerais
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isWorkoutStarted, setIsWorkoutStarted] = useState(false);
  const [workoutName, setWorkoutName] = useState("");
  const [exercicios, setExercicios] = useState<ExercicioExecucao[]>([]);

  // === NOVOS ESTADOS PARA O MODO RÁPIDO ===
  const [isManualMode, setIsManualMode] = useState(false);
  const [manualDuration, setManualDuration] = useState<string>("45");

  // Estados de Tempo
  const [tempoTotal, setTempoTotal] = useState(0);
  const [tempoDescanso, setTempoDescanso] = useState(0);
  const [timerDescansoAtivo, setTimerDescansoAtivo] = useState(false);

  // Referência para saber onde salvar o descanso
  const lastSerieRef = useRef<{ exIndex: number; serieIndex: number } | null>(
    null,
  );

  // --- 1. CARREGAR DADOS ---
  useEffect(() => {
    const fetchWorkoutDetails = async () => {
      try {
        if (!id) return;

        const savedSession = localStorage.getItem(
          `iron_ai_workout_progress_${id}`,
        );

        if (savedSession) {
          const data = JSON.parse(savedSession);

          const segundosAusente = data.lastUpdateTimestamp
            ? Math.floor((Date.now() - data.lastUpdateTimestamp) / 1000)
            : 0;

          setWorkoutName(data.savedName);
          setExercicios(data.savedExercicios);
          setTempoTotal((data.savedTime || 0) + segundosAusente);

          if (data.savedTimerDescansoAtivo) {
            setTimerDescansoAtivo(true);
            setTempoDescanso((data.savedTempoDescanso || 0) + segundosAusente);
          } else {
            setTimerDescansoAtivo(false);
            setTempoDescanso(data.savedTempoDescanso || 0);
          }

          if (data.savedLastSerie) {
            lastSerieRef.current = data.savedLastSerie;
          }

          setIsWorkoutStarted(true);
          setLoading(false);
          return;
        }

        const response = await api.get(`/workouts/day/${id}`);
        const diaTreino = response.data;

        setWorkoutName(diaTreino.nome);

        const listaFormatada: ExercicioExecucao[] = (
          diaTreino.exercicios_treino || []
        ).map((ex: any) => {
          
          // --- APLICANDO A NORMALIZAÇÃO DA CATEGORIA AQUI ---
          const categoriaNormalizada = ex.exercicios?.grupo_pai?.trim().toLowerCase();
          const isCardio = categoriaNormalizada === 'cardio';

          // Se for cardio, não precisa criar o array de séries
          const seriesIniciais: SerieExecucao[] = isCardio ? [] : Array.from({
            length: ex.series || 3,
          }).map((_, i) => ({
            id: i,
            peso: "",
            reps: "",
            concluido: false,
            descansoRealizado: 0,
          }));

          const repsString = isCardio 
            ? null 
            : (ex.repeticoes_min === ex.repeticoes_max
              ? `${ex.repeticoes_min}`
              : `${ex.repeticoes_min}-${ex.repeticoes_max}`);

          return {
            id: ex.exercicios.id,
            nome: ex.exercicios.nome,
            categoria: categoriaNormalizada || 'forca', // --- USANDO A CATEGORIA NORMALIZADA ---
            equipamento: ex.exercicios?.equipamentos?.nome || "Peso do Corpo",
            seriesAlvo: ex.series || null,
            repsAlvo: repsString,
            descansoSegundos: ex.descanso_segundos || null,
            tempoMetaMinutos: ex.tempo_meta_minutos || null,
            distanciaMetaKm: ex.distancia_meta_km || null,
            seriesFeitas: seriesIniciais,
            observacoesUsuario: "",
            tempoRealMinutos: "",
            distanciaRealKm: "",
            cardioConcluido: false,
          };
        });

        setExercicios(listaFormatada);
        setIsWorkoutStarted(false);
      } catch (error) {
        console.error("Erro ao carregar treino:", error);
        toast.error("Erro ao carregar os exercícios.");
        navigate("/dashboard");
      } finally {
        setLoading(false);
      }
    };

    fetchWorkoutDetails();
  }, [id, navigate]);

  // --- CRONÔMETROS ---
  const lastTickTreino = useRef<number>(Date.now());
  const lastTickDescanso = useRef<number>(Date.now());

  useEffect(() => {
    let interval: any;
    if (isWorkoutStarted && !isManualMode) {
      lastTickTreino.current = Date.now();
      interval = setInterval(() => {
        const now = Date.now();
        const diffSegundos = Math.round((now - lastTickTreino.current) / 1000);
        if (diffSegundos > 0) {
          setTempoTotal((prev) => prev + diffSegundos);
          lastTickTreino.current = now;
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isWorkoutStarted, isManualMode]);

  useEffect(() => {
    let interval: any;
    if (timerDescansoAtivo && !isManualMode) {
      lastTickDescanso.current = Date.now();
      interval = setInterval(() => {
        const now = Date.now();
        const diffSegundos = Math.round(
          (now - lastTickDescanso.current) / 1000,
        );
        if (diffSegundos > 0) {
          setTempoDescanso((prev) => prev + diffSegundos);
          lastTickDescanso.current = now;
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerDescansoAtivo, isManualMode]);

  const formataTempo = (segundos: number) => {
    const min = Math.floor(segundos / 60);
    const sec = segundos % 60;
    return `${min}:${sec < 10 ? "0" : ""}${sec}`;
  };

  const handleCheckSet = (exIndex: number, serieIndex: number) => {
    const novosExercicios = [...exercicios];
    const serie = novosExercicios[exIndex].seriesFeitas[serieIndex];

    if (timerDescansoAtivo && !serie.concluido && lastSerieRef.current) {
      const { exIndex: lastEx, serieIndex: lastSerie } = lastSerieRef.current;
      novosExercicios[lastEx].seriesFeitas[lastSerie].descansoRealizado =
        tempoDescanso;
    }

    serie.concluido = !serie.concluido;
    setExercicios(novosExercicios);

    if (serie.concluido) {
      setTempoDescanso(0);
      setTimerDescansoAtivo(true);
      lastSerieRef.current = { exIndex, serieIndex };
    }
  };

  const handleStopRest = () => {
    if (lastSerieRef.current) {
      const { exIndex, serieIndex } = lastSerieRef.current;
      const novosExercicios = [...exercicios];
      novosExercicios[exIndex].seriesFeitas[serieIndex].descansoRealizado =
        tempoDescanso;
      setExercicios(novosExercicios);
      lastSerieRef.current = null;
    }
    setTimerDescansoAtivo(false);
    setTempoDescanso(0);
  };

  // --- MÉTODOS PARA O CARDIO ---
  const handleUpdateCardio = (exIndex: number, campo: 'tempo' | 'distancia', valor: string) => {
    const valorLimpo = valor.replace(/[^0-9.,]/g, "").replace(",", ".");
    const novosExercicios = [...exercicios];
    
    if (campo === 'tempo') novosExercicios[exIndex].tempoRealMinutos = valorLimpo;
    if (campo === 'distancia') novosExercicios[exIndex].distanciaRealKm = valorLimpo;
    
    setExercicios(novosExercicios);
  };

  const handleCheckCardio = (exIndex: number) => {
    const novosExercicios = [...exercicios];
    novosExercicios[exIndex].cardioConcluido = !novosExercicios[exIndex].cardioConcluido;
    setExercicios(novosExercicios);
  };

  // --- SALVAR PROGRESSO NO LOCALSTORAGE ---
  useEffect(() => {
    if (loading || exercicios.length === 0) return;

    if (isWorkoutStarted && !isManualMode) {
      const sessionData = {
        savedName: workoutName,
        savedExercicios: exercicios,
        savedTime: tempoTotal,
        savedTimerDescansoAtivo: timerDescansoAtivo,
        savedTempoDescanso: tempoDescanso,
        savedLastSerie: lastSerieRef.current,
        isWorkoutStarted: true,
        lastUpdateTimestamp: Date.now(),
      };
      localStorage.setItem(
        `iron_ai_workout_progress_${id}`,
        JSON.stringify(sessionData),
      );
    } else if (!isWorkoutStarted) {
      localStorage.removeItem(`iron_ai_workout_progress_${id}`);
    }
  }, [
    exercicios,
    tempoTotal,
    tempoDescanso,
    timerDescansoAtivo,
    workoutName,
    loading,
    id,
    isWorkoutStarted,
    isManualMode,
  ]);

  const handleUpdateValue = (
    exIndex: number,
    serieIndex: number,
    campo: "peso" | "reps" | "descanso",
    valor: string,
  ) => {
    let valorLimpo = valor;

    if (campo === "reps" || campo === "descanso") {
      valorLimpo = valor.replace(/\D/g, ""); // Apenas números
    } else if (campo === "peso") {
      valorLimpo = valor.replace(/[^0-9.,]/g, "");
      const partes = valorLimpo.split(/[.,]/);
      if (partes.length > 2) {
        valorLimpo = partes[0] + "." + partes.slice(1).join("");
      }
    }

    const novosExercicios = [...exercicios];
    
    if (campo === "descanso") {
      novosExercicios[exIndex].seriesFeitas[serieIndex].descansoRealizado = valorLimpo ? Number(valorLimpo) : 0;
    } else {
      novosExercicios[exIndex].seriesFeitas[serieIndex][campo] = valorLimpo;
    }
    
    setExercicios(novosExercicios);
  };

  const handleObservacaoChange = (exIndex: number, texto: string) => {
    const novosExercicios = [...exercicios];
    novosExercicios[exIndex].observacoesUsuario = texto;
    setExercicios(novosExercicios);
  };

  const finishWorkout = async () => {
    try {
      setSaving(true);

      if (timerDescansoAtivo && lastSerieRef.current && !isManualMode) {
        const { exIndex, serieIndex } = lastSerieRef.current;
        exercicios[exIndex].seriesFeitas[serieIndex].descansoRealizado =
          tempoDescanso;
      }

      const duracaoFinalSegundos = isManualMode
        ? Number(manualDuration) * 60
        : tempoTotal;

      const exerciciosProcessados = exercicios.map((ex) => {
        
        // Trata séries se for força
        const seriesProcessadas = ex.seriesFeitas.map((serie) => {
          if (isManualMode && serie.peso !== "" && serie.reps !== "") {
            return { ...serie, concluido: true };
          }
          return serie;
        });

        // Passamos os dados de força e de cardio para o backend
        return {
          id: ex.id,
          categoria: ex.categoria, // Informamos a categoria para o backend
          seriesFeitas: seriesProcessadas, // Vazio se for cardio
          observacoes: ex.observacoesUsuario,
          tempoRealMinutos: ex.tempoRealMinutos ? Number(ex.tempoRealMinutos) : null,
          distanciaRealKm: ex.distanciaRealKm ? Number(ex.distanciaRealKm) : null,
        };
      });

      const payload = {
        diaTreinoId: id,
        duracaoSegundos: duracaoFinalSegundos,
        exerciciosRealizados: exerciciosProcessados,
      };

      await api.post("/history", payload);
      localStorage.removeItem(`iron_ai_workout_progress_${id}`);

      toast.success("Treino salvo com sucesso! 💪");
      navigate("/dashboard");
    } catch (error) {
      toast.error("Erro ao salvar o treino.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#112218] flex flex-col items-center justify-center text-[#13ec6a]">
        <Loader2 className="animate-spin mb-4" size={48} />
        <p>Preparando anilhas...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#112218] flex flex-col relative pb-40">
      {/* HEADER FIXO */}
      <header className="sticky top-0 bg-[#112218]/95 backdrop-blur border-b border-[#193324] p-4 z-20 shadow-md">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate("/dashboard")}
            className="text-slate-400 hover:text-white p-2 -ml-2"
          >
            <ArrowLeft />
          </button>
          
          <div className="flex flex-col items-center flex-1">
            <h1 className="text-white font-bold text-sm text-center line-clamp-1">{workoutName}</h1>
            {!isManualMode && (
              <div className="flex items-center gap-1.5 text-[#13ec6a] bg-[#13ec6a]/10 px-2 py-0.5 rounded text-xs font-mono font-bold mt-1">
                <Clock size={12} />
                {formataTempo(tempoTotal)}
              </div>
            )}
          </div>
          
          <button
            onClick={() => {
              setIsManualMode(!isManualMode);
              if (!isManualMode) {
                  setTimerDescansoAtivo(false);
              }
            }}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-2 transition-colors shadow-sm text-[10px] uppercase font-bold border whitespace-nowrap ${
              isManualMode
                ? "bg-[#13ec6a] text-[#112218] border-[#13ec6a]"
                : "bg-[#13ec6a]/10 text-[#13ec6a] border-[#13ec6a]/30 hover:bg-[#13ec6a]/20 hover:border-[#13ec6a]/50"
            }`}
          >
            <Zap size={14} fill={isManualMode ? "currentColor" : "none"} />
            <span className="hidden sm:inline">{isManualMode ? "Modo performance" : "Preenchimento Rápido"}</span>
            <span className="sm:hidden">{isManualMode ? "Rápido" : "Manual"}</span>
          </button>
        </div>
      </header>

      {/* LISTA DE EXERCÍCIOS */}
      <div className="flex-1 p-4 lg:p-6 max-w-3xl mx-auto w-full space-y-8">
        {exercicios.map((ex, exIndex) => {
          const isCardio = ex.categoria === 'cardio';

          return (
            <div
              key={ex.id}
              className={`animate-in fade-in slide-in-from-bottom-4 duration-500 bg-[#193324]/20 p-4 rounded-2xl border ${isManualMode ? 'border-[#13ec6a]/30' : 'border-white/5'}`}
            >
              <div className="mb-4">
                <div className="flex justify-between items-start mb-1">
                  <h2 className="text-xl font-black text-white leading-tight w-3/4 flex items-center gap-2">
                    {ex.nome}
                  </h2>
                  
                  {/* Etiqueta de Descanso (Força) ou Etiqueta de Cardio */}
                  {!isManualMode && !isCardio && ex.descansoSegundos && (
                    <div className="text-[10px] text-slate-400 font-medium whitespace-nowrap bg-white/5 px-2 py-1 rounded flex items-center gap-1">
                      <Timer size={10} /> Meta: {ex.descansoSegundos}s
                    </div>
                  )}
                  {isCardio && (
                    <div className="text-[10px] text-[#13ec6a] font-bold whitespace-nowrap bg-[#13ec6a]/10 px-2 py-1 rounded flex items-center gap-1">
                      <Activity size={12} /> AERÓBICO
                    </div>
                  )}
                </div>

                {/* Subtítulo (Séries ou Meta de Cardio) */}
                <div className="flex items-center gap-2 text-[#92c9a8] text-sm mb-4">
                  {!isCardio ? (
                    <>
                      <Dumbbell size={14} />
                      <span>{ex.seriesAlvo} séries x {ex.repsAlvo} reps</span>
                    </>
                  ) : (
                    <>
                      <Timer size={14} />
                      <span>
                        Meta: {ex.tempoMetaMinutos ? `${ex.tempoMetaMinutos} min` : 'Livre'} 
                        {ex.distanciaMetaKm ? ` • ${ex.distanciaMetaKm} km` : ''}
                      </span>
                    </>
                  )}
                </div>

                {/* ========================================= */}
                {/* RENDERIZAÇÃO CONDICIONAL: FORÇA VS CARDIO   */}
                {/* ========================================= */}
                {!isCardio ? (
                  // Tabela de FORÇA Clássica
                  <div className="space-y-2">
                    <div className="grid grid-cols-12 gap-2 text-[#92c9a8] text-[10px] uppercase font-bold tracking-widest px-2 opacity-50">
                      <div className="col-span-2 text-center">Set</div>
                      <div className="col-span-3 text-center">KG</div>
                      <div className="col-span-3 text-center">Reps</div>
                      {isManualMode ? (
                        <div className="col-span-4 text-center">Pausa (s)</div>
                      ) : (
                        <div className="col-span-4 text-center">Check</div>
                      )}
                    </div>

                    {ex.seriesFeitas.map((serie, serieIndex) => {
                      const hasValues = serie.peso !== "" && serie.reps !== "";
                      const showAsCompleted = serie.concluido || (isManualMode && hasValues);

                      return (
                        <div
                          key={serie.id}
                          className={`
                            grid grid-cols-12 gap-2 items-center p-2 rounded-lg border transition-all duration-200
                            ${showAsCompleted ? "bg-[#13ec6a]/5 border-[#13ec6a]/20" : "bg-[#193324]/50 border-white/5"}
                          `}
                        >
                          <div className="col-span-2 flex justify-center flex-col items-center">
                            <span
                              className={`
                                font-bold text-sm w-7 h-7 flex items-center justify-center rounded-full
                                ${showAsCompleted ? "bg-[#13ec6a] text-[#112218]" : "bg-white/10 text-white/50"}
                              `}
                            >
                              {serieIndex + 1}
                            </span>
                            {serie.descansoRealizado && !isManualMode ? (
                              <span className="text-[9px] text-[#13ec6a] mt-1 font-mono">
                                {serie.descansoRealizado}s
                              </span>
                            ) : null}
                          </div>

                          <div className="col-span-3">
                            <input
                              type="tel"
                              inputMode="decimal"
                              maxLength={6}
                              value={serie.peso}
                              onChange={(e) => handleUpdateValue(exIndex, serieIndex, "peso", e.target.value)}
                              placeholder="-"
                              className={`w-full bg-transparent border-b border-white/10 text-white text-center py-1 outline-none font-bold placeholder:text-white/10 focus:border-[#13ec6a] transition-colors ${showAsCompleted ? "text-[#13ec6a]" : ""}`}
                            />
                          </div>

                          <div className="col-span-3">
                            <input
                              type="tel"
                              inputMode="numeric"
                              maxLength={3}
                              value={serie.reps}
                              onChange={(e) => handleUpdateValue(exIndex, serieIndex, "reps", e.target.value)}
                              placeholder={ex.repsAlvo?.split("-")[0]}
                              className={`w-full bg-transparent border-b border-white/10 text-white text-center py-1 outline-none font-bold placeholder:text-white/10 focus:border-[#13ec6a] transition-colors ${showAsCompleted ? "text-[#13ec6a]" : ""}`}
                            />
                          </div>

                          {isManualMode ? (
                            <div className="col-span-4">
                              <input
                                type="tel"
                                inputMode="numeric"
                                maxLength={3}
                                value={serie.descansoRealizado || ""}
                                onChange={(e) => handleUpdateValue(exIndex, serieIndex, "descanso", e.target.value)}
                                placeholder={`${ex.descansoSegundos}s`}
                                className={`w-full bg-transparent border-b border-white/10 text-white text-center py-1 outline-none font-bold placeholder:text-white/10 focus:border-[#13ec6a] transition-colors ${showAsCompleted ? "text-[#13ec6a]" : ""}`}
                              />
                            </div>
                          ) : (
                            <div className="col-span-4 flex justify-center">
                              <button
                                onClick={() => handleCheckSet(exIndex, serieIndex)}
                                className={`
                                  h-9 w-full rounded flex items-center justify-center transition-all active:scale-95
                                  ${serie.concluido ? "bg-[#13ec6a]/20 text-[#13ec6a]" : "bg-white/5 text-slate-500 hover:bg-white/10"}
                                `}
                              >
                                {serie.concluido ? <CircleCheck size={20} /> : <Circle size={20} />}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  // =========================================
                  // TELA DO CARDIO 
                  // =========================================
                  <div className={`p-4 rounded-xl border transition-all duration-300 ${ex.cardioConcluido || (isManualMode && (ex.tempoRealMinutos || ex.distanciaRealKm)) ? 'bg-[#13ec6a]/5 border-[#13ec6a]/30' : 'bg-black/20 border-white/5'}`}>
                    <div className="grid grid-cols-2 gap-4">
                      
                      {/* Input Tempo */}
                      <div>
                        <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">Tempo Feito (Min)</label>
                        <div className="relative">
                          <input
                            type="tel"
                            inputMode="decimal"
                            value={ex.tempoRealMinutos}
                            onChange={(e) => handleUpdateCardio(exIndex, 'tempo', e.target.value)}
                            placeholder={ex.tempoMetaMinutos ? String(ex.tempoMetaMinutos) : "30"}
                            className="w-full bg-[#112218] border border-white/10 rounded-lg h-12 text-center text-white font-bold text-lg focus:border-[#13ec6a] outline-none transition-colors"
                          />
                        </div>
                      </div>

                      {/* Input Distância */}
                      <div>
                        <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">Distância (KM)</label>
                        <div className="relative">
                          <input
                            type="tel"
                            inputMode="decimal"
                            value={ex.distanciaRealKm}
                            onChange={(e) => handleUpdateCardio(exIndex, 'distancia', e.target.value)}
                            placeholder={ex.distanciaMetaKm ? String(ex.distanciaMetaKm) : "5.0"}
                            className="w-full bg-[#112218] border border-white/10 rounded-lg h-12 text-center text-white font-bold text-lg focus:border-[#13ec6a] outline-none transition-colors"
                          />
                        </div>
                      </div>
                    </div>

                    {!isManualMode && (
                      <button
                        onClick={() => handleCheckCardio(exIndex)}
                        className={`mt-4 w-full h-12 rounded-lg font-bold flex items-center justify-center gap-2 transition-all active:scale-95 ${
                          ex.cardioConcluido 
                            ? "bg-[#13ec6a]/20 text-[#13ec6a] border border-[#13ec6a]/50" 
                            : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        {ex.cardioConcluido ? <><CircleCheck size={20} /> Cardio Concluído</> : "Marcar como Feito"}
                      </button>
                    )}
                  </div>
                )}

                {/* Observações Livres (Serve para Força e Cardio) */}
                <div className="mt-4 pt-4 border-t border-white/5">
                  <div className="flex items-center gap-2 mb-2 text-slate-400 text-xs font-bold uppercase tracking-widest">
                    <MessageSquarePlus size={14} /> Observações / {isCardio ? 'Pace e Fôlego' : 'Dores'}
                  </div>
                  <textarea
                    value={ex.observacoesUsuario}
                    onChange={(e) => handleObservacaoChange(exIndex, e.target.value)}
                    placeholder={isCardio ? "Ex: Corri super bem, pace bom hoje..." : "Ex: Senti o ombro estalar, aumentei carga fácil..."}
                    className="w-full bg-[#112218] border border-white/10 rounded-lg p-3 text-sm text-white placeholder:text-slate-600 focus:border-[#13ec6a] outline-none min-h-[60px] resize-none"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* FOOTER */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#112218] border-t border-[#193324] p-4 lg:pl-80 z-30 pb-6 safe-area-bottom shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
        <div className="max-w-3xl mx-auto">
          {isManualMode ? (
            <div className="flex items-end gap-3">
              <div className="flex-shrink-0 w-28">
                <p className="text-[10px] text-slate-400 font-bold mb-1.5 uppercase pl-1 tracking-wider">Total (Minutos)</p>
                <input
                  type="number"
                  value={manualDuration}
                  onChange={(e) => setManualDuration(e.target.value)}
                  className="w-full bg-[#193324] border border-white/10 text-white rounded-xl h-14 text-center text-xl font-bold outline-none focus:border-[#13ec6a]"
                  placeholder="45"
                />
              </div>
              <button
                onClick={finishWorkout}
                disabled={saving}
                className={`flex-1 h-14 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg text-lg transition-colors ${
                  saving ? "bg-gray-600 text-gray-300" : "bg-[#13ec6a] hover:bg-[#10d460] text-[#102217]"
                }`}
              >
                {saving ? <Loader2 className="animate-spin" size={20} /> : <><Save size={20} /> Registrar </>}
              </button>
            </div>
          ) : (
            !isWorkoutStarted ? (
              <button
                onClick={() => setIsWorkoutStarted(true)}
                className="w-full h-14 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95 text-lg bg-[#13ec6a] hover:bg-[#10d460] text-[#102217]"
              >
                <Play size={24} /> Iniciar Treino
              </button>
            ) : (
              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col">
                  <div className="flex items-center gap-3">
                    <div
                      className={`
                        w-12 h-12 rounded-xl flex items-center justify-center transition-colors
                        ${timerDescansoAtivo ? "bg-[#13ec6a] text-[#112218]" : "bg-[#193324] text-slate-500"}
                      `}
                    >
                      <Timer size={24} />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-[#92c9a8] tracking-widest">
                        Descanso
                      </p>
                      <p
                        className={`text-2xl font-mono font-bold tabular-nums ${timerDescansoAtivo ? "text-white" : "text-slate-500"}`}
                      >
                        {formataTempo(tempoDescanso)}
                      </p>
                    </div>
                  </div>
                </div>

                {timerDescansoAtivo ? (
                  <button
                    onClick={handleStopRest}
                    className="bg-red-500/20 p-3 rounded-full text-red-500 hover:bg-red-500/30 active:scale-95 transition-colors"
                  >
                    <Square size={20} fill="currentColor" />
                  </button>
                ) : (
                  <button
                    onClick={() => setTimerDescansoAtivo(true)}
                    className="bg-[#193324] p-3 rounded-full text-white hover:bg-white/10 active:scale-95"
                  >
                    <Play size={20} />
                  </button>
                )}

                <button
                  onClick={finishWorkout}
                  disabled={saving}
                  className={`
                    flex-1 h-14 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95 text-lg
                    ${saving ? "bg-gray-600 text-gray-300 cursor-not-allowed" : "bg-[#13ec6a] hover:bg-[#10d460] text-[#102217]"}
                  `}
                >
                  {saving ? (
                    <>
                      <Loader2 className="animate-spin" size={20} /> ...
                    </>
                  ) : (
                    <>
                      <Save size={20} /> Finalizar
                    </>
                  )}
                </button>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
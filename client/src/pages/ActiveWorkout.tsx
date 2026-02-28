// client/src/pages/ActiveWorkout.tsx
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Timer, CircleCheck, Circle, 
  Play, Save, Loader2, Clock, Dumbbell, MessageSquarePlus, Square 
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../services/api';

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
  seriesAlvo: number;
  repsAlvo: string;
  descansoSegundos: number; 
  seriesFeitas: SerieExecucao[]; 
  observacoesUsuario: string;
}

export default function ActiveWorkout() {
  const { id } = useParams(); 
  const navigate = useNavigate();

  // Estados Gerais
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isWorkoutStarted, setIsWorkoutStarted] = useState(false); // <--- Adicionado aqui
  const [workoutName, setWorkoutName] = useState(""); 
  const [exercicios, setExercicios] = useState<ExercicioExecucao[]>([]);
  
  // Estados de Tempo
  const [tempoTotal, setTempoTotal] = useState(0); 
  const [tempoDescanso, setTempoDescanso] = useState(0); 
  const [timerDescansoAtivo, setTimerDescansoAtivo] = useState(false);

  // Referência para saber onde salvar o descanso
  const lastSerieRef = useRef<{exIndex: number, serieIndex: number} | null>(null);

  // --- 1. CARREGAR DADOS ---
  useEffect(() => {
    const fetchWorkoutDetails = async () => {
        try {
            if (!id) return;

            // NOVA LÓGICA: Verifica se existe um treino salvo em andamento
            const savedSession = localStorage.getItem(`iron_ai_workout_progress_${id}`);
            
            if (savedSession) {
                const data = JSON.parse(savedSession);
                
                // Calcula exatamente quantos segundos a tela ficou fechada
                const segundosAusente = data.lastUpdateTimestamp 
                    ? Math.floor((Date.now() - data.lastUpdateTimestamp) / 1000) 
                    : 0;

                setWorkoutName(data.savedName);
                setExercicios(data.savedExercicios);
                
                // Soma o tempo ausente ao tempo total do treino
                setTempoTotal((data.savedTime || 0) + segundosAusente);
                
                // Restaura o descanso e soma o tempo ausente, se estivesse rodando
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

                // A MÁGICA ESTÁ AQUI: Avisa que o treino já tinha sido iniciado
                setIsWorkoutStarted(true); 
                
                setLoading(false);
                return; // Sai da função
            }

            // LÓGICA ORIGINAL: Se não tem salvo, busca do banco vazio
            const response = await api.get(`/workouts/day/${id}`);
            const diaTreino = response.data;

            setWorkoutName(diaTreino.nome); 

            const listaFormatada: ExercicioExecucao[] = (diaTreino.exercicios_treino || []).map((ex: any) => {
                const seriesIniciais: SerieExecucao[] = Array.from({ length: ex.series || 3 }).map((_, i) => ({
                    id: i,
                    peso: '', 
                    reps: '', 
                    concluido: false,
                    descansoRealizado: 0
                }));

                const repsString = ex.repeticoes_min === ex.repeticoes_max 
                    ? `${ex.repeticoes_min}` 
                    : `${ex.repeticoes_min}-${ex.repeticoes_max}`;

                return {
                    id: ex.exercicios.id,
                    nome: ex.exercicios.nome, 
                    seriesAlvo: ex.series || 3,
                    repsAlvo: repsString,
                    descansoSegundos: ex.descanso_segundos || 60,
                    seriesFeitas: seriesIniciais,
                    observacoesUsuario: "" 
                };
            });

            setExercicios(listaFormatada);
            setIsWorkoutStarted(false); // Garante que começa como false para treinos novos

        } catch (error) {
            console.error("Erro ao carregar treino:", error);
            toast.error("Erro ao carregar os exercícios.");
            navigate('/dashboard'); 
        } finally {
            setLoading(false);
        }
    };

    fetchWorkoutDetails();
  }, [id, navigate]);

  // --- CRONÔMETROS ---
  useEffect(() => {
    let interval: any;
    // Só conta o tempo total se o treino tiver sido iniciado
    if (isWorkoutStarted) {
      interval = setInterval(() => setTempoTotal(prev => prev + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isWorkoutStarted]);

  useEffect(() => {
    let interval: any;
    if (timerDescansoAtivo) {
      interval = setInterval(() => setTempoDescanso(prev => prev + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timerDescansoAtivo]);

  const formataTempo = (segundos: number) => {
    const min = Math.floor(segundos / 60);
    const sec = segundos % 60;
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  const handleCheckSet = (exIndex: number, serieIndex: number) => {
    const novosExercicios = [...exercicios];
    const serie = novosExercicios[exIndex].seriesFeitas[serieIndex];

    if (timerDescansoAtivo && !serie.concluido && lastSerieRef.current) {
        const { exIndex: lastEx, serieIndex: lastSerie } = lastSerieRef.current;
        novosExercicios[lastEx].seriesFeitas[lastSerie].descansoRealizado = tempoDescanso;
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
        
        // Salva o tempo na série correspondente
        novosExercicios[exIndex].seriesFeitas[serieIndex].descansoRealizado = tempoDescanso;
        setExercicios(novosExercicios);
        
        // Limpa a referência para não salvar de novo sem querer
        lastSerieRef.current = null;
    }
    
    // Para e zera o cronômetro
    setTimerDescansoAtivo(false);
    setTempoDescanso(0);
  };

  // --- SALVAR PROGRESSO NO LOCALSTORAGE ---
  useEffect(() => {
    if (loading || exercicios.length === 0) return;

    if (isWorkoutStarted) {
        // Se INICIOU, salva o progresso atualizado normalmente
        const sessionData = {
            savedName: workoutName,
            savedExercicios: exercicios,
            savedTime: tempoTotal,
            savedTimerDescansoAtivo: timerDescansoAtivo,
            savedTempoDescanso: tempoDescanso,
            savedLastSerie: lastSerieRef.current,
            isWorkoutStarted: true,
            lastUpdateTimestamp: Date.now() 
        };
        localStorage.setItem(`iron_ai_workout_progress_${id}`, JSON.stringify(sessionData));
    } else {
        // AQUI ESTÁ O EXORCISTA DO FANTASMA 👻
        // Se NÃO INICIOU, destrói qualquer cache que tenha ficado salvo sem querer
        localStorage.removeItem(`iron_ai_workout_progress_${id}`);
    }
  }, [exercicios, tempoTotal, tempoDescanso, timerDescansoAtivo, workoutName, loading, id, isWorkoutStarted]);

  // --- FUNÇÃO BLINDADA (Sanitização Direta) ---
  const handleUpdateValue = (exIndex: number, serieIndex: number, campo: 'peso' | 'reps', valor: string) => {
    let valorLimpo = valor;

    if (campo === 'reps') {
        // Apenas números (remove letras, pontos, vírgulas)
        valorLimpo = valor.replace(/\D/g, '');
    } else if (campo === 'peso') {
        // Apenas números, ponto e vírgula
        valorLimpo = valor.replace(/[^0-9.,]/g, '');
        
        // Evita múltiplos pontos decimais (ex: 20..5)
        const partes = valorLimpo.split(/[.,]/);
        if (partes.length > 2) {
             valorLimpo = partes[0] + '.' + partes.slice(1).join('');
        }
    }

    const novosExercicios = [...exercicios];
    novosExercicios[exIndex].seriesFeitas[serieIndex][campo] = valorLimpo;
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
        
        if (timerDescansoAtivo && lastSerieRef.current) {
            const { exIndex, serieIndex } = lastSerieRef.current;
            exercicios[exIndex].seriesFeitas[serieIndex].descansoRealizado = tempoDescanso;
        }

        const payload = {
            diaTreinoId: id,
            duracaoSegundos: tempoTotal,
            exerciciosRealizados: exercicios.map(ex => ({
                id: ex.id, 
                seriesFeitas: ex.seriesFeitas,
                observacoes: ex.observacoesUsuario 
            }))
        };

        await api.post('/history', payload);
        localStorage.removeItem(`iron_ai_workout_progress_${id}`);

        toast.success("Treino salvo com sucesso! 💪");
        navigate('/dashboard');

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
            <button onClick={() => navigate('/dashboard')} className="text-slate-400 hover:text-white p-2 -ml-2">
                <ArrowLeft />
            </button>
            <div className="flex flex-col items-center">
                <h1 className="text-white font-bold text-sm">{workoutName}</h1>
                <div className="flex items-center gap-1.5 text-[#13ec6a] bg-[#13ec6a]/10 px-2 py-0.5 rounded text-xs font-mono font-bold mt-1">
                    <Clock size={12} />
                    {formataTempo(tempoTotal)}
                </div>
            </div>
            <div className="w-8"></div>
        </div>
      </header>

      {/* LISTA DE EXERCÍCIOS */}
      <div className="flex-1 p-4 lg:p-6 max-w-3xl mx-auto w-full space-y-8">
        {exercicios.map((ex, exIndex) => (
            <div key={ex.id} className="animate-in fade-in slide-in-from-bottom-4 duration-500 bg-[#193324]/20 p-4 rounded-2xl border border-white/5">
                
                {/* Cabeçalho do Card */}
                <div className="mb-4">
                    <div className="flex justify-between items-start mb-1">
                         <h2 className="text-xl font-black text-white leading-tight w-3/4">{ex.nome}</h2>
                         <div className="text-[10px] text-slate-400 font-medium whitespace-nowrap bg-white/5 px-2 py-1 rounded flex items-center gap-1">
                            <Timer size={10} /> Meta: {ex.descansoSegundos}s
                         </div>
                    </div>
                    <div className="flex items-center gap-2 text-[#92c9a8] text-sm mb-4">
                        <Dumbbell size={14} />
                        <span>{ex.seriesAlvo} séries x {ex.repsAlvo} reps</span>
                    </div>

                    {/* Tabela de Séries */}
                    <div className="space-y-2">
                        <div className="grid grid-cols-12 gap-2 text-[#92c9a8] text-[10px] uppercase font-bold tracking-widest px-2 opacity-50">
                            <div className="col-span-2 text-center">Set</div>
                            <div className="col-span-3 text-center">KG</div>
                            <div className="col-span-3 text-center">Reps</div>
                            <div className="col-span-4 text-center">Check</div>
                        </div>

                        {ex.seriesFeitas.map((serie, serieIndex) => (
                            <div 
                                key={serie.id} 
                                className={`
                                    grid grid-cols-12 gap-2 items-center p-2 rounded-lg border transition-all duration-200
                                    ${serie.concluido 
                                        ? 'bg-[#13ec6a]/5 border-[#13ec6a]/20' 
                                        : 'bg-[#193324]/50 border-white/5'}
                                `}
                            >
                                <div className="col-span-2 flex justify-center flex-col items-center">
                                    <span className={`
                                        font-bold text-sm w-7 h-7 flex items-center justify-center rounded-full
                                        ${serie.concluido ? 'bg-[#13ec6a] text-[#112218]' : 'bg-white/10 text-white/50'}
                                    `}>
                                        {serieIndex + 1}
                                    </span>
                                    {serie.descansoRealizado ? (
                                        <span className="text-[9px] text-[#13ec6a] mt-1 font-mono">{serie.descansoRealizado}s</span>
                                    ) : null}
                                </div>

                                {/* INPUT DE PESO BLINDADO */}
                                <div className="col-span-3">
                                    <input 
                                        type="tel" /* Teclado numérico no mobile */
                                        inputMode="decimal"
                                        maxLength={6}
                                        value={serie.peso}
                                        onChange={(e) => handleUpdateValue(exIndex, serieIndex, 'peso', e.target.value)}
                                        placeholder="-"
                                        className={`w-full bg-transparent border-b border-white/10 text-white text-center py-1 outline-none font-bold placeholder:text-white/10 focus:border-[#13ec6a] transition-colors ${serie.concluido ? 'text-[#13ec6a]' : ''}`}
                                    />
                                </div>

                                {/* INPUT DE REPS BLINDADO */}
                                <div className="col-span-3">
                                    <input 
                                        type="tel" 
                                        inputMode="numeric"
                                        maxLength={3}
                                        value={serie.reps}
                                        onChange={(e) => handleUpdateValue(exIndex, serieIndex, 'reps', e.target.value)}
                                        placeholder={ex.repsAlvo.split('-')[0]} 
                                        className={`w-full bg-transparent border-b border-white/10 text-white text-center py-1 outline-none font-bold placeholder:text-white/10 focus:border-[#13ec6a] transition-colors ${serie.concluido ? 'text-[#13ec6a]' : ''}`}
                                    />
                                </div>

                                <div className="col-span-4 flex justify-center">
                                    <button 
                                        onClick={() => handleCheckSet(exIndex, serieIndex)}
                                        className={`
                                            h-9 w-full rounded flex items-center justify-center transition-all active:scale-95
                                            ${serie.concluido 
                                                ? 'bg-[#13ec6a]/20 text-[#13ec6a]' 
                                                : 'bg-white/5 text-slate-500 hover:bg-white/10'}
                                        `}
                                    >
                                        {serie.concluido ? <CircleCheck size={20} /> : <Circle size={20} />}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-4 pt-4 border-t border-white/5">
                        <div className="flex items-center gap-2 mb-2 text-slate-400 text-xs font-bold uppercase tracking-widest">
                            <MessageSquarePlus size={14} /> Observações / Dores
                        </div>
                        <textarea 
                            value={ex.observacoesUsuario}
                            onChange={(e) => handleObservacaoChange(exIndex, e.target.value)}
                            placeholder="Ex: Senti o ombro estalar, aumentei carga fácil..."
                            className="w-full bg-[#112218] border border-white/10 rounded-lg p-3 text-sm text-white placeholder:text-slate-600 focus:border-[#13ec6a] outline-none min-h-[60px] resize-none"
                        />
                    </div>
                </div>
            </div>
        ))}
      </div>

      {/* FOOTER */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#112218] border-t border-[#193324] p-4 lg:pl-80 z-30 pb-6 safe-area-bottom shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
        <div className="max-w-3xl mx-auto">
            
            {!isWorkoutStarted ? (
                // BOTÃO DE INICIAR (Aparece antes de começar)
                <button 
                    onClick={() => setIsWorkoutStarted(true)}
                    className="w-full h-14 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95 text-lg bg-[#13ec6a] hover:bg-[#10d460] text-[#102217]"
                >
                    <Play size={24} /> Iniciar Treino
                </button>
            ) : (
                // CONTROLES DO TREINO (Aparece depois de começar)
                <div className="flex items-center justify-between gap-4">
                    <div className="flex flex-col">
                        <div className="flex items-center gap-3">
                            <div className={`
                                w-12 h-12 rounded-xl flex items-center justify-center transition-colors
                                ${timerDescansoAtivo ? 'bg-[#13ec6a] text-[#112218]' : 'bg-[#193324] text-slate-500'}
                            `}>
                                <Timer size={24} />
                            </div>
                            <div>
                                <p className="text-[10px] uppercase font-bold text-[#92c9a8] tracking-widest">Descanso</p>
                                <p className={`text-2xl font-mono font-bold tabular-nums ${timerDescansoAtivo ? 'text-white' : 'text-slate-500'}`}>
                                    {formataTempo(tempoDescanso)}
                                </p>
                            </div>
                        </div>
                    </div>

                    {timerDescansoAtivo ? (
                        <button onClick={handleStopRest} className="bg-red-500/20 p-3 rounded-full text-red-500 hover:bg-red-500/30 active:scale-95 transition-colors">
                            <Square size={20} fill="currentColor" />
                        </button>
                    ) : (
                        <button onClick={() => setTimerDescansoAtivo(true)} className="bg-[#193324] p-3 rounded-full text-white hover:bg-white/10 active:scale-95">
                            <Play size={20} />
                        </button>
                    )}

                    <button 
                        onClick={finishWorkout}
                        disabled={saving}
                        className={`
                            flex-1 h-14 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95 text-lg
                            ${saving ? 'bg-gray-600 text-gray-300 cursor-not-allowed' : 'bg-[#13ec6a] hover:bg-[#10d460] text-[#102217]'}
                        `}
                    >
                        {saving ? (
                            <> <Loader2 className="animate-spin" size={20} /> ... </>
                        ) : (
                            <> <Save size={20} /> Finalizar </>
                        )}
                    </button>
                </div>
            )}

        </div>
      </div>
    </div>
  );
}
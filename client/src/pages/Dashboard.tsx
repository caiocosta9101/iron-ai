// client/src/pages/Dashboard.tsx
import React, { useEffect, useState } from 'react';
import { 
  Play, BrainCircuit, TrendingUp, Dumbbell as GymIcon, 
  Loader2, History, ArrowUpRight, CheckCircle2, XCircle, 
  Calendar, Zap, ChevronLeft, ChevronRight 
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom'; 
import { toast } from 'sonner'; 
import api from '../services/api';

// --- TIPAGEM COMPLETA DO BACKEND ---
interface ExerciseMaxLoad { 
  exercise: string; 
  maxWeight: string; 
}

interface SessionData {
  id: string; programName: string; name: string; focus: string;
  estimatedTime: number; intensity: string;
  maxLoads: ExerciseMaxLoad[]; // <-- Atualizado aqui
}

interface HistoryData {
  id: string; dia_treino_id: string; name: string;
  date: string; duration: string; volume: string; statusColor: string;
}

interface DashboardData {
  name: string; suggestedSessionId: string | null;
  sessions: SessionData[]; history: HistoryData[];
}

export const Dashboard: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const newWorkoutFromAI = location.state?.newWorkout;

  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState("Campeão");
  const [currentDate, setCurrentDate] = useState("");
  
  // --- ESTADOS GLOBAIS E DO CARROSSEL ---
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [globalHistory, setGlobalHistory] = useState<HistoryData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [suggestedId, setSuggestedId] = useState<string | null>(null);

  useEffect(() => {
    const now = new Date();
    const formatted = new Intl.DateTimeFormat('pt-BR', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long' 
    }).format(now);
    setCurrentDate(formatted.charAt(0).toUpperCase() + formatted.slice(1));

    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const response = await api.get<DashboardData>('/dashboard');
        
        if (response.data) {
          setUserName(response.data.name);
          setGlobalHistory(response.data.history || []);
          
          if (response.data.sessions && response.data.sessions.length > 0) {
            setSessions(response.data.sessions);
            setSuggestedId(response.data.suggestedSessionId);
            
            // Define o treino inicial na tela como sendo o sugerido pelo backend
            const sugIndex = response.data.sessions.findIndex(s => s.id === response.data.suggestedSessionId);
            setCurrentIndex(sugIndex !== -1 ? sugIndex : 0);
          }
        }

      } catch (err) {
        console.error("Erro ao carregar dados:", err);
        toast.error("Erro ao sincronizar dashboard.");
      } finally {
        setLoading(false);
      }
    };

    if (!newWorkoutFromAI) {
      fetchDashboardData();
    }
  }, [newWorkoutFromAI]);

  // --- FUNÇÕES DE NAVEGAÇÃO DO CARROSSEL ---
  const handlePrevWorkout = () => {
    setCurrentIndex((prev) => (prev === 0 ? sessions.length - 1 : prev - 1));
  };

  const handleNextWorkout = () => {
    setCurrentIndex((prev) => (prev === sessions.length - 1 ? 0 : prev + 1));
  };

  // --- DATA BINDING (Vínculo de Dados Relativos ao Treino Atual) ---
  const currentWorkout = sessions[currentIndex];
  const isSuggested = currentWorkout?.id === suggestedId;
  const filteredHistory = globalHistory.filter(h => h.dia_treino_id === currentWorkout?.id);

  // --- FUNÇÕES DE AÇÃO ---
  const handleStartWorkout = () => {
    if (currentWorkout?.id) {
        navigate(`/workout/active/${currentWorkout.id}`);
    } else {
        toast.error("Nenhum treino configurado.");
        navigate('/new-workout'); 
    }
  };

  const handleSaveWorkout = () => {
    toast.success("Plano de treino ativado com sucesso!");
    navigate('/my-workouts', { 
        state: { savedWorkout: newWorkoutFromAI } 
    });
  };

  const handleDiscard = () => {
      navigate('/dashboard', { state: {} });
      toast.info("Sugestão descartada.");
      window.location.reload(); 
  };

  if (loading) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center text-[#13ec6a]">
        <Loader2 className="animate-spin mb-4" size={48} />
        <p className="font-bold tracking-widest uppercase text-[10px]">Sincronizando Iron AI...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 lg:space-y-8 animate-in fade-in duration-500 pb-10">
      
      {/* Estilos Globais do Componente */}
      <style>{`
          .custom-scrollbar::-webkit-scrollbar { width: 4px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(19, 236, 106, 0.2); border-radius: 10px; }
          .custom-scrollbar:hover::-webkit-scrollbar-thumb { background: rgba(19, 236, 106, 0.5); }
      `}</style>

      {/* Cabeçalho */}
      <header className="flex flex-col gap-4 lg:flex-row lg:justify-between lg:items-end">
        <div className="flex items-center gap-4">
          <div className="space-y-1">
            <h2 className="text-2xl lg:text-4xl font-black tracking-tight text-white">
              Olá, {userName}!
            </h2>
            <p className="text-[#92c9a8] text-sm lg:text-lg">
                {currentDate} • {newWorkoutFromAI ? "Nova Sugestão Disponível" : "Foco Total"}
            </p>
          </div>
        </div>
      </header>

      {newWorkoutFromAI ? (
        
        /* === CARTÃO DE PREVIEW DA IA === */
        <section className="bg-gradient-to-br from-[#193324] to-[#102217] border border-[#13ec6a] rounded-2xl p-6 lg:p-8 shadow-[0_0_30px_rgba(19,236,106,0.1)] relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-[#13ec6a] text-[#112218] text-xs font-bold px-3 py-1 rounded-bl-xl z-10">
                SUGESTÃO IRON AI
            </div>

            <div className="mb-6 relative z-10">
                <div className="flex items-center gap-2 text-[#13ec6a] mb-2">
                    <BrainCircuit size={24} />
                    <h3 className="text-xl font-bold uppercase tracking-wider">Novo Plano Detectado</h3>
                </div>
                <h1 className="text-3xl lg:text-4xl font-black text-white mb-2">{newWorkoutFromAI.nome}</h1>
                <p className="text-[#92c9a8] max-w-3xl text-lg">{newWorkoutFromAI.descricao}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8 relative z-10">
                {newWorkoutFromAI.dias.map((dia: any, index: number) => (
                    <div key={index} className="bg-[#112218]/80 border border-[#326747] rounded-xl p-4 hover:border-[#13ec6a]/50 transition-colors flex flex-col max-h-[350px]">
                        <div className="flex justify-between items-center mb-3 border-b border-white/5 pb-2 shrink-0">
                            <span className="font-bold text-white">{dia.nome}</span>
                            <span className="text-[10px] bg-[#13ec6a]/20 text-[#13ec6a] px-2 py-1 rounded uppercase font-bold">{dia.foco || "Geral"}</span>
                        </div>
                        
                        <div className="overflow-y-auto pr-2 custom-scrollbar">
                            <ul className="space-y-3">
                                {dia.exercicios.map((ex: any, idx: number) => (
                                    <li key={idx} className="text-sm text-zinc-300 flex items-start gap-2 border-b border-white/5 pb-2 last:border-0">
                                        <div className="w-1.5 h-1.5 bg-[#13ec6a] rounded-full mt-1.5 shrink-0" />
                                        <div>
                                            <span className="font-semibold block">{ex.nome}</span>
                                            <span className="text-xs text-[#92c9a8] opacity-70">
                                                {ex.series} séries de {ex.repeticoes} reps
                                            </span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex gap-4 relative z-10">
                <button 
                    onClick={handleSaveWorkout}
                    className="flex-1 md:flex-none bg-[#13ec6a] hover:bg-[#10d460] text-[#102217] px-8 py-4 rounded-full font-black text-lg flex items-center justify-center gap-2 shadow-lg hover:scale-105 transition-all"
                >
                    <CheckCircle2 size={24} /> APROVAR E SALVAR
                </button>
                <button 
                    onClick={handleDiscard}
                    className="flex-1 md:flex-none border border-red-500/30 text-red-400 hover:bg-red-500/10 px-8 py-4 rounded-full font-bold flex items-center justify-center gap-2 transition-colors"
                >
                    <XCircle size={24} /> Descartar
                </button>
            </div>
        </section>

      ) : (

        /* === DASHBOARD PADRÃO (SINCRONIZADO) === */
        <>
            {/* 1. Hero Card - CARROSSEL */}
            <section className="bg-[#193324] rounded-xl overflow-hidden border border-white/5 flex flex-col lg:flex-row shadow-2xl relative">
                <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                    <ArrowUpRight size={100} className="text-[#13ec6a]" />
                </div>

                <div className="w-full lg:w-1/3 bg-slate-800 h-48 lg:h-auto relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-[#112218] to-[#193324]" />
                    <div className="absolute inset-0 flex items-center justify-center text-[#13ec6a]/20 group-hover:scale-110 transition-transform duration-500">
                        <GymIcon size={80} />
                    </div>
                </div>
                
                <div className="p-6 lg:p-8 flex-1 flex flex-col justify-center gap-4 relative z-10">
                    
                    {/* Controles do Carrossel */}
                    <div className="flex justify-between items-start">
                        <div className="flex flex-wrap items-center gap-3">
                             {isSuggested ? (
                                <span className="text-[#13ec6a] text-xs font-bold uppercase tracking-widest bg-[#13ec6a]/10 px-3 py-1 rounded-full w-fit flex items-center gap-1">
                                    <BrainCircuit size={12} /> Sugerido para Hoje
                                </span>
                             ) : (
                                <span className="text-slate-400 text-xs font-bold uppercase tracking-widest bg-white/5 px-3 py-1 rounded-full w-fit">
                                    Treino Selecionado
                                </span>
                             )}
                            
                            {currentWorkout && (
                              <span className="text-[#92c9a8] text-xs font-bold uppercase tracking-widest border border-[#92c9a8]/20 px-3 py-1 rounded-full w-fit">
                                {currentWorkout.programName}
                              </span>
                            )}
                        </div>

                        {/* Setinhas */}
                        {sessions.length > 1 && (
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={handlePrevWorkout}
                                    className="p-2 rounded-full bg-white/5 text-white hover:bg-[#13ec6a]/20 hover:text-[#13ec6a] transition-colors"
                                >
                                    <ChevronLeft size={20} />
                                </button>
                                <button 
                                    onClick={handleNextWorkout}
                                    className="p-2 rounded-full bg-white/5 text-white hover:bg-[#13ec6a]/20 hover:text-[#13ec6a] transition-colors"
                                >
                                    <ChevronRight size={20} />
                                </button>
                            </div>
                        )}
                    </div>
                   
                    <div>
                      <h3 className="text-2xl lg:text-3xl font-bold text-white">
                          {currentWorkout ? currentWorkout.name : "Nenhum treino ativo"}
                      </h3>
                      <p className="text-[#92c9a8] mt-1">
                        {currentWorkout?.focus || "Crie um plano para começar sua jornada."}
                      </p>
                    </div>
                    
                    {currentWorkout ? (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pt-4 border-t border-white/10">
                          <div className="flex gap-8">
                              <StatItem label="Estimativa" value={`${currentWorkout.estimatedTime} min`} icon={<Calendar size={14}/>} />
                              <StatItem label="Intensidade" value={currentWorkout.intensity} icon={<Zap size={14}/>} />
                          </div>
                          
                          <button 
                              onClick={handleStartWorkout}
                              className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 bg-[#13ec6a] text-[#112218] rounded-full text-lg font-black hover:scale-105 transition-all shadow-lg shadow-[#13ec6a]/20 group"
                          >
                              <Play fill="currentColor" size={20} className="group-hover:translate-x-1 transition-transform" />
                              <span>Iniciar Agora</span>
                          </button>
                      </div>
                    ) : (
                      <div className="pt-4 border-t border-white/10">
                         <button 
                              onClick={() => navigate('/new-workout')}
                              className="bg-[#13ec6a] hover:bg-[#10d460] text-[#112218] font-bold py-3 px-6 rounded-full transition-colors"
                          >
                              Criar Primeiro Treino
                          </button>
                      </div>
                    )}
                </div>
            </section>

            {/* Renderiza widgets APENAS se houver treino selecionado */}
            {currentWorkout && (
                <>
                    {/* 2. Cards de Insights */}
                    <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-[#193324] border border-[#326747] p-6 lg:p-8 rounded-xl">
                            <div className="flex justify-between items-center mb-6">
                                <div className="flex items-center gap-2">
                                    <BrainCircuit className="text-[#13ec6a]" size={24} />
                                    <p className="text-[#92c9a8] text-sm font-medium uppercase tracking-widest">Consistência</p>
                                </div>
                                <div className="flex items-center gap-1 text-[#13ec6a] font-bold">
                                    <TrendingUp size={16} />
                                    <span>Ótima</span>
                                </div>
                            </div>
                            <div className="h-32 flex items-center justify-center text-slate-500 italic border border-white/5 rounded-lg border-dashed text-sm">
                                [Gráfico de Frequência Semanal]
                            </div>
                        </div>

                        {/* NOVO CARD: CARGAS MÁXIMAS */}
                        <div className="bg-[#193324] border border-[#326747] p-6 lg:p-8 rounded-xl flex flex-col max-h-[350px]">
                            <div className="flex items-center gap-2 mb-4 shrink-0">
                                <GymIcon className="text-[#13ec6a]" size={24} />
                                <p className="text-[#92c9a8] text-sm font-medium uppercase tracking-widest">Cargas Máximas (PRs)</p>
                            </div>
                            
                            <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar flex-1">
                                {currentWorkout.maxLoads?.length > 0 ? (
                                    currentWorkout.maxLoads.map((item, idx) => (
                                        <MaxLoadBox key={idx} exercise={item.exercise} maxWeight={item.maxWeight} />
                                    ))
                                ) : (
                                    <div className="h-full flex items-center justify-center text-[#92c9a8] italic text-sm text-center">
                                        Nenhum recorde registrado para este treino ainda.
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>

                    {/* 3. Tabela de Histórico */}
                    <section className="pb-10">
                        <div className="flex items-center gap-3 mb-6">
                            <History className="text-[#13ec6a]" size={24} />
                            <h2 className="text-xl lg:text-2xl font-bold text-white">Últimas Vezes Neste Treino</h2>
                        </div>
                        
                        <div className="bg-[#193324] rounded-xl border border-white/5 overflow-hidden">
                            <div className="overflow-x-auto">
                            <table className="w-full text-left min-w-[600px]">
                                <thead className="bg-white/5 text-[#92c9a8] text-[10px] uppercase font-bold tracking-widest">
                                <tr>
                                    <th className="px-6 py-4">Treino</th>
                                    <th className="px-6 py-4">Data</th>
                                    <th className="px-6 py-4">Duração</th>
                                    <th className="px-6 py-4">Volume</th>
                                    <th className="px-6 py-4 text-right">Ação</th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                {filteredHistory.length > 0 ? (
                                    filteredHistory.map((act) => (
                                        <tr key={act.id} className="hover:bg-white/5 transition-all">
                                            <td className="px-6 py-4 font-bold text-sm text-white">
                                                <div className="flex items-center gap-3">
                                                <div className={`w-2 h-2 rounded-full ${act.statusColor}`} />
                                                {act.name}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-xs text-[#92c9a8]">{act.date}</td>
                                            <td className="px-6 py-4 text-xs text-[#92c9a8]">{act.duration}</td>
                                            <td className="px-6 py-4 text-xs text-[#92c9a8]">{act.volume}</td>
                                            <td className="px-6 py-4 text-right">
                                                <ArrowUpRight className="inline text-[#13ec6a]" size={16} />
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-slate-500 text-sm italic">
                                            Nenhum histórico registrado para este treino ainda. Comece hoje!
                                        </td>
                                    </tr>
                                )}
                                </tbody>
                            </table>
                            </div>
                        </div>
                    </section>
                </>
            )}
        </>
      )}
    </div>
  );
};

// Componentes Auxiliares
const StatItem = ({ label, value, icon }: { label: string, value: string, icon?: React.ReactNode }) => (
  <div className="flex flex-col">
    <div className="flex items-center gap-1 mb-1">
        {icon && <span className="text-[#92c9a8]">{icon}</span>}
        <span className="text-[10px] text-[#92c9a8] uppercase tracking-widest">{label}</span>
    </div>
    <span className="font-bold text-white text-lg">{value}</span>
  </div>
);

// --- NOVO COMPONENTE: MaxLoadBox ---
const MaxLoadBox = ({ exercise, maxWeight }: { exercise: string, maxWeight: string }) => (
  <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 rounded-full bg-[#13ec6a]/20 flex items-center justify-center text-[#13ec6a] shrink-0">
        <GymIcon size={20} />
      </div>
      <div>
        <p className="text-sm font-bold text-white leading-tight">{exercise}</p>
      </div>
    </div>
    <div className="flex flex-col items-end shrink-0 ml-2">
        <span className="text-[10px] text-[#92c9a8] uppercase tracking-widest">PR / Máx</span>
        <span className="text-[#13ec6a] font-black">{maxWeight}</span>
    </div>
  </div>
);
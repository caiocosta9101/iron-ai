import React, { useEffect, useState } from 'react';
import { 
  Play, BrainCircuit, TrendingUp, Dumbbell as GymIcon, 
  Loader2, History, ArrowUpRight, CheckCircle2, XCircle 
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom'; // <--- Necessário para receber os dados
import { toast } from 'sonner'; // <--- Necessário para feedback
import api from '../services/api';

export const Dashboard: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // 1. Detecta se a IA mandou um treino novo pra cá
  const newWorkoutFromAI = location.state?.newWorkout;

  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState(localStorage.getItem('userName') || "Campeão");
  const [currentDate, setCurrentDate] = useState("");

  // Dados Mockados (Mantidos conforme seu original)
  const [activities] = useState([
    { id: 1, name: 'Membros Inferiores B', date: 'Ontem, 16:45', duration: '62 min', volume: '4.250 kg', statusColor: 'bg-[#13ec6a]' },
    { id: 2, name: 'Cardio LISS', date: 'Sábado, 09:00', duration: '45 min', volume: '--', statusColor: 'bg-slate-400' },
    { id: 3, name: 'Costas e Bíceps A', date: 'Sexta, 18:20', duration: '58 min', volume: '3.800 kg', statusColor: 'bg-[#13ec6a]' },
  ]);

  useEffect(() => {
    // Formata Data
    const now = new Date();
    const formatted = new Intl.DateTimeFormat('pt-BR', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long' 
    }).format(now);
    setCurrentDate(formatted.charAt(0).toUpperCase() + formatted.slice(1));

    // Busca nome do usuário (apenas se não tiver carregando preview, opcional)
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const response = await api.get('/dashboard');
        if (response.data && response.data.name) {
          const firstName = response.data.name.split(' ')[0];
          setUserName(firstName);
        }
      } catch (err) {
        console.error("Erro ao carregar dados:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  // --- FUNÇÃO PARA SALVAR O TREINO ---
  const handleSaveWorkout = () => {
    // Aqui você enviaria para o backend salvar no banco.
    // Por enquanto, vamos passar direto para a tela "Meus Treinos"
    toast.success("Plano de treino ativado com sucesso!");
    
    navigate('/meus-treinos', { 
        state: { savedWorkout: newWorkoutFromAI } 
    });
  };

  // --- FUNÇÃO PARA DESCARTAR ---
  const handleDiscard = () => {
      // Limpa o state da navegação recarregando a página limpa ou navegando para si mesmo com state vazio
      navigate('/dashboard', { state: {} });
      toast.info("Sugestão descartada.");
  };

  if (loading) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center text-[#13ec6a]">
        <Loader2 className="animate-spin mb-4" size={48} />
        <p className="font-bold tracking-widest uppercase text-[10px]">Carregando Perfil...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 lg:space-y-8 animate-in fade-in duration-500 pb-10">
      
      <header className="flex flex-col gap-4 lg:flex-row lg:justify-between lg:items-end">
        <div className="flex items-center gap-4">
          <div className="space-y-1">
            <h2 className="text-2xl lg:text-4xl font-black tracking-tight text-white">
              Olá, {userName}!
            </h2>
            <p className="text-[#92c9a8] text-sm lg:text-lg">{currentDate} • {newWorkoutFromAI ? "Nova Sugestão Disponível" : "Dia de Superiores"}</p>
          </div>
        </div>
      </header>

      {/* === LÓGICA CONDICIONAL: SE TIVER TREINO DA IA, MOSTRA O PREVIEW === */}
      {newWorkoutFromAI ? (
        <section className="bg-gradient-to-br from-[#193324] to-[#102217] border border-[#13ec6a] rounded-2xl p-6 lg:p-8 shadow-[0_0_30px_rgba(19,236,106,0.1)] relative overflow-hidden">
            {/* Badge de IA */}
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

            {/* Grid dos Dias Gerados */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8 relative z-10">
                {newWorkoutFromAI.dias.map((dia: any, index: number) => (
                    <div key={index} className="bg-[#112218]/80 border border-[#326747] rounded-xl p-4 hover:border-[#13ec6a]/50 transition-colors">
                        <div className="flex justify-between items-center mb-3 border-b border-white/5 pb-2">
                            <span className="font-bold text-white">{dia.nome}</span>
                            <span className="text-[10px] bg-[#13ec6a]/20 text-[#13ec6a] px-2 py-1 rounded uppercase font-bold">{dia.foco || "Geral"}</span>
                        </div>
                        <ul className="space-y-2">
                            {dia.exercicios.slice(0, 4).map((ex: any, idx: number) => (
                                <li key={idx} className="text-sm text-zinc-400 flex items-center gap-2">
                                    <div className="w-1 h-1 bg-[#13ec6a] rounded-full" />
                                    {ex.nome} <span className="text-xs text-[#92c9a8] opacity-50">({ex.series}x{ex.repeticoes})</span>
                                </li>
                            ))}
                            {dia.exercicios.length > 4 && (
                                <li className="text-xs text-[#13ec6a] font-bold italic">+ {dia.exercicios.length - 4} exercícios</li>
                            )}
                        </ul>
                    </div>
                ))}
            </div>

            {/* Botões de Ação */}
            <div className="flex gap-4 relative z-10">
                <button 
                    onClick={handleSaveWorkout}
                    className="flex-1 md:flex-none bg-[#13ec6a] hover:bg-[#10d460] text-[#102217] px-8 py-4 rounded-full font-black text-lg flex items-center justify-center gap-2 shadow-lg hover:scale-105 transition-all"
                >
                    <CheckCircle2 size={24} />
                    APROVAR E SALVAR
                </button>
                <button 
                    onClick={handleDiscard}
                    className="flex-1 md:flex-none border border-red-500/30 text-red-400 hover:bg-red-500/10 px-8 py-4 rounded-full font-bold flex items-center justify-center gap-2 transition-colors"
                >
                    <XCircle size={24} />
                    Descartar
                </button>
            </div>
        </section>
      ) : (
        /* === DASHBOARD PADRÃO (SE NÃO TIVER PREVIEW) === */
        <>
            {/* Hero Card */}
            <section className="bg-[#193324] rounded-xl overflow-hidden border border-white/5 flex flex-col lg:flex-row shadow-2xl">
                <div className="w-full lg:w-1/3 bg-slate-800 h-48 lg:h-auto relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#193324]" />
                </div>
                <div className="p-6 lg:p-8 flex-1 flex flex-col justify-center gap-4">
                    <span className="text-[#13ec6a] text-xs font-bold uppercase tracking-widest bg-[#13ec6a]/10 px-3 py-1 rounded-full w-fit">Programado para Hoje</span>
                    <h3 className="text-2xl lg:text-3xl font-bold text-white">Próximo Treino: Membros Superiores</h3>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pt-4 border-t border-white/10">
                    <div className="flex gap-8">
                        <StatItem label="Duração" value="55 min" />
                        <StatItem label="Foco" value="Peito & Tríceps" />
                    </div>
                    <button className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 bg-[#13ec6a] text-[#112218] rounded-full text-lg font-black hover:scale-105 transition-all shadow-lg shadow-[#13ec6a]/20">
                        <Play fill="currentColor" size={20} />
                        <span>Iniciar Agora</span>
                    </button>
                    </div>
                </div>
            </section>

            {/* Insights Section */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-[#193324] border border-[#326747] p-6 lg:p-8 rounded-xl">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-2">
                        <BrainCircuit className="text-[#13ec6a]" size={24} />
                        <p className="text-[#92c9a8] text-sm font-medium uppercase tracking-widest">Equilíbrio</p>
                        </div>
                        <div className="flex items-center gap-1 text-[#13ec6a] font-bold">
                        <TrendingUp size={16} />
                        <span>+5.2%</span>
                        </div>
                    </div>
                    <div className="h-32 flex items-center justify-center text-slate-600 italic border border-white/5 rounded-lg border-dashed">
                        [Gráfico de Performance]
                    </div>
                </div>

                <div className="bg-[#193324] border border-[#326747] p-6 lg:p-8 rounded-xl space-y-4">
                    <p className="text-[#92c9a8] text-sm font-medium uppercase tracking-widest mb-2">Sugestões de Carga (IA)</p>
                    <LoadBox exercise="Supino Inclinado" weight="30kg" gain="+2.5kg" />
                    <LoadBox exercise="Tríceps Corda" weight="20kg" gain="+5kg" />
                </div>
            </section>

            {/* Tabela de Atividades */}
            <section className="pb-10">
                <div className="flex items-center gap-3 mb-6">
                    <History className="text-[#13ec6a]" size={24} />
                    <h2 className="text-xl lg:text-2xl font-bold text-white">Atividades Recentes</h2>
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
                        {activities.map((act) => (
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
                        ))}
                        </tbody>
                    </table>
                    </div>
                </div>
            </section>
        </>
      )}
    </div>
  );
};

// Componentes auxiliares
const StatItem = ({ label, value }: { label: string, value: string }) => (
  <div className="flex flex-col">
    <span className="text-[10px] text-[#92c9a8] uppercase tracking-widest">{label}</span>
    <span className="font-bold text-white">{value}</span>
  </div>
);

const LoadBox = ({ exercise, weight, gain }: { exercise: string, weight: string, gain: string }) => (
  <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 rounded-full bg-[#13ec6a]/20 flex items-center justify-center text-[#13ec6a]">
        <GymIcon size={20} />
      </div>
      <div>
        <p className="text-sm font-bold text-white">{exercise}</p>
        <p className="text-[10px] text-[#92c9a8]">ATUAL: {weight}</p>
      </div>
    </div>
    <span className="text-[#13ec6a] font-black">{gain}</span>
  </div>
);
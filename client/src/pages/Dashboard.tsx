import React, { useEffect, useState } from 'react';
import { Sidebar } from '../components/Sidebar';
import { 
  Play, BrainCircuit, TrendingUp, Dumbbell as GymIcon, 
  Loader2, History, ArrowUpRight, Menu 
} from 'lucide-react';
import api from '../services/api';

export const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState(localStorage.getItem('userName') || "Campeão");
  const [currentDate, setCurrentDate] = useState("");
  // Estado para controlar a Sidebar no mobile
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [activities] = useState([
    { id: 1, name: 'Membros Inferiores B', date: 'Ontem, 16:45', duration: '62 min', volume: '4.250 kg', statusColor: 'bg-[#13ec6a]' },
    { id: 2, name: 'Cardio LISS', date: 'Sábado, 09:00', duration: '45 min', volume: '--', statusColor: 'bg-slate-400' },
    { id: 3, name: 'Costas e Bíceps A', date: 'Sexta, 18:20', duration: '58 min', volume: '3.800 kg', statusColor: 'bg-[#13ec6a]' },
  ]);

  const getFormattedDate = () => {
    const now = new Date();
    const formatted = new Intl.DateTimeFormat('pt-BR', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long' 
    }).format(now);
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };

  useEffect(() => {
    setCurrentDate(getFormattedDate());
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

  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#102217] text-[#13ec6a]">
        <Loader2 className="animate-spin mb-4" size={48} />
        <p className="font-bold tracking-widest uppercase text-[10px]">Carregando Perfil...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#102217] text-white font-display">
      {/* Passamos o estado e a função de fechar para a Sidebar */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <main className="flex-1 overflow-y-auto bg-[#102217]">
        {/* Padding responsivo: p-4 no celular, p-8 no desktop */}
        <div className="p-4 lg:p-8 max-w-6xl mx-auto space-y-6 lg:space-y-8">
          
          <header className="flex flex-col gap-4 lg:flex-row lg:justify-between lg:items-end">
            <div className="flex items-center gap-4">
              {/* Botão Menu Mobile */}
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden p-2 -ml-2 text-white hover:bg-white/10 rounded-lg"
              >
                <Menu size={28} />
              </button>
              
              <div className="space-y-1">
                <h2 className="text-2xl lg:text-4xl font-black tracking-tight">
                  Olá, {userName}!
                </h2>
                <p className="text-[#92c9a8] text-sm lg:text-lg">{currentDate} • Dia de Superiores</p>
              </div>
            </div>
          </header>

          {/* Hero Card */}
          <section className="bg-[#193324] rounded-xl overflow-hidden border border-white/5 flex flex-col lg:flex-row shadow-2xl">
            <div className="w-full lg:w-1/3 bg-slate-800 h-48 lg:h-auto" />
            <div className="p-6 lg:p-8 flex-1 flex flex-col justify-center gap-4">
              <span className="text-[#13ec6a] text-xs font-bold uppercase tracking-widest bg-[#13ec6a]/10 px-3 py-1 rounded-full w-fit">Programado para Hoje</span>
              <h3 className="text-2xl lg:text-3xl font-bold">Próximo Treino: Membros Superiores</h3>
              
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
              <h2 className="text-xl lg:text-2xl font-bold">Atividades Recentes</h2>
            </div>
            
            <div className="bg-[#193324] rounded-xl border border-white/5 overflow-hidden">
              {/* Container com scroll horizontal para a tabela não quebrar no mobile */}
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[600px]"> {/* min-w força a tabela a ter um tamanho mínimo */}
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
                        <td className="px-6 py-4 font-bold text-sm">
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
        </div>
      </main>
    </div>
  );
};

const StatItem = ({ label, value }: { label: string, value: string }) => (
  <div className="flex flex-col">
    <span className="text-[10px] text-[#92c9a8] uppercase tracking-widest">{label}</span>
    <span className="font-bold">{value}</span>
  </div>
);

const LoadBox = ({ exercise, weight, gain }: { exercise: string, weight: string, gain: string }) => (
  <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 rounded-full bg-[#13ec6a]/20 flex items-center justify-center text-[#13ec6a]">
        <GymIcon size={20} />
      </div>
      <div>
        <p className="text-sm font-bold">{exercise}</p>
        <p className="text-[10px] text-[#92c9a8]">ATUAL: {weight}</p>
      </div>
    </div>
    <span className="text-[#13ec6a] font-black">{gain}</span>
  </div>
);
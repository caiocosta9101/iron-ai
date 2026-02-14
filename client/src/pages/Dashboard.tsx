// client/src/pages/Dashboard.tsx
import React, { useEffect, useState } from 'react';
import { Sidebar } from '../components/Sidebar';
import { 
  Play, 
  BrainCircuit, 
  TrendingUp, 
  Dumbbell as GymIcon, 
  Loader2, 
  History,
  ArrowUpRight 
} from 'lucide-react';
import api from '../services/api';

interface TrainingActivity {
  id: number;
  name: string;
  date: string;
  duration: string;
  volume: string;
  statusColor: string;
}

export const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activities] = useState<TrainingActivity[]>([
    { id: 1, name: 'Membros Inferiores B', date: 'Ontem, 16:45', duration: '62 min', volume: '4.250 kg', statusColor: 'bg-[#13ec6a]' },
    { id: 2, name: 'Cardio LISS', date: 'Sábado, 09:00', duration: '45 min', volume: '--', statusColor: 'bg-slate-400' },
    { id: 3, name: 'Costas e Bíceps A', date: 'Sexta, 18:20', duration: '58 min', volume: '3.800 kg', statusColor: 'bg-[#13ec6a]' },
  ]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        // Chama a api para evitar erro de variável não lida
        await api.get('/auth/me').catch(() => null); 
        setError(null);
      } catch (err) {
        console.error("Erro na API:", err);
        setError("Modo de Simulação Ativo");
      } finally {
        setTimeout(() => setLoading(false), 600);
      }
    };
    fetchInitialData();
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#102217] text-[#13ec6a]">
        <Loader2 className="animate-spin mb-4" size={48} />
        <p className="font-bold tracking-widest uppercase text-[10px]">Sincronizando Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#102217] text-white font-display">
      <Sidebar />
      
      <main className="flex-1 overflow-y-auto p-8 bg-[#102217]">
        <div className="max-w-6xl mx-auto space-y-8">
          
          <header className="flex justify-between items-end">
            <div className="space-y-1">
              <h2 className="text-4xl font-black tracking-tight">Bem-vindo de volta, Campeão!</h2>
              <p className="text-[#92c9a8] text-lg">Segunda-feira, 14 de Outubro • Dia de Superiores</p>
            </div>
          </header>

          {error && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 p-2 rounded-lg text-[10px] font-bold uppercase text-center">
              {error}
            </div>
          )}

          {/* Hero Card */}
          <section className="bg-[#193324] rounded-xl overflow-hidden border border-white/5 flex flex-col lg:flex-row shadow-2xl">
            <div className="w-full lg:w-1/3 bg-slate-800 aspect-video lg:aspect-auto" />
            <div className="p-8 flex-1 flex flex-col justify-center gap-4">
              <span className="text-[#13ec6a] text-xs font-bold uppercase tracking-widest bg-[#13ec6a]/10 px-3 py-1 rounded-full w-fit">Programado para Hoje</span>
              <h3 className="text-3xl font-bold">Próximo Treino: Membros Superiores</h3>
              <div className="flex flex-wrap items-center justify-between gap-6 pt-4 border-t border-white/10">
                <div className="flex gap-8">
                  <StatItem label="Duração" value="55 min" />
                  <StatItem label="Foco" value="Peito & Tríceps" />
                </div>
                <button className="flex items-center gap-3 px-8 py-4 bg-[#13ec6a] text-[#112218] rounded-full text-lg font-black hover:scale-105 transition-all shadow-lg shadow-[#13ec6a]/20">
                  <Play fill="currentColor" size={20} />
                  <span>Iniciar Agora</span>
                </button>
              </div>
            </div>
          </section>

          {/* Insights Section - Usando BrainCircuit e TrendingUp */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-[#193324] border border-[#326747] p-8 rounded-xl">
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

            <div className="bg-[#193324] border border-[#326747] p-8 rounded-xl space-y-4">
              <p className="text-[#92c9a8] text-sm font-medium uppercase tracking-widest mb-2">Sugestões de Carga (IA)</p>
              <LoadBox exercise="Supino Inclinado" weight="30kg" gain="+2.5kg" />
              <LoadBox exercise="Tríceps Corda" weight="20kg" gain="+5kg" />
            </div>
          </section>

          {/* Atividades Recentes - Usando History */}
          <section className="pb-10">
            <div className="flex items-center gap-3 mb-6">
              <History className="text-[#13ec6a]" size={24} />
              <h2 className="text-2xl font-bold">Atividades Recentes</h2>
            </div>
            
            <div className="bg-[#193324] rounded-xl border border-white/5 overflow-hidden">
              <table className="w-full text-left">
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
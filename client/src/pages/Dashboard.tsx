// client/src/pages/Dashboard.tsx
import React, { useEffect, useState } from 'react';
import { Sidebar } from '../components/Sidebar';
import { Play, BrainCircuit, TrendingUp, Dumbbell as GymIcon } from 'lucide-react';
import api from '../services/api'; // [cite: 30]

export const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        // Aqui chamaremos as rotas que você criará no backend
        // const response = await api.get('/user/stats');
      } catch (error) {
        console.error("Erro ao carregar dashboard:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-[#102217] text-white font-display">
      <Sidebar />
      
      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          
          {/* Header */}
          <header className="flex justify-between items-end">
            <div>
              <h2 className="text-4xl font-black tracking-tight">Bem-vindo de volta, Campeão!</h2>
              <p className="text-[#92c9a8] text-lg">Segunda-feira, 14 de Outubro • Dia de Superiores</p>
            </div>
          </header>

          {/* Hero Card */}
          <section className="bg-[#193324] rounded-xl overflow-hidden border border-white/5 flex flex-col md:flex-row shadow-2xl">
            <div className="w-full md:w-1/3 bg-slate-800 h-48 md:h-auto" />
            <div className="p-8 flex-1 flex flex-col justify-center gap-4">
              <span className="text-[#13ec6a] text-xs font-bold uppercase bg-[#13ec6a]/10 px-3 py-1 rounded-full w-fit">Programado para Hoje</span>
              <h3 className="text-3xl font-bold">Próximo Treino: Membros Superiores</h3>
              <div className="flex justify-between items-center pt-4 border-t border-white/10">
                <div className="flex gap-8">
                  <Stat label="Duração" value="55 min" />
                  <Stat label="Foco" value="Peito & Tríceps" />
                </div>
                <button className="flex items-center gap-3 px-8 py-4 bg-[#13ec6a] text-[#112218] rounded-full text-lg font-black hover:scale-105 transition-all shadow-lg shadow-[#13ec6a]/30">
                  <Play fill="currentColor" /> Iniciar Agora
                </button>
              </div>
            </div>
          </section>

          {/* AI Insights Section */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <BrainCircuit className="text-[#13ec6a]" size={32} />
              <h2 className="text-2xl font-bold">Insights da IA</h2>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card title="Equilíbrio Muscular" value="85%" trend="+5.2%" />
              <div className="bg-[#193324] border border-[#326747] p-8 rounded-xl space-y-4">
                <div className="flex justify-between">
                  <p className="text-[#92c9a8] text-sm font-medium uppercase">Sugestões de Carga</p>
                  <span className="text-[#13ec6a] text-xs font-bold">OTIMIZAÇÃO AI</span>
                </div>
                <LoadSuggestion exercise="Supino Inclinado" current="30kg" increase="+2.5kg" />
                <LoadSuggestion exercise="Tríceps Corda" current="20kg" increase="+5kg" />
              </div>
            </div>
          </section>

        </div>
      </main>
    </div>
  );
};

const Stat = ({ label, value }: { label: string, value: string }) => (
  <div className="flex flex-col">
    <span className="text-xs text-[#92c9a8]/60 uppercase">{label}</span>
    <span className="font-bold">{value}</span>
  </div>
);

const LoadSuggestion = ({ exercise, current, increase }: any) => (
  <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-transparent hover:border-[#13ec6a]/30 transition-all">
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 rounded-full bg-[#13ec6a]/20 flex items-center justify-center text-[#13ec6a]">
        <GymIcon size={18} />
      </div>
      <div>
        <p className="text-sm font-bold">{exercise}</p>
        <p className="text-xs text-[#92c9a8]">Carga atual: {current}</p>
      </div>
    </div>
    <div className="text-right">
      <p className="text-[#13ec6a] font-black">{increase}</p>
      <p className="text-[10px] text-slate-400 uppercase">Nova Meta</p>
    </div>
  </div>
);

const Card = ({ title, value, trend }: any) => (
  <div className="bg-[#193324] border border-[#326747] p-8 rounded-xl">
    <p className="text-[#92c9a8] text-sm font-medium uppercase">{title}</p>
    <div className="flex justify-between items-baseline mt-2">
      <p className="text-4xl font-black">{value}</p>
      <p className="text-[#0bda43] text-sm font-bold flex items-center gap-1">
        <TrendingUp size={14} /> {trend}
      </p>
    </div>
    <div className="h-32 mt-4 bg-white/5 rounded-lg flex items-center justify-center text-[#92c9a8]/20">
      [Gráfico de Equilíbrio]
    </div>
  </div>
);
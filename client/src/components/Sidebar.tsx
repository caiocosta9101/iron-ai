// client/src/components/Sidebar.tsx
import React from 'react'; // <--- ADICIONE ESTA LINHA IMPORTANTE
import { LayoutDashboard, Dumbbell, Activity, History, Settings, Plus } from 'lucide-react';

export const Sidebar = () => {
  return (
    <aside className="w-72 bg-[#112218] flex flex-col justify-between p-6 border-r border-[#193324] h-screen">
      <div className="flex flex-col gap-8">
        <div className="flex items-center gap-3">
          <div className="rounded-full size-12 border-2 border-[#13ec6a] bg-slate-700" />
          <div className="flex flex-col">
            <h1 className="text-white text-lg font-bold">Iron AI</h1>
            
          </div>
        </div>
        
        <nav className="flex flex-col gap-2">
          <NavItem icon={<LayoutDashboard size={20} />} label="Dashboard" active />
          <NavItem icon={<Dumbbell size={20} />} label="Meus Treinos" />
          <NavItem icon={<Activity size={20} />} label="Progresso" />
          <NavItem icon={<History size={20} />} label="Histórico" />
          <NavItem icon={<Settings size={20} />} label="Configurações" />
        </nav>
      </div>

      <button className="w-full flex items-center justify-center gap-2 rounded-full h-12 bg-[#13ec6a] text-[#112218] text-sm font-bold hover:scale-[1.02] transition-transform">
        <Plus size={20} />
        <span>Novo Treino</span>
      </button>
    </aside>
  );
};

// Agora o React.ReactNode vai funcionar pois importamos o React lá em cima
const NavItem = ({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) => (
  <a className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
    active ? 'bg-[#13ec6a]/10 text-[#13ec6a] border border-[#13ec6a]/20' : 'text-slate-400 hover:text-white hover:bg-white/5'
  }`} href="#">
    {icon}
    <p className="text-sm font-medium">{label}</p>
  </a>
);
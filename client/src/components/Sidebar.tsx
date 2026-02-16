import React from 'react';
import { LayoutDashboard, Dumbbell, Activity, History, Settings, Plus, X } from 'lucide-react';

// Adicionamos tipos para as props de controle do menu mobile
interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  return (
    <>
      {/* Overlay Escuro (Só aparece no mobile quando aberto) */}
      <div 
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity lg:hidden ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`} 
        onClick={onClose}
      />

      {/* Sidebar Principal */}
      <aside 
        className={`
          fixed lg:relative z-50 
          w-72 h-screen 
          bg-[#112218] border-r border-[#193324] 
          flex flex-col justify-between p-6 
          transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="flex flex-col gap-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-full size-12 border-2 border-[#13ec6a] bg-slate-700" />
              <div className="flex flex-col">
                <h1 className="text-white text-lg font-bold">Iron AI</h1>
              </div>
            </div>
            {/* Botão de Fechar (Só mobile) */}
            <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-white">
              <X size={24} />
            </button>
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
    </>
  );
};

const NavItem = ({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) => (
  <a className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
    active ? 'bg-[#13ec6a]/10 text-[#13ec6a] border border-[#13ec6a]/20' : 'text-slate-400 hover:text-white hover:bg-white/5'
  }`} href="#">
    {icon}
    <p className="text-sm font-medium">{label}</p>
  </a>
);
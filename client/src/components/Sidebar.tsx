// client/src/components/Sidebar.tsx
import React from 'react';
import { 
  LayoutDashboard, 
  Dumbbell, 
  Activity, 
  History, 
  Settings, 
  Plus, 
  X,
  PlayCircle // <--- Ícone novo para o "Treinar Agora"
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom'; 

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation(); 

  const handleNavigation = (path: string) => {
    navigate(path);
    onClose(); 
  };

  return (
    <>
      {/* Overlay Escuro (Mobile) */}
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
          
          {/* Logo e Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-full size-12 border-2 border-[#13ec6a] bg-slate-700 overflow-hidden relative">
                 {/* Placeholder de avatar ou logo */}
                 <div className="absolute inset-0 bg-[#13ec6a]/20 flex items-center justify-center text-[#13ec6a] font-bold">I</div>
              </div>
              <div className="flex flex-col">
                <h1 className="text-white text-lg font-bold">Iron AI</h1>
                <span className="text-xs text-slate-400">Beta</span>
              </div>
            </div>
            <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-white">
              <X size={24} />
            </button>
          </div>
          
          {/* Navegação */}
          <nav className="flex flex-col gap-2">
            <NavItem 
              icon={<LayoutDashboard size={20} />} 
              label="Dashboard" 
              active={location.pathname === '/dashboard'}
              onClick={() => handleNavigation('/dashboard')}
            />

            {/* --- NOVO BOTÃO DE ATALHO PARA O TREINO ATUAL --- */}
            <NavItem 
              icon={<PlayCircle size={20} />} 
              label="Atividade (Treinar)" 
              // Fica ativo se estiver na rota mágica ou já dentro do treino
              active={location.pathname === '/active' || location.pathname.includes('/workout/active')}
              onClick={() => handleNavigation('/active')}
            />

            <NavItem 
              icon={<Dumbbell size={20} />} 
              label="Meus Treinos" 
              active={location.pathname === '/my-workouts'} // Atualizado para bater com App.tsx
              onClick={() => handleNavigation('/my-workouts')}
            />
            <NavItem 
              icon={<Activity size={20} />} 
              label="Progresso" 
              active={location.pathname === '/progress'}
              onClick={() => handleNavigation('/progress')}
            />
            <NavItem 
              icon={<History size={20} />} 
              label="Histórico" 
              active={location.pathname === '/history'}
              onClick={() => handleNavigation('/history')}
            />
            <NavItem 
              icon={<Settings size={20} />} 
              label="Configurações" 
              active={location.pathname === '/settings'}
              onClick={() => handleNavigation('/settings')}
            />
          </nav>
        </div>

        {/* Botão NOVO TREINO */}
        <button 
          onClick={() => handleNavigation('/new-workout')} // Atualizado para bater com App.tsx
          className="w-full flex items-center justify-center gap-2 rounded-full h-12 bg-[#13ec6a] text-[#112218] text-sm font-bold hover:scale-[1.02] transition-transform hover:shadow-lg hover:shadow-[#13ec6a]/20"
        >
          <Plus size={20} />
          <span>Novo Treino</span>
        </button>
      </aside>
    </>
  );
};

// Componente NavItem
const NavItem = ({ icon, label, active = false, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all w-full text-left group ${
      active 
        ? 'bg-[#13ec6a]/10 text-[#13ec6a] border border-[#13ec6a]/20 shadow-[0_0_10px_rgba(19,236,106,0.1)]' 
        : 'text-slate-400 hover:text-white hover:bg-white/5'
    }`}
  >
    <span className={`transition-colors ${active ? 'text-[#13ec6a]' : 'group-hover:text-[#13ec6a]'}`}>
        {icon}
    </span>
    <p className="text-sm font-medium">{label}</p>
  </button>
);
import React from 'react';
import { LayoutDashboard, Dumbbell, Activity, History, Settings, Plus, X } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom'; 

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation(); // Hook para saber em qual URL estamos

  // Função auxiliar para navegar e fechar o menu (no mobile)
  const handleNavigation = (path: string) => {
    navigate(path);
    onClose(); // Fecha o menu mobile se estiver aberto
  };

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
            <NavItem 
              icon={<LayoutDashboard size={20} />} 
              label="Dashboard" 
              active={location.pathname === '/dashboard'}
              onClick={() => handleNavigation('/dashboard')}
            />
            <NavItem 
              icon={<Dumbbell size={20} />} 
              label="Meus Treinos" 
              active={location.pathname === '/meus-treinos'} // Exemplo de rota futura
              onClick={() => handleNavigation('/meus-treinos')}
            />
            <NavItem 
              icon={<Activity size={20} />} 
              label="Progresso" 
              active={location.pathname === '/progresso'}
              onClick={() => handleNavigation('/progresso')}
            />
            <NavItem 
              icon={<History size={20} />} 
              label="Histórico" 
              active={location.pathname === '/historico'}
              onClick={() => handleNavigation('/historico')}
            />
            <NavItem 
              icon={<Settings size={20} />} 
              label="Configurações" 
              active={location.pathname === '/configuracoes'}
              onClick={() => handleNavigation('/configuracoes')}
            />
          </nav>
        </div>

        {/* Botão NOVO TREINO com ação real */}
        <button 
          onClick={() => handleNavigation('/novo-treino')}
          className="w-full flex items-center justify-center gap-2 rounded-full h-12 bg-[#13ec6a] text-[#112218] text-sm font-bold hover:scale-[1.02] transition-transform hover:shadow-lg hover:shadow-[#13ec6a]/20"
        >
          <Plus size={20} />
          <span>Novo Treino</span>
        </button>
      </aside>
    </>
  );
};

// Componente NavItem atualizado para usar Button e onClick
const NavItem = ({ icon, label, active = false, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all w-full text-left ${
      active ? 'bg-[#13ec6a]/10 text-[#13ec6a] border border-[#13ec6a]/20' : 'text-slate-400 hover:text-white hover:bg-white/5'
    }`}
  >
    {icon}
    <p className="text-sm font-medium">{label}</p>
  </button>
);
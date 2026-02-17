import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react'; // Importamos o ícone de menu
import { Sidebar } from '../components/Sidebar';

export function AppLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-[#102217] text-white overflow-hidden font-sans">
      
      {/* Sidebar (Menu Lateral) */}
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />

      {/* Área Principal de Conteúdo */}
      <main className="flex-1 overflow-y-auto bg-[#102217] relative scroll-smooth">
        
        {/* Cabeçalho Mobile (Só aparece em telas pequenas) */}
        {/* Adicionei um fundo com desfoque (blur) para ficar fixo e bonito ao rolar */}
        <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between p-4 bg-[#102217]/90 backdrop-blur-md border-b border-[#13ec6a]/10">
            <span className="font-bold text-lg text-white">Iron AI</span>
            <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 text-[#13ec6a] hover:bg-[#13ec6a]/10 rounded-lg transition-colors"
                aria-label="Abrir menu"
            >
                <Menu size={24} />
            </button>
        </div>

        {/* Onde as páginas (Dashboard, Novo Treino, etc) são renderizadas */}
        <div className="p-4 lg:p-8 mx-auto max-w-7xl">
          <Outlet /> 
        </div>
        
      </main>
    </div>
  );
}
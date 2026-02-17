import { Dumbbell, BrainCircuit, ChevronRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function NewWorkout() {
  const navigate = useNavigate();

  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in duration-500 py-6">
      
      {/* Cabeçalho */}
      <div className="space-y-2">
        <h1 className="text-3xl lg:text-4xl font-black text-white tracking-tight">
          Criar Novo Treino
        </h1>
        <p className="text-[#92c9a8] text-lg">
          Escolha o método ideal para destruir no treino de hoje.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
        
        {/* === OPÇÃO 1: MANUAL (Estilo Iron AI - Verde) === */}
        <div 
          onClick={() => console.log("Clicou Manual - Em breve")} // Mantido placeholder até criarmos a tela manual
          className="group relative flex flex-col justify-between h-[320px] p-8 rounded-3xl bg-[#193324] border border-[#326747] hover:border-[#13ec6a] transition-all duration-300 cursor-pointer hover:shadow-2xl hover:shadow-[#13ec6a]/10"
        >
          <div className="absolute top-8 right-8 text-[#326747] group-hover:text-[#13ec6a] transition-colors">
            <ChevronRight size={24} />
          </div>

          <div className="h-16 w-16 bg-[#112218] rounded-2xl flex items-center justify-center group-hover:bg-[#13ec6a] text-[#13ec6a] group-hover:text-[#112218] transition-all duration-300 shadow-inner border border-[#326747]">
            <Dumbbell size={32} />
          </div>

          <div className="space-y-3">
            <h3 className="text-2xl font-bold text-white group-hover:text-[#13ec6a] transition-colors">
              Montar Manualmente
            </h3>
            <p className="text-[#92c9a8] leading-relaxed group-hover:text-white transition-colors">
              Você é o coach. Selecione exercícios da nossa biblioteca, defina séries e repetições.
            </p>
          </div>
        </div>

        {/* === OPÇÃO 2: IRON AI (Estilo Roxo Integrado) === */}
        <div 
          onClick={() => navigate('/novo-treino/ia')} // <--- ROTA ATUALIZADA AQUI
          className="group relative flex flex-col justify-between h-[320px] p-8 rounded-3xl bg-gradient-to-br from-[#193324] to-purple-900/40 border border-purple-500/20 hover:border-purple-500 transition-all duration-300 cursor-pointer hover:shadow-2xl hover:shadow-purple-900/20 overflow-hidden"
        >
          {/* Efeito de brilho hover */}
          <div className="absolute inset-0 bg-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <div className="absolute top-0 right-0 bg-purple-600 text-white text-xs font-bold px-4 py-2 rounded-bl-2xl shadow-lg flex items-center gap-2">
            <Sparkles size={12} fill="currentColor" />
            IA BETA
          </div>

          <div className="h-16 w-16 bg-[#112218] rounded-2xl flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform duration-300 border border-purple-500/20">
            <BrainCircuit size={32} />
          </div>

          <div className="space-y-3 relative z-10">
            <h3 className="text-2xl font-bold text-white group-hover:text-purple-300 transition-colors">
              Gerar com Iron AI
            </h3>
            <p className="text-[#92c9a8] leading-relaxed group-hover:text-white">
              Responda a 5 perguntas rápidas e deixe nossa Inteligência Artificial montar o plano perfeito.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
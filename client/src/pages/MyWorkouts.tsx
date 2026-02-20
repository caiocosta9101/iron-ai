import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dumbbell, ChevronRight, Calendar, Plus, Loader2 } from 'lucide-react';
import api from '../services/api';

// Definição simples do tipo para o TypeScript não reclamar
interface Treino {
  id: string;
  nome: string;
  descricao: string;
  frequencia_semanal?: number; // O banco pode retornar null as vezes
  gerado_por_ia: boolean;
}

export default function MyWorkouts() {
  const navigate = useNavigate();
  const [workouts, setWorkouts] = useState<Treino[]>([]);
  const [loading, setLoading] = useState(true);

  // Busca os treinos assim que a tela carrega
  useEffect(() => {
    async function fetchWorkouts() {
      try {
        const response = await api.get('/workouts');
        setWorkouts(response.data);
      } catch (error) {
        console.error("Erro ao carregar treinos", error);
      } finally {
        setLoading(false);
      }
    }

    fetchWorkouts();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="text-3xl lg:text-4xl font-black text-white tracking-tight">Meus Treinos</h1>
            <p className="text-[#92c9a8]">Gerencie suas rotinas e periodizações.</p>
        </div>
        <button 
            onClick={() => navigate('/novo-treino')}
            className="bg-[#13ec6a] hover:bg-[#10d460] text-[#102217] px-6 py-3 rounded-full font-bold shadow-lg shadow-[#13ec6a]/20 transition-all hover:scale-105 flex items-center gap-2"
        >
            <Plus size={20} />
            Criar Novo
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-20 text-[#13ec6a]">
            <Loader2 size={40} className="animate-spin" />
        </div>
      )}

      {/* Empty State (Sem treinos) */}
      {!loading && workouts.length === 0 && (
         <div className="py-20 text-center border border-dashed border-[#326747] rounded-2xl bg-[#112218]/50">
            <p className="text-[#92c9a8] mb-4">Você ainda não tem nenhum treino montado.</p>
            <button onClick={() => navigate('/novo-treino')} className="text-white underline font-bold">
                Começar agora
            </button>
         </div>
      )}

      {/* Grid de Treinos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {!loading && workouts.map((treino) => (
            <div 
                key={treino.id} 
                onClick={() => navigate(`/treino/${treino.id}`)} // <--- CLIQUE ADICIONADO AQUI
                className="bg-[#193324] border border-[#13ec6a]/30 rounded-2xl p-6 relative group hover:border-[#13ec6a] hover:shadow-[0_0_20px_rgba(19,236,106,0.1)] transition-all cursor-pointer"
            >

                
                {/* Badge de IA ou Manual */}
                {treino.gerado_por_ia && (
                    <div className="absolute top-0 right-0 bg-[#13ec6a] text-[#112218] text-[10px] font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl">
                        IRON AI
                    </div>
                )}
                
                <div className="flex items-center gap-4 mb-6 mt-2">
                    <div className="w-12 h-12 bg-[#13ec6a] rounded-xl flex items-center justify-center text-[#102217]">
                        <Dumbbell size={24} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white line-clamp-1">{treino.nome}</h3>
                        <p className="text-xs text-[#13ec6a] font-bold uppercase tracking-widest">
                            {treino.gerado_por_ia ? 'Sugestão Inteligente' : 'Treino Manual'}
                        </p>
                    </div>
                </div>

                <div className="space-y-4 mb-6">
                    <p className="text-sm text-zinc-400 line-clamp-2 min-h-[40px]">
                        {treino.descricao || "Sem descrição disponível."}
                    </p>
                </div>

                <div className="pt-4 border-t border-white/5 flex items-center justify-between group-hover:pl-2 transition-all">
                    <span className="text-white font-bold text-sm">Ver Detalhes</span>
                    <ChevronRight className="text-[#13ec6a]" />
                </div>
            </div>
        ))}

      </div>
    </div>
  );
}
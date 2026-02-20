import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Dumbbell, Clock, Activity, Calendar, AlertCircle } from 'lucide-react';
import api from '../services/api';

// --- DEFINIÇÃO DOS TIPOS ---
interface Exercicio {
  id: string;
  nome: string;
  series: number;
  repeticoes_min: number;
  repeticoes_max: number;
  descanso_segundos: number;
  observacoes: string | null;
}

interface DiaTreino {
  id: string;
  nome: string;
  ordem_dia: number;
  observacoes: string | null;
  exercicios: Exercicio[];
}

interface TreinoDetalhado {
  id: string;
  nome: string;
  descricao: string;
  objetivo: string;
  criado_em: string;
  dias: DiaTreino[];
}

export default function WorkoutDetails() {
  const { id } = useParams(); // Pega o ID do treino na URL
  const navigate = useNavigate();
  
  const [workout, setWorkout] = useState<TreinoDetalhado | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Busca os detalhes do treino ao carregar a página
  useEffect(() => {
    const fetchWorkoutDetails = async () => {
      try {
        const response = await api.get(`/workouts/${id}`);
        setWorkout(response.data);
      } catch (err: any) {
        console.error("Erro ao buscar detalhes:", err);
        setError('Não foi possível carregar os detalhes deste treino.');
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchWorkoutDetails();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-[#92c9a8] animate-pulse">
        <Dumbbell size={48} className="mb-4 animate-bounce" />
        <p className="text-xl font-bold">Carregando protocolo...</p>
      </div>
    );
  }

  if (error || !workout) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-red-400 space-y-4">
        <AlertCircle size={48} />
        <p className="text-xl font-bold">{error}</p>
        <button onClick={() => navigate('/meus-treinos')} className="text-white bg-[#326747] px-6 py-2 rounded-full hover:bg-[#193324] transition">
          Voltar aos Treinos
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-6 animate-in fade-in duration-500">
      
      {/* --- CABEÇALHO DO TREINO --- */}
      <button 
        onClick={() => navigate('/meus-treinos')}
        className="flex items-center gap-2 text-[#92c9a8] hover:text-white mb-6 transition-colors"
      >
        <ChevronLeft size={20} /> Voltar para Meus Treinos
      </button>

      <div className="bg-[#112218] border border-[#326747] rounded-3xl p-6 lg:p-10 shadow-2xl mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 bg-emerald-500 text-[#0a140f] text-xs font-black px-4 py-1 rounded-bl-xl uppercase tracking-widest">
          Iron AI
        </div>
        <h1 className="text-3xl lg:text-4xl font-black text-white mb-4">{workout.nome}</h1>
        <p className="text-zinc-400 text-lg mb-6 leading-relaxed">{workout.descricao}</p>
        
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2 bg-[#193324] px-4 py-2 rounded-xl border border-[#326747]">
            <Activity size={18} className="text-emerald-400" />
            <span className="text-[#92c9a8] font-medium capitalize">{workout.objetivo}</span>
          </div>
          <div className="flex items-center gap-2 bg-[#193324] px-4 py-2 rounded-xl border border-[#326747]">
            <Calendar size={18} className="text-emerald-400" />
            <span className="text-[#92c9a8] font-medium">{workout.dias.length} Dias de Treino</span>
          </div>
        </div>
      </div>

      {/* --- DIAS DE TREINO --- */}
      <div className="space-y-8">
        {workout.dias.map((dia) => (
          <div key={dia.id} className="bg-[#193324] border border-[#326747] rounded-2xl overflow-hidden">
            
            <div className="bg-[#112218] p-5 border-b border-[#326747] flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  {dia.nome}
                </h2>
                {dia.observacoes && (
                  <p className="text-emerald-400 text-sm mt-1 font-medium">{dia.observacoes}</p>
                )}
              </div>
            </div>

            <div className="p-5">
              <div className="space-y-4">
                {dia.exercicios.map((ex, index) => (
                  <div key={ex.id} className="flex flex-col md:flex-row md:items-center justify-between bg-[#112218] p-4 rounded-xl border border-[#326747]/50 hover:border-emerald-500/50 transition-colors gap-4">
                    
                    <div className="flex items-start gap-4 flex-1">
                      <div className="bg-[#193324] text-emerald-400 w-8 h-8 rounded-full flex items-center justify-center font-bold shrink-0 border border-[#326747]">
                        {index + 1}
                      </div>
                      <div>
                        <h3 className="text-white font-bold text-lg">{ex.nome}</h3>
                        {ex.observacoes && (
                          <p className="text-zinc-500 text-sm mt-1">{ex.observacoes}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-sm font-medium bg-[#193324] p-3 rounded-lg border border-[#326747] shrink-0">
                      <div className="flex items-center gap-2 text-white">
                        <Activity size={16} className="text-emerald-400" />
                        <span>{ex.series} Séries</span>
                      </div>
                      <div className="w-px h-4 bg-[#326747] hidden md:block"></div>
                      <div className="flex items-center gap-2 text-white">
                        <Dumbbell size={16} className="text-emerald-400" />
                        <span>{ex.repeticoes_min}{ex.repeticoes_min !== ex.repeticoes_max ? ` a ${ex.repeticoes_max}` : ''} Reps</span>
                      </div>
                      <div className="w-px h-4 bg-[#326747] hidden md:block"></div>
                      <div className="flex items-center gap-2 text-white">
                        <Clock size={16} className="text-emerald-400" />
                        <span>{ex.descanso_segundos}s Rest</span>
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            </div>

          </div>
        ))}
      </div>
    </div>
  );
}
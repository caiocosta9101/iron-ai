import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, Dumbbell, Clock, Activity, Calendar, 
  AlertCircle, Trash2, Edit3, Check, X, Save, RefreshCw, Search
} from 'lucide-react';
import api from '../services/api';
import { toast } from 'sonner';

// --- DEFINIÇÃO DOS TIPOS ---
interface Exercicio {
  id: string; // ID da tabela pivô (exercicios_treino)
  nome: string;
  equipamento: string; // Adicionado equipamento aqui
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
  foco: string | null;
  exercicios: Exercicio[];
}

interface TreinoDetalhado {
  id: string;
  nome: string;
  descricao: string;
  objetivo: string;
  criado_em: string;
  gerado_por_ia: boolean;
  dias: DiaTreino[];
}

export default function WorkoutDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [workout, setWorkout] = useState<TreinoDetalhado | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Estados para Edição do Cabeçalho
  const [isEditingWorkout, setIsEditingWorkout] = useState(false);
  const [editedWorkout, setEditedWorkout] = useState({ nome: '', descricao: '', objetivo: '' });

  // Estados para Edição de Exercício Inline
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [editedExercise, setEditedExercise] = useState<Partial<Exercicio>>({});

  // Estados para Substituição de Exercício
  const [substitutingExercise, setSubstitutingExercise] = useState<{diaId: string, ex: Exercicio} | null>(null);
  const [exerciseLibrary, setExerciseLibrary] = useState<any[]>([]);
  const [searchSub, setSearchSub] = useState('');

  useEffect(() => {
    const fetchWorkoutDetails = async () => {
      try {
        const response = await api.get(`/workouts/${id}`);
        setWorkout(response.data);
        setEditedWorkout({
          nome: response.data.nome,
          descricao: response.data.descricao || '',
          objetivo: response.data.objetivo
        });
      } catch (err: any) {
        console.error("Erro ao buscar detalhes:", err);
        setError('Não foi possível carregar os detalhes deste treino.');
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchWorkoutDetails();
  }, [id]);

  // === FUNÇÕES REAIS INTEGRADAS AO BACKEND ===

  const handleDeleteWorkout = async () => {
    if (!window.confirm("Tem certeza que deseja excluir este treino inteiro? Esta ação não tem volta.")) return;
    try {
      await api.delete(`/workouts/${id}`);
      toast.success("Treino excluído com sucesso!");
      navigate('/meus-treinos');
    } catch (error) {
      toast.error("Erro ao excluir treino.");
    }
  };

  const handleSaveWorkoutInfo = async () => {
    try {
      await api.put(`/workouts/${id}`, editedWorkout);
      if (workout) {
        setWorkout({ ...workout, ...editedWorkout });
      }
      setIsEditingWorkout(false);
      toast.success("Informações do treino atualizadas!");
    } catch (error) {
      toast.error("Erro ao atualizar informações.");
    }
  };

  const handleDeleteExercise = async (diaId: string, exId: string) => {
    if (!window.confirm("Excluir este exercício do treino?")) return;
    try {
      await api.delete(`/workouts/exercises/${exId}`);
      toast.success("Exercício removido!");
      
      if (workout) {
        const newDias = workout.dias.map(d => {
          if (d.id === diaId) {
            return { ...d, exercicios: d.exercicios.filter(e => e.id !== exId) };
          }
          return d;
        });
        setWorkout({ ...workout, dias: newDias });
      }
    } catch (error) {
      toast.error("Erro ao remover exercício.");
    }
  };

  const startEditingExercise = (ex: Exercicio) => {
    setSubstitutingExercise(null); // Fecha a substituição se estiver aberta
    setEditingExerciseId(ex.id);
    setEditedExercise({ ...ex });
  };

  const handleSaveExercise = async (diaId: string) => {
    try {
      await api.put(`/workouts/exercises/${editedExercise.id}`, editedExercise);
      toast.success("Exercício atualizado!");
      
      if (workout && editedExercise.id) {
        const newDias = workout.dias.map(d => {
          if (d.id === diaId) {
            const newExs = d.exercicios.map(e => e.id === editedExercise.id ? { ...e, ...editedExercise } as Exercicio : e);
            return { ...d, exercicios: newExs };
          }
          return d;
        });
        setWorkout({ ...workout, dias: newDias });
      }
      setEditingExerciseId(null);
    } catch (error) {
      toast.error("Erro ao atualizar exercício.");
    }
  };

  // === FUNÇÕES DE SUBSTITUIÇÃO ===
  const openSubstitute = async (diaId: string, ex: Exercicio) => {
    setEditingExerciseId(null); // Fecha edição se estiver aberta
    setSubstitutingExercise({ diaId, ex });
    setSearchSub('');
    
    // Busca a biblioteca se ainda não tiver carregado
    if (exerciseLibrary.length === 0) {
      try {
        const response = await api.get('/exercises');
        setExerciseLibrary(response.data);
      } catch (error) {
        toast.error("Erro ao carregar biblioteca de exercícios.");
      }
    }
  };

  const handleConfirmSubstitution = async (diaId: string, oldExId: string, newLibraryEx: any) => {
    try {
      // Enviamos o novo exercicio_id para o backend atualizar a relação
      await api.put(`/workouts/exercises/${oldExId}`, { exercicio_id: newLibraryEx.id });
      toast.success("Exercício substituído!");
      
      // Atualiza a UI mantendo as metas antigas mas com o nome e equipamento novos
      if (workout) {
        const newDias = workout.dias.map(d => {
          if (d.id === diaId) {
            const newExs = d.exercicios.map(e => e.id === oldExId ? { 
              ...e, 
              nome: newLibraryEx.nome,
              equipamento: newLibraryEx.equipamento
            } : e);
            return { ...d, exercicios: newExs };
          }
          return d;
        });
        setWorkout({ ...workout, dias: newDias });
      }
      setSubstitutingExercise(null);
    } catch (error) {
      toast.error("Erro ao substituir exercício.");
    }
  };

  // ===========================================

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
      
      <button 
        onClick={() => navigate('/meus-treinos')}
        className="flex items-center gap-2 text-[#92c9a8] hover:text-white mb-6 transition-colors font-medium"
      >
        <ChevronLeft size={20} /> Voltar para Meus Treinos
      </button>

      {/* --- CABEÇALHO DO TREINO --- */}
      <div className="bg-[#112218] border border-[#326747] rounded-3xl p-6 lg:p-10 shadow-2xl mb-8 relative overflow-hidden">
        {workout.gerado_por_ia && (
          <div className="absolute top-0 right-0 bg-emerald-500 text-[#0a140f] text-xs font-black px-4 py-1 rounded-bl-xl uppercase tracking-widest">
            Iron AI
          </div>
        )}

        {isEditingWorkout ? (
          <div className="space-y-4 animate-in fade-in">
            <input 
              type="text" 
              className="bg-transparent text-3xl lg:text-4xl font-black text-white border-b-2 border-[#326747] focus:border-emerald-500 outline-none w-full pb-2"
              value={editedWorkout.nome}
              onChange={(e) => setEditedWorkout({...editedWorkout, nome: e.target.value})}
            />
            <div className="flex flex-col md:flex-row gap-4">
              <select 
                className="bg-[#193324] border border-[#326747] text-white p-3 rounded-xl focus:border-emerald-500 outline-none font-bold shrink-0"
                value={editedWorkout.objetivo}
                onChange={(e) => setEditedWorkout({...editedWorkout, objetivo: e.target.value})}
              >
                <option value="Hipertrofia">Hipertrofia</option>
                <option value="Emagrecimento">Emagrecimento</option>
                <option value="Força Pura">Força Pura</option>
                <option value="Resistência">Resistência</option>
                <option value="Geral">Manutenção / Geral</option>
              </select>
              <textarea 
                className="bg-[#193324] border border-[#326747] text-white p-3 rounded-xl focus:border-emerald-500 outline-none flex-1 resize-none min-h-[48px]"
                value={editedWorkout.descricao}
                onChange={(e) => setEditedWorkout({...editedWorkout, descricao: e.target.value})}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={handleSaveWorkoutInfo} className="bg-emerald-500 text-[#112218] px-6 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-400 transition-colors">
                <Save size={18} /> Salvar Alterações
              </button>
              <button onClick={() => setIsEditingWorkout(false)} className="bg-[#193324] text-zinc-300 px-6 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-[#326747] transition-colors">
                <X size={18} /> Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex justify-between items-start mb-4 gap-4">
              <h1 className="text-3xl lg:text-4xl font-black text-white">{workout.nome}</h1>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => setIsEditingWorkout(true)} className="p-2 bg-[#193324] text-emerald-400 rounded-lg border border-[#326747] hover:bg-[#326747] hover:text-white transition-colors" title="Editar Informações">
                  <Edit3 size={20} />
                </button>
                <button onClick={handleDeleteWorkout} className="p-2 bg-red-500/10 text-red-400 rounded-lg border border-red-500/20 hover:bg-red-500 hover:text-white transition-colors" title="Excluir Treino">
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
            
            {workout.descricao && <p className="text-zinc-400 text-lg mb-6 leading-relaxed">{workout.descricao}</p>}
            
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
        )}
      </div>

      {/* --- DIAS DE TREINO --- */}
      <div className="space-y-8">
        {workout.dias.map((dia) => (
          <div key={dia.id} className="bg-[#193324] border border-[#326747] rounded-2xl overflow-hidden shadow-lg">
            
            <div className="bg-[#112218] p-5 border-b border-[#326747] flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  {dia.nome} {dia.foco ? `- ${dia.foco}` : ''}
                </h2>
                {dia.observacoes && (
                  <p className="text-emerald-400 text-sm mt-1 font-medium">{dia.observacoes}</p>
                )}
              </div>
            </div>

            <div className="p-5">
              <div className="space-y-4">
                {dia.exercicios.map((ex, index) => (
                  <div key={ex.id} className="flex flex-col lg:flex-row lg:items-center justify-between bg-[#112218] p-4 rounded-xl border border-[#326747]/50 transition-colors gap-4">
                    
                    {/* Exibe o número, nome e EQUIPAMENTO do exercício (Escondido se estiver na tela de substituição) */}
                    {substitutingExercise?.ex.id !== ex.id && (
                      <div className="flex items-center gap-4 flex-1">
                        <div className="bg-[#193324] text-emerald-400 w-8 h-8 rounded-full flex items-center justify-center font-bold shrink-0 border border-[#326747]">
                          {index + 1}
                        </div>
                        <h3 className="text-white font-bold text-lg flex items-center flex-wrap gap-2">
                          {ex.nome}
                          <span className="text-zinc-500 font-normal text-sm">
                            ({ex.equipamento || 'Não especificado'})
                          </span>
                        </h3>
                      </div>
                    )}

                    {substitutingExercise?.ex.id === ex.id ? (
                      /* --- MODO SUBSTITUIÇÃO DE EXERCÍCIO --- */
                      <div className="flex-1 animate-in fade-in space-y-3">
                        <div className="flex items-center gap-2 bg-[#193324] p-3 rounded-xl border border-blue-500/50">
                          <Search size={20} className="text-blue-400" />
                          <input 
                            autoFocus
                            type="text" 
                            placeholder="Buscar novo exercício na biblioteca..." 
                            className="bg-transparent text-white outline-none w-full text-lg" 
                            value={searchSub} 
                            onChange={(e) => setSearchSub(e.target.value)} 
                          />
                          <button onClick={() => setSubstitutingExercise(null)} className="p-1 text-zinc-400 hover:text-white transition-colors">
                            <X size={20} />
                          </button>
                        </div>
                        
                        <div className="max-h-48 overflow-y-auto bg-[#193324] rounded-xl border border-[#326747] shadow-inner">
                          {exerciseLibrary
                            .filter(libEx => libEx.nome.toLowerCase().includes(searchSub.toLowerCase()))
                            .map(libEx => (
                              <button 
                                key={libEx.id}
                                onClick={() => handleConfirmSubstitution(dia.id, ex.id, libEx)}
                                className="w-full text-left p-4 hover:bg-blue-500/10 text-zinc-300 hover:text-blue-400 transition-colors border-b border-[#326747]/30 last:border-0 flex justify-between items-center group gap-3"
                              >
                                <span className="font-bold flex-1">{libEx.nome}</span>
                                <span className="flex gap-2 shrink-0">
                                  <span className="text-xs opacity-70 bg-[#112218] px-2 py-1 rounded-md border border-[#326747]/50 group-hover:text-blue-400/80 transition-colors">{libEx.grupo_muscular}</span>
                                  <span className="text-xs text-blue-400/70 bg-[#112218] px-2 py-1 rounded-md border border-blue-500/20 group-hover:text-blue-400 transition-colors">{libEx.equipamento}</span>
                                </span>
                              </button>
                            ))
                          }
                          {exerciseLibrary.length > 0 && exerciseLibrary.filter(libEx => libEx.nome.toLowerCase().includes(searchSub.toLowerCase())).length === 0 && (
                             <p className="p-4 text-center text-zinc-500">Nenhum exercício encontrado.</p>
                          )}
                        </div>
                      </div>

                    ) : editingExerciseId === ex.id ? (
                      /* --- MODO EDIÇÃO INLINE DO EXERCÍCIO --- */
                      <div className="flex flex-wrap items-center gap-3 animate-in fade-in">
                        <div className="flex items-center gap-2 bg-[#193324] p-2 rounded-lg border border-emerald-500/50">
                          <span className="text-xs text-[#92c9a8] uppercase font-bold">Séries</span>
                          <input type="number" className="w-12 bg-transparent text-center text-white outline-none font-bold" value={editedExercise.series} onChange={(e) => setEditedExercise({...editedExercise, series: Number(e.target.value)})} />
                        </div>
                        <div className="flex items-center gap-1 bg-[#193324] p-2 rounded-lg border border-emerald-500/50">
                          <span className="text-xs text-[#92c9a8] uppercase font-bold mr-1">Reps</span>
                          <input type="number" className="w-10 bg-transparent text-center text-white outline-none font-bold" value={editedExercise.repeticoes_min} onChange={(e) => setEditedExercise({...editedExercise, repeticoes_min: Number(e.target.value)})} />
                          <span className="text-[#326747]">-</span>
                          <input type="number" className="w-10 bg-transparent text-center text-white outline-none font-bold" value={editedExercise.repeticoes_max} onChange={(e) => setEditedExercise({...editedExercise, repeticoes_max: Number(e.target.value)})} />
                        </div>
                        <div className="flex items-center gap-2 bg-[#193324] p-2 rounded-lg border border-emerald-500/50">
                          <span className="text-xs text-[#92c9a8] uppercase font-bold">Rest</span>
                          <input type="number" className="w-12 bg-transparent text-center text-white outline-none font-bold" value={editedExercise.descanso_segundos} onChange={(e) => setEditedExercise({...editedExercise, descanso_segundos: Number(e.target.value)})} />
                          <span className="text-xs font-bold text-[#326747]">s</span>
                        </div>
                        
                        <div className="flex items-center gap-2 mt-2 lg:mt-0 lg:ml-2">
                          <button onClick={() => handleSaveExercise(dia.id)} className="p-2 bg-emerald-500 text-[#112218] rounded-lg hover:bg-emerald-400 transition-colors" title="Salvar">
                            <Check size={18} />
                          </button>
                          <button onClick={() => setEditingExerciseId(null)} className="p-2 bg-[#193324] text-zinc-400 rounded-lg border border-[#326747] hover:bg-[#326747] hover:text-white transition-colors" title="Cancelar">
                            <X size={18} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* --- MODO VISUALIZAÇÃO --- */
                      <div className="flex flex-col lg:flex-row items-center gap-4 w-full lg:w-auto">
                        <div className="flex flex-wrap items-center gap-4 text-sm font-medium bg-[#193324] p-3 rounded-lg border border-[#326747] w-full lg:w-auto justify-center lg:justify-start">
                          <div className="flex items-center gap-2 text-white">
                            <Activity size={16} className="text-emerald-400" />
                            <span>{ex.series} Séries</span>
                          </div>
                          <div className="w-px h-4 bg-[#326747] hidden lg:block"></div>
                          <div className="flex items-center gap-2 text-white">
                            <Dumbbell size={16} className="text-emerald-400" />
                            <span>{ex.repeticoes_min}{ex.repeticoes_min !== ex.repeticoes_max ? ` a ${ex.repeticoes_max}` : ''} Reps</span>
                          </div>
                          <div className="w-px h-4 bg-[#326747] hidden lg:block"></div>
                          <div className="flex items-center gap-2 text-white">
                            <Clock size={16} className="text-emerald-400" />
                            <span>{ex.descanso_segundos}s Rest</span>
                          </div>
                        </div>

                        {/* Botões FIXOS */}
                        <div className="flex items-center gap-2 w-full lg:w-auto justify-center">
                          <button 
                            onClick={() => openSubstitute(dia.id, ex)} 
                            className="p-2 text-blue-400 bg-blue-500/5 hover:bg-blue-500/20 rounded-lg border border-blue-500/20 transition-colors" 
                            title="Substituir Exercício"
                          >
                            <RefreshCw size={18} />
                          </button>
                          <button 
                            onClick={() => startEditingExercise(ex)} 
                            className="p-2 text-emerald-400 bg-[#193324] hover:bg-[#326747] hover:text-white rounded-lg border border-[#326747] transition-colors" 
                            title="Editar Metas"
                          >
                            <Edit3 size={18} />
                          </button>
                          <button 
                            onClick={() => handleDeleteExercise(dia.id, ex.id)} 
                            className="p-2 text-red-400 bg-red-500/5 hover:bg-red-500/20 hover:text-red-300 rounded-lg border border-red-500/20 transition-colors" 
                            title="Excluir Exercício"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    )}

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
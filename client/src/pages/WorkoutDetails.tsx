import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, Dumbbell, Clock, Activity, Calendar, 
  AlertCircle, Trash2, Edit3, Check, X, Save, RefreshCw, Search, Plus,
  CalendarDays, Zap, Timer
} from 'lucide-react';
import api from '../services/api';
import { toast } from 'sonner';

// --- DEFINIÇÃO DOS TIPOS (Atualizado para o modelo Híbrido) ---
export type TipoModalidade = 'forca' | 'cardio' | 'isometrico' | 'hiit';

interface Exercicio {
  id: string; // ID da tabela pivô (exercicios_treino)
  nome: string;
  equipamento: string; 
  tipo: TipoModalidade; // Adicionado para servir de discriminador
  observacoes: string | null;
  
  // Metas de Força
  series?: number;
  repeticoes_min?: number;
  repeticoes_max?: number;
  descanso_segundos?: number;
  
  // Metas de Cardio
  tempo_meta_minutos?: number | null;
  distancia_meta_km?: number | null;

  // Metas de Isometria
  tempo_segundos?: number;

  // Metas de HIIT
  rounds?: number;
  tempos_estimulo_segundos?: number[];
  tempos_descanso_segundos?: number[];
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
  data_inicio?: string; 
  data_fim?: string;    
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

  // Estados para Adição de Novo Dia
  const [isAddingDay, setIsAddingDay] = useState(false);
  const [newDayForm, setNewDayForm] = useState({ nome: 'Treino B', foco: '' });

  // Estados para Adição de Novo Exercício (Preparado para as 4 modalidades)
  const [addingExerciseToDayId, setAddingExerciseToDayId] = useState<string | null>(null);
  const [searchNewEx, setSearchNewEx] = useState('');
  const [selectedNewEx, setSelectedNewEx] = useState<any | null>(null);
  const [newExForm, setNewExForm] = useState({ 
    series: 3, 
    repeticoes_min: 8, 
    repeticoes_max: 12, 
    descanso_segundos: 60,
    tempo_meta_minutos: 0,
    distancia_meta_km: 0,
    tempo_segundos: 45, // Isometria
    rounds: 8, tempos_estimulo_segundos: 20, tempos_descanso_hiit: 10 // HIIT
  });

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
    setSubstitutingExercise(null); 
    setEditingExerciseId(ex.id);
    setEditedExercise({ ...ex });
  };

  const handleSaveExercise = async (diaId: string) => {
    try {
      // --- BLINDAGEM DE PAYLOAD NO FRONTEND ---
      let payloadLimpo: any = {
        id: editedExercise.id,
        nome: editedExercise.nome,
        equipamento: editedExercise.equipamento,
        observacoes: editedExercise.observacoes,
      };

      switch(editedExercise.tipo) {
        case 'forca':
          payloadLimpo = { ...payloadLimpo, series: editedExercise.series, repeticoes_min: editedExercise.repeticoes_min, repeticoes_max: editedExercise.repeticoes_max, descanso_segundos: editedExercise.descanso_segundos };
          break;
        case 'cardio':
          payloadLimpo = { ...payloadLimpo, tempo_meta_minutos: editedExercise.tempo_meta_minutos, distancia_meta_km: editedExercise.distancia_meta_km };
          break;
        case 'isometrico':
          payloadLimpo = { ...payloadLimpo, series: editedExercise.series, tempo_segundos: editedExercise.tempo_segundos, descanso_segundos: editedExercise.descanso_segundos };
          break;
        case 'hiit':
          payloadLimpo = { ...payloadLimpo, rounds: editedExercise.rounds, tempos_estimulo_segundos: editedExercise.tempos_estimulo_segundos, tempos_descanso_segundos: editedExercise.tempos_descanso_segundos };
          break;
        default:
          // Fallback se não vier o tipo do backend (compatibilidade retroativa)
          payloadLimpo = { ...payloadLimpo, series: editedExercise.series, repeticoes_min: editedExercise.repeticoes_min, repeticoes_max: editedExercise.repeticoes_max, descanso_segundos: editedExercise.descanso_segundos };
      }

      await api.put(`/workouts/exercises/${editedExercise.id}`, payloadLimpo);
      toast.success("Exercício atualizado!");
      
      if (workout && editedExercise.id) {
        const newDias = workout.dias.map(d => {
          if (d.id === diaId) {
            const newExs = d.exercicios.map(e => e.id === editedExercise.id ? { ...e, ...payloadLimpo } as Exercicio : e);
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

  const openSubstitute = async (diaId: string, ex: Exercicio) => {
    setEditingExerciseId(null); 
    setSubstitutingExercise({ diaId, ex });
    setSearchSub('');
    
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
      await api.put(`/workouts/exercises/${oldExId}`, { exercicio_id: newLibraryEx.id });
      toast.success("Exercício substituído!");
      
      if (workout) {
        const newDias = workout.dias.map(d => {
          if (d.id === diaId) {
            const newExs = d.exercicios.map(e => e.id === oldExId ? { 
              ...e, 
              nome: newLibraryEx.nome,
              equipamento: newLibraryEx.equipamentos?.nome || 'Peso do Corpo',
              tipo: newLibraryEx.categoria // Atualiza o tipo na interface
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

  const handleDeleteDay = async (diaId: string) => {
    if (!window.confirm("Tem certeza que deseja excluir este dia inteiro de treino? Todos os exercícios dele serão apagados.")) return;
    try {
      await api.delete(`/workouts/days/${diaId}`);
      toast.success("Dia de treino removido!");
      
      if (workout) {
        setWorkout({
          ...workout,
          dias: workout.dias.filter(d => d.id !== diaId)
        });
      }
    } catch (error) {
      toast.error("Erro ao remover dia de treino.");
    }
  };

  const handleAddDay = async () => {
    if (!newDayForm.nome.trim()) return toast.error("O nome do dia é obrigatório.");
    try {
      const response = await api.post(`/workouts/${id}/days`, newDayForm);
      toast.success("Novo dia adicionado!");
      if (workout) {
        setWorkout({ ...workout, dias: [...workout.dias, { ...response.data, exercicios: [] }] });
      }
      setIsAddingDay(false);
      setNewDayForm({ nome: 'Novo Treino', foco: '' });
    } catch (error) {
      toast.error("Erro ao adicionar novo dia.");
    }
  };

  const openAddExercise = async (diaId: string) => {
    setAddingExerciseToDayId(diaId);
    setSelectedNewEx(null);
    setSearchNewEx('');
    if (exerciseLibrary.length === 0) {
      try {
        const response = await api.get('/exercises');
        setExerciseLibrary(response.data);
      } catch (error) {
        toast.error("Erro ao carregar biblioteca.");
      }
    }
  };

  const handleConfirmAddExercise = async (diaId: string) => {
    try {
      // --- BLINDAGEM DE PAYLOAD NO FRONTEND ---
      const categoria = selectedNewEx.categoria?.toLowerCase() as TipoModalidade || 'forca';
      
      let payloadLimpo: any = { 
        exercicio_id: selectedNewEx.id,
        tipo: categoria // Informação valiosa para o schema
      };

      switch(categoria) {
        case 'forca': 
          payloadLimpo = { ...payloadLimpo, series: newExForm.series, repeticoes_min: newExForm.repeticoes_min, repeticoes_max: newExForm.repeticoes_max, descanso_segundos: newExForm.descanso_segundos }; 
          break;
        case 'cardio': 
          payloadLimpo = { ...payloadLimpo, tempo_meta_minutos: newExForm.tempo_meta_minutos, distancia_meta_km: newExForm.distancia_meta_km }; 
          break;
        case 'isometrico': 
          payloadLimpo = { ...payloadLimpo, series: newExForm.series, tempo_segundos: newExForm.tempo_segundos, descanso_segundos: newExForm.descanso_segundos }; 
          break;
        case 'hiit': 
          payloadLimpo = { ...payloadLimpo, rounds: newExForm.rounds, tempos_estimulo_segundos: [newExForm.tempos_estimulo_segundos], tempos_descanso_segundos: [newExForm.tempos_descanso_hiit] }; 
          break;
      }

      const response = await api.post(`/workouts/days/${diaId}/exercises`, payloadLimpo);
      toast.success("Exercício adicionado!");
      
      if (workout) {
        const newDias = workout.dias.map(d => {
          if (d.id === diaId) {
            return { ...d, exercicios: [...d.exercicios, response.data] };
          }
          return d;
        });
        setWorkout({ ...workout, dias: newDias });
      }
      setAddingExerciseToDayId(null);
      setSelectedNewEx(null);
    } catch (error) {
      toast.error("Erro ao adicionar exercício.");
    }
  };

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
            
            <div className="flex flex-wrap gap-4 mt-2">
              {/* BADGES EXISTENTES */}
              <div className="flex items-center gap-2 bg-[#193324] px-4 py-2 rounded-xl border border-[#326747]">
                <Activity size={18} className="text-emerald-400" />
                <span className="text-[#92c9a8] font-medium capitalize">{workout.objetivo}</span>
              </div>
              <div className="flex items-center gap-2 bg-[#193324] px-4 py-2 rounded-xl border border-[#326747]">
                <Calendar size={18} className="text-emerald-400" />
                <span className="text-[#92c9a8] font-medium">{workout.dias.length} Dias de Treino</span>
              </div>

             {/* === NOVO CARD DE PERIODIZAÇÃO === */}
              {(workout.data_inicio && workout.data_fim) && (
                <div className="flex items-center gap-3 bg-[#112218] border border-[#326747] px-4 py-2 rounded-xl shadow-inner">
                  <div className="p-2 bg-[#193324] rounded-lg border border-[#326747]/50">
                    <CalendarDays size={18} className="text-emerald-400" />
                  </div>
                  <div className="flex flex-col justify-center">
                    <span className="text-[10px] font-black text-[#92c9a8] uppercase tracking-widest mb-0.5">
                      Período da Ficha
                    </span>
                    <div className="text-sm font-bold text-white flex items-center">
                      {new Date(workout.data_inicio).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                      <span className="text-emerald-500 mx-2 text-xs">➔</span>
                      {new Date(workout.data_fim).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                    </div>
                  </div>
                </div>
              )} 
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
              <button 
                onClick={() => handleDeleteDay(dia.id)}
                className="p-2 bg-red-500/10 text-red-400 rounded-lg border border-red-500/20 hover:bg-red-500 hover:text-white transition-colors"
                title="Excluir Dia de Treino"
              >
                <Trash2 size={20} />
              </button>
            </div>

            <div className="p-5">
              <div className="space-y-4">
                {dia.exercicios.map((ex, index) => (
                  <div key={ex.id} className="flex flex-col lg:flex-row lg:items-center justify-between bg-[#112218] p-4 rounded-xl border border-[#326747]/50 transition-colors gap-4">
                    
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
                                  <span className="text-xs opacity-70 bg-[#112218] px-2 py-1 rounded-md border border-[#326747]/50 group-hover:text-blue-400/80 transition-colors">{libEx.musculo_primario}</span>
                                  <span className="text-xs text-blue-400/70 bg-[#112218] px-2 py-1 rounded-md border border-blue-500/20 group-hover:text-blue-400 transition-colors">{libEx.equipamentos?.nome || 'Peso do Corpo'}</span>
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
                        {(() => {
                          const tipoEx = editedExercise.tipo || 'forca'; // Fallback visual

                          if (tipoEx === 'cardio') {
                            return (
                              <>
                                <div className="flex items-center gap-2 bg-[#193324] p-2 rounded-lg border border-emerald-500/50">
                                  <span className="text-xs text-[#92c9a8] uppercase font-bold">Tempo (min)</span>
                                  <input type="number" className="w-16 bg-transparent text-center text-white outline-none font-bold" value={editedExercise.tempo_meta_minutos || ''} onChange={(e) => setEditedExercise({...editedExercise, tempo_meta_minutos: Number(e.target.value)})} />
                                </div>
                                <div className="flex items-center gap-2 bg-[#193324] p-2 rounded-lg border border-emerald-500/50">
                                  <span className="text-xs text-[#92c9a8] uppercase font-bold">Dist. (km)</span>
                                  <input type="number" step="0.1" className="w-16 bg-transparent text-center text-white outline-none font-bold" value={editedExercise.distancia_meta_km || ''} onChange={(e) => setEditedExercise({...editedExercise, distancia_meta_km: Number(e.target.value)})} />
                                </div>
                              </>
                            );
                          }

                          if (tipoEx === 'isometrico') {
                            return (
                              <>
                                <div className="flex items-center gap-2 bg-[#193324] p-2 rounded-lg border border-emerald-500/50">
                                  <span className="text-xs text-[#92c9a8] uppercase font-bold">Séries</span>
                                  <input type="number" className="w-12 bg-transparent text-center text-white outline-none font-bold" value={editedExercise.series || ''} onChange={(e) => setEditedExercise({...editedExercise, series: Number(e.target.value)})} />
                                </div>
                                <div className="flex items-center gap-2 bg-[#193324] p-2 rounded-lg border border-emerald-500/50">
                                  <span className="text-xs text-[#92c9a8] uppercase font-bold">Tempo (s)</span>
                                  <input type="number" className="w-16 bg-transparent text-center text-white outline-none font-bold" value={editedExercise.tempo_segundos || ''} onChange={(e) => setEditedExercise({...editedExercise, tempo_segundos: Number(e.target.value)})} />
                                </div>
                                <div className="flex items-center gap-2 bg-[#193324] p-2 rounded-lg border border-emerald-500/50">
                                  <span className="text-xs text-[#92c9a8] uppercase font-bold">Rest</span>
                                  <input type="number" className="w-12 bg-transparent text-center text-white outline-none font-bold" value={editedExercise.descanso_segundos || ''} onChange={(e) => setEditedExercise({...editedExercise, descanso_segundos: Number(e.target.value)})} />
                                  <span className="text-xs font-bold text-[#326747]">s</span>
                                </div>
                              </>
                            );
                          }

                          if (tipoEx === 'hiit') {
                            return (
                              <>
                                <div className="flex items-center gap-2 bg-[#193324] p-2 rounded-lg border border-emerald-500/50">
                                  <span className="text-xs text-[#92c9a8] uppercase font-bold">Rounds</span>
                                  <input type="number" className="w-12 bg-transparent text-center text-white outline-none font-bold" value={editedExercise.rounds || ''} onChange={(e) => setEditedExercise({...editedExercise, rounds: Number(e.target.value)})} />
                                </div>
                                <div className="flex items-center gap-1 bg-[#193324] p-2 rounded-lg border border-emerald-500/50">
                                  <span className="text-xs text-[#92c9a8] uppercase font-bold mr-1">ON</span>
                                  <input type="number" className="w-10 bg-transparent text-center text-white outline-none font-bold" value={editedExercise.tempos_estimulo_segundos?.[0] || ''} onChange={(e) => setEditedExercise({...editedExercise, tempos_estimulo_segundos: [Number(e.target.value)]})} />
                                  <span className="text-xs text-[#92c9a8] uppercase font-bold mx-1">OFF</span>
                                  <input type="number" className="w-10 bg-transparent text-center text-white outline-none font-bold" value={editedExercise.tempos_descanso_segundos?.[0] || ''} onChange={(e) => setEditedExercise({...editedExercise, tempos_descanso_segundos: [Number(e.target.value)]})} />
                                </div>
                              </>
                            );
                          }

                          // Default: Força
                          return (
                            <>
                              <div className="flex items-center gap-2 bg-[#193324] p-2 rounded-lg border border-emerald-500/50">
                                <span className="text-xs text-[#92c9a8] uppercase font-bold">Séries</span>
                                <input type="number" className="w-12 bg-transparent text-center text-white outline-none font-bold" value={editedExercise.series || ''} onChange={(e) => setEditedExercise({...editedExercise, series: Number(e.target.value)})} />
                              </div>
                              <div className="flex items-center gap-1 bg-[#193324] p-2 rounded-lg border border-emerald-500/50">
                                <span className="text-xs text-[#92c9a8] uppercase font-bold mr-1">Reps</span>
                                <input type="number" className="w-10 bg-transparent text-center text-white outline-none font-bold" value={editedExercise.repeticoes_min || ''} onChange={(e) => setEditedExercise({...editedExercise, repeticoes_min: Number(e.target.value)})} />
                                <span className="text-[#326747]">-</span>
                                <input type="number" className="w-10 bg-transparent text-center text-white outline-none font-bold" value={editedExercise.repeticoes_max || ''} onChange={(e) => setEditedExercise({...editedExercise, repeticoes_max: Number(e.target.value)})} />
                              </div>
                              <div className="flex items-center gap-2 bg-[#193324] p-2 rounded-lg border border-emerald-500/50">
                                <span className="text-xs text-[#92c9a8] uppercase font-bold">Rest</span>
                                <input type="number" className="w-12 bg-transparent text-center text-white outline-none font-bold" value={editedExercise.descanso_segundos || ''} onChange={(e) => setEditedExercise({...editedExercise, descanso_segundos: Number(e.target.value)})} />
                                <span className="text-xs font-bold text-[#326747]">s</span>
                              </div>
                            </>
                          );
                        })()}
                        
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
                      /* --- MODO VISUALIZAÇÃO CONDICIONAL POR TIPO --- */
                      <div className="flex flex-col lg:flex-row items-center gap-4 w-full lg:w-auto">
                        <div className="flex flex-wrap items-center gap-4 text-sm font-medium bg-[#193324] p-3 rounded-lg border border-[#326747] w-full lg:w-auto justify-center lg:justify-start">
                          
                          {ex.tipo === 'cardio' ? (
                            <>
                              <div className="flex items-center gap-2 text-white">
                                <Timer size={16} className="text-emerald-400" />
                                <span>Meta: {ex.tempo_meta_minutos || 0} min</span>
                              </div>
                              <div className="w-px h-4 bg-[#326747] hidden lg:block"></div>
                              <div className="flex items-center gap-2 text-white">
                                <Activity size={16} className="text-emerald-400" />
                                <span>{ex.distancia_meta_km || 0} km</span>
                              </div>
                            </>
                          ) : ex.tipo === 'isometrico' ? (
                            <>
                              <div className="flex items-center gap-2 text-white">
                                <Activity size={16} className="text-emerald-400" />
                                <span>{ex.series} Séries</span>
                              </div>
                              <div className="w-px h-4 bg-[#326747] hidden lg:block"></div>
                              <div className="flex items-center gap-2 text-white">
                                <Timer size={16} className="text-emerald-400" />
                                <span>{ex.tempo_segundos}s (Isometria)</span>
                              </div>
                              <div className="w-px h-4 bg-[#326747] hidden lg:block"></div>
                              <div className="flex items-center gap-2 text-white">
                                <Clock size={16} className="text-emerald-400" />
                                <span>{ex.descanso_segundos}s Rest</span>
                              </div>
                            </>
                          ) : ex.tipo === 'hiit' ? (
                            <>
                              <div className="flex items-center gap-2 text-white">
                                <Activity size={16} className="text-emerald-400" />
                                <span>{ex.rounds} Rounds</span>
                              </div>
                              <div className="w-px h-4 bg-[#326747] hidden lg:block"></div>
                              <div className="flex items-center gap-2 text-white">
                                <Zap size={16} className="text-yellow-400" />
                                <span>{ex.tempos_estimulo_segundos?.[0] || 0}s ON / {ex.tempos_descanso_segundos?.[0] || 0}s OFF</span>
                              </div>
                            </>
                          ) : (
                            // Default Visualização de Força
                            <>
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
                            </>
                          )}
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

                {/* --- MODO INSERÇÃO DE NOVO EXERCÍCIO --- */}
                {addingExerciseToDayId === dia.id ? (
                  <div className="bg-[#112218] p-4 rounded-xl border border-dashed border-emerald-500/50 animate-in fade-in space-y-4">
                    {!selectedNewEx ? (
                      // 1. Busca o exercício
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 bg-[#193324] p-3 rounded-xl border border-emerald-500/30">
                          <Search size={20} className="text-emerald-400" />
                          <input 
                            autoFocus
                            type="text" 
                            placeholder="Buscar exercício para adicionar..." 
                            className="bg-transparent text-white outline-none w-full text-lg" 
                            value={searchNewEx} 
                            onChange={(e) => setSearchNewEx(e.target.value)} 
                          />
                          <button onClick={() => setAddingExerciseToDayId(null)} className="p-1 text-zinc-400 hover:text-white">
                            <X size={20} />
                          </button>
                        </div>
                        <div className="max-h-48 overflow-y-auto bg-[#193324] rounded-xl border border-[#326747]">
                          {exerciseLibrary
                            .filter(libEx => libEx.nome.toLowerCase().includes(searchNewEx.toLowerCase()))
                            .map(libEx => (
                              <button 
                                key={libEx.id}
                                onClick={() => setSelectedNewEx(libEx)}
                                className="w-full text-left p-3 hover:bg-emerald-500/10 text-zinc-300 hover:text-emerald-400 transition-colors border-b border-[#326747]/30 last:border-0 font-bold"
                              >
                                {libEx.nome}
                              </button>
                            ))
                          }
                        </div>
                      </div>
                    ) : (
                      // 2. Define metas do exercício escolhido com base na categoria
                      <div className="flex flex-col gap-4">
                        <div className="flex justify-between items-center">
                          <h4 className="text-emerald-400 font-bold text-lg">Configurar: {selectedNewEx.nome}</h4>
                          <button onClick={() => setSelectedNewEx(null)} className="text-sm text-zinc-400 hover:text-white underline">Voltar para busca</button>
                        </div>
                        
                        {(() => {
                          const catNova = selectedNewEx.categoria?.toLowerCase() || 'forca';
                          
                          if (catNova === 'cardio') {
                            return (
                              <div className="flex flex-wrap gap-3">
                                <div className="flex items-center gap-2 bg-[#193324] p-2 rounded-lg border border-[#326747]">
                                  <span className="text-xs text-[#92c9a8] uppercase font-bold">Tempo (min)</span>
                                  <input type="number" className="w-16 bg-transparent text-center text-white outline-none font-bold" value={newExForm.tempo_meta_minutos} onChange={(e) => setNewExForm({...newExForm, tempo_meta_minutos: Number(e.target.value)})} />
                                </div>
                                <div className="flex items-center gap-2 bg-[#193324] p-2 rounded-lg border border-[#326747]">
                                  <span className="text-xs text-[#92c9a8] uppercase font-bold">Dist. (km)</span>
                                  <input type="number" step="0.1" className="w-16 bg-transparent text-center text-white outline-none font-bold" value={newExForm.distancia_meta_km} onChange={(e) => setNewExForm({...newExForm, distancia_meta_km: Number(e.target.value)})} />
                                </div>
                              </div>
                            );
                          }

                          if (catNova === 'isometrico') {
                            return (
                              <div className="flex flex-wrap gap-3">
                                <div className="flex items-center gap-2 bg-[#193324] p-2 rounded-lg border border-[#326747]">
                                  <span className="text-xs text-[#92c9a8] uppercase font-bold">Séries</span>
                                  <input type="number" className="w-12 bg-transparent text-center text-white outline-none font-bold" value={newExForm.series} onChange={(e) => setNewExForm({...newExForm, series: Number(e.target.value)})} />
                                </div>
                                <div className="flex items-center gap-2 bg-[#193324] p-2 rounded-lg border border-[#326747]">
                                  <span className="text-xs text-[#92c9a8] uppercase font-bold">Tempo (s)</span>
                                  <input type="number" className="w-16 bg-transparent text-center text-white outline-none font-bold" value={newExForm.tempo_segundos} onChange={(e) => setNewExForm({...newExForm, tempo_segundos: Number(e.target.value)})} />
                                </div>
                                <div className="flex items-center gap-2 bg-[#193324] p-2 rounded-lg border border-[#326747]">
                                  <span className="text-xs text-[#92c9a8] uppercase font-bold">Rest</span>
                                  <input type="number" className="w-12 bg-transparent text-center text-white outline-none font-bold" value={newExForm.descanso_segundos} onChange={(e) => setNewExForm({...newExForm, descanso_segundos: Number(e.target.value)})} />
                                  <span className="text-xs font-bold text-[#326747]">s</span>
                                </div>
                              </div>
                            );
                          }

                          if (catNova === 'hiit') {
                            return (
                              <div className="flex flex-wrap gap-3">
                                <div className="flex items-center gap-2 bg-[#193324] p-2 rounded-lg border border-[#326747]">
                                  <span className="text-xs text-[#92c9a8] uppercase font-bold">Rounds</span>
                                  <input type="number" className="w-12 bg-transparent text-center text-white outline-none font-bold" value={newExForm.rounds} onChange={(e) => setNewExForm({...newExForm, rounds: Number(e.target.value)})} />
                                </div>
                                <div className="flex items-center gap-1 bg-[#193324] p-2 rounded-lg border border-[#326747]">
                                  <span className="text-xs text-[#92c9a8] uppercase font-bold mr-1">ON</span>
                                  <input type="number" className="w-10 bg-transparent text-center text-white outline-none font-bold" value={newExForm.tempos_estimulo_segundos} onChange={(e) => setNewExForm({...newExForm, tempos_estimulo_segundos: Number(e.target.value)})} />
                                  <span className="text-xs text-[#92c9a8] uppercase font-bold mx-1">OFF</span>
                                  <input type="number" className="w-10 bg-transparent text-center text-white outline-none font-bold" value={newExForm.tempos_descanso_hiit} onChange={(e) => setNewExForm({...newExForm, tempos_descanso_hiit: Number(e.target.value)})} />
                                </div>
                              </div>
                            );
                          }

                          // Default for Força
                          return (
                            <div className="flex flex-wrap gap-3">
                              <div className="flex items-center gap-2 bg-[#193324] p-2 rounded-lg border border-[#326747]">
                                <span className="text-xs text-[#92c9a8] uppercase font-bold">Séries</span>
                                <input type="number" className="w-12 bg-transparent text-center text-white outline-none font-bold" value={newExForm.series} onChange={(e) => setNewExForm({...newExForm, series: Number(e.target.value)})} />
                              </div>
                              <div className="flex items-center gap-1 bg-[#193324] p-2 rounded-lg border border-[#326747]">
                                <span className="text-xs text-[#92c9a8] uppercase font-bold mr-1">Reps</span>
                                <input type="number" className="w-10 bg-transparent text-center text-white outline-none font-bold" value={newExForm.repeticoes_min} onChange={(e) => setNewExForm({...newExForm, repeticoes_min: Number(e.target.value)})} />
                                <span className="text-[#326747]">-</span>
                                <input type="number" className="w-10 bg-transparent text-center text-white outline-none font-bold" value={newExForm.repeticoes_max} onChange={(e) => setNewExForm({...newExForm, repeticoes_max: Number(e.target.value)})} />
                              </div>
                              <div className="flex items-center gap-2 bg-[#193324] p-2 rounded-lg border border-[#326747]">
                                <span className="text-xs text-[#92c9a8] uppercase font-bold">Rest</span>
                                <input type="number" className="w-12 bg-transparent text-center text-white outline-none font-bold" value={newExForm.descanso_segundos} onChange={(e) => setNewExForm({...newExForm, descanso_segundos: Number(e.target.value)})} />
                                <span className="text-xs font-bold text-[#326747]">s</span>
                              </div>
                            </div>
                          );
                        })()}

                        <div className="flex gap-2 mt-2">
                          <button onClick={() => handleConfirmAddExercise(dia.id)} className="bg-emerald-500 text-[#112218] px-4 py-2 rounded-lg font-bold hover:bg-emerald-400 transition-colors">
                            Salvar Exercício
                          </button>
                          <button onClick={() => setAddingExerciseToDayId(null)} className="bg-[#193324] text-white px-4 py-2 rounded-lg font-bold hover:bg-[#326747] transition-colors">
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <button 
                    onClick={() => openAddExercise(dia.id)}
                    className="w-full py-3 border-2 border-dashed border-[#326747] rounded-xl text-emerald-500 font-bold flex items-center justify-center gap-2 hover:bg-emerald-500/10 hover:border-emerald-500 transition-colors"
                  >
                    <Plus size={20} /> Adicionar Exercício
                  </button>
                )}
              </div>
            </div>

          </div>
        ))}

        {/* --- ADICIONAR NOVO DIA DE TREINO --- */}
        {isAddingDay ? (
          <div className="bg-[#193324] border border-emerald-500 rounded-2xl p-6 shadow-lg animate-in fade-in">
            <h3 className="text-xl font-bold text-white mb-4">Adicionar Novo Dia</h3>
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              <input 
                type="text" 
                placeholder="Ex: Treino C" 
                className="bg-[#112218] text-white border border-[#326747] p-3 rounded-xl outline-none focus:border-emerald-500 flex-1 font-bold"
                value={newDayForm.nome}
                onChange={(e) => setNewDayForm({...newDayForm, nome: e.target.value})}
              />
              <input 
                type="text" 
                placeholder="Foco (Opcional). Ex: Pernas" 
                className="bg-[#112218] text-white border border-[#326747] p-3 rounded-xl outline-none focus:border-emerald-500 flex-1"
                value={newDayForm.foco}
                onChange={(e) => setNewDayForm({...newDayForm, foco: e.target.value})}
              />
            </div>
            <div className="flex gap-3">
              <button onClick={handleAddDay} className="bg-emerald-500 text-[#112218] px-6 py-2 rounded-xl font-bold hover:bg-emerald-400 transition-colors">
                Salvar Novo Dia
              </button>
              <button onClick={() => setIsAddingDay(false)} className="bg-transparent border border-[#326747] text-zinc-300 px-6 py-2 rounded-xl font-bold hover:bg-[#326747] hover:text-white transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button 
            onClick={() => setIsAddingDay(true)}
            className="w-full py-4 border border-[#326747] bg-[#112218] rounded-2xl text-[#92c9a8] font-bold text-lg flex items-center justify-center gap-2 hover:bg-[#193324] hover:text-white hover:border-emerald-500 transition-all shadow-lg"
          >
            <Plus size={24} /> Adicionar Novo Dia de Treino
          </button>
        )}

      </div>
    </div>
  );
}
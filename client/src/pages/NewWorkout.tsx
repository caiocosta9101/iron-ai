import { useState, useEffect } from 'react';
import { 
  Dumbbell, BrainCircuit, ChevronRight, Sparkles, 
  Plus, Trash2, Save, Search, ChevronLeft, Calendar
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import api from '../services/api';

interface Equipamento {
  id: string;
  nome: string;
  peso_livre: boolean;
}

interface Exercise {
  id: string;
  nome: string;
  grupo_pai: string;
  musculo_primario: string;
  equipamentos?: Equipamento; 
  categoria: string;
}

export default function NewWorkout() {
  const navigate = useNavigate();
  const [view, setView] = useState<'selection' | 'manual'>('selection');
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [exerciseLibrary, setExerciseLibrary] = useState<Exercise[]>([]);

  // Estado do treino manual atualizado com as novas datas de periodização
  const [manualWorkout, setManualWorkout] = useState({
    nome: '',
    descricao: '',
    objetivo: 'Hipertrofia', 
    data_inicio: new Date().toISOString().split('T')[0], // Hoje como padrão
    data_fim: '', // Vazio para o usuário escolher
    dias: [
      { nome: 'Treino A', foco: '', exercicios: [] as any[] }
    ]
  });

  useEffect(() => {
    if (view === 'manual' && exerciseLibrary.length === 0) {
      loadExercises();
    }
  }, [view]);

  const loadExercises = async () => {
    try {
      const response = await api.get('/exercises');
      setExerciseLibrary(response.data);
    } catch (error) {
      toast.error("Erro ao carregar biblioteca de exercícios.");
    }
  };

  const addDay = () => {
    const nextLetter = String.fromCharCode(65 + manualWorkout.dias.length);
    setManualWorkout({
      ...manualWorkout,
      dias: [...manualWorkout.dias, { nome: `Treino ${nextLetter}`, foco: '', exercicios: [] }]
    });
  };

  const addExerciseToDay = (dayIndex: number, exercise: Exercise) => {
    const newDias = [...manualWorkout.dias];
    
    // Identifica o tipo do exercício para criar os valores default corretos
    const categoriaSegura = exercise.categoria?.toLowerCase() || '';
    const isCardio = exercise.categoria === 'cardio';
    const isIso = exercise.categoria === 'isometrico';
    const isHiit = exercise.categoria === 'hiit';
    const isForca = !isCardio && !isIso && !isHiit; // Default para força

    newDias[dayIndex].exercicios.push({
      exercicio_id: exercise.id,
      nome: exercise.nome,
      categoria: exercise.categoria, 
      equipamento: exercise.equipamentos?.nome || 'Peso do Corpo',
      tipo: categoriaSegura || 'forca', 
      
      // Campos de Força
      series: (isForca || isIso) ? 3 : null,
      repeticoes_min: isForca ? 8 : null,
      repeticoes_max: isForca ? 12 : null,
      
      // Descanso (comum a força e isométrico)
      descanso_segundos: (isForca || isIso) ? 60 : null,
      
      // Campos de Cardio (LIMPO E MAGRO)
      tempo_meta_minutos: isCardio ? 15 : null, 
      distancia_meta_km: isCardio ? 5 : null,

      // Campos Exclusivos de Isometria
      tempo_segundos: isIso ? 30 : null,

      // Campos Exclusivos de HIIT (LIMPO E MAGRO)
      rounds: isHiit ? 8 : null,
      tempos_estimulo_segundos: isHiit ? [20] : [], 
      tempos_descanso_segundos: isHiit ? [10] : []
    });
    
    setManualWorkout({ ...manualWorkout, dias: newDias });
    setSearch('');
    toast.success(`${exercise.nome} adicionado ao ${newDias[dayIndex].nome}`);
  };

  // Aceita any no value para podermos passar arrays no caso do HIIT
  const updateExerciseField = (dayIndex: number, exerciseIndex: number, field: string, value: any) => {
    const newDias = [...manualWorkout.dias];
    newDias[dayIndex].exercicios[exerciseIndex][field] = value;
    setManualWorkout({ ...manualWorkout, dias: newDias });
  };

  const removeExercise = (dayIndex: number, exerciseIndex: number) => {
    const newDias = [...manualWorkout.dias];
    newDias[dayIndex].exercicios.splice(exerciseIndex, 1);
    setManualWorkout({ ...manualWorkout, dias: newDias });
  };

  const handleSaveManual = async () => {
    if (!manualWorkout.nome) return toast.error("Dê um nome ao seu treino!");
    if (!manualWorkout.objetivo) return toast.error("Selecione um objetivo!");
    if (!manualWorkout.data_inicio || !manualWorkout.data_fim) return toast.error("Defina o período da periodização!");
    
    // Validação básica de data
    if (new Date(manualWorkout.data_fim) <= new Date(manualWorkout.data_inicio)) {
      return toast.error("A data de término deve ser posterior à data de início!");
    }
    
    try {
      setLoading(true);
      const payload = {
        ...manualWorkout,
        gerado_por_ia: false, 
        dias_treino: manualWorkout.dias.map((d, idx) => ({
          ...d,
          ordem_dia: idx + 1
        }))
      };

      await api.post('/workouts', payload);
      toast.success("Treino manual salvo com sucesso!");
      navigate('/dashboard');
    } catch (error) {
      toast.error("Erro ao salvar treino.");
    } finally {
      setLoading(false);
    }
  };

  if (view === 'selection') {
    return (
      <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in duration-500 py-6">
        <div className="space-y-2">
          <h1 className="text-3xl lg:text-4xl font-black text-white tracking-tight">Criar Novo Treino</h1>
          <p className="text-[#92c9a8] text-lg">Escolha o método ideal para destruir no treino de hoje.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          <div 
            onClick={() => setView('manual')}
            className="group relative flex flex-col justify-between h-[320px] p-8 rounded-3xl bg-[#193324] border border-[#326747] hover:border-[#13ec6a] transition-all duration-300 cursor-pointer hover:shadow-2xl hover:shadow-[#13ec6a]/10"
          >
            <div className="absolute top-8 right-8 text-[#326747] group-hover:text-[#13ec6a] transition-colors"><ChevronRight size={24} /></div>
            <div className="h-16 w-16 bg-[#112218] rounded-2xl flex items-center justify-center group-hover:bg-[#13ec6a] text-[#13ec6a] group-hover:text-[#112218] transition-all duration-300 border border-[#326747]"><Dumbbell size={32} /></div>
            <div className="space-y-3">
              <h3 className="text-2xl font-bold text-white group-hover:text-[#13ec6a]">Montar Manualmente</h3>
              <p className="text-[#92c9a8] leading-relaxed group-hover:text-white">Você é o coach. Selecione exercícios da nossa biblioteca, defina séries e repetições.</p>
            </div>
          </div>

          <div 
            onClick={() => navigate('/new-workout/ai')} 
            className="group relative flex flex-col justify-between h-[320px] p-8 rounded-3xl bg-gradient-to-br from-[#193324] to-purple-900/40 border border-purple-500/20 hover:border-purple-500 transition-all duration-300 cursor-pointer hover:shadow-2xl hover:shadow-purple-900/20 overflow-hidden"
          >
            <div className="absolute top-0 right-0 bg-purple-600 text-white text-xs font-bold px-4 py-2 rounded-bl-2xl flex items-center gap-2"><Sparkles size={12} fill="currentColor" />IA BETA</div>
            <div className="h-16 w-16 bg-[#112218] rounded-2xl flex items-center justify-center text-purple-400 border border-purple-500/20"><BrainCircuit size={32} /></div>
            <div className="space-y-3 relative z-10">
              <h3 className="text-2xl font-bold text-white group-hover:text-purple-300">Gerar com Iron AI</h3>
              <p className="text-[#92c9a8] leading-relaxed group-hover:text-white">Responda a 5 perguntas rápidas e deixe nossa Inteligência Artificial montar o plano perfeito.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-6 animate-in slide-in-from-bottom-4 duration-500">
      <button onClick={() => setView('selection')} className="flex items-center gap-2 text-[#92c9a8] hover:text-white mb-6 transition-colors">
        <ChevronLeft size={20} /> Voltar para seleção
      </button>

      {/* CABEÇALHO DO TREINO MANUAL */}
      <div className="bg-[#193324] border border-[#326747] rounded-3xl p-6 lg:p-8 mb-8 space-y-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="w-full space-y-4">
            <input 
              type="text" 
              placeholder="Nome do Treino (ex: Protocolo Hyper)"
              className="bg-transparent text-3xl font-black text-white border-b-2 border-[#326747] focus:border-[#13ec6a] outline-none pb-2 transition-all w-full placeholder:text-white/30"
              value={manualWorkout.nome}
              onChange={(e) => setManualWorkout({...manualWorkout, nome: e.target.value})}
            />
            
            <div className="flex flex-col md:flex-row gap-4">
              <select 
                className="bg-[#112218] border border-[#326747] text-white p-3 rounded-xl focus:border-[#13ec6a] outline-none font-bold shrink-0"
                value={manualWorkout.objetivo}
                onChange={(e) => setManualWorkout({...manualWorkout, objetivo: e.target.value})}
              >
                <option value="Hipertrofia">Hipertrofia</option>
                <option value="Emagrecimento">Emagrecimento</option>
                <option value="Força Pura">Força Pura</option>
                <option value="Resistência">Resistência</option>
                <option value="Geral">Manutenção / Geral</option>
              </select>

              <textarea 
                placeholder="Descreva a metodologia ou observações gerais do treino..."
                className="bg-[#112218] border border-[#326747] text-white p-3 rounded-xl focus:border-[#13ec6a] outline-none flex-1 resize-none h-12 min-h-[48px]"
                value={manualWorkout.descricao}
                onChange={(e) => setManualWorkout({...manualWorkout, descricao: e.target.value})}
              />
            </div>

            {/* NOVOS CAMPOS DE DATA PARA PERIODIZAÇÃO */}
            <div className="flex flex-col md:flex-row gap-4 pt-2 border-t border-[#326747]/50 mt-2">
              <div className="flex-1 flex flex-col gap-1">
                <label className="text-xs text-[#92c9a8] font-bold uppercase flex items-center gap-1">
                  <Calendar size={12} /> Início da Periodização
                </label>
                <input 
                  type="date" 
                  className="bg-[#112218] border border-[#326747] text-white p-3 rounded-xl focus:border-[#13ec6a] outline-none"
                  value={manualWorkout.data_inicio}
                  onChange={(e) => setManualWorkout({...manualWorkout, data_inicio: e.target.value})}
                />
              </div>
              <div className="flex-1 flex flex-col gap-1">
                <label className="text-xs text-[#92c9a8] font-bold uppercase flex items-center gap-1">
                  <Calendar size={12} /> Fim da Periodização (Obrigatório)
                </label>
                <input 
                  type="date" 
                  className="bg-[#112218] border border-[#326747] text-white p-3 rounded-xl focus:border-[#13ec6a] outline-none"
                  value={manualWorkout.data_fim}
                  onChange={(e) => setManualWorkout({...manualWorkout, data_fim: e.target.value})}
                />
              </div>
            </div>
            
          </div>

          <button 
            onClick={handleSaveManual}
            disabled={loading}
            className="bg-[#13ec6a] text-[#112218] px-8 py-4 rounded-full font-black flex items-center gap-2 hover:scale-105 transition-all disabled:opacity-50 shrink-0 shadow-lg shadow-[#13ec6a]/20 mt-4 md:mt-0"
          >
            <Save size={20} /> {loading ? 'Salvando...' : 'Salvar Treino'}
          </button>
        </div>
      </div>

      {/* DIAS DE TREINO */}
      <div className="space-y-8">
        {manualWorkout.dias.map((dia, dIdx) => (
          <div key={dIdx} className="bg-[#193324] border border-[#326747] rounded-3xl p-6 lg:p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4 w-full">
                <div className="h-10 w-10 bg-[#13ec6a] text-[#112218] rounded-lg flex items-center justify-center font-black shrink-0">
                  {dia.nome.split(' ')[1]}
                </div>
                <input 
                  type="text" 
                  placeholder="Foco do dia (ex: Costas e Bíceps)"
                  className="bg-[#112218] border border-[#326747] rounded-xl px-4 py-2 text-white outline-none focus:border-[#13ec6a] w-full md:w-1/2"
                  value={dia.foco}
                  onChange={(e) => {
                    const newDias = [...manualWorkout.dias];
                    newDias[dIdx].foco = e.target.value;
                    setManualWorkout({...manualWorkout, dias: newDias});
                  }}
                />
              </div>
            </div>

            {/* LISTAGEM DE EXERCÍCIOS COM RENDERIZAÇÃO CONDICIONAL */}
            <div className="space-y-4 mb-6">
              {dia.exercicios.map((ex, eIdx) => (
                <div key={eIdx} className="flex flex-col lg:flex-row lg:items-center gap-4 bg-[#112218] p-4 rounded-2xl border border-[#326747]/50 hover:border-[#326747] transition-colors">
                   <span className="text-white font-bold flex-1 text-lg">{ex.nome}</span>
                   
                   <div className="flex flex-wrap items-center gap-4">
                     
                     {/* RENDERIZAÇÃO PARA CARDIO */}
                     {ex.categoria === 'cardio' && (
                       <>
                         <div className="flex items-center gap-2">
                           <span className="text-xs text-[#92c9a8] uppercase font-bold">Tempo</span>
                           <div className="flex items-center bg-[#193324] border border-[#326747] rounded-lg p-1 focus-within:border-[#13ec6a] transition-colors">
                             <input type="number" className="w-14 bg-transparent text-center text-white outline-none font-bold" value={ex.tempo_meta_minutos || ''} onChange={(e) => updateExerciseField(dIdx, eIdx, 'tempo_meta_minutos', Number(e.target.value))} />
                             <span className="text-[#326747] text-xs font-bold pr-2">min</span>
                           </div>
                         </div>
                         <div className="flex items-center gap-2">
                           <span className="text-xs text-[#92c9a8] uppercase font-bold">Dist</span>
                           <div className="flex items-center bg-[#193324] border border-[#326747] rounded-lg p-1 focus-within:border-[#13ec6a] transition-colors">
                             <input type="number" step="0.1" className="w-14 bg-transparent text-center text-white outline-none font-bold" value={ex.distancia_meta_km || ''} onChange={(e) => updateExerciseField(dIdx, eIdx, 'distancia_meta_km', Number(e.target.value))} />
                             <span className="text-[#326747] text-xs font-bold pr-2">km</span>
                           </div>
                         </div>
                       </>
                     )}

                     {/* RENDERIZAÇÃO PARA ISOMÉTRICO */}
                     {ex.categoria === 'isometrico' && (
                       <>
                         <div className="flex items-center gap-2">
                           <span className="text-xs text-[#92c9a8] uppercase font-bold">Séries</span>
                           <input type="number" className="w-14 bg-[#193324] border border-[#326747] rounded-lg p-2 text-center text-white outline-none focus:border-[#13ec6a] font-bold" value={ex.series || ''} onChange={(e) => updateExerciseField(dIdx, eIdx, 'series', Number(e.target.value))} />
                         </div>
                         <div className="flex items-center gap-2">
                           <span className="text-xs text-[#92c9a8] uppercase font-bold">Duração</span>
                           <div className="flex items-center bg-[#193324] border border-[#326747] rounded-lg p-1 focus-within:border-[#13ec6a] transition-colors">
                             <input type="number" className="w-14 bg-transparent text-center text-white outline-none font-bold" value={ex.tempo_segundos || ''} onChange={(e) => updateExerciseField(dIdx, eIdx, 'tempo_segundos', Number(e.target.value))} />
                             <span className="text-[#326747] text-xs font-bold pr-2">seg</span>
                           </div>
                         </div>
                         <div className="flex items-center gap-2">
                           <span className="text-xs text-[#92c9a8] uppercase font-bold">Rest</span>
                           <div className="flex items-center bg-[#193324] border border-[#326747] rounded-lg p-1 focus-within:border-[#13ec6a] transition-colors">
                             <input type="number" className="w-12 bg-transparent text-center text-white outline-none font-bold" value={ex.descanso_segundos || ''} onChange={(e) => updateExerciseField(dIdx, eIdx, 'descanso_segundos', Number(e.target.value))} />
                             <span className="text-[#326747] text-xs font-bold pr-2">s</span>
                           </div>
                         </div>
                       </>
                     )}

                     {/* RENDERIZAÇÃO PARA HIIT */}
                     {ex.categoria === 'hiit' && (
                       <>
                         <div className="flex items-center gap-2">
                           <span className="text-xs text-[#92c9a8] uppercase font-bold">Rounds</span>
                           <input type="number" className="w-14 bg-[#193324] border border-[#326747] rounded-lg p-2 text-center text-white outline-none focus:border-[#13ec6a] font-bold" value={ex.rounds || ''} onChange={(e) => updateExerciseField(dIdx, eIdx, 'rounds', Number(e.target.value))} />
                         </div>
                         <div className="flex items-center gap-2">
                           <span className="text-xs text-[#92c9a8] uppercase font-bold">Estímulo</span>
                           <div className="flex items-center bg-[#193324] border border-[#326747] rounded-lg p-1 focus-within:border-[#13ec6a] transition-colors">
                             <input type="number" className="w-14 bg-transparent text-center text-white outline-none font-bold text-red-400" value={ex.tempos_estimulo_segundos?.[0] || ''} onChange={(e) => updateExerciseField(dIdx, eIdx, 'tempos_estimulo_segundos', [Number(e.target.value)])} />
                             <span className="text-[#326747] text-xs font-bold pr-2">s</span>
                           </div>
                         </div>
                         <div className="flex items-center gap-2">
                           <span className="text-xs text-[#92c9a8] uppercase font-bold">Descanso</span>
                           <div className="flex items-center bg-[#193324] border border-[#326747] rounded-lg p-1 focus-within:border-[#13ec6a] transition-colors">
                             <input type="number" className="w-14 bg-transparent text-center text-white outline-none font-bold text-blue-400" value={ex.tempos_descanso_segundos?.[0] || ''} onChange={(e) => updateExerciseField(dIdx, eIdx, 'tempos_descanso_segundos', [Number(e.target.value)])} />
                             <span className="text-[#326747] text-xs font-bold pr-2">s</span>
                           </div>
                         </div>
                       </>
                     )}

                     {/* RENDERIZAÇÃO PARA FORÇA (PADRÃO) */}
                     {(ex.categoria === 'forca' || (!ex.categoria) || (!['cardio', 'isometrico', 'hiit'].includes(ex.categoria))) && (
                       <>
                         <div className="flex items-center gap-2">
                           <span className="text-xs text-[#92c9a8] uppercase font-bold">Séries</span>
                           <input type="number" className="w-14 bg-[#193324] border border-[#326747] rounded-lg p-2 text-center text-white outline-none focus:border-[#13ec6a] font-bold" value={ex.series || ''} onChange={(e) => updateExerciseField(dIdx, eIdx, 'series', Number(e.target.value))} />
                         </div>
                         <div className="flex items-center gap-2">
                           <span className="text-xs text-[#92c9a8] uppercase font-bold">Reps</span>
                           <div className="flex items-center gap-1 bg-[#193324] border border-[#326747] rounded-lg p-1 focus-within:border-[#13ec6a] transition-colors">
                             <input type="number" className="w-10 bg-transparent text-center text-white outline-none font-bold" value={ex.repeticoes_min || ''} onChange={(e) => updateExerciseField(dIdx, eIdx, 'repeticoes_min', Number(e.target.value))} />
                             <span className="text-[#326747]">-</span>
                             <input type="number" className="w-10 bg-transparent text-center text-white outline-none font-bold" value={ex.repeticoes_max || ''} onChange={(e) => updateExerciseField(dIdx, eIdx, 'repeticoes_max', Number(e.target.value))} />
                           </div>
                         </div>
                         <div className="flex items-center gap-2">
                           <span className="text-xs text-[#92c9a8] uppercase font-bold">Rest</span>
                           <div className="flex items-center bg-[#193324] border border-[#326747] rounded-lg p-1 focus-within:border-[#13ec6a] transition-colors">
                             <input type="number" className="w-12 bg-transparent text-center text-white outline-none font-bold" value={ex.descanso_segundos || ''} onChange={(e) => updateExerciseField(dIdx, eIdx, 'descanso_segundos', Number(e.target.value))} />
                             <span className="text-[#326747] text-xs font-bold pr-2">s</span>
                           </div>
                         </div>
                       </>
                     )}

                     {/* Excluir (Mantido igual para todos) */}
                     <button 
                       onClick={() => removeExercise(dIdx, eIdx)}
                       className="text-red-400 hover:bg-red-500 hover:text-white p-2 rounded-lg transition-colors bg-red-400/10 hover:shadow-[0_0_15px_rgba(248,113,113,0.5)]"
                     >
                       <Trash2 size={20} />
                     </button>
                   </div>
                </div>
              ))}
            </div>

            {/* BUSCA DE EXERCÍCIOS */}
            <div className="relative">
              <div className="flex items-center gap-2 bg-[#112218] border border-[#326747] rounded-2xl px-4 py-4 focus-within:border-[#13ec6a] transition-all shadow-inner">
                <Search size={20} className="text-[#326747]" />
                <input 
                  type="text" 
                  placeholder="Buscar exercício na biblioteca..."
                  className="bg-transparent flex-1 outline-none text-white text-lg placeholder:text-[#326747]"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {search && (
                <div className="absolute z-50 w-full mt-2 bg-[#112218] border border-[#326747] rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] max-h-60 overflow-y-auto overflow-x-hidden">
                  {exerciseLibrary
                    .filter(ex => ex.nome.toLowerCase().includes(search.toLowerCase()))
                    .map(ex => (
                      <button 
                        key={ex.id}
                        onClick={() => addExerciseToDay(dIdx, ex)}
                        className="w-full text-left px-5 py-4 hover:bg-[#13ec6a]/10 text-zinc-300 hover:text-[#13ec6a] flex items-center justify-between transition-colors border-b border-[#326747]/30 last:border-0 font-medium group"
                      >
                        <span className="flex flex-wrap items-center gap-3">
                          {ex.nome} 
                          <span className="text-xs opacity-80 font-normal flex items-center gap-2">
                            <span className="bg-[#112218] px-2 py-1 rounded-md border border-[#326747]/50 text-zinc-400 group-hover:text-[#13ec6a]/80 transition-colors">
                              {ex.musculo_primario}
                            </span>
                            <span className="bg-[#112218] px-2 py-1 rounded-md border border-[#13ec6a]/20 text-[#13ec6a]/80 group-hover:text-[#13ec6a] transition-colors">
                              {ex.equipamentos?.nome || 'peso do corpo'}
                            </span>
                          </span>
                        </span>
                        <Plus size={20} className="shrink-0 opacity-50 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                </div>
              )}
            </div>
          </div>
        ))}

        <button 
          onClick={addDay}
          className="w-full py-5 border-2 border-dashed border-[#326747] rounded-3xl text-[#92c9a8] hover:border-[#13ec6a] hover:text-[#13ec6a] transition-all flex items-center justify-center gap-2 font-black text-lg hover:shadow-[0_0_20px_rgba(19,236,106,0.1)] bg-[#193324]/50 hover:bg-[#193324]"
        >
          <Plus size={24} /> ADICIONAR NOVO DIA DE TREINO
        </button>
      </div>
    </div>
  );
}
import { useEffect, useState } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { TrendingUp, Clock, Activity, Dumbbell, Layers, Bot, X, Timer } from 'lucide-react';
import api from '../services/api';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ReactMarkdown from 'react-markdown'; 

export function Progress() {
  const [stats, setStats] = useState({ totalTreinos: 0, tempoTotalHoras: 0 });
  const [workoutGroups, setWorkoutGroups] = useState<any[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<string>('');
  const [chartData, setChartData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [muscleStats, setMuscleStats] = useState<any[]>([]);

  // --- ESTADOS DO MODAL DA IA ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [relatorios, setRelatorios] = useState<any[]>([]);
  const [loadingRelatorios, setLoadingRelatorios] = useState(false);

  // 1. Busca os KPIs gerais e a lista de exercícios agrupada
  useEffect(() => {
    async function fetchInitialData() {
      try {
        const [statsRes, groupsRes, muscleRes] = await Promise.all([
          api.get('/progress/stats'),
          api.get('/progress/exercises-by-workout'),
          api.get('/progress/muscle-stats')
        ]);
        
        setStats(statsRes.data);
        
        // --- FILTRA O CARDIO DO SELECT DO GRÁFICO ---
        const filteredGroups = groupsRes.data.map((group: any) => ({
          ...group,
          exercicios: group.exercicios.filter((ex: any) => ex.grupo_pai?.trim().toLowerCase() !== 'cardio')
        })).filter((group: any) => group.exercicios.length > 0);

        setWorkoutGroups(filteredGroups);
        setMuscleStats(muscleRes.data);
        
        if (filteredGroups.length > 0 && filteredGroups[0].exercicios.length > 0) {
          setSelectedExercise(filteredGroups[0].exercicios[0].id);
        }
      } catch (error) {
        console.error('Erro ao buscar dados iniciais:', error);
      }
    }
    fetchInitialData();
  }, []);

  // 2. Busca os dados do gráfico
  useEffect(() => {
    async function fetchChartData() {
      if (!selectedExercise) return;
      
      setIsLoading(true);
      try {
        const response = await api.get(`/progress/exercise/${selectedExercise}`);
        const formattedData = response.data.map((item: any) => ({
          ...item,
          dataLabel: format(parseISO(item.data), "dd/MMM", { locale: ptBR }),
        }));
        
        setChartData(formattedData);
      } catch (error) {
        console.error('Erro ao buscar progressão:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchChartData();
  }, [selectedExercise]);

  // 3. Função para buscar Relatórios e abrir o Modal
  const handleOpenReports = async () => {
    setIsModalOpen(true);
    setLoadingRelatorios(true);
    try {
      const response = await api.get('/reports');
      setRelatorios(response.data);
    } catch (error) {
      console.error("Erro ao buscar relatórios", error);
    } finally {
      setLoadingRelatorios(false);
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900 border border-gray-700 p-3 rounded-lg shadow-xl z-50">
          <p className="text-gray-400 text-sm mb-1">{label}</p>
          <p className="text-emerald-500 font-bold">
            Carga Máxima: {payload[0].value} kg
          </p>
          {payload[1] && (
            <p className="text-blue-400 text-sm mt-1">
              Volume Total: {payload[1].value} kg
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  // --- SEPARAÇÃO DOS DADOS: FORÇA VS CARDIO ---
  const forceStats = muscleStats.filter(grupo => grupo.grupo_pai?.trim().toLowerCase() !== 'cardio');
  const cardioStatsRaw = muscleStats.filter(grupo => grupo.grupo_pai?.trim().toLowerCase() === 'cardio');

  // Calcula os totais do cardio varrendo os exercícios dentro do grupo
  let totalCardioMinutos = 0;
  let totalCardioKm = 0;

  cardioStatsRaw.forEach(grupo => {
    grupo.exercicios?.forEach((ex: any) => {
        // Tenta pegar os valores, garantindo que sejam convertidos para número se existirem
        const minutos = ex.tempoRealMinutos || ex.tempo_real_minutos || 0;
        const km = ex.distanciaRealKm || ex.distancia_real_km || 0;
        
        totalCardioMinutos += Number(minutos);
        totalCardioKm += Number(km);
    });
  });


  return (
    <div className="p-6 text-white max-w-7xl mx-auto space-y-6">
      
      {/* --- CABEÇALHO COM BOTÃO DA IA --- */}
      <div className="flex justify-between items-center mb-1">
        <div>
          <h1 className="text-2xl font-bold mb-1">Seu Progresso</h1>
          <p className="text-gray-400 text-sm">Acompanhe sua evolução e consistência</p>
        </div>
        
        <button 
          onClick={handleOpenReports}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 shadow-lg shadow-emerald-900/20"
        >
          <Bot className="w-5 h-5" />
          <span className="hidden sm:inline">Avaliações da IA</span>
          <span className="sm:hidden">IA</span>
        </button>
      </div>

      {/* --- CARDS DE KPIs --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-900 p-5 rounded-xl border border-gray-800 flex items-center gap-4">
          <div className="p-3 bg-emerald-500/20 text-emerald-500 rounded-lg">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <p className="text-gray-400 text-sm">Treinos Realizados</p>
            <p className="text-2xl font-bold text-white">{stats.totalTreinos}</p>
          </div>
        </div>

        <div className="bg-gray-900 p-5 rounded-xl border border-gray-800 flex items-center gap-4">
          <div className="p-3 bg-blue-500/20 text-blue-500 rounded-lg">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-gray-400 text-sm">Tempo de Foco</p>
            <p className="text-2xl font-bold text-white">{stats.tempoTotalHoras}h</p>
          </div>
        </div>

        <div className="bg-gray-900 p-5 rounded-xl border border-gray-800 flex items-center gap-4">
          <div className="p-3 bg-purple-500/20 text-purple-500 rounded-lg">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-gray-400 text-sm">Status da Evolução</p>
            <p className="text-lg font-bold text-emerald-500">Sobrecarga Ativa</p>
          </div>
        </div>
      </div>

      {/* --- GRÁFICO DE EVOLUÇÃO --- */}
      <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div className="flex items-center gap-2">
            <Dumbbell className="w-5 h-5 text-emerald-500" />
            <h2 className="text-lg font-bold">Evolução de Carga</h2>
          </div>
          
          <select 
            value={selectedExercise}
            onChange={(e) => setSelectedExercise(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-white text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block p-2.5 outline-none w-full sm:w-auto cursor-pointer"
          >
            {workoutGroups.length === 0 && (
               <option value="" disabled>Nenhum treino encontrado</option>
            )}
            
            {workoutGroups.map((group, index) => (
              <optgroup 
                key={index} 
                label={`${group.treinoNome} - ${group.diaNome}`} 
                className="bg-gray-900 text-emerald-500 font-bold italic"
              >
                {group.exercicios.map((ex: any) => (
                  <option 
                    key={`${group.diaNome}-${ex.id}`} 
                    value={ex.id} 
                    className="bg-gray-800 text-white not-italic font-normal"
                  >
                    {ex.nome}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <div className="h-[300px] w-full">
          {isLoading ? (
            <div className="w-full h-full flex items-center justify-center text-emerald-500 animate-pulse">
              Carregando gráfico...
            </div>
          ) : chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                <XAxis 
                  dataKey="dataLabel" 
                  stroke="#9CA3AF" 
                  fontSize={12} 
                  tickMargin={10}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  stroke="#9CA3AF" 
                  fontSize={12}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => `${value}kg`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="maxCarga" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#1f2937' }}
                  activeDot={{ r: 6, fill: '#10b981', stroke: '#fff' }}
                  name="Carga Máxima"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-500 flex-col gap-2">
              <Activity className="w-8 h-8 opacity-20" />
              <p>Nenhum histórico registrado para este exercício.</p>
            </div>
          )}
        </div>
      </div>

      {/* --- NOVO: PAINEL DE CARDIO (Últimos 7 dias) --- */}
      {cardioStatsRaw.length > 0 && (
        <div className="pt-2">
          <div className="flex items-center gap-2 mb-4">
            <Timer className="w-5 h-5 text-emerald-500" />
            <h2 className="text-xl font-bold">Cardio (Últimos 7 dias)</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#112218] border border-[#193324] rounded-xl p-5 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-[#13ec6a]/10 text-[#13ec6a] rounded-lg">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-gray-400 text-sm uppercase tracking-wider font-semibold">Tempo Total</p>
                <p className="text-2xl font-bold text-white">{totalCardioMinutos} min</p>
              </div>
            </div>

            <div className="bg-[#112218] border border-[#193324] rounded-xl p-5 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-[#13ec6a]/10 text-[#13ec6a] rounded-lg">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <p className="text-gray-400 text-sm uppercase tracking-wider font-semibold">Distância Total</p>
                <p className="text-2xl font-bold text-white">{totalCardioKm} km</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- VOLUME SEMANAL POR GRUPO MUSCULAR (FORÇA) --- */}
      <div className="pt-2">
        <div className="flex items-center gap-2 mb-4">
          <Layers className="w-5 h-5 text-emerald-500" />
          <h2 className="text-xl font-bold">Volume de Força (Últimos 7 dias)</h2>
        </div>
        
        {forceStats.length === 0 ? (
           <p className="text-gray-500 text-sm">Nenhum treino de força registrado nos últimos 7 dias.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {forceStats.map((grupo, index) => (
              <div key={index} className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-sm">
                
                <div className="flex justify-between items-start border-b border-gray-800 pb-3 mb-3">
                  <div>
                    <h3 className="font-bold text-lg text-white leading-tight">
                      {grupo.musculo_primario}
                    </h3>
                    <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
                      {grupo.grupo_pai}
                    </span>
                  </div>
                  <span className="bg-emerald-500/10 text-emerald-400 text-xs font-bold px-2 py-1 rounded mt-1">
                    {grupo.totalSeries} Séries
                  </span>
                </div>

                <div className="flex justify-between text-sm mb-4">
                  <div className="text-gray-400">
                    <p>Total Reps</p>
                    <p className="text-white font-medium text-base">{grupo.totalReps}</p>
                  </div>
                  <div className="text-right text-gray-400">
                    <p>Volume (Carga x Reps)</p>
                    <p className="text-blue-400 font-bold text-base">{grupo.volumeTotal} kg</p>
                  </div>
                </div>

                <div className="space-y-2 mt-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Carga Máxima atingida</p>
                  {grupo.exercicios.map((ex: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center text-sm bg-gray-800/50 p-2 rounded">
                      <span className="text-gray-300 truncate pr-2" title={ex.nome}>{ex.nome}</span>
                      <span className="text-emerald-500 font-medium whitespace-nowrap">{ex.maxCarga} kg</span>
                    </div>
                  ))}
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

      {/* ========================================= */}
      {/* MODAL DE RELATÓRIOS DA IA */}
      {/* ========================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl">
            
            <div className="flex justify-between items-center p-5 border-b border-gray-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-500">
                  <Bot className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold text-white">Dossiê de Treinamento</h2>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1">
              {loadingRelatorios ? (
                <div className="flex flex-col items-center justify-center h-40 text-emerald-500 animate-pulse gap-3">
                  <Bot className="w-8 h-8" />
                  <p>Buscando análises do treinador...</p>
                </div>
              ) : relatorios.length === 0 ? (
                <div className="text-center text-gray-500 mt-10 flex flex-col items-center gap-3">
                  <Activity className="w-10 h-10 opacity-20" />
                  <p>Você ainda não possui relatórios gerados.</p>
                  <p className="text-sm">Eles aparecerão aqui automaticamente após 7 dias de treino.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {relatorios.map((relatorio) => (
                    <div key={relatorio.id} className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                      
                      {/* Cabeçalho do Card de Relatório */}
                      <div className="flex justify-between items-start mb-4">
                        <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full ${
                          relatorio.tipo === 'final' 
                            ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' 
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}>
                          Avaliação {relatorio.tipo}
                        </span>
                        <span className="text-sm text-gray-400 font-medium bg-gray-900 px-3 py-1 rounded-full border border-gray-800">
                          {new Date(relatorio.data_geracao).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 mb-6 text-gray-300">
                        <Layers className="w-4 h-4 text-emerald-500" />
                        <p className="text-sm font-medium">Referente a: <span className="text-white">{relatorio.treinos?.nome}</span></p>
                      </div>
                      
                      {/* ========================================= */}
                      {/* RENDERIZADOR DO MARKDOWN COM TAILWIND CSS */}
                      {/* ========================================= */}
                      <div className="text-gray-300 text-sm">
                        <ReactMarkdown
                          components={{
                            // Título Nível 1 (Se a IA gerar #)
                            h1: ({node, ...props}) => <h1 className="text-xl font-bold text-white mt-6 mb-3" {...props} />,
                            // Título Nível 2 (Ex: ## ⚠️ Pontos de Atenção)
                            h2: ({node, ...props}) => <h2 className="text-lg font-bold text-emerald-400 mt-6 mb-2 border-b border-gray-700 pb-1" {...props} />,
                            // Título Nível 3 (Ex: ### Meta da Próxima Semana)
                            h3: ({node, ...props}) => <h3 className="text-base font-bold text-gray-200 mt-4 mb-2" {...props} />,
                            // Parágrafos Normais
                            p: ({node, ...props}) => <p className="mb-3 leading-relaxed" {...props} />,
                            // Listas com Bolinhas (Ex: - Análise de Cargas...)
                            ul: ({node, ...props}) => <ul className="list-disc list-inside mb-4 space-y-1 marker:text-emerald-500" {...props} />,
                            // Listas Numeradas (Ex: 1. Fazer isso...)
                            ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-4 space-y-1 marker:text-emerald-500" {...props} />,
                            // Itens da Lista
                            li: ({node, ...props}) => <li className="text-gray-300 leading-relaxed ml-2" {...props} />,
                            // Textos em Negrito (Ex: **Muito Importante**)
                            strong: ({node, ...props}) => <strong className="font-bold text-white" {...props} />,
                          }}
                        >
                          {relatorio.conteudo}
                        </ReactMarkdown>
                      </div>

                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
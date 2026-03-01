import { useEffect, useState } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { TrendingUp, Clock, Activity, Dumbbell, Layers } from 'lucide-react';
import api from '../services/api';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function Progress() {
  const [stats, setStats] = useState({ totalTreinos: 0, tempoTotalHoras: 0 });
  const [workoutGroups, setWorkoutGroups] = useState<any[]>([]); // <--- Estado novo
  const [selectedExercise, setSelectedExercise] = useState<string>('');
  const [chartData, setChartData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [muscleStats, setMuscleStats] = useState<any[]>([]);

  // 1. Busca os KPIs gerais e a lista de exercícios agrupada ao carregar a página
  useEffect(() => {
    async function fetchInitialData() {
      try {
        const [statsRes, groupsRes, muscleRes] = await Promise.all([
          api.get('/progress/stats'),
          api.get('/progress/exercises-by-workout'),
          api.get('/progress/muscle-stats')
        ]);
        
        setStats(statsRes.data);
        setWorkoutGroups(groupsRes.data);
        setMuscleStats(muscleRes.data);
        // Seleciona o primeiro exercício do primeiro treino por padrão, se houver
        if (groupsRes.data.length > 0 && groupsRes.data[0].exercicios.length > 0) {
          setSelectedExercise(groupsRes.data[0].exercicios[0].id);
        }
      } catch (error) {
        console.error('Erro ao buscar dados iniciais:', error);
      }
    }
    fetchInitialData();
  }, []);

  // 2. Busca os dados do gráfico sempre que o exercício selecionado mudar
  useEffect(() => {
    async function fetchChartData() {
      if (!selectedExercise) return;
      
      setIsLoading(true);
      try {
        const response = await api.get(`/progress/exercise/${selectedExercise}`);
        
        // Formata a data para ficar bonita no eixo X do gráfico
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

  // Componente customizado para o Tooltip (a caixinha que aparece ao passar o mouse)
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

  return (
    <div className="p-6 text-white max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Seu Progresso</h1>
        <p className="text-gray-400 text-sm">Acompanhe sua evolução e consistência</p>
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
          
          {/* SELECT AGRUPADO POR TREINOS */}
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
      {/* --- NOVA SEÇÃO: VOLUME SEMANAL POR GRUPO MUSCULAR --- */}
      <div className="pt-4">
        <div className="flex items-center gap-2 mb-4">
          <Layers className="w-5 h-5 text-emerald-500" />
          <h2 className="text-xl font-bold">Volume Semanal (Últimos 7 dias)</h2>
        </div>
        
        {muscleStats.length === 0 ? (
           <p className="text-gray-500 text-sm">Nenhum treino registrado nos últimos 7 dias.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {muscleStats.map((grupo, index) => (
              <div key={index} className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-sm">
                
                {/* Cabeçalho do Card */}
                <div className="flex justify-between items-center border-b border-gray-800 pb-3 mb-3">
                  <h3 className="font-bold text-lg text-white">{grupo.grupo_muscular}</h3>
                  <span className="bg-emerald-500/10 text-emerald-400 text-xs font-bold px-2 py-1 rounded">
                    {grupo.totalSeries} Séries
                  </span>
                </div>

                {/* Métricas Principais */}
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

                {/* Lista de Carga Máxima por Exercício */}
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
    </div>
  );
}
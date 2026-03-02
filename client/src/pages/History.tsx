import { useEffect, useState } from 'react';
import { format, getDaysInMonth, getDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { X, Clock, Dumbbell, Calendar, MessageSquare } from 'lucide-react';
import api from '../services/api';

export default function History() {
  const [datasTreinadas, setDatasTreinadas] = useState<string[]>([]);
  
  // Estados do Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [workoutDetails, setWorkoutDetails] = useState<any>(null);

  const currentYear = new Date().getFullYear();

  useEffect(() => {
    async function fetchHistory() {
      try {
        const response = await api.get('/history/dates');
        setDatasTreinadas(response.data);
      } catch (error) {
        console.error('Erro ao buscar histórico:', error);
      }
    }

    fetchHistory();
  }, []);

  const handleDayClick = async (dateString: string) => {
    // Só abre o modal se o dia tiver treino
    if (datasTreinadas.includes(dateString)) {
      setIsModalOpen(true);
      setIsLoadingDetails(true);
      setWorkoutDetails(null);

      try {
        const response = await api.get(`/history/details/${dateString}`);
        setWorkoutDetails(response.data);
      } catch (error) {
        console.error('Erro ao buscar detalhes do treino:', error);
      } finally {
        setIsLoadingDetails(false);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  // Nomes dos meses e dias da semana para o cabeçalho do calendário
  const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const diasSemana = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  return (
    <div className="p-6 text-white relative">
      <h1 className="text-2xl font-bold mb-2">Histórico de Treinos</h1>
      <p className="text-gray-400 mb-6">Seus treinos realizados em {currentYear}</p>
      
      {/* GRID DE MESES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {meses.map((nomeMes, indexMes) => {
          // Lógica para descobrir quantos dias o mês tem e em qual dia da semana ele começa
          const totalDias = getDaysInMonth(new Date(currentYear, indexMes));
          const diaInicio = getDay(new Date(currentYear, indexMes, 1)); // 0 = Dom, 6 = Sáb
          
          const diasArray = Array.from({ length: totalDias }, (_, i) => i + 1);
          const espacosVazios = Array.from({ length: diaInicio }, (_, i) => i);

          return (
            <div key={nomeMes} className="bg-gray-900 p-5 rounded-xl border border-gray-800 shadow-sm">
              <h3 className="text-lg font-bold text-white mb-4 text-center">{nomeMes}</h3>
              
              {/* Cabeçalho dos dias da semana */}
              <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {diasSemana.map((d, i) => (
                  <div key={i} className="text-xs font-semibold text-gray-500">{d}</div>
                ))}
              </div>
              
              {/* Grid de dias numéricos */}
              <div className="grid grid-cols-7 gap-1">
                {/* Preenche os espaços vazios antes do dia 1 */}
                {espacosVazios.map(v => <div key={`empty-${v}`} />)}
                
                {diasArray.map(dia => {
                  // Formata a data para YYYY-MM-DD para comparar com o banco
                  const dateString = `${currentYear}-${String(indexMes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
                  const treinou = datasTreinadas.includes(dateString);

                  return (
                    <button
                      key={dia}
                      onClick={() => handleDayClick(dateString)}
                      disabled={!treinou}
                      className={`
                        aspect-square flex items-center justify-center text-sm rounded-md transition-all duration-200 font-medium
                        ${treinou 
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 hover:bg-emerald-500 hover:text-gray-900 cursor-pointer shadow-[0_0_10px_rgba(16,185,129,0.1)]' 
                          : 'bg-gray-800/50 text-gray-500 cursor-default hover:bg-gray-800'}
                      `}
                    >
                      {dia}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* --- MODAL DE DETALHES (Mantido exatamente como o anterior) --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            
            {/* Header do Modal */}
            <div className="p-6 border-b border-gray-800 flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Calendar className="w-6 h-6 text-emerald-500" />
                  {workoutDetails ? format(parseISO(workoutDetails.sessao.data_treino), "dd 'de' MMMM, yyyy", { locale: ptBR }) : 'Carregando...'}
                </h2>
                {workoutDetails && (
                  <div className="flex items-center gap-4 mt-2 text-gray-400">
                    <span className="flex items-center gap-1">
                      <Dumbbell className="w-4 h-4" /> 
                      {workoutDetails.sessao.dias_treino?.nome || 'Treino Extra'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" /> 
                      {workoutDetails.sessao.duracao_real_minutos} min
                    </span>
                  </div>
                )}
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Corpo do Modal */}
            <div className="p-6 overflow-y-auto space-y-6">
              {isLoadingDetails ? (
                <div className="text-center py-10 text-emerald-500 animate-pulse font-medium">
                  Buscando dados do treino...
                </div>
              ) : workoutDetails?.exercicios ? (
                workoutDetails.exercicios.map((item: any, exIndex: number) => (
                  <div key={exIndex} className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
                    <h3 className="text-lg font-semibold text-white mb-1">
                      {item.exercicios?.nome}
                    </h3>
                    <span className="text-xs px-2 py-1 bg-gray-800 text-gray-400 rounded-md mb-4 inline-block">
                      {item.exercicios?.grupo_pai} | Foco: {item.exercicios?.musculo_primario}
                    </span>

                    {/* Tabela de Séries */}
                    <div className="overflow-x-auto mt-2">
                      <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-400 border-b border-gray-700">
                          <tr>
                            <th className="pb-2 font-medium">Série</th>
                            <th className="pb-2 font-medium">Carga</th>
                            <th className="pb-2 font-medium">Repetições</th>
                            <th className="pb-2 font-medium">Descanso</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700/50">
                          {item.cargas_kg.map((carga: number, serieIndex: number) => (
                            <tr key={serieIndex} className="text-gray-300 hover:bg-gray-800/30 transition-colors">
                              <td className="py-2 text-emerald-500 font-medium pl-2">{serieIndex + 1}</td>
                              <td className="py-2">{carga} kg</td>
                              <td className="py-2">{item.repeticoes[serieIndex]}</td>
                              <td className="py-2">{formatTime(item.descansos_segundos[serieIndex])}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Observações */}
                    {item.observacoes && (
                      <div className="mt-4 p-3 bg-gray-900/50 rounded text-sm text-gray-400 flex items-start gap-2 border border-gray-800">
                        <MessageSquare className="w-4 h-4 mt-0.5 shrink-0 text-emerald-500" />
                        <p className="italic">"{item.observacoes}"</p>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-gray-400 text-center py-10">Não foi possível carregar os detalhes.</p>
              )}
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}
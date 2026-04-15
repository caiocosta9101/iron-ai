// client/src/pages/History.tsx
import { useEffect, useState, useRef } from 'react';
import { 
  format, getDaysInMonth, getDay, parseISO, 
  addMonths, subMonths, addYears, subYears, setMonth, setYear 
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  X, Clock, Dumbbell, Calendar, MessageSquare, 
  ChevronLeft, ChevronRight, Copy, Image as ImageIcon, FileText, 
  FileJson, FileCode2, Activity, Zap, Timer
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../services/api';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export default function History() {
  const [datasTreinadas, setDatasTreinadas] = useState<string[]>([]);
  
  // Estado de navegação do calendário
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Estados do Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [workoutDetails, setWorkoutDetails] = useState<any>(null);

  // Ref para capturar a imagem do modal
  const modalRef = useRef<HTMLDivElement>(null);

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
    if (!seconds) return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  // --- FUNÇÕES DE EXPORTAÇÃO ---
  const handleCopyToWhatsApp = () => {
    if (!workoutDetails) return;

    const dataFormatada = format(parseISO(workoutDetails.sessao.data_treino), "dd/MM/yyyy");
    const nomeTreino = workoutDetails.sessao.dias_treino?.nome || 'Treino Extra';
    const duracao = workoutDetails.sessao.duracao_real_minutos;

    let texto = `*Resumo do Treino - Iron AI* 🤖💪\n`;
    texto += `📅 Data: ${dataFormatada}\n`;
    texto += `🎯 Foco: ${nomeTreino}\n`;
    texto += `⏱️ Duração: ${duracao} min\n\n`;

    workoutDetails.exercicios.forEach((item: any) => {
      const nomeExercicio = item.nome || item.exercicios?.nome || 'Exercício Desconhecido';
      texto += `🔸 *${nomeExercicio}*\n`;
      
      const categoria = item.categoria || item.tipo;
      const grupoPai = item.grupo_pai || item.exercicios?.grupo_pai || '';
      const isCardioLegacy = grupoPai.trim().toLowerCase() === 'cardio' && categoria !== 'hiit';

      if (categoria === 'hiit') {
        let totalSeg = 0, totalDist = 0;
        item.velocidades_estimulo_real?.forEach((vel: number, idx: number) => {
           const tOn = item.tempos_estimulo_real?.[idx] || 0;
           const tOff = item.tempos_descanso_real?.[idx] || 0;
           const vOff = item.velocidades_descanso_real?.[idx] || 0;
           totalSeg += (tOn + tOff);
           totalDist += (tOn / 3600) * vel + (tOff / 3600) * vOff;
        });
        const mins = Math.round(totalSeg / 60);
        const km = Number(totalDist.toFixed(2));
        
        texto += `  ⏱️ Total: ${mins} min | 🏃 Distância: ${km} km\n`;
        item.velocidades_estimulo_real?.forEach((vel: number, idx: number) => {
           texto += `  Round ${idx + 1}: ${vel}km/h (${item.tempos_estimulo_real?.[idx]}s) ⚡ / ${item.velocidades_descanso_real?.[idx]}km/h (${item.tempos_descanso_real?.[idx]}s) 🚶\n`;
        });
      } else if (categoria === 'isometrico') {
        item.tempos_reais_segundos?.forEach((tempo: number, idx: number) => {
           texto += `  Série ${idx + 1}: ${tempo}s ⏱️\n`;
        });
      } else if (categoria === 'cardio' || isCardioLegacy) {
        const tempo = item.tempo_real_minutos || item.tempoRealMinutos;
        const dist = item.distancia_real_km || item.distanciaRealKm;
        if (tempo) texto += `  ⏱️ Tempo: ${tempo} min\n`;
        if (dist) texto += `  🏃 Distância: ${dist} km\n`;
      } else {
        item.cargas_kg?.forEach((carga: number, index: number) => {
          const reps = item.repeticoes?.[index] || item.repeticoes?.[index];
          texto += `  Série ${index + 1}: ${carga}kg x ${reps} reps\n`;
        });
      }
      
      if (item.observacoes) texto += `  💬 Obs: ${item.observacoes}\n`;
      texto += `\n`;
    });

    navigator.clipboard.writeText(texto).then(() => {
      toast.success("Treino copiado! Pronto para colar no WhatsApp.");
    }).catch(err => {
      console.error('Erro ao copiar', err);
      toast.error("Erro ao copiar o treino.");
    });
  };

  const handleCopyMarkdown = () => {
    if (!workoutDetails) return;

    const dataFormatada = format(parseISO(workoutDetails.sessao.data_treino), "dd/MM/yyyy");
    const nomeTreino = workoutDetails.sessao.dias_treino?.nome || 'Treino Extra';
    const duracao = workoutDetails.sessao.duracao_real_minutos;

    let md = `# Histórico de Treino: ${nomeTreino}\n`;
    md += `**Data:** ${dataFormatada} | **Duração:** ${duracao} min\n\n`;

    workoutDetails.exercicios.forEach((item: any) => {
      const nomeExercicio = item.nome || item.exercicios?.nome || 'Exercício Desconhecido';
      const grupoPai = item.grupo_pai || item.exercicios?.grupo_pai || '';
      const musculoPrimario = item.musculo_primario || item.exercicios?.musculo_primario || '';

      md += `### ${nomeExercicio}\n`;
      if (grupoPai || musculoPrimario) {
        md += `*${grupoPai} | Foco: ${musculoPrimario}*\n\n`;
      }
      
      const categoria = item.categoria || item.tipo;
      const isCardioLegacy = grupoPai.trim().toLowerCase() === 'cardio' && categoria !== 'hiit';

      if (categoria === 'hiit') {
        let totalSeg = 0, totalDist = 0;
        item.velocidades_estimulo_real?.forEach((vel: number, idx: number) => {
           const tOn = item.tempos_estimulo_real?.[idx] || 0;
           const tOff = item.tempos_descanso_real?.[idx] || 0;
           const vOff = item.velocidades_descanso_real?.[idx] || 0;
           totalSeg += (tOn + tOff);
           totalDist += (tOn / 3600) * vel + (tOff / 3600) * vOff;
        });
        const mins = Math.round(totalSeg / 60);
        const km = Number(totalDist.toFixed(2));
        
        md += `**Tempo Total:** ${mins} min | **Distância:** ${km} km\n\n`;
        md += `| Round | Vel Alta (ON) | Vel Baixa (OFF) |\n`;
        md += `| :---: | :---: | :---: |\n`;
        item.velocidades_estimulo_real?.forEach((vel: number, idx: number) => {
           md += `| ${idx + 1} | **${vel} km/h** (${item.tempos_estimulo_real?.[idx]}s) | ${item.velocidades_descanso_real?.[idx]} km/h (${item.tempos_descanso_real?.[idx]}s) |\n`;
        });
      } else if (categoria === 'isometrico') {
        md += `| Série | Tempo Mantido | Descanso |\n`;
        md += `| :---: | :---: | :---: |\n`;
        item.tempos_reais_segundos?.forEach((tempo: number, idx: number) => {
           md += `| ${idx + 1} | **${tempo}s** | ${item.descansos_segundos?.[idx] || 0}s |\n`;
        });
      } else if (categoria === 'cardio' || isCardioLegacy) {
        const tempo = item.tempo_real_minutos || item.tempoRealMinutos;
        const dist = item.distancia_real_km || item.distanciaRealKm;
        md += `**Tempo:** ${tempo ? `${tempo} min` : '-'} | **Distância:** ${dist ? `${dist} km` : '-'}\n`;
      } else {
        md += `| Série | Carga   | Repetições | Descanso |\n`;
        md += `| :---: | :-----: | :--------: | :------: |\n`;
        item.cargas_kg?.forEach((carga: number, index: number) => {
          const reps = item.repeticoes?.[index];
          const descanso = formatTime(item.descansos_segundos?.[index] || 0);
          md += `| ${index + 1} | **${carga} kg** | ${reps} | ${descanso} |\n`;
        });
      }

      if (item.observacoes) {
        md += `\n> **Observação:** ${item.observacoes}\n`;
      }
      md += `\n---\n\n`;
    });

    navigator.clipboard.writeText(md).then(() => {
      toast.success("Markdown copiado para a área de transferência!");
    }).catch(err => {
      console.error('Erro ao copiar Markdown:', err);
      toast.error("Erro ao copiar o Markdown.");
    });
  };

  const handleDownloadJSON = () => {
    if (!workoutDetails) return;

    const jsonString = JSON.stringify(workoutDetails, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    const dataFormatada = format(parseISO(workoutDetails.sessao.data_treino), "yyyy-MM-dd");
    a.download = `IronAI_${dataFormatada}.json`;
    
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Arquivo JSON baixado com sucesso!");
  };

  const handleDownloadImage = async () => {
    if (!modalRef.current) return;
    
    const toastId = toast.loading("Gerando imagem completa...");
    const modalElement = modalRef.current;
    
    const scrollableDiv = modalElement.querySelector('.overflow-y-auto') as HTMLElement;
    
    const originalMaxHeight = modalElement.style.maxHeight;
    const originalOverflow = modalElement.style.overflow;
    const originalScrollOverflow = scrollableDiv ? scrollableDiv.style.overflow : '';

    try {
      modalElement.style.maxHeight = 'none';
      modalElement.style.overflow = 'visible';
      if (scrollableDiv) scrollableDiv.style.overflow = 'visible';

      const canvas = await html2canvas(modalElement, {
        backgroundColor: '#111827',
        scale: 2,
        windowHeight: modalElement.scrollHeight, 
      });

      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      const dataFormatada = workoutDetails?.sessao.data_treino ? format(parseISO(workoutDetails.sessao.data_treino), "yyyy-MM-dd") : 'treino';
      link.download = `IronAI_${dataFormatada}.png`;
      link.click();

      toast.success("Imagem salva com sucesso!", { id: toastId });
    } catch (error) {
      console.error('Erro ao gerar imagem:', error);
      toast.error("Erro ao gerar imagem.", { id: toastId });
    } finally {
      modalElement.style.maxHeight = originalMaxHeight;
      modalElement.style.overflow = originalOverflow;
      if (scrollableDiv) scrollableDiv.style.overflow = originalScrollOverflow;
    }
  };

  const handleDownloadPDF = async () => {
    if (!modalRef.current) return;
    
    const toastId = toast.loading("Gerando PDF completo...");
    const modalElement = modalRef.current;
    
    const scrollableDiv = modalElement.querySelector('.overflow-y-auto') as HTMLElement;
    
    const originalMaxHeight = modalElement.style.maxHeight;
    const originalOverflow = modalElement.style.overflow;
    const originalScrollOverflow = scrollableDiv ? scrollableDiv.style.overflow : '';

    try {
      modalElement.style.maxHeight = 'none';
      modalElement.style.overflow = 'visible';
      if (scrollableDiv) scrollableDiv.style.overflow = 'visible';

      const canvas = await html2canvas(modalElement, {
        backgroundColor: '#111827',
        scale: 2,
        windowHeight: modalElement.scrollHeight,
      });

      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      const dataFormatada = workoutDetails?.sessao.data_treino ? format(parseISO(workoutDetails.sessao.data_treino), "yyyy-MM-dd") : 'treino';
      pdf.save(`IronAI_${dataFormatada}.pdf`);

      toast.success("PDF salvo com sucesso!", { id: toastId });
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error("Erro ao gerar PDF.", { id: toastId });
    } finally {
      modalElement.style.maxHeight = originalMaxHeight;
      modalElement.style.overflow = originalOverflow;
      if (scrollableDiv) scrollableDiv.style.overflow = originalScrollOverflow;
    }
  };

  // --- FUNÇÕES DE NAVEGAÇÃO ---
  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const handlePrevYear = () => setCurrentDate(subYears(currentDate, 1));
  const handleNextYear = () => setCurrentDate(addYears(currentDate, 1));
  const handleGoToToday = () => setCurrentDate(new Date());

  const currentYear = currentDate.getFullYear();
  const currentMonthIndex = currentDate.getMonth();
  const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const diasSemana = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
  
  const realCurrentYear = new Date().getFullYear();
  const anosDisponiveis = Array.from({ length: 8 }, (_, i) => realCurrentYear - 5 + i);

  const totalDias = getDaysInMonth(currentDate);
  const diaInicio = getDay(new Date(currentYear, currentMonthIndex, 1));
  const diasArray = Array.from({ length: totalDias }, (_, i) => i + 1);
  const espacosVazios = Array.from({ length: diaInicio }, (_, i) => i);

  return (
    <div className="p-6 text-white relative max-w-4xl mx-auto">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-1">Histórico de Treinos</h1>
          <p className="text-gray-400 text-sm">Acompanhe sua consistência</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
          <div className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-lg p-1 shadow-sm w-full sm:w-auto">
            <button onClick={handlePrevMonth} className="p-2 hover:bg-gray-800 rounded-md transition-colors text-gray-400 hover:text-white">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <select value={currentMonthIndex} onChange={(e) => setCurrentDate(setMonth(currentDate, Number(e.target.value)))} className="bg-transparent text-emerald-500 font-bold text-center appearance-none cursor-pointer outline-none text-base md:text-lg w-28">
              {meses.map((mes, index) => (<option key={mes} value={index} className="bg-gray-900 text-white">{mes}</option>))}
            </select>
            <button onClick={handleNextMonth} className="p-2 hover:bg-gray-800 rounded-md transition-colors text-gray-400 hover:text-white">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-lg p-1 shadow-sm w-full sm:w-auto">
            <button onClick={handlePrevYear} className="p-2 hover:bg-gray-800 rounded-md transition-colors text-gray-400 hover:text-white">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <select value={currentYear} onChange={(e) => setCurrentDate(setYear(currentDate, Number(e.target.value)))} className="bg-transparent text-gray-300 font-bold text-center appearance-none cursor-pointer outline-none text-base md:text-lg w-16">
              {anosDisponiveis.map((ano) => (<option key={ano} value={ano} className="bg-gray-900 text-white">{ano}</option>))}
            </select>
            <button onClick={handleNextYear} className="p-2 hover:bg-gray-800 rounded-md transition-colors text-gray-400 hover:text-white">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
      
      {(currentDate.getMonth() !== new Date().getMonth() || currentDate.getFullYear() !== new Date().getFullYear()) && (
        <div className="flex justify-end mb-4">
          <button onClick={handleGoToToday} className="text-xs text-emerald-500 hover:text-emerald-400 font-medium transition-colors">Voltar para Hoje</button>
        </div>
      )}

      <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 shadow-sm">
        <div className="grid grid-cols-7 gap-2 text-center mb-4">
          {diasSemana.map((d, i) => (<div key={i} className="text-sm font-semibold text-gray-500">{d}</div>))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {espacosVazios.map(v => <div key={`empty-${v}`} />)}
          {diasArray.map(dia => {
            const dateString = `${currentYear}-${String(currentMonthIndex + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
            const treinou = datasTreinadas.includes(dateString);
            const isToday = dateString === format(new Date(), 'yyyy-MM-dd');

            return (
              <button
                key={dia}
                onClick={() => handleDayClick(dateString)}
                disabled={!treinou}
                className={`
                  relative aspect-square flex flex-col items-center justify-center text-sm md:text-base rounded-lg transition-all duration-200 font-medium
                  ${treinou ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 hover:bg-emerald-500 hover:text-gray-900 cursor-pointer shadow-[0_0_10px_rgba(16,185,129,0.1)]' : 'bg-gray-800/30 text-gray-500 cursor-default hover:bg-gray-800/50'}
                  ${isToday && !treinou ? 'border border-gray-600' : ''}
                `}
              >
                {dia}
                {isToday && (<span className="absolute bottom-1 w-1 h-1 rounded-full bg-gray-400"></span>)}
              </button>
            );
          })}
        </div>
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div ref={modalRef} className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-6 border-b border-gray-800 flex justify-between items-start">
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 md:w-6 md:h-6 text-emerald-500" />
                  {workoutDetails ? format(parseISO(workoutDetails.sessao.data_treino), "dd 'de' MMMM, yyyy", { locale: ptBR }) : 'Carregando...'}
                </h2>
                {workoutDetails && (
                  <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-400">
                    <span className="flex items-center gap-1"><Dumbbell className="w-4 h-4" /> {workoutDetails.sessao.dias_treino?.nome || 'Treino Extra'}</span>
                    <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {workoutDetails.sessao.duracao_real_minutos} min</span>
                  </div>
                )}
              </div>
              <div data-html2canvas-ignore="true" className="flex items-center gap-2 flex-wrap justify-end">
                <button onClick={handleCopyToWhatsApp} className="p-2 bg-gray-800 hover:bg-gray-700 text-emerald-500 rounded-md transition-colors border border-gray-700" title="Copiar Texto"><Copy className="w-4 h-4" /></button>
                <button onClick={handleCopyMarkdown} className="p-2 bg-gray-800 hover:bg-gray-700 text-purple-400 rounded-md transition-colors border border-gray-700" title="Copiar Markdown"><FileCode2 className="w-4 h-4" /></button>
                <button onClick={handleDownloadJSON} className="p-2 bg-gray-800 hover:bg-gray-700 text-yellow-400 rounded-md transition-colors border border-gray-700" title="Baixar JSON"><FileJson className="w-4 h-4" /></button>
                <button onClick={handleDownloadImage} className="p-2 bg-gray-800 hover:bg-gray-700 text-blue-400 rounded-md transition-colors border border-gray-700" title="Baixar Imagem"><ImageIcon className="w-4 h-4" /></button>
                <button onClick={handleDownloadPDF} className="p-2 bg-gray-800 hover:bg-gray-700 text-red-400 rounded-md transition-colors border border-gray-700" title="Baixar PDF"><FileText className="w-4 h-4" /></button>
                <div className="hidden sm:block w-px h-6 bg-gray-700 mx-1"></div>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white transition-colors p-2 rounded-md hover:bg-gray-800" title="Fechar"><X className="w-6 h-6" /></button>
              </div>
            </div>

            <div className="p-4 md:p-6 overflow-y-auto space-y-6">
              {isLoadingDetails ? (
                <div className="text-center py-10 text-emerald-500 animate-pulse font-medium">Buscando dados do treino...</div>
              ) : workoutDetails?.exercicios ? (
                workoutDetails.exercicios.map((item: any, exIndex: number) => {
                  
                  const nomeExercicio = item.nome || item.exercicios?.nome || 'Exercício Desconhecido';
                  const grupoPai = item.grupo_pai || item.exercicios?.grupo_pai || '';
                  const musculoPrimario = item.musculo_primario || item.exercicios?.musculo_primario || '';
                  
                  const categoria = item.categoria || item.tipo;
                  // Correção crucial: Cardio legado NÃO entra se for hiit
                  const isCardioLegacy = grupoPai.trim().toLowerCase() === 'cardio' && categoria !== 'hiit';

                  // 1. CÁLCULO DINÂMICO PARA HIIT
                  let hiitTotalMinutos = 0;
                  let hiitTotalKm = 0;

                  if (categoria === 'hiit' && item.tempos_estimulo_real) {
                    let totalSegundos = 0;
                    let totalDistancia = 0;

                    for (let i = 0; i < item.tempos_estimulo_real.length; i++) {
                      const tOn = item.tempos_estimulo_real[i] || 0;
                      const tOff = item.tempos_descanso_real?.[i] || 0;
                      const vOn = item.velocidades_estimulo_real?.[i] || 0;
                      const vOff = item.velocidades_descanso_real?.[i] || 0;

                      totalSegundos += (tOn + tOff);
                      totalDistancia += (tOn / 3600) * vOn;
                      totalDistancia += (tOff / 3600) * vOff;
                    }

                    hiitTotalMinutos = Math.round(totalSegundos / 60);
                    hiitTotalKm = Number(totalDistancia.toFixed(2));
                  }

                  return (
                    <div key={exIndex} className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
                      
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="text-base md:text-lg font-semibold text-white">
                          {nomeExercicio}
                        </h3>
                        
                        {/* Selos Visuais */}
                        <div className="flex gap-2">
                           {categoria === 'forca' && <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded font-bold uppercase tracking-wider flex items-center gap-1"><Dumbbell size={12}/> Força</span>}
                           {categoria === 'hiit' && <span className="text-[10px] bg-yellow-500/10 text-yellow-500 px-2 py-1 rounded font-bold uppercase tracking-wider flex items-center gap-1"><Zap size={12}/> HIIT</span>}
                           {categoria === 'isometrico' && <span className="text-[10px] bg-blue-500/10 text-blue-500 px-2 py-1 rounded font-bold uppercase tracking-wider flex items-center gap-1"><Timer size={12}/> Iso</span>}
                           {(categoria === 'cardio' || isCardioLegacy) && <span className="text-[10px] bg-purple-500/10 text-purple-400 px-2 py-1 rounded font-bold uppercase tracking-wider flex items-center gap-1"><Activity size={12}/> Cardio</span>}
                        </div>
                      </div>

                      {(grupoPai || musculoPrimario) && (
                        <span className="text-xs px-2 py-1 bg-gray-800 text-gray-400 rounded-md mb-4 inline-block">
                          {grupoPai} {grupoPai && musculoPrimario ? '|' : ''} {musculoPrimario ? `Foco: ${musculoPrimario}` : ''}
                        </span>
                      )}

                      {/* --- TELA DE CARDIO --- */}
                      {(categoria === 'cardio' || isCardioLegacy) && (
                        <div className="grid grid-cols-2 gap-4 mt-2 mb-4">
                          <div className="bg-gray-900/80 p-4 rounded-lg border border-gray-700/50 flex flex-col items-center justify-center">
                            <span className="text-gray-400 text-[10px] uppercase tracking-widest font-bold mb-1 flex items-center gap-1"><Clock size={12}/> Tempo</span>
                            <span className="text-xl font-bold text-emerald-500">
                              {(item.tempo_real_minutos || item.tempoRealMinutos) ? `${item.tempo_real_minutos || item.tempoRealMinutos} min` : '-'}
                            </span>
                          </div>
                          <div className="bg-gray-900/80 p-4 rounded-lg border border-gray-700/50 flex flex-col items-center justify-center">
                            <span className="text-gray-400 text-[10px] uppercase tracking-widest font-bold mb-1 flex items-center gap-1"><Activity size={12}/> Distância</span>
                            <span className="text-xl font-bold text-emerald-500">
                              {(item.distancia_real_km || item.distanciaRealKm) ? `${item.distancia_real_km || item.distanciaRealKm} km` : '-'}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* --- TELA DE HIIT --- */}
                      {categoria === 'hiit' && (
                        <>
                          <div className="grid grid-cols-2 gap-4 mt-2 mb-4">
                            <div className="bg-gray-900/80 p-4 rounded-lg border border-gray-700/50 flex flex-col items-center justify-center">
                              <span className="text-gray-400 text-[10px] uppercase tracking-widest font-bold mb-1 flex items-center gap-1"><Clock size={12}/> Tempo Total</span>
                              <span className="text-xl font-bold text-emerald-500">
                                {hiitTotalMinutos} min
                              </span>
                            </div>
                            <div className="bg-gray-900/80 p-4 rounded-lg border border-gray-700/50 flex flex-col items-center justify-center">
                              <span className="text-gray-400 text-[10px] uppercase tracking-widest font-bold mb-1 flex items-center gap-1"><Activity size={12}/> Distância Total</span>
                              <span className="text-xl font-bold text-emerald-500">
                                {hiitTotalKm} km
                              </span>
                            </div>
                          </div>

                          <div className="overflow-x-auto mt-2">
                            <table className="w-full text-sm text-left whitespace-nowrap">
                              <thead className="text-xs text-gray-400 border-b border-gray-700">
                                <tr>
                                  <th className="pb-2 font-medium">Round</th>
                                  <th className="pb-2 font-medium text-emerald-500">Vel Alta (ON)</th>
                                  <th className="pb-2 font-medium text-gray-400">Vel Baixa (OFF)</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-700/50">
                                {item.velocidades_estimulo_real?.map((velOn: number, i: number) => (
                                  <tr key={i} className="text-gray-300 hover:bg-gray-800/30 transition-colors">
                                    <td className="py-2 text-white font-medium pl-2">{i + 1}</td>
                                    <td className="py-2">
                                       <div className="flex flex-col">
                                          <span className="text-emerald-500 font-bold">{velOn} km/h</span>
                                          <span className="text-xs text-gray-500">{item.tempos_estimulo_real?.[i]}s</span>
                                       </div>
                                    </td>
                                    <td className="py-2">
                                       <div className="flex flex-col">
                                          <span className="text-gray-300 font-bold">{item.velocidades_descanso_real?.[i]} km/h</span>
                                          <span className="text-xs text-gray-500">{item.tempos_descanso_real?.[i]}s</span>
                                       </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </>
                      )}

                      {/* --- TELA DE ISOMETRIA --- */}
                      {categoria === 'isometrico' && (
                        <div className="overflow-x-auto mt-2">
                          <table className="w-full text-sm text-left whitespace-nowrap">
                            <thead className="text-xs text-gray-400 border-b border-gray-700">
                              <tr>
                                <th className="pb-2 font-medium">Série</th>
                                <th className="pb-2 font-medium">Tempo Mantido</th>
                                <th className="pb-2 font-medium">Descanso</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700/50">
                              {item.tempos_reais_segundos?.map((tempo: number, serieIndex: number) => (
                                <tr key={serieIndex} className="text-gray-300 hover:bg-gray-800/30 transition-colors">
                                  <td className="py-2 text-emerald-500 font-medium pl-2">{serieIndex + 1}</td>
                                  <td className="py-2">{tempo}s</td>
                                  <td className="py-2">{formatTime(item.descansos_segundos?.[serieIndex] || 0)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* --- TELA DE FORÇA --- */}
                      {categoria === 'forca' && (
                        <div className="overflow-x-auto mt-2">
                          <table className="w-full text-sm text-left whitespace-nowrap">
                            <thead className="text-xs text-gray-400 border-b border-gray-700">
                              <tr>
                                <th className="pb-2 font-medium">Série</th>
                                <th className="pb-2 font-medium">Carga</th>
                                <th className="pb-2 font-medium">Repetições</th>
                                <th className="pb-2 font-medium">Descanso</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700/50">
                              {item.cargas_kg?.map((carga: number, serieIndex: number) => (
                                <tr key={serieIndex} className="text-gray-300 hover:bg-gray-800/30 transition-colors">
                                  <td className="py-2 text-emerald-500 font-medium pl-2">{serieIndex + 1}</td>
                                  <td className="py-2 font-bold">{carga} kg</td>
                                  <td className="py-2">{item.repeticoes?.[serieIndex]}</td>
                                  <td className="py-2">{formatTime(item.descansos_segundos?.[serieIndex] || 0)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* OBSERVAÇÕES */}
                      {item.observacoes && (
                        <div className="mt-4 p-3 bg-gray-900/50 rounded text-sm text-gray-400 flex items-start gap-2 border border-gray-800">
                          <MessageSquare className="w-4 h-4 mt-0.5 shrink-0 text-emerald-500" />
                          <p className="italic whitespace-pre-wrap">"{item.observacoes}"</p>
                        </div>
                      )}

                    </div>
                  );
                })
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
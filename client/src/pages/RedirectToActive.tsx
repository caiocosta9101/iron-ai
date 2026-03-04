import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '../services/api';

export default function RedirectToActive() {
  const navigate = useNavigate();

  useEffect(() => {
    const discoverAndRedirect = async () => {
      try {
        // 1. Procurar no localStorage se já existe um treino em andamento
        let workoutInProgressId = null;
        
        // Varre o localStorage procurando a chave que o ActiveWorkout salvou
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('iron_ai_workout_progress_')) {
            // Extrai apenas o ID do final da string
            workoutInProgressId = key.replace('iron_ai_workout_progress_', '');
            break;
          }
        }

        // Se achou um treino rolando localmente, resgata ele imediatamente
        if (workoutInProgressId) {
          navigate(`/workout/active/${workoutInProgressId}`, { replace: true });
          return; // Para a execução aqui para não bater no backend à toa
        }

        // 2. Se não tem treino em andamento, consulta o backend inteligente
        const response = await api.get('/dashboard');
        
        // Agora usamos a nova variável que o backend envia
        const suggestedId = response.data?.suggestedSessionId;

        if (suggestedId) {
            // Se achou o sugerido, navega para a tela de execução
            navigate(`/workout/active/${suggestedId}`, { replace: true });
        } else {
            // Se não tem treino nenhum no banco de dados, manda criar
            toast.info("Nenhum treino programado. Que tal criar um?");
            navigate('/new-workout', { replace: true });
        }
      } catch (error) {
        console.error("Erro ao buscar treino ativo:", error);
        toast.error("Erro ao localizar seu treino.");
        navigate('/dashboard', { replace: true });
      }
    };

    discoverAndRedirect();
  }, [navigate]);

  // Tela de carregamento enquanto calculamos a rota
  return (
    <div className="min-h-screen bg-[#112218] flex flex-col items-center justify-center text-[#13ec6a]">
       <Loader2 className="animate-spin mb-4" size={48} />
       <p className="font-bold tracking-widest uppercase text-xs mt-4">Localizando seu treino...</p>
    </div>
  );
}
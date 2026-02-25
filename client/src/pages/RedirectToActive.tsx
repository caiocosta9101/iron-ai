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
        // Usa a mesma lógica do Dashboard para descobrir o próximo treino
        const response = await api.get('/dashboard');
        const nextSession = response.data?.nextSession;

        if (nextSession && nextSession.id) {
            // Se achou, navega direto para a tela de execução
            navigate(`/workout/active/${nextSession.id}`, { replace: true });
        } else {
            // Se não tem treino configurado, manda criar
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
       <p className="font-bold tracking-widest uppercase text-xs">Localizando seu treino...</p>
    </div>
  );
}
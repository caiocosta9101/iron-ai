import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, Check, ArrowRight, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import api from '../services/api';
import { loginSchema, LoginForm } from '../utils/schemas';

export default function Login() {
  const navigate = useNavigate();
  
  const { 
    register, 
    handleSubmit, 
    formState: { errors, isSubmitting } 
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema)
  });

  const handleLogin = async (data: LoginForm) => {
    try {
      const response = await api.post('/auth/login', data);
      
    
      localStorage.setItem('token', response.data.token);

      
      if (response.data.user && response.data.user.name) {
        localStorage.setItem('userName', response.data.user.name);
      }
      
      // Sucesso
      toast.success(`Bem-vindo, ${response.data.user?.name || 'Atleta'}!`);
      
      // Redireciona
      navigate('/dashboard'); 

    } catch (error: any) {
      console.error(error);
      
      if (error.response) {
        toast.error(error.response.data.message || "Credenciais inválidas.");
      } else if (error.request) {
        toast.error("Sem conexão com o servidor. Tente novamente mais tarde.");
      } else {
        toast.error("Erro inesperado. Contate o suporte.");
      }
    }
  };

  return (
    <div className="bg-background-dark min-h-screen flex flex-col overflow-x-hidden font-display">
      
      {/* Header */}
      <header className="flex items-center justify-between border-b border-[#234832] px-6 md:px-20 py-4 w-full z-10 bg-background-dark/90 backdrop-blur-sm">
        <div className="flex items-center gap-3 text-primary">
          <div className="size-8">
            <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path clipRule="evenodd" d="M12.0799 24L4 19.2479L9.95537 8.75216L18.04 13.4961L18.0446 4H29.9554L29.96 13.4961L38.0446 8.75216L44 19.2479L35.92 24L44 28.7521L38.0446 39.2479L29.96 34.5039L29.9554 44H18.0446L18.04 34.5039L9.95537 39.2479L4 28.7521L12.0799 24Z" fill="currentColor" fillRule="evenodd"></path>
            </svg>
          </div>
          <h2 className="text-white text-xl font-bold tracking-tight">Iron AI</h2>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center bg-fitness bg-cover bg-center bg-no-repeat p-4">
        <div className="w-full max-w-[480px] rounded-2xl p-8 md:p-12 shadow-2xl flex flex-col gap-6 glass-panel" 
             style={{ background: 'rgba(25, 51, 36, 0.85)', backdropFilter: 'blur(12px)', border: '1px solid rgba(50, 103, 71, 0.5)' }}>
          
          <div className="text-center flex flex-col gap-2">
            <h1 className="text-white text-3xl font-bold leading-tight">Acesse sua conta</h1>
            <p className="text-zinc-400 text-base">Evolua seu treino com inteligência.</p>
          </div>

          <form onSubmit={handleSubmit(handleLogin)} className="flex flex-col gap-5">
            
            {/* Email */}
            <div className="flex flex-col gap-2">
              <label className="text-zinc-200 text-sm font-medium px-1">E-mail</label>
              <input 
                {...register('email')}
                className={`w-full rounded-full text-white border bg-input-bg h-14 px-5 transition-all outline-none placeholder:text-zinc-500 
                  ${errors.email ? 'border-red-500 focus:ring-red-500' : 'border-input-border focus:border-primary focus:ring-1 focus:ring-primary'}`}
                placeholder="seu@email.com" 
                type="email"
                disabled={isSubmitting}
              />
              {errors.email && <span className="text-red-400 text-xs px-2">{errors.email.message}</span>}
            </div>

            {/* Senha */}
            <div className="flex flex-col gap-2">
              <label className="text-zinc-200 text-sm font-medium px-1">Senha</label>
              <div className="relative">
                <input 
                  {...register('password')}
                  className={`w-full rounded-full text-white border bg-input-bg h-14 pl-5 pr-14 transition-all outline-none placeholder:text-zinc-500
                    ${errors.password ? 'border-red-500 focus:ring-red-500' : 'border-input-border focus:border-primary focus:ring-1 focus:ring-primary'}`}
                  placeholder="Sua senha" 
                  type="password"
                  disabled={isSubmitting}
                />
                <button type="button" className="absolute right-5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-primary">
                  <Eye size={20} />
                </button>
              </div>
              {errors.password && <span className="text-red-400 text-xs px-2">{errors.password.message}</span>}
            </div>

            <div className="flex items-center justify-between px-1">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className="relative flex items-center">
                  <input type="checkbox" className="peer appearance-none size-5 border border-input-border bg-input-bg rounded-md checked:bg-primary checked:border-primary transition-all" />
                  <Check className="absolute text-background-dark w-3.5 h-3.5 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 peer-checked:opacity-100 pointer-events-none" />
                </div>
                <span className="text-zinc-300 text-sm font-medium group-hover:text-white transition-colors">Lembrar de mim</span>
              </label>
              <a href="#" className="text-primary text-sm font-medium hover:underline">Esqueci senha</a>
            </div>

            {/* Botão com Estado de Loading */}
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full h-14 bg-primary text-background-dark rounded-full font-bold text-lg shadow-[0_0_20px_rgba(19,236,106,0.3)] hover:shadow-[0_0_30px_rgba(19,236,106,0.5)] active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" /> Processando...
                </>
              ) : (
                <>
                  <span>Entrar</span>
                  <ArrowRight size={24} />
                </>
              )}
            </button>
          </form>

          {/* Rodapé do Form */}
          <div className="text-center border-t border-input-border pt-4 mt-2">
            <p className="text-zinc-400 text-sm">
              Novo por aqui?{' '}
              <Link to="/register" className="text-primary font-bold hover:underline">
                Criar conta gratuita
              </Link>
            </p>
          </div>

        </div>
      </main>
      
      <footer className="py-6 px-20 border-t border-[#234832] text-center bg-background-dark">
        <p className="text-zinc-500 text-xs font-medium">© 2026 Iron AI. High Performance Code. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
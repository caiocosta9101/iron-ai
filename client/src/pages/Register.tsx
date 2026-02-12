import { useForm } from 'react-hook-form';
import { User, Mail, Lock, ArrowRight, Dumbbell } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function Register() {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const navigate = useNavigate();

  const handleRegister = async (data: any) => {
    try {
      await api.post('/auth/register', data);
      alert("Conta criada com sucesso! Faça login.");
      navigate('/'); // Manda o usuário de volta para o Login
    } catch (error) {
      console.error("Erro ao cadastrar:", error);
      alert("Erro ao criar conta. Tente outro email.");
    }
  };

  return (
    <div className="bg-background-dark min-h-screen flex flex-col overflow-x-hidden font-display">
      <header className="flex items-center justify-between border-b border-[#234832] px-6 md:px-20 py-4 w-full z-10 bg-background-dark/90 backdrop-blur-sm">
        <div className="flex items-center gap-3 text-primary">
          <Dumbbell className="size-8" />
          <h2 className="text-white text-xl font-bold tracking-tight">Treino IA</h2>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center bg-fitness bg-cover bg-center bg-no-repeat p-4">
        <div className="w-full max-w-[480px] rounded-2xl p-8 md:p-12 shadow-2xl flex flex-col gap-6" 
             style={{ background: 'rgba(25, 51, 36, 0.95)', backdropFilter: 'blur(12px)', border: '1px solid rgba(50, 103, 71, 0.5)' }}>
          
          <div className="text-center">
            <h1 className="text-white text-3xl font-bold">Crie sua conta</h1>
            <p className="text-zinc-400">Comece sua jornada hoje.</p>
          </div>

          <form onSubmit={handleSubmit(handleRegister)} className="flex flex-col gap-4">
            {/* Nome */}
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
              <input {...register('name', { required: true })} 
                className="w-full rounded-full bg-input-bg border border-input-border text-white pl-12 pr-4 h-14 focus:border-primary focus:ring-1 focus:ring-primary outline-none" placeholder="Seu Nome" />
            </div>

            {/* Email */}
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
              <input {...register('email', { required: true })} type="email"
                className="w-full rounded-full bg-input-bg border border-input-border text-white pl-12 pr-4 h-14 focus:border-primary focus:ring-1 focus:ring-primary outline-none" placeholder="seu@email.com" />
            </div>

            {/* Senha */}
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
              <input {...register('password', { required: true })} type="password"
                className="w-full rounded-full bg-input-bg border border-input-border text-white pl-12 pr-4 h-14 focus:border-primary focus:ring-1 focus:ring-primary outline-none" placeholder="Sua senha secreta" />
            </div>

            <button type="submit" className="w-full h-14 bg-primary text-background-dark rounded-full font-bold text-lg mt-2 hover:opacity-90 transition-all flex items-center justify-center gap-2">
              <span>Cadastrar</span>
              <ArrowRight size={20} />
            </button>
          </form>

          <div className="text-center border-t border-input-border pt-4">
            <p className="text-zinc-400 text-sm">
              Já tem conta? <Link to="/" className="text-primary font-bold hover:underline">Faça Login</Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
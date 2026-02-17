import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    ChevronLeft, ChevronRight, Check, BrainCircuit, 
    Clock, Calendar, Activity, User, Ruler, Weight, 
    AlertTriangle, HeartPulse 
} from 'lucide-react';

export default function AiSetup() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Estado completo com Bio + Saúde
  const [answers, setAnswers] = useState({
    objetivo: '', 
    idade: '',    
    peso: '',     
    altura: '',
    limitacoes: '', // Novo: Lesões, dores, comorbidades
    dias: 4,      
    tempo: 60,    
    nivel: ''     
  });

  const handleNext = () => setStep(step + 1);
  const handleBack = () => setStep(step - 1);

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
        setIsGenerating(false);
        // O Payload agora vai completinho para a IA considerar a segurança
        console.log("Enviando Payload Seguro:", answers); 
        navigate('/dashboard'); 
    }, 2000);
  };

  return (
    <div className="max-w-3xl mx-auto py-6 lg:py-10 animate-in fade-in duration-500">
      
      {/* Cabeçalho */}
      <div className="mb-8 text-center space-y-2">
        <div className="inline-flex items-center gap-2 bg-purple-500/10 text-purple-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest border border-purple-500/20">
            <BrainCircuit size={14} />
            Setup Iron AI
        </div>
        <h1 className="text-3xl font-black text-white">Vamos montar seu plano</h1>
        <p className="text-[#92c9a8]">Passo {step} de 5</p>
      </div>

      {/* Barra de Progresso (Divisão por 5) */}
      <div className="h-1 bg-[#193324] rounded-full overflow-hidden mb-8 max-w-md mx-auto">
        <div 
            className="h-full bg-purple-600 transition-all duration-500 ease-out shadow-[0_0_10px_#9333ea]" 
            style={{ width: `${(step / 5) * 100}%` }}
        />
      </div>

      <div className="bg-[#193324] border border-[#326747] rounded-3xl p-6 lg:p-10 shadow-2xl relative overflow-hidden">
        
        {/* --- PASSO 1: OBJETIVO --- */}
        {step === 1 && (
            <div className="space-y-6 animate-in slide-in-from-right duration-300">
                <h2 className="text-2xl font-bold text-white text-center">Qual seu objetivo principal?</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                        { label: 'Hipertrofia', desc: 'Ganhar massa muscular e volume', icon: '💪' },
                        { label: 'Emagrecimento', desc: 'Queimar gordura e definir', icon: '🔥' },
                        { label: 'Força Pura', desc: 'Aumentar cargas (Powerlifting)', icon: '🏋️' },
                        { label: 'Resistência', desc: 'Condicionamento físico geral', icon: '🏃' }
                    ].map((item) => (
                        <button
                            key={item.label}
                            onClick={() => setAnswers({...answers, objetivo: item.label})}
                            className={`p-6 text-left rounded-2xl border transition-all hover:scale-[1.02] ${
                                answers.objetivo === item.label 
                                ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-900/50' 
                                : 'bg-[#112218] border-[#326747] text-zinc-400 hover:border-purple-500/50 hover:bg-[#152b1f]'
                            }`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-2xl">{item.icon}</span>
                                {answers.objetivo === item.label && <Check size={20} className="text-white" />}
                            </div>
                            <span className={`block font-bold text-lg ${answers.objetivo === item.label ? 'text-white' : 'text-white'}`}>{item.label}</span>
                            <span className={`text-sm ${answers.objetivo === item.label ? 'text-purple-200' : 'text-[#92c9a8]'}`}>{item.desc}</span>
                        </button>
                    ))}
                </div>
            </div>
        )}

        {/* --- PASSO 2: BIO (Idade, Peso, Altura) --- */}
        {step === 2 && (
            <div className="space-y-8 animate-in slide-in-from-right duration-300">
                <h2 className="text-2xl font-bold text-white text-center">Sobre Você</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-bold text-[#92c9a8] uppercase tracking-wider">
                            <User size={16} className="text-purple-400"/> Idade
                        </label>
                        <input 
                            type="number" placeholder="Anos" value={answers.idade}
                            onChange={(e) => setAnswers({...answers, idade: e.target.value})}
                            className="w-full bg-[#112218] border border-[#326747] text-white p-4 rounded-xl focus:border-purple-500 focus:outline-none text-lg font-bold"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-bold text-[#92c9a8] uppercase tracking-wider">
                            <Weight size={16} className="text-purple-400"/> Peso (kg)
                        </label>
                        <input 
                            type="number" placeholder="kg" value={answers.peso}
                            onChange={(e) => setAnswers({...answers, peso: e.target.value})}
                            className="w-full bg-[#112218] border border-[#326747] text-white p-4 rounded-xl focus:border-purple-500 focus:outline-none text-lg font-bold"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-bold text-[#92c9a8] uppercase tracking-wider">
                            <Ruler size={16} className="text-purple-400"/> Altura (cm)
                        </label>
                        <input 
                            type="number" placeholder="cm" value={answers.altura}
                            onChange={(e) => setAnswers({...answers, altura: e.target.value})}
                            className="w-full bg-[#112218] border border-[#326747] text-white p-4 rounded-xl focus:border-purple-500 focus:outline-none text-lg font-bold"
                        />
                    </div>
                </div>
            </div>
        )}

        {/* --- PASSO 3: SAÚDE (NOVO) --- */}
        {step === 3 && (
            <div className="space-y-6 animate-in slide-in-from-right duration-300">
                <div className="text-center space-y-2">
                    <div className="mx-auto w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center text-red-400 mb-4">
                        <HeartPulse size={24} />
                    </div>
                    <h2 className="text-2xl font-bold text-white">Histórico de Saúde</h2>
                    <p className="text-[#92c9a8]">Você possui alguma lesão, dor crônica ou condição médica?</p>
                </div>

                <div className="space-y-4">
                    <textarea 
                        value={answers.limitacoes}
                        onChange={(e) => setAnswers({...answers, limitacoes: e.target.value})}
                        placeholder="Ex: Tenho condromalácia no joelho direito, hérnia de disco L4-L5, hipertensão controlada..."
                        className="w-full h-40 bg-[#112218] border border-[#326747] text-white p-4 rounded-xl focus:border-purple-500 focus:outline-none resize-none text-lg placeholder:text-zinc-600"
                    />
                    
                    <div className="flex items-start gap-3 bg-yellow-500/10 p-4 rounded-xl border border-yellow-500/20">
                        <AlertTriangle className="text-yellow-500 shrink-0 mt-1" size={20} />
                        <p className="text-sm text-yellow-200/80">
                            <strong>Importante:</strong> A IA usará essas informações para evitar exercícios perigosos para sua condição. Se não tiver nada, deixe em branco.
                        </p>
                    </div>
                </div>
            </div>
        )}

        {/* --- PASSO 4: DISPONIBILIDADE (Antigo Passo 3) --- */}
        {step === 4 && (
            <div className="space-y-8 animate-in slide-in-from-right duration-300">
                <h2 className="text-2xl font-bold text-white text-center">Sua Disponibilidade</h2>
                
                {/* Dias por Semana */}
                <div className="space-y-4">
                    <div className="flex items-center gap-3 text-[#92c9a8] mb-2">
                        <Calendar size={20} className="text-purple-400" />
                        <span className="font-bold uppercase text-xs tracking-widest">Dias por Semana</span>
                    </div>
                    <div className="bg-[#112218] p-6 rounded-2xl border border-[#326747]">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-zinc-400">Eu posso treinar:</span>
                            <span className="text-3xl font-black text-white">{answers.dias}x <span className="text-sm font-normal text-[#92c9a8]">/semana</span></span>
                        </div>
                        <input 
                            type="range" min="2" max="7" 
                            value={answers.dias} 
                            onChange={(e) => setAnswers({...answers, dias: Number(e.target.value)})}
                            className="w-full h-2 bg-[#193324] rounded-lg appearance-none cursor-pointer accent-purple-500"
                        />
                        <div className="flex justify-between text-xs text-[#92c9a8] mt-2 font-mono">
                            <span>2 dias</span>
                            <span>7 dias</span>
                        </div>
                    </div>
                </div>

                {/* Tempo */}
                <div className="space-y-4">
                    <div className="flex items-center gap-3 text-[#92c9a8] mb-2">
                        <Clock size={20} className="text-purple-400" />
                        <span className="font-bold uppercase text-xs tracking-widest">Duração do Treino</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        {[30, 45, 60, 90, 120].map((min) => (
                            <button
                                key={min}
                                onClick={() => setAnswers({...answers, tempo: min})}
                                className={`py-3 rounded-xl border font-bold transition-all ${
                                    answers.tempo === min
                                    ? 'bg-purple-600 border-purple-500 text-white'
                                    : 'bg-[#112218] border-[#326747] text-zinc-400 hover:border-purple-500/50'
                                }`}
                            >
                                {min === 120 ? '120+' : min} min
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {/* --- PASSO 5: NÍVEL (Antigo Passo 4) --- */}
        {step === 5 && (
            <div className="space-y-6 animate-in slide-in-from-right duration-300">
                <h2 className="text-2xl font-bold text-white text-center">Seu Nível de Experiência</h2>
                <div className="space-y-3">
                    {[
                        { val: 'Iniciante', desc: 'Nunca treinei ou parei há muito tempo (< 6 meses)' },
                        { val: 'Intermediário', desc: 'Treino regularmente há pelo menos 1 ano' },
                        { val: 'Avançado', desc: 'Treino pesado há anos com técnica sólida' }
                    ].map((nivel) => (
                        <button
                            key={nivel.val}
                            onClick={() => setAnswers({...answers, nivel: nivel.val})}
                            className={`w-full p-4 flex items-center gap-4 rounded-xl border transition-all text-left ${
                                answers.nivel === nivel.val
                                ? 'bg-purple-600 border-purple-500 text-white'
                                : 'bg-[#112218] border-[#326747] text-zinc-400 hover:border-purple-500/50'
                            }`}
                        >
                            <div className={`p-2 rounded-full ${answers.nivel === nivel.val ? 'bg-white/20' : 'bg-[#193324]'}`}>
                                <Activity size={20} />
                            </div>
                            <div>
                                <span className="block font-bold">{nivel.val}</span>
                                <span className={`text-sm ${answers.nivel === nivel.val ? 'text-purple-200' : 'text-[#92c9a8]'}`}>{nivel.desc}</span>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        )}

        {/* --- FOOTER: BOTÕES --- */}
        <div className="flex justify-between items-center mt-8 pt-8 border-t border-white/5">
            {step > 1 ? (
                <button onClick={handleBack} className="flex items-center gap-2 text-[#92c9a8] hover:text-white px-4 py-2 font-medium transition-colors">
                    <ChevronLeft size={20} /> Voltar
                </button>
            ) : (
                <div />
            )}

            <button 
                onClick={step === 5 ? handleGenerate : handleNext}
                // Validação
                disabled={
                    (step === 1 && !answers.objetivo) || 
                    (step === 2 && (!answers.idade || !answers.peso || !answers.altura)) || 
                    // Passo 3 é opcional, não precisa validar
                    (step === 5 && !answers.nivel) || 
                    isGenerating
                }
                className={`flex items-center gap-2 px-8 py-4 rounded-full font-bold shadow-lg transition-all ${
                    isGenerating 
                    ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
                    : 'bg-purple-600 hover:bg-purple-500 text-white hover:scale-105 shadow-purple-900/20'
                }`}
            >
                {isGenerating ? (
                    'Criando Inteligência...'
                ) : (
                    <>
                        {step === 5 ? 'Gerar Treino com IA' : 'Próximo'} 
                        {step !== 5 && <ChevronRight size={20} />}
                    </>
                )}
            </button>
        </div>

      </div>
    </div>
  );
}
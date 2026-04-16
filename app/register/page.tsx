'use client';

import { useState, useEffect } from 'react';
import { registerUser, getSession } from '@/lib/actions';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User, Mail, Phone, Lock, ArrowLeft, Briefcase, Brain, Sparkles, ShieldCheck, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function RegisterClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [tipoUtilizador, setTipoUtilizador] = useState<'Cliente' | 'Prestador'>('Cliente');

  useEffect(() => {
    const checkSession = async () => {
      const session = await getSession();
      if (session) {
        let target = '/client';
        if (session.userType === 'Admin') target = '/admin';
        else if (session.userType === 'Prestador') target = '/provider';
        
        router.push(target);
      }
    };
    checkSession();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');

    const formData = new FormData(e.currentTarget);
    const data = {
      nomeCompleto: formData.get('nomeCompleto') as string,
      email: formData.get('email') as string,
      nTelefone: formData.get('nTelefone') as string,
      senhaHash: formData.get('senha') as string,
      tipoUtilizador
    };

    try {
      const res = await registerUser(data);
      if (!res.success) {
        setError(res.error || 'Erro ao criar conta');
        setLoading(false);
        return;
      }
      
      setSuccessMsg('Conta criada com sucesso! A redirecionar...');
      localStorage.setItem('rememberedEmail', data.email);
      
      setTimeout(() => {
        if (res.type === 'Cliente') {
          window.location.href = '/client';
        } else {
          window.location.href = '/provider';
        }
      }, 1500);
      
    } catch (err: any) {
      setError(err.message || 'Erro ao criar conta');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex font-sans overflow-hidden">
      {/* Left Side - Branding & Info */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 relative p-16 flex-col justify-between overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,#1e293b_0%,transparent_50%)] opacity-50" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-blue-600/20 rounded-full blur-[120px]" />
        
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10"
        >
          <Link href="/" className="flex items-center gap-3 group">
            <div className="bg-blue-600 p-2 rounded-xl group-hover:scale-110 transition-transform">
              <Brain className="w-8 h-8 text-white" />
            </div>
            <span className="text-2xl font-display font-black text-white tracking-tight">SAPS</span>
          </Link>
        </motion.div>

        <div className="relative z-10 max-w-lg">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h1 className="text-5xl font-display font-black text-white leading-[1.1] mb-8">
              Junte-se à maior rede de serviços de <span className="text-blue-500">Angola.</span>
            </h1>
            
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="mt-1 bg-blue-500/10 p-2 rounded-lg">
                  <ShieldCheck className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-white font-bold">Segurança Garantida</h3>
                  <p className="text-slate-400 text-sm">Processos de verificação rigorosos para todos os prestadores.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="mt-1 bg-blue-500/10 p-2 rounded-lg">
                  <Sparkles className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-white font-bold">Preços Dinâmicos</h3>
                  <p className="text-slate-400 text-sm">IA que ajusta os valores de acordo com a urgência e mercado.</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="relative z-10 flex items-center gap-4"
        >
          <div className="flex -space-x-3">
            {[1,2,3,4].map(i => (
              <div key={i} className="w-10 h-10 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center overflow-hidden">
                <img src={`https://picsum.photos/seed/user${i}/100/100`} alt="User" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Mais de 10,000 utilizadores ativos</p>
        </motion.div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex flex-col p-8 sm:p-12 lg:p-20 overflow-y-auto">
        <div className="max-w-md w-full mx-auto">
          <div className="mb-12">
            <Link href="/" className="inline-flex items-center text-slate-400 hover:text-slate-600 transition-colors mb-8 group">
              <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
              <span className="text-sm font-bold uppercase tracking-widest">Voltar</span>
            </Link>
            <h2 className="text-4xl font-display font-black text-slate-900 tracking-tight mb-2">Criar Conta</h2>
            <p className="text-slate-500 font-medium">Comece hoje mesmo a sua jornada no SAPS.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <AnimatePresence mode="wait">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl text-sm font-bold flex items-center gap-3"
                >
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  {error}
                </motion.div>
              )}
              
              {successMsg && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-green-50 border border-green-100 text-green-700 p-4 rounded-2xl text-sm font-bold flex items-center gap-3"
                >
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  {successMsg}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-3">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Tipo de Utilizador</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setTipoUtilizador('Cliente')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                    tipoUtilizador === 'Cliente'
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200'
                  }`}
                >
                  <User className="w-6 h-6" />
                  <span className="text-xs font-black uppercase tracking-widest">Cliente</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTipoUtilizador('Prestador')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                    tipoUtilizador === 'Prestador'
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200'
                  }`}
                >
                  <Briefcase className="w-6 h-6" />
                  <span className="text-xs font-black uppercase tracking-widest">Prestador</span>
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Nome Completo</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                  </div>
                  <input 
                    name="nomeCompleto" 
                    type="text" 
                    required 
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent rounded-2xl text-sm font-bold focus:bg-white focus:border-blue-500 outline-none transition-all placeholder:text-slate-300" 
                    placeholder="Ex: João Manuel Silva" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Email Profissional</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                  </div>
                  <input 
                    name="email" 
                    type="email" 
                    required 
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent rounded-2xl text-sm font-bold focus:bg-white focus:border-blue-500 outline-none transition-all placeholder:text-slate-300" 
                    placeholder="joao@exemplo.com" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Contacto Telefónico</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                  </div>
                  <input 
                    name="nTelefone" 
                    type="tel" 
                    required 
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent rounded-2xl text-sm font-bold focus:bg-white focus:border-blue-500 outline-none transition-all placeholder:text-slate-300" 
                    placeholder="9XXXXXXXX" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Senha de Acesso</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                  </div>
                  <input 
                    name="senha" 
                    type="password" 
                    required 
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent rounded-2xl text-sm font-bold focus:bg-white focus:border-blue-500 outline-none transition-all placeholder:text-slate-300" 
                    placeholder="••••••••" 
                  />
                </div>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading} 
              className="w-full flex items-center justify-center py-5 px-4 bg-blue-600 text-white rounded-[2rem] text-sm font-black uppercase tracking-widest shadow-2xl shadow-blue-200 hover:bg-blue-700 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                  A processar...
                </>
              ) : (
                'Criar Conta Agora'
              )}
            </button>
          </form>
          
          <div className="mt-12 text-center">
            <p className="text-sm font-bold text-slate-500">
              Já faz parte da rede?{' '}
              <Link href="/login" className="text-blue-600 hover:text-blue-700 hover:underline">
                Entrar na minha conta
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

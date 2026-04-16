'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Brain, ArrowRight, Loader2, Sparkles, ShieldCheck, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import { getSession } from '@/lib/actions';

export default function Home() {
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const session = await getSession();
      if (session) {
        setIsRedirecting(true);
        let target = '/client';
        if (session.userType === 'Admin') target = '/admin';
        else if (session.userType === 'Prestador') target = '/provider';
        
        router.push(target);
      }
    };
    checkSession();
  }, [router]);

  const handleSkip = () => {
    setIsRedirecting(true);
    router.push('/login');
  };

  const letters = ["S", "A", "P", "S"];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Hero Banner */}
      <div className="relative bg-white overflow-hidden flex-1 flex flex-col justify-center py-20">
        <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:20px_20px] opacity-30" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center">
          
          {/* 3D Brain Logo */}
          <div className="relative mb-12 group">
            <div className="absolute -inset-8 bg-blue-100 rounded-full blur-3xl opacity-40 group-hover:opacity-60 transition duration-1000"></div>
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.8, type: "spring" }}
              className="relative bg-white p-8 rounded-[2.5rem] shadow-2xl shadow-blue-100 transform transition-transform hover:scale-105 border border-slate-100"
            >
              <Brain className="w-24 h-24 text-blue-600" strokeWidth={1.5} />
            </motion.div>
          </div>

          {/* SAPS Animation */}
          <div className="flex gap-4 mb-8">
            {letters.map((letter, index) => (
              <motion.span
                key={index}
                initial={{ opacity: 0, scale: 0.5, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{
                  duration: 0.4,
                  delay: index * 0.1,
                  type: "spring",
                  stiffness: 200
                }}
                className="text-7xl sm:text-8xl font-display font-black text-slate-900 tracking-tighter"
              >
                {letter}
              </motion.span>
            ))}
          </div>
          
          <div className="flex flex-col items-center gap-10">
            <div className="space-y-4">
              <h2 className="text-2xl sm:text-4xl font-display font-black text-slate-900 tracking-tight max-w-2xl">
                {isRedirecting ? 'A preparar o seu espaço...' : 'A plataforma inteligente para serviços profissionais em Angola.'}
              </h2>
              <p className="text-slate-500 max-w-lg mx-auto leading-relaxed text-lg">
                Conectamos técnicos qualificados a clientes que precisam de soluções rápidas, seguras e com preços dinâmicos ajustados à realidade.
              </p>
            </div>

            <div className="flex flex-col items-center gap-6 w-full max-w-md">
              <button 
                onClick={handleSkip}
                disabled={isRedirecting}
                className="w-full group flex items-center justify-center gap-3 px-8 py-6 bg-blue-600 text-white rounded-[2rem] font-display font-black text-xl shadow-2xl shadow-blue-200 hover:bg-blue-700 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isRedirecting ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    A entrar...
                  </>
                ) : (
                  <>
                    Entrar no SAPS
                    <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>

              {!isRedirecting && (
                <Link 
                  href="/register"
                  className="w-full flex items-center justify-center gap-3 px-8 py-6 bg-white text-slate-900 border-2 border-slate-100 rounded-[2rem] font-display font-black text-xl hover:bg-slate-50 transition-all active:scale-[0.98]"
                >
                  Criar Nova Conta
                  <Sparkles className="w-6 h-6 text-blue-600" />
                </Link>
              )}
              
              {!isRedirecting && (
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2 text-slate-400">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">500+ Técnicos Ativos</span>
                  </div>
                  <div className="w-px h-4 bg-slate-200"></div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Sistema Seguro</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer info */}
      <div className="bg-white py-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">© 2024 SAPS - Sistema de Atendimento e Prestação de Serviços</p>
        </div>
      </div>
    </div>
  );
}

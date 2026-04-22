import Link from 'next/link';
import { getSession, setRoleOverride } from '@/lib/actions';
import { Shield, ArrowRight, CheckCircle, Smartphone, Clock, Award, Briefcase } from 'lucide-react';
import * as motion from 'motion/react-client';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const session = await getSession();

  // Se já houver uma sessão (role override), redirecionar automaticamente para a dashboard correta
  if (session && !session.isGuest) {
    if (session.userType === 'Prestador') redirect('/provider');
    if (session.userType === 'Admin') redirect('/admin');
    if (session.userType === 'Cliente') redirect('/client');
  }

  async function selectRole(formData: FormData) {
    'use server';
    const role = formData.get('role') as 'Admin' | 'Prestador' | 'Cliente';
    await setRoleOverride(role);
    
    if (role === 'Prestador') redirect('/provider');
    if (role === 'Admin') redirect('/admin');
    redirect('/client');
  }

  return (
    <div className="min-h-screen bg-slate-50 overflow-x-hidden font-sans">
      {/* Hero / Banner Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center pt-20 pb-20 px-4">
        {/* Background Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-[120px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-[0.03] bg-[radial-gradient(#0f172a_1px,transparent_1px)] [background-size:32px_32px]" />
        </div>

        <div className="max-w-6xl mx-auto text-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-100 rounded-full text-blue-600 text-sm font-black mb-8 uppercase tracking-widest"
          >
            <Shield className="w-4 h-4" />
            SAPS - Sistema de Agendamento Profissional
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-6xl md:text-8xl font-display font-black text-slate-900 leading-[0.95] tracking-tighter mb-8"
          >
            Serviços de Qualidade <br />
            <span className="text-blue-600">À Distância de um Clique.</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-xl md:text-2xl text-slate-500 max-w-3xl mx-auto mb-12 font-medium leading-relaxed"
          >
            Conectamos os melhores profissionais a quem precisa de soluções rápidas, seguras e eficientes. 
            Tudo num único lugar, com transparência total.
          </motion.p>

          <div className="flex flex-col lg:flex-row items-center justify-center gap-4">
            <form action={selectRole}>
              <input type="hidden" name="role" value="Cliente" />
              <button 
                type="submit"
                className="group flex items-center justify-center gap-3 px-8 py-5 bg-slate-900 text-white rounded-[2rem] text-lg font-black hover:bg-black transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-slate-900/20 w-64"
              >
                Pedir um Serviço
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </form>
            
            <form action={selectRole}>
              <input type="hidden" name="role" value="Prestador" />
              <button 
                type="submit"
                className="group flex items-center justify-center gap-3 px-8 py-5 bg-blue-600 text-white rounded-[2rem] text-lg font-black hover:bg-blue-700 transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-blue-600/20 w-64"
              >
                Área do Técnico
                <Briefcase className="w-5 h-5" />
              </button>
            </form>

            <form action={selectRole}>
              <input type="hidden" name="role" value="Admin" />
              <button 
                type="submit"
                className="flex items-center justify-center gap-3 px-8 py-5 bg-white text-slate-900 border-2 border-slate-200 rounded-[2rem] text-lg font-black hover:bg-slate-50 transition-all hover:scale-105 active:scale-95 w-64"
              >
                Área Admin
                <Shield className="w-5 h-5 text-blue-600" />
              </button>
            </form>
          </div>

          {/* User Session Badge */}
          {session && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="mt-12 flex items-center justify-center gap-2 text-sm text-slate-400 font-bold"
            >
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Sessão Ativa: {session.userName} ({session.userType})
            </motion.div>
          )}
        </div>
      </section>

      {/* Quick Stats / Info */}
      <section className="pb-32 px-4">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureItem 
            icon={<Clock className="w-8 h-8 text-blue-600" />}
            title="Rapidez Total"
            desc="Agendamentos feitos em menos de 2 minutos com confirmação imediata."
          />
          <FeatureItem 
            icon={<Award className="w-8 h-8 text-purple-600" />}
            title="Técnicos Certificados"
            desc="Todos os nossos prestadores passam por uma verificação rigorosa de documentos."
          />
          <FeatureItem 
            icon={<Smartphone className="w-8 h-8 text-orange-600" />}
            title="Controlo na Mão"
            desc="Acompanhe o estado do seu serviço em tempo real através da nossa plataforma."
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-12 px-4 text-center">
        <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">
          © 2026 SAPS Business Solutions. Todos os direitos reservados.
        </p>
      </footer>
    </div>
  );
}

function FeatureItem({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="p-8 bg-white rounded-[2.5rem] border border-slate-100 hover:border-blue-200 hover:shadow-xl transition-all group">
      <div className="bg-slate-50 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-xl font-display font-black text-slate-900 mb-3">{title}</h3>
      <p className="text-slate-500 font-medium leading-relaxed">{desc}</p>
    </div>
  )
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { login, getSession } from '@/lib/actions';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, ArrowLeft, User, Brain, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Login() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rememberedEmail, setRememberedEmail] = useState('');
  const [rememberedPassword, setRememberedPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showFullForm, setShowFullForm] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  const handleSubmit = useCallback(async (e?: React.FormEvent<HTMLFormElement>, autoEmail?: string, autoPass?: string) => {
    if (e) e.preventDefault();
    if (loading) return;
    
    setLoading(true);
    setError('');

    let email = '';
    let senha = '';

    if (autoEmail && autoPass) {
      email = autoEmail;
      senha = autoPass;
    } else if (e) {
      const formData = new FormData(e.currentTarget);
      email = showFullForm ? (formData.get('email') as string) : rememberedEmail;
      senha = formData.get('senha') as string;
    }

    if (!email || !senha) {
      setError('Por favor, preencha todos os campos');
      setLoading(false);
      return;
    }

    try {
      localStorage.setItem('rememberedEmail', email);
      localStorage.setItem('rememberedPassword', senha);

      const res = await login(email, senha);
      
      // If we reach here, it means login returned an error object
      // because successful login redirects on the server
      if (res && !res.success) {
        setError(res.error || 'Credenciais inválidas. Verifique o email e a senha.');
        setLoading(false);
      }
    } catch (err: any) {
      // Next.js redirect throws an error, but we handle it in the action
      // If we catch something else here, it's a real error
      if (!err.message?.includes('NEXT_REDIRECT')) {
        setError('Ocorreu um erro inesperado. Por favor, tente novamente.');
        setLoading(false);
      }
    }
  }, [loading, rememberedEmail, showFullForm]);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const session = await getSession();
        if (session) {
          let target = '/client';
          if (session.userType === 'Admin') target = '/admin';
          else if (session.userType === 'Prestador') target = '/provider';
          
          router.push(target);
          return;
        }
        
        // If no session, check for saved credentials for auto-login
        const savedEmail = localStorage.getItem('rememberedEmail');
        const savedPassword = localStorage.getItem('rememberedPassword');
        
        if (savedEmail && savedPassword) {
          setRememberedEmail(savedEmail);
          setRememberedPassword(savedPassword);
          // Auto-submit
          await handleSubmit(undefined, savedEmail, savedPassword);
        } else if (savedEmail) {
          setRememberedEmail(savedEmail);
          setIsChecking(false);
        } else {
          setShowFullForm(true);
          setIsChecking(false);
        }
      } catch (err) {
        setIsChecking(false);
      }
    };
    checkSession();
  }, [router, handleSubmit]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <AnimatePresence>
        {(isChecking || loading) && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-white/80 backdrop-blur-sm z-[100] flex flex-col items-center justify-center"
          >
            <div className="bg-white p-8 rounded-[3rem] shadow-2xl flex flex-col items-center gap-6 border border-slate-100">
              <div className="relative">
                <div className="absolute inset-0 bg-blue-100 rounded-full blur-xl animate-pulse"></div>
                <Brain className="w-16 h-16 text-blue-600 relative animate-bounce" />
              </div>
              <div className="flex flex-col items-center gap-2">
                <h2 className="text-xl font-display font-black text-slate-900 tracking-tight">A entrar no SAPS...</h2>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">A validar o seu acesso permanente</p>
              </div>
              <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full max-w-md">
        {/* Brand Logo/Header */}
        <div className="flex flex-col items-center mb-8">
          <Link href="/" className="mb-6 bg-white p-4 rounded-full shadow-md border border-gray-100 hover:scale-105 transition-transform">
            <Brain className="w-10 h-10 text-blue-600" />
          </Link>
        </div>

        <div className="bg-white py-8 px-4 shadow-xl rounded-2xl sm:px-10 border border-gray-100">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            {!showFullForm && rememberedEmail ? (
              <div className="text-center bg-blue-50 rounded-lg p-4 mb-4 border border-blue-100">
                <div className="mx-auto bg-blue-100 w-10 h-10 rounded-full flex items-center justify-center mb-2">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-sm text-gray-600">Bem-vindo de volta,</p>
                <p className="font-medium text-gray-900 truncate">{rememberedEmail}</p>
                <button 
                  type="button" 
                  onClick={() => setShowFullForm(true)} 
                  className="text-xs text-blue-600 hover:text-blue-800 hover:underline mt-2 inline-block"
                >
                  Entrar com outra conta
                </button>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input name="email" type="email" required className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2 border" placeholder="joao@exemplo.com" />
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">Senha</label>
                <Link href="/forgot-password" title="Recuperar Senha" id="forgot-password-link" className="text-xs font-semibold text-blue-600 hover:text-blue-500">
                  Esqueceu-se da senha?
                </Link>
              </div>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input 
                  name="senha" 
                  type="password" 
                  required 
                  defaultValue={rememberedPassword}
                  className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2 border" 
                  placeholder="••••••••" 
                />
              </div>
            </div>

            <div className="hidden">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                checked={true}
                readOnly
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
              />
            </div>

            <div>
              <button 
                type="submit" 
                disabled={loading} 
                className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all active:scale-[0.98]"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    A entrar...
                  </>
                ) : (
                  'Entrar'
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Não tem conta?{' '}
              <Link href="/register" className="font-semibold text-blue-600 hover:text-blue-500">
                Criar conta
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link href="/" className="inline-flex items-center text-sm text-gray-400 hover:text-gray-600 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar à página inicial
          </Link>
        </div>
      </div>
    </div>
  );
}

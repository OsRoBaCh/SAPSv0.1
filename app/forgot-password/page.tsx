'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, Brain } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulação de envio de email de recuperação
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <Link href="/login" className="mb-6 bg-white p-4 rounded-full shadow-md border border-gray-100 hover:scale-105 transition-transform">
            <Brain className="w-10 h-10 text-blue-600" />
          </Link>
          <h2 className="text-3xl font-bold text-gray-900">Recuperar Senha</h2>
          <p className="text-gray-500 mt-2 text-center">Introduza o seu email para receber instruções de recuperação</p>
        </div>

        <div className="bg-white py-8 px-4 shadow-xl rounded-2xl sm:px-10 border border-gray-100">
          {!submitted ? (
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input 
                    type="email" 
                    required 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2 border" 
                    placeholder="joao@exemplo.com" 
                  />
                </div>
              </div>

              <div>
                <button type="submit" className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all active:scale-[0.98]">
                  Enviar Instruções
                </button>
              </div>
            </form>
          ) : (
            <div className="text-center py-4">
              <div className="bg-green-50 text-green-700 p-4 rounded-lg mb-6">
                Se o email existir no nosso sistema, receberá instruções em breve.
              </div>
              <Link href="/login" className="text-blue-600 font-semibold hover:text-blue-500">
                Voltar ao Login
              </Link>
            </div>
          )}
        </div>

        <div className="mt-8 text-center">
          <Link href="/login" className="inline-flex items-center text-sm text-gray-400 hover:text-gray-600 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao login
          </Link>
        </div>
      </div>
    </div>
  );
}

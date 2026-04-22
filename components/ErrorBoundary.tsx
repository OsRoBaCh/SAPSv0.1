'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RotateCcw, Home } from 'lucide-react';
import Link from 'next/link';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Don't show error boundary for Next.js internal redirects
    if (error.message?.includes('NEXT_REDIRECT') || error.message?.includes('NEXT_NOT_FOUND')) {
      return { hasError: false, error: null };
    }
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (error.message?.includes('NEXT_REDIRECT') || error.message?.includes('NEXT_NOT_FOUND')) {
      return;
    }
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-100 p-8 text-center">
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            
            <h1 className="text-2xl font-display font-black text-slate-900 mb-2">Ops! Algo correu mal</h1>
            <p className="text-slate-500 mb-8 leading-relaxed">
              Ocorreu um erro inesperado na aplicação. Estamos a trabalhar para resolver.
            </p>

            {process.env.NODE_ENV === 'development' && (
              <div className="mb-8 p-4 bg-slate-50 rounded-xl text-left overflow-auto max-h-40">
                <p className="text-xs font-mono text-red-500 whitespace-pre-wrap">
                  {this.state.error?.toString()}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={() => window.location.reload()}
                className="flex items-center justify-center gap-2 w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all active:scale-[0.98]"
              >
                <RotateCcw className="w-4 h-4" />
                Tentar Novamente
              </button>
              
              <Link
                href="/"
                className="flex items-center justify-center gap-2 w-full py-4 bg-white text-slate-900 border border-slate-200 rounded-2xl font-bold hover:bg-slate-50 transition-all active:scale-[0.98]"
              >
                <Home className="w-4 h-4" />
                Ir para o Início
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

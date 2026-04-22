import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-vh-100 bg-white p-6 text-center">
      <h1 className="text-4xl font-black text-slate-900 mb-4">404 - Página Não Encontrada</h1>
      <p className="text-slate-500 mb-8 max-w-md">Lamentamos, mas a página que procura não existe ou foi removida.</p>
      <Link 
        href="/client" 
        className="bg-blue-600 text-white font-black px-8 py-4 rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
      >
        Voltar ao Início
      </Link>
    </div>
  );
}

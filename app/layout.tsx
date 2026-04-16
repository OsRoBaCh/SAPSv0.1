import type {Metadata} from 'next';
import { Inter, Outfit } from 'next/font/google';
import './globals.css'; // Global styles
import IdleRedirect from '@/components/IdleRedirect';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-display',
});

export const metadata: Metadata = {
  title: 'SAPS - Sistema de Agendamento',
  description: 'Sistema de Agendamento e Prestação de Serviços',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="pt" className={`${inter.variable} ${outfit.variable}`}>
      <body suppressHydrationWarning className="font-sans antialiased text-slate-900">
        <IdleRedirect />
        {children}
      </body>
    </html>
  );
}

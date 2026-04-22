import { createBrowserClient } from '@supabase/ssr';

// --- CONFIGURAÇÃO SUPABASE ---
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://asonxjbdpklobnnnlpuj.supabase.co"; 
const SUPABASE_PUBLIC_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_LmAisnPDqQ0fFSQFhprcoQ__hci32TC"; 

/**
 * Cliente Supabase para utilização no Browser.
 * Gere automaticamente a persistência da sessão via Cookies para compatibilidade com Middleware.
 */
export const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY);

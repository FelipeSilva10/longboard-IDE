import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Faltam as variáveis de ambiente do Supabase no arquivo .env");
}

// Cria a conexão e exporta para o resto do aplicativo usar
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
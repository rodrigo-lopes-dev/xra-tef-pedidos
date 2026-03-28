import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Garantir que .env esta carregado (pode ser importado antes do server.ts)
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error(
    'Variaveis SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sao obrigatorias. Verifique o .env'
  );
}

// service_role bypassa RLS — usado apenas no backend
// NUNCA expor essa chave no frontend
export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

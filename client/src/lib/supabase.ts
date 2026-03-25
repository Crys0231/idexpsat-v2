import { createClient } from "@supabase/supabase-js";

/**
 * ============================================================================
 * SUPABASE CLIENT
 * ============================================================================
 *
 * Cliente Supabase para autenticação e acesso ao banco de dados
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
        "Missing Supabase environment variables. Please check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY"
    );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

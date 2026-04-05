import { createClient } from "@supabase/supabase-js";
import { ENV } from "./env.js";

/**
 * ============================================================================
 * SUPABASE CLIENT (BACKEND ADMIN)
 * ============================================================================
 *
 * Cliente Supabase para o backend com credenciais de service role
 * Permite operações administrativas e acesso total ao banco
 */

const supabaseUrl = ENV.supabaseUrl;
const supabaseServiceRoleKey = ENV.supabaseServiceRoleKey;
const supabaseAnonKey = ENV.supabaseAnonKey; // adicione no seu ENV

if (!supabaseUrl || !supabaseServiceRoleKey || !supabaseAnonKey) {
    throw new Error(
        "Missing Supabase environment variables. Please check SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and SUPABASE_ANON_KEY"
    );
}

// Admin: NUNCA expor no frontend
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});

// Client “normal” com Auth integrado (para frontend ou rotas autenticadas)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
    },
});

/**
 * Exemplo de uso no tRPC client (frontend):
 *
 * const trpcClient = createTRPCProxyClient<AppRouter>({
 *   links: [
 *     httpBatchLink({
 *       url: "/api/trpc",
 *       headers: async () => {
 *         const { data } = await supabase.auth.getSession();
 *         const token = data.session?.access_token;
 *         return token ? { Authorization: `Bearer ${token}` } : {};
 *       },
 *     }),
 *   ],
 * });
 */

/**
 * Obter usuário do Supabase Auth pelo JWT (backend)
 */
export async function getUserFromJWT(token: string) {
    try {
        const {
            data: { user },
            error,
        } = await supabaseAdmin.auth.getUser(token);

        if (error) {
            console.error("[Supabase] Error getting user from JWT:", error);
            return null;
        }

        return user;
    } catch (error) {
        console.error("[Supabase] Error in getUserFromJWT:", error);
        return null;
    }
}

/**
 * Verificar se usuário existe no banco de dados
 */
export async function getUserFromDatabase(userId: string) {
    try {
        const { data, error } = await supabaseAdmin
            .from("users")
            .select("*")
            .eq("open_id", userId)
            .single();

        if (error) {
            console.error("[Supabase] Error getting user from database:", error);
            return null;
        }

        return data;
    } catch (error) {
        console.error("[Supabase] Error in getUserFromDatabase:", error);
        return null;
    }
}

/**
 * Criar ou atualizar usuário no banco de dados
 */
export async function upsertUserInDatabase(
    userId: string,
    email: string,
    tenantId: string,
    name?: string
) {
    try {
        const { data, error } = await supabaseAdmin
            .from("users")
            .upsert(
                {
                    open_id: userId,
                    email,
                    tenant_id: tenantId,
                    name: name || email.split("@")[0],
                    role: "user",
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    last_signed_in: new Date().toISOString(),
                },
                {
                    onConflict: "open_id",
                }
            )
            .select()
            .single();

        if (error) {
            console.error("[Supabase] Error upserting user:", error);
            return null;
        }

        return data;
    } catch (error) {
        console.error("[Supabase] Error in upsertUserInDatabase:", error);
        return null;
    }
}

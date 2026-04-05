import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema.js";
import { supabaseAdmin } from "./supabase.js";
import { extractTenantContext, type MultiTenantContext } from "./multitenant.js";
import * as db from "../db.js";

export type TrpcContext = {
    req: CreateExpressContextOptions["req"];
    res: CreateExpressContextOptions["res"];
    user: User | null;
    tenant?: MultiTenantContext;
};

/**
 * Extrai o Bearer token do header Authorization ou do cookie sb-access-token
 * setado automaticamente pelo cliente Supabase no frontend.
 */
function extractToken(req: CreateExpressContextOptions["req"]): string | null {
    // 1. Header Authorization: Bearer <token>  (preferencial para API calls)
    const authHeader = req.headers["authorization"];
    if (authHeader?.startsWith("Bearer ")) {
        return authHeader.slice(7);
    }

    // 2. Cookie de sessão do Supabase (setado automaticamente pelo @supabase/supabase-js no browser)
    // O nome do cookie segue o padrão: sb-<project-ref>-auth-token
    const cookies = req.headers.cookie ?? "";
    const match = cookies.match(/sb-[^=]+-auth-token=([^;]+)/);
    if (match) {
        try {
            // O cookie do Supabase é um JSON com { access_token, ... } codificado em base64 ou raw
            const raw = decodeURIComponent(match[1]);
            const parsed = JSON.parse(raw);
            return parsed.access_token ?? null;
        } catch {
            return null;
        }
    }

    return null;
}

export async function createContext(
    opts: CreateExpressContextOptions
): Promise<TrpcContext> {
    let user: User | null = null;
    let tenant: MultiTenantContext | undefined;

    try {
        const token = extractToken(opts.req);
        if (!token) throw new Error("No token");

        // Verifica o JWT com o Supabase (substitui sdk.authenticateRequest)
        const { data, error } = await supabaseAdmin.auth.getUser(token);
        if (error || !data.user) throw new Error("Invalid token");

        const supabaseUser = data.user;

        // Busca o usuário na nossa tabela pelo ID do Supabase Auth
        // O id da nossa tabela users é igual ao id do Supabase Auth (inserido em requestAccess)
        user = await db.getUserById(supabaseUser.id) ?? null;

        // Sincroniza automaticamente se o usuário não existir ainda
        // (ex: usuário criado direto pelo painel do Supabase)
        if (!user && supabaseUser.email) {
            user = await db.getUserByEmail(supabaseUser.email) ?? null;
        }

        if (user) {
            // Atualiza last_signed_in sem bloquear o request
            db.updateLastSignedIn(user.id).catch(() => { });
            tenant = extractTenantContext(user);
        }
    } catch {
        user = null;
    }

    return {
        req: opts.req,
        res: opts.res,
        user,
        tenant,
    };
}
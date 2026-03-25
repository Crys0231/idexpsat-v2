import { z } from "zod";
import { randomUUID } from "crypto";
import { publicProcedure, router, adminProcedure } from "../../../server/_core/trpc";
import { supabaseAdmin } from "../../../server/_core/supabase";
import * as db from "../db";
import { sendApprovalRequestEmail } from "../../../server/_core/email";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { users, tenants, userTenants } from "../../drizzle/schema";

export const authRouter = router({
  /**
   * Retorna o usuário atual (null se não autenticado).
   * O frontend usa isso para hidratar o estado de auth após login.
   */
  me: publicProcedure.query((opts) => opts.ctx.user),

  /**
   * Logout: o Supabase Auth é gerenciado pelo frontend via supabase.auth.signOut().
   * Este endpoint existe apenas para limpeza server-side futura (ex: blacklist de tokens).
   */
  logout: publicProcedure.mutation(() => {
    // O cliente Supabase no frontend chama supabase.auth.signOut() que invalida
    // a sessão diretamente no Supabase. Não há cookie server-side para limpar.
    return { success: true } as const;
  }),

  /**
   * Solicita acesso ao sistema.
   * Cria o usuário no Supabase Auth + registra na nossa DB com status PENDING.
   * Um admin precisa aprovar antes do usuário conseguir logar com acesso pleno.
   */
  requestAccess: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string().min(6),
      tenantName: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      const { email, password, tenantName } = input;

      try {
        // 1. Cria usuário no Supabase Auth
        const adminAuth = (supabaseAdmin.auth as any).admin;
        const { data: authData, error: authError } = await adminAuth.createUser({
          email,
          password,
          email_confirm: true,
        });

        if (authError || !authData?.user) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: authError?.message || "Failed to create user in Supabase Auth",
          });
        }

        const userId = authData.user.id;

        const database = await db.getDb();
        if (!database) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB Connection failed" });
        }

        // 2. Cria o Tenant
        const tenantId = randomUUID();
        await database.insert(tenants).values({ id: tenantId, nome: tenantName });

        // 3. Cria o usuário na nossa DB com status PENDING
        // O id é o mesmo do Supabase Auth para facilitar o lookup no context.ts
        await database.insert(users).values({
          id: userId,
          tenantId,
          email,
          role: "admin",
          pendingAccess: "PENDING",
        });

        // 4. Cria o vínculo User <-> Tenant
        await database.insert(userTenants).values({ userId, tenantId, role: "admin" });

        // 5. Notifica admin por email
        await sendApprovalRequestEmail(email, tenantName);

        return { success: true, message: "Acesso solicitado com sucesso. Aguardando aprovação." };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Error in requestAccess:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao solicitar acesso.",
        });
      }
    }),

  // Lista usuários com acesso pendente (somente admin)
  listPendingUsers: adminProcedure.query(async () => {
    const database = await db.getDb();
    if (!database) return [];
    return database.select().from(users).where(eq(users.pendingAccess, "PENDING"));
  }),

  // Aprova acesso de um usuário (somente admin)
  approveAccess: adminProcedure
    .input(z.object({ userId: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const database = await db.getDb();
      if (!database) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB Connection failed" });
      }
      await database
        .update(users)
        .set({ pendingAccess: "APPROVED" })
        .where(eq(users.id, input.userId));

      return { success: true };
    }),
});
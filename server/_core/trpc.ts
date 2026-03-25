import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from "@shared/const";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
    transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

// ============================================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================================

const requireUser = t.middleware(async (opts) => {
    const { ctx, next } = opts;

    if (!ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
    }

    return next({
        ctx: {
            ...ctx,
            user: ctx.user,
        },
    });
});

export const protectedProcedure = t.procedure.use(requireUser);

// ============================================================================
// MULTI-TENANT MIDDLEWARE
// ============================================================================

const requireTenant = t.middleware(async (opts) => {
    const { ctx, next } = opts;

    if (!ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
    }

    if (!ctx.tenant) {
        throw new TRPCError({
            code: "FORBIDDEN",
            message: "User is not associated with any tenant",
        });
    }

    return next({
        ctx: {
            ...ctx,
            user: ctx.user,
            tenant: ctx.tenant,
        },
    });
});

/**
 * Protected procedure with mandatory tenant context
 * Use this for all tenant-specific operations
 */
export const tenantProcedure = t.procedure.use(requireTenant);

// ============================================================================
// ADMIN MIDDLEWARE
// ============================================================================

export const adminProcedure = t.procedure.use(
    t.middleware(async (opts) => {
        const { ctx, next } = opts;

        if (!ctx.user || ctx.user.role !== "admin") {
            throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
        }

        return next({
            ctx: {
                ...ctx,
                user: ctx.user,
            },
        });
    })
);

/**
 * Admin procedure with mandatory tenant context
 * Use this for admin operations that are tenant-scoped
 */
export const tenantAdminProcedure = t.procedure.use(
    t.middleware(async (opts) => {
        const { ctx, next } = opts;

        if (!ctx.user || ctx.user.role !== "admin") {
            throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
        }

        if (!ctx.tenant) {
            throw new TRPCError({
                code: "FORBIDDEN",
                message: "User is not associated with any tenant",
            });
        }

        return next({
            ctx: {
                ...ctx,
                user: ctx.user,
                tenant: ctx.tenant,
            },
        });
    })
);

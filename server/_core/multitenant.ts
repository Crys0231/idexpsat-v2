import { TRPCError } from "@trpc/server";
import type { User } from "../../drizzle/schema";

export interface MultiTenantContext {
    tenantId: string;
    // FIX: era number, mas User.id é uuid (string) no schema Drizzle.
    // Causava TS2322: Type 'string' is not assignable to type 'number'.
    userId: string;
    user: User;
}

export function extractTenantContext(user: User): MultiTenantContext {
    if (!user.tenantId) {
        throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "User is not associated with any tenant",
        });
    }

    return {
        tenantId: user.tenantId,
        userId: user.id, // user.id é string (uuid)
        user,
    };
}

export function validateTenantAccess(userTenantId: string, requestedTenantId: string): void {
    if (userTenantId !== requestedTenantId) {
        throw new TRPCError({
            code: "FORBIDDEN",
            message: "Access denied: tenant_id mismatch",
        });
    }
}

export function validateTenantAccessBatch(userTenantId: string, tenantIds: string[]): void {
    const invalidTenantIds = tenantIds.filter((id) => id !== userTenantId);
    if (invalidTenantIds.length > 0) {
        throw new TRPCError({
            code: "FORBIDDEN",
            message: "Access denied: one or more tenant_ids do not match user's tenant",
        });
    }
}

export function withTenantFilter(tenantId: string, baseQuery: Record<string, any>) {
    return {
        ...baseQuery,
        tenantId,
    };
}
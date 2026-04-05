import { eq, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
    InsertUser,
    users,
    tenants,
    clientes,
    veiculos,
    marcas,
    compras,
    pesquisas,
    perguntas,
    tiposPesquisa,
    respostas,
    notificacoes,
} from "../drizzle/schema.js";
import { ENV } from "./_core/env.js";
import { randomUUID } from "crypto";
import { createHash } from "crypto";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
    if (!_db && process.env.DATABASE_URL) {
        try {
            const client = postgres(process.env.DATABASE_URL);
            _db = drizzle(client);
        } catch (error) {
            console.warn("[Database] Failed to connect:", error);
            _db = null;
        }
    }
    return _db;
}

// ============================================================================
// USER MANAGEMENT
// ============================================================================

export async function upsertUser(
    user: Partial<InsertUser> & { openId: string; tenantId: string; email: string }
): Promise<void> {
    const db = await getDb();
    if (!db) {
        console.warn("[Database] Cannot upsert user: database not available");
        return;
    }

    try {
        const values: InsertUser = {
            tenantId: user.tenantId,
            email: user.email,
            openId: user.openId,
        };
        const updateSet: Record<string, unknown> = { openId: user.openId };

        if (user.name !== undefined) {
            values.name = user.name;
            updateSet.name = user.name;
        }

        if ((user as any).lastSignedIn !== undefined) {
            values.lastSignedIn = (user as any).lastSignedIn;
            updateSet.lastSignedIn = (user as any).lastSignedIn;
        }

        if (user.role !== undefined) {
            values.role = user.role;
            updateSet.role = user.role;
        } else if (user.email === ENV.ownerOpenId) {
            values.role = "admin";
            updateSet.role = "admin";
        }

        if (!values.createdAt) {
            values.createdAt = new Date();
        }

        await db.insert(users).values(values).onConflictDoUpdate({
            target: users.email,
            set: updateSet,
        });
    } catch (error) {
        console.error("[Database] Failed to upsert user:", error);
        throw error;
    }
}

/** Busca usuário pelo UUID do Supabase Auth (campo id) */
export async function getUserById(id: string) {
    const db = await getDb();
    if (!db) return undefined;

    const result = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

    return result.length > 0 ? result[0] : undefined;
}

/** Busca usuário pelo open_id OAuth legado (mantido por compatibilidade) */
export async function getUserByOpenId(openId: string) {
    const db = await getDb();
    if (!db) {
        console.warn("[Database] Cannot get user: database not available");
        return undefined;
    }

    const result = await db
        .select()
        .from(users)
        .where(eq(users.openId, openId))
        .limit(1);

    return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
    const db = await getDb();
    if (!db) {
        console.warn("[Database] Cannot get user: database not available");
        return undefined;
    }

    const result = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

    return result.length > 0 ? result[0] : undefined;
}

/** Atualiza last_signed_in sem fazer upsert completo — chamado a cada request autenticado */
export async function updateLastSignedIn(userId: string): Promise<void> {
    const db = await getDb();
    if (!db) return;

    await db
        .update(users)
        .set({ lastSignedIn: new Date() })
        .where(eq(users.id, userId));
}

// ============================================================================
// TENANT MANAGEMENT
// ============================================================================

export async function getTenantById(tenantId: string) {
    const db = await getDb();
    if (!db) return undefined;

    const result = await db
        .select()
        .from(tenants)
        .where(eq(tenants.id, tenantId))
        .limit(1);

    return result.length > 0 ? result[0] : undefined;
}

// ============================================================================
// CLIENTE MANAGEMENT
// ============================================================================

export async function getOrCreateCliente(
    tenantId: string,
    telefone: string,
    nome: string,
    cidade: string
) {
    const db = await getDb();
    if (!db) return null;

    try {
        const existing = await db
            .select()
            .from(clientes)
            .where(and(eq(clientes.tenantId, tenantId), eq(clientes.telefone, telefone)))
            .limit(1);

        if (existing.length > 0) {
            await db
                .update(clientes)
                .set({ nome, cidade, updatedAt: new Date() })
                .where(eq(clientes.id, existing[0].id));
            return existing[0].id;
        }

        const clienteId = randomUUID();
        await db.insert(clientes).values({ id: clienteId, tenantId, telefone, nome, cidade });
        return clienteId;
    } catch (error) {
        console.error("[Database] Failed to process cliente:", error);
        return null;
    }
}

// ============================================================================
// VEICULO MANAGEMENT
// ============================================================================

export async function getOrCreateVeiculo(
    tenantId: string,
    placa: string,
    modelo: string,
    marcaId: string
) {
    const db = await getDb();
    if (!db) return null;

    try {
        const existing = await db
            .select()
            .from(veiculos)
            .where(and(eq(veiculos.tenantId, tenantId), eq(veiculos.placa, placa)))
            .limit(1);

        if (existing.length > 0) {
            await db
                .update(veiculos)
                .set({ modelo, marcaId, updatedAt: new Date() })
                .where(eq(veiculos.id, existing[0].id));
            return existing[0].id;
        }

        const veiculoId = randomUUID();
        await db.insert(veiculos).values({ id: veiculoId, tenantId, placa, modelo, marcaId });
        return veiculoId;
    } catch (error) {
        console.error("[Database] Failed to process veiculo:", error);
        return null;
    }
}

// ============================================================================
// MARCA MANAGEMENT
// ============================================================================

export async function getOrCreateMarca(tenantId: string, nome: string) {
    const db = await getDb();
    if (!db) return null;

    try {
        const existing = await db
            .select()
            .from(marcas)
            .where(and(eq(marcas.tenantId, tenantId), eq(marcas.nome, nome)))
            .limit(1);

        if (existing.length > 0) return existing[0].id;

        const marcaId = randomUUID();
        await db.insert(marcas).values({ id: marcaId, tenantId, nome });
        return marcaId;
    } catch (error) {
        console.error("[Database] Failed to process marca:", error);
        return null;
    }
}

// ============================================================================
// TIPO PESQUISA MANAGEMENT
// ============================================================================

export async function getOrCreateTipoPesquisa(tenantId: string, nome: string) {
    const db = await getDb();
    if (!db) return null;

    try {
        const existing = await db
            .select()
            .from(tiposPesquisa)
            .where(and(eq(tiposPesquisa.tenantId, tenantId), eq(tiposPesquisa.nome, nome)))
            .limit(1);

        if (existing.length > 0) return existing[0].id;

        const tipoPesquisaId = randomUUID();
        await db.insert(tiposPesquisa).values({
            id: tipoPesquisaId,
            tenantId,
            nome,
            descricao: `Pesquisa de ${nome.toLowerCase()}`,
        });
        return tipoPesquisaId;
    } catch (error) {
        console.error("[Database] Failed to process tipo pesquisa:", error);
        return null;
    }
}

// ============================================================================
// COMPRA MANAGEMENT
// ============================================================================

export function gerarHashCompra(clienteId: string, veiculoId: string, tipoPesquisaId: string): string {
    return createHash("sha256").update(`${clienteId}_${veiculoId}_${tipoPesquisaId}`).digest("hex");
}

export async function getOrCreateCompra(
    tenantId: string,
    clienteId: string,
    veiculoId: string,
    tipoPesquisaId: string,
    dataCompra: Date
) {
    const db = await getDb();
    if (!db) return null;

    try {
        const hashCompra = gerarHashCompra(clienteId, veiculoId, tipoPesquisaId);

        const existing = await db
            .select()
            .from(compras)
            .where(and(eq(compras.tenantId, tenantId), eq(compras.hashCompra, hashCompra)))
            .limit(1);

        if (existing.length > 0) return existing[0].id;

        const compraId = randomUUID();
        await db.insert(compras).values({
            id: compraId,
            tenantId,
            clienteId,
            veiculoId,
            tipoPesquisaId,
            dataCompra,
            hashCompra,
        });
        return compraId;
    } catch (error) {
        console.error("[Database] Failed to process compra:", error);
        return null;
    }
}

// ============================================================================
// PESQUISA MANAGEMENT
// ============================================================================

export async function createPesquisa(tenantId: string, compraId: string, tipoPesquisaId: string) {
    const db = await getDb();
    if (!db) return null;

    try {
        const pesquisaId = randomUUID();
        const token = randomUUID();

        await db.insert(pesquisas).values({
            id: pesquisaId,
            tenantId,
            compraId,
            tipoPesquisaId,
            token,
            respondida: false,
            enviada: false,
        });

        return { id: pesquisaId, token };
    } catch (error) {
        console.error("[Database] Failed to create pesquisa:", error);
        return null;
    }
}

export async function getPesquisaByToken(token: string) {
    const db = await getDb();
    if (!db) return null;

    try {
        const result = await db
            .select()
            .from(pesquisas)
            .where(eq(pesquisas.token, token))
            .limit(1);

        return result.length > 0 ? result[0] : null;
    } catch (error) {
        console.error("[Database] Failed to get pesquisa by token:", error);
        return null;
    }
}

export async function getPerguntasByTipoPesquisa(tipoPesquisaId: string) {
    const db = await getDb();
    if (!db) return [];

    try {
        return await db
            .select()
            .from(perguntas)
            .where(and(eq(perguntas.tipoPesquisaId, tipoPesquisaId), eq(perguntas.ativa, true)))
            .orderBy(perguntas.ordem);
    } catch (error) {
        console.error("[Database] Failed to get perguntas:", error);
        return [];
    }
}

// ============================================================================
// RESPOSTA MANAGEMENT
// ============================================================================

export async function createResposta(
    tenantId: string,
    pesquisaId: string,
    perguntaId: string,
    resposta: string,
    score?: number,
    sentimento?: string,
    temas?: string
) {
    const db = await getDb();
    if (!db) return null;

    try {
        const respostaId = randomUUID();
        await db.insert(respostas).values({
            id: respostaId,
            tenantId,
            pesquisaId,
            perguntaId,
            resposta,
            score: score ?? null,
            sentimento: (sentimento as any) ?? null,
            temas,
        });
        return respostaId;
    } catch (error) {
        console.error("[Database] Failed to create resposta:", error);
        return null;
    }
}

export async function markPesquisaAsAnswered(pesquisaId: string) {
    const db = await getDb();
    if (!db) return false;

    try {
        await db
            .update(pesquisas)
            .set({ respondida: true, dataResposta: new Date() })
            .where(eq(pesquisas.id, pesquisaId));
        return true;
    } catch (error) {
        console.error("[Database] Failed to mark pesquisa as answered:", error);
        return false;
    }
}

// ============================================================================
// NOTIFICACAO MANAGEMENT
// ============================================================================

export async function createNotificacao(
    tenantId: string,
    userId: string,
    pesquisaId: string,
    titulo: string,
    conteudo: string
) {
    const db = await getDb();
    if (!db) return null;

    try {
        const notificacaoId = randomUUID();
        await db.insert(notificacoes).values({
            id: notificacaoId,
            tenantId,
            userId,
            pesquisaId,
            titulo,
            conteudo,
            lida: false,
        });
        return notificacaoId;
    } catch (error) {
        console.error("[Database] Failed to create notificacao:", error);
        return null;
    }
}
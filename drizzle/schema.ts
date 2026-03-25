import {
    pgTable,
    uuid,
    varchar,
    text,
    timestamp,
    boolean,
    date,
    primaryKey,
    integer,
    pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const pendingStatusEnum = pgEnum("pending_status", ["PENDING", "APPROVED"]);

// ============================================================================
// CORE TENANT MANAGEMENT
// ============================================================================

export const tenants = pgTable("tenants", {
    id: uuid("id").defaultRandom().primaryKey(),
    nome: varchar("nome").notNull(),
    createdAt: timestamp("created_at", { mode: 'date' }).defaultNow(),
});

export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = typeof tenants.$inferInsert;

// ============================================================================
// USER MANAGEMENT
// ============================================================================

export const users = pgTable("users", {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
    email: varchar("email").notNull().unique(),
    // FIX: openId adicionado para suporte ao fluxo OAuth customizado (sdk.ts/oauth.ts)
    openId: varchar("open_id").unique(),
    // FIX: name e lastSignedIn adicionados — usados em upsertUser, sdk.ts e oauth.ts
    name: varchar("name"),
    lastSignedIn: timestamp("last_signed_in", { mode: 'date' }),
    role: varchar("role").notNull().default("admin"),
    pendingAccess: pendingStatusEnum("pending_access").notNull().default("APPROVED"),
    createdAt: timestamp("created_at", { mode: 'date' }).defaultNow(),
    updatedAt: timestamp("updated_at", { mode: 'date' }).defaultNow(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const userTenants = pgTable("user_tenants", {
    userId: uuid("user_id").notNull(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
    role: text("role").default("admin"),
}, (table) => ({
    pk: primaryKey({ columns: [table.userId, table.tenantId] }),
}));

export type UserTenant = typeof userTenants.$inferSelect;
export type InsertUserTenant = typeof userTenants.$inferInsert;

// ============================================================================
// CLIENT MANAGEMENT
// ============================================================================

export const clientes = pgTable("clientes", {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
    nome: varchar("nome"),
    telefone: varchar("telefone").notNull(),
    cidade: varchar("cidade"),
    telegramChatId: text("telegram_chat_id"),
    createdAt: timestamp("created_at", { mode: 'date' }).defaultNow(),
    updatedAt: timestamp("updated_at", { mode: 'date' }).defaultNow(),
});

export type Cliente = typeof clientes.$inferSelect;
export type InsertCliente = typeof clientes.$inferInsert;

// ============================================================================
// VEHICLE & BRAND MANAGEMENT
// ============================================================================

export const marcas = pgTable("marcas", {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
    nome: varchar("nome").notNull(),
    createdAt: timestamp("created_at", { mode: 'date' }).defaultNow(),
});

export type Marca = typeof marcas.$inferSelect;
export type InsertMarca = typeof marcas.$inferInsert;

export const veiculos = pgTable("veiculos", {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
    placa: varchar("placa").notNull(),
    modelo: varchar("modelo"),
    marcaId: uuid("marca_id").references(() => marcas.id),
    createdAt: timestamp("created_at", { mode: 'date' }).defaultNow(),
    updatedAt: timestamp("updated_at", { mode: 'date' }).defaultNow(),
});

export type Veiculo = typeof veiculos.$inferSelect;
export type InsertVeiculo = typeof veiculos.$inferInsert;

// ============================================================================
// SURVEY CONFIGURATION
// ============================================================================

export const tiposPesquisa = pgTable("tipos_pesquisa", {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
    nome: varchar("nome").notNull(),
    descricao: text("descricao"),
    createdAt: timestamp("created_at", { mode: 'date' }).defaultNow(),
});

export type TipoPesquisa = typeof tiposPesquisa.$inferSelect;
export type InsertTipoPesquisa = typeof tiposPesquisa.$inferInsert;

export const perguntas = pgTable("perguntas", {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
    tipoPesquisaId: uuid("tipo_pesquisa_id").references(() => tiposPesquisa.id),
    pergunta: text("pergunta").notNull(),
    ordem: integer("ordem"),
    ativa: boolean("ativa").default(true),
    createdAt: timestamp("created_at", { mode: 'date' }).defaultNow(),
});

export type Pergunta = typeof perguntas.$inferSelect;
export type InsertPergunta = typeof perguntas.$inferInsert;

// ============================================================================
// PURCHASE TRACKING
// ============================================================================

export const compras = pgTable("compras", {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
    clienteId: uuid("cliente_id").notNull().references(() => clientes.id),
    veiculoId: uuid("veiculo_id").notNull().references(() => veiculos.id),
    tipoPesquisaId: uuid("tipo_pesquisa_id").references(() => tiposPesquisa.id),
    dataCompra: date("data_compra", { mode: 'date' }),
    hashCompra: text("hash_compra").notNull(),
    createdAt: timestamp("created_at", { mode: 'date' }).defaultNow(),
});

export type Compra = typeof compras.$inferSelect;
export type InsertCompra = typeof compras.$inferInsert;

// ============================================================================
// SURVEY MANAGEMENT
// ============================================================================

export const pesquisas = pgTable("pesquisas", {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
    tipoPesquisaId: uuid("tipo_pesquisa_id").notNull().references(() => tiposPesquisa.id),
    compraId: uuid("compra_id").references(() => compras.id),
    token: uuid("token").defaultRandom().notNull().unique(),
    respondida: boolean("respondida").default(false),
    enviada: boolean("enviada").default(false),
    dataEnvio: timestamp("data_envio", { mode: 'date' }),
    dataResposta: timestamp("data_resposta", { mode: 'date' }),
    createdAt: timestamp("created_at", { mode: 'date' }).defaultNow(),
    expiraEm: timestamp("expira_em", { mode: 'date' }),
});

export type Pesquisa = typeof pesquisas.$inferSelect;
export type InsertPesquisa = typeof pesquisas.$inferInsert;

// ============================================================================
// SURVEY RESPONSES
// ============================================================================

export const respostas = pgTable("respostas", {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
    pesquisaId: uuid("pesquisa_id").notNull().references(() => pesquisas.id),
    perguntaId: uuid("pergunta_id").notNull().references(() => perguntas.id),
    resposta: text("resposta"),
    score: integer("score"),
    sentimento: varchar("sentimento"),
    temas: text("temas"),
    createdAt: timestamp("created_at", { mode: 'date' }).defaultNow(),
});

export type Resposta = typeof respostas.$inferSelect;
export type InsertResposta = typeof respostas.$inferInsert;

// ============================================================================
// NOTIFICATIONS
// FIX: tabela notificacoes adicionada — estava sendo importada em db.ts mas não existia no schema
// FIX: userId era number em db.ts (createNotificacao), corrigido para uuid/string
// ============================================================================

export const notificacoes = pgTable("notificacoes", {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
    userId: uuid("user_id").notNull(),
    pesquisaId: uuid("pesquisa_id").references(() => pesquisas.id),
    titulo: varchar("titulo").notNull(),
    conteudo: text("conteudo"),
    lida: boolean("lida").default(false),
    createdAt: timestamp("created_at", { mode: 'date' }).defaultNow(),
});

export type Notificacao = typeof notificacoes.$inferSelect;
export type InsertNotificacao = typeof notificacoes.$inferInsert;

// ============================================================================
// RELATIONS
// ============================================================================

export const usersRelations = relations(users, ({ one }) => ({
    tenant: one(tenants, {
        fields: [users.tenantId],
        references: [tenants.id],
    }),
}));

export const clientesRelations = relations(clientes, ({ one }) => ({
    tenant: one(tenants, {
        fields: [clientes.tenantId],
        references: [tenants.id],
    }),
}));
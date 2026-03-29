export const ENV = {
    cookieSecret: process.env.JWT_SECRET ?? "",
    databaseUrl: process.env.DATABASE_URL ?? "",
    ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
    isProduction: process.env.NODE_ENV === "production",
    forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
    forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
    supabaseUrl: process.env.VITE_SUPABASE_URL ?? "",
    supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY ?? "",
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    // WhatsApp / Evolution API
    appUrl: process.env.APP_URL ?? "http://localhost:5173",
    evolutionApiUrl: process.env.EVOLUTION_API_URL ?? "",
    evolutionApiKey: process.env.EVOLUTION_API_KEY ?? "",
    evolutionInstanceName: process.env.EVOLUTION_INSTANCE_NAME ?? "idexpsat",
};
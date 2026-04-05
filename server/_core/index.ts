import "dotenv/config";
import express, { type Express } from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers.js";
import { createContext } from "./context.js";
import { serveStatic, setupVite } from "./vite.js";
// FIX: removido import de registerOAuthRoutes — rota /api/oauth/callback era
// exclusiva do fluxo Manus. O Supabase Auth não precisa de callback server-side;
// o frontend lida com a sessão diretamente via @supabase/supabase-js.

export const app: Express = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.use(
    "/api/trpc",
    createExpressMiddleware({
        router: appRouter,
        createContext,
    })
);

// Export default para api/index.ts (Vercel serverless handler)
export default app;

// ─── Servidor local (dev / non-Vercel) ───────────────────────────────────────

function isPortAvailable(port: number): Promise<boolean> {
    return new Promise(resolve => {
        const server = net.createServer();
        server.listen(port, () => server.close(() => resolve(true)));
        server.on("error", () => resolve(false));
    });
}

async function findAvailablePort(startPort = 3000): Promise<number> {
    for (let port = startPort; port < startPort + 20; port++) {
        if (await isPortAvailable(port)) return port;
    }
    throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
    const server = createServer(app);

    if (process.env.NODE_ENV === "development") {
        await setupVite(app, server);
    } else {
        serveStatic(app);
    }

    const preferredPort = parseInt(process.env.PORT || "3000");
    const port = await findAvailablePort(preferredPort);

    if (port !== preferredPort) {
        console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
    }

    server.listen(port, () => {
        console.log(`Server running on http://localhost:${port}/`);
    });
}

if (!process.env.VERCEL) {
    startServer().catch(console.error);
}
import express from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config.js";

export async function setupVite(app: express.Application, server: Server) {
    const serverOptions = {
        middlewareMode: true,
        hmr: { server },
        allowedHosts: true as const,
    };

    const vite = await createViteServer({
        ...viteConfig,
        configFile: false,
        server: serverOptions,
        appType: "custom",
    });

    app.use(vite.middlewares);

    // FIX: tipos explícitos nos parâmetros do callback — com strict mode e
    // moduleResolution: bundler, o TypeScript não infere automaticamente
    app.use("*", async (req: express.Request, res: express.Response, next: express.NextFunction) => {
        const url = req.originalUrl;

        try {
            const clientTemplate = path.resolve(
                import.meta.dirname,
                "../..",
                "client",
                "index.html"
            );

            let template = await fs.promises.readFile(clientTemplate, "utf-8");
            template = template.replace(
                `src="/src/main.tsx"`,
                `src="/src/main.tsx?v=${nanoid()}"`
            );
            const page = await vite.transformIndexHtml(url, template);
            res.status(200).set({ "Content-Type": "text/html" }).end(page);
        } catch (e) {
            vite.ssrFixStacktrace(e as Error);
            next(e);
        }
    });
}

export function serveStatic(app: express.Application) {
    const distPath =
        process.env.NODE_ENV === "development"
            ? path.resolve(import.meta.dirname, "../..", "dist", "public")
            : path.resolve(import.meta.dirname, "public");

    if (!fs.existsSync(distPath)) {
        console.error(
            `Could not find the build directory: ${distPath}, make sure to build the client first`
        );
    }

    app.use(express.static(distPath));

    // FIX: tipos explícitos aqui também
    app.use("*", (_req: express.Request, res: express.Response) => {
        res.sendFile(path.resolve(distPath, "index.html"));
    });
}
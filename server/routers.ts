import { router } from "./_core/trpc.js";
import { csvRouter } from "./routers/csv.js";
import { surveysRouter } from "./routers/surveys.js";
import { configRouter } from "./routers/config.js";
import { authRouter } from "./routers/auth.js"; // import the new authRouter

export const appRouter = router({

    // Auth logic including Request Access / Approvals
    auth: authRouter,

    // Feature routers
    csv: csvRouter,
    surveys: surveysRouter,
    config: configRouter,
});

export type AppRouter = typeof appRouter;

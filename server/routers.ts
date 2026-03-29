import { router } from "./_core/trpc";
import { csvRouter } from "./routers/csv";
import { surveysRouter } from "./routers/surveys";
import { configRouter } from "./routers/config";
import { authRouter } from "./routers/auth"; // import the new authRouter

export const appRouter = router({

    // Auth logic including Request Access / Approvals
    auth: authRouter,

    // Feature routers
    csv: csvRouter,
    surveys: surveysRouter,
    config: configRouter,
});

export type AppRouter = typeof appRouter;

import { router } from "../../../server/_core/trpc";
import { authRouter } from "./auth";
import { configRouter } from "./config";
import { surveysRouter } from "./surveys";
import { csvRouter } from "./csv";

export const appRouter = router({
    auth: authRouter,
    config: configRouter,
    surveys: surveysRouter,
    csv: csvRouter,
});

export type AppRouter = typeof appRouter;

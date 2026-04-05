// client/src/lib/trpc.ts
import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import { supabase } from "./supabase";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore – cross-project import; Vite resolves this correctly at build time
import type { AppRouter } from "../../../server/routers";

export const trpc = createTRPCReact<AppRouter>();

export function createTRPCClient() {
    return trpc.createClient({
        links: [
            httpBatchLink({
                url: "/api/trpc",
                transformer: superjson,
                headers: async () => {
                    const { data } = await supabase.auth.getSession();
                    const token = data.session?.access_token;
                    return token ? { Authorization: `Bearer ${token}` } : {};
                },
            }),
        ],
    });
}
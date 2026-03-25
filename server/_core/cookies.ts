import type { CookieOptions, Request } from "express";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function isIpAddress(host: string) {
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
    return host.includes(":");
}

function isSecureRequest(req: Request) {
    if (req.protocol === "https") return true;

    const forwardedProto = req.headers["x-forwarded-proto"];
    if (!forwardedProto) return false;

    const protoList = Array.isArray(forwardedProto)
        ? forwardedProto
        : forwardedProto.split(",");

    return protoList.some(proto => proto.trim().toLowerCase() === "https");
}

// FIX: removido "domain" do Pick — a função retorna um objeto sem domain
// (domain está comentado no corpo), o que causava TS2344 e TS2741.
// O tipo agora bate exatamente com o objeto retornado.
export function getSessionCookieOptions(
    req: Request
): Pick<CookieOptions, "httpOnly" | "path" | "sameSite" | "secure"> {
    return {
        httpOnly: true,
        path: "/",
        sameSite: "none",
        secure: isSecureRequest(req),
    };
}
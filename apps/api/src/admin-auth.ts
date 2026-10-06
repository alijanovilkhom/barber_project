import { createHmac, timingSafeEqual } from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { ApiEnv } from "./env.js";

export const adminCookieName = "bravo_admin";
type Session = { adminId: string; exp: number };

function secret(env: ApiEnv) {
  const value = env.ADMIN_SESSION_SECRET ?? env.TELEGRAM_BOT_TOKEN;
  if (!value) throw Object.assign(new Error("Admin session secret is not configured"), { statusCode: 503, apiCode: "ADMIN_NOT_CONFIGURED" });
  return value;
}

export function createAdminSession(adminId: string, env: ApiEnv) {
  const payload = Buffer.from(JSON.stringify({ adminId, exp: Date.now() + 7 * 86400_000 } satisfies Session)).toString("base64url");
  const signature = createHmac("sha256", secret(env)).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function readAdminSession(request: FastifyRequest, env: ApiEnv): Session | undefined {
  const token = request.cookies[adminCookieName];
  if (!token) return;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return;
  const expected = createHmac("sha256", secret(env)).update(payload).digest("base64url");
  const a = Buffer.from(signature); const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return;
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString()) as Session;
    return session.exp > Date.now() && session.adminId ? session : undefined;
  } catch { return; }
}

export function requireAdmin(request: FastifyRequest, env: ApiEnv) {
  const session = readAdminSession(request, env);
  if (!session) throw Object.assign(new Error("Authentication required"), { statusCode: 401, apiCode: "ADMIN_UNAUTHORIZED" });
  return session;
}

export function setAdminCookie(reply: FastifyReply, token: string, env: ApiEnv) {
  // The admin UI and API run on different origins (and ports) during local development.
  // None allows the credentialed API request; Secure is accepted on localhost and required in production.
  reply.setCookie(adminCookieName, token, { httpOnly: true, secure: true, sameSite: "none", path: "/", maxAge: 7 * 86400 });
}

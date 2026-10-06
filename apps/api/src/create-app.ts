import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import Fastify, { type FastifyError } from "fastify";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ZodError, z } from "zod";
import { createDatabaseClient } from "@barber/db";
import type { ApiEnv } from "./env.js";
import { registerBookingRoutes } from "./booking-routes.js";
import { telegramUserFromRequest } from "./telegram-auth.js";
import { createTelegramBot, registerTelegramWebhook } from "./telegram-bot.js";
import { registerAdminRoutes } from "./admin-routes.js";

const barberParam = z.object({ id: z.string().trim().min(1).max(100) });
const uuid = z.string().uuid();

export function buildApp(env: ApiEnv) {
  const app = Fastify({ logger: env.NODE_ENV !== "test" });
  const db = createDatabaseClient();
  const allowedOrigins = new Set([env.APP_URL, env.MINIAPP_URL, env.API_PUBLIC_URL, env.MINIAPP_PUBLIC_URL, "http://localhost:3000", "http://127.0.0.1:3000"]
    .flatMap(value => value?.split(",") ?? [])
    .map(value => { try { return new URL(value.trim()).origin; } catch { return value.trim().replace(/\/$/, ""); } })
    .filter(Boolean));
  const apiDir = path.dirname(fileURLToPath(import.meta.url));
  const workspaceRoot = path.resolve(apiDir, "../../..");
  const telegramBot = createTelegramBot(db, env);

  if (!process.env.VERCEL) {
    app.register(fastifyStatic, { root: path.join(workspaceRoot, "apps/miniapp/dist"), prefix: "/miniapp/" });
    app.register(fastifyStatic, { root: path.join(workspaceRoot, "apps/web/public"), prefix: "/media/", decorateReply: false });
  }
  app.register(cookie);
  app.register(rateLimit, { global: false });
  app.register(multipart, { limits: { fileSize: 8 * 1024 * 1024, files: 1 } });

  app.register(cors, {
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin.replace(/\/$/, ""))) return callback(null, true);
      callback(Object.assign(new Error("Origin is not allowed"), { statusCode: 403, code: "CORS_FORBIDDEN" }), false);
    },
    methods: ["GET", "POST", "HEAD", "OPTIONS"],
    credentials: true,
  });

  app.get("/", async () => ({
    status: "ok",
    service: "BRAVO Barbershop API",
    health: "/health",
  }));

  app.get("/health", async () => {
    await db.$queryRaw`SELECT 1`;
    return { status: "ok", database: "connected" };
  });

  app.get("/api/v1/services", async () => {
    const services = await db.service.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, slug: true, name: true, description: true, durationMin: true, price: true },
    });
    return { data: services.map(service => ({ ...service, price: Number(service.price) })) };
  });

  app.get("/api/v1/barbers", async () => {
    const barbers = await db.barber.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, slug: true, name: true, photoUrl: true, bio: true, experienceYears: true },
    });
    return { data: barbers };
  });

  app.get("/api/v1/barbers/:id", async request => {
    const { id } = barberParam.parse(request.params);
    const barber = await db.barber.findFirst({
      where: uuid.safeParse(id).success ? { id, isActive: true } : { slug: id, isActive: true },
      select: {
        id: true, slug: true, name: true, photoUrl: true, bio: true, experienceYears: true,
        portfolio: { orderBy: { sortOrder: "asc" }, select: { id: true, imageUrl: true } },
        services: {
          where: { isEnabled: true, service: { isActive: true } },
          select: { durationMin: true, price: true, service: { select: { id: true, slug: true, name: true, durationMin: true, price: true } } },
        },
      },
    });
    if (!barber) throw Object.assign(new Error("Barber not found"), { statusCode: 404 });
    return {
      data: {
        ...barber,
        services: barber.services.map(item => ({
          ...item.service,
          durationMin: item.durationMin ?? item.service.durationMin,
          price: Number(item.price ?? item.service.price),
        })),
      },
    };
  });

  app.post("/api/v1/telegram/auth", async request => ({ data: { user: telegramUserFromRequest(request, env.TELEGRAM_BOT_TOKEN) } }));

  registerTelegramWebhook(app, telegramBot, env);
  registerBookingRoutes(app, db, env.TELEGRAM_BOT_TOKEN, telegramBot, env.TELEGRAM_ADMIN_CHAT_ID);
  registerAdminRoutes(app, db, env);

  app.setNotFoundHandler((_request, reply) => reply.code(404).send({ error: { code: "NOT_FOUND", message: "Маршрут не найден" } }));
  app.setErrorHandler((error: FastifyError | ZodError, request, reply) => {
    if (error instanceof ZodError) {
      return reply.code(400).send({ error: { code: "VALIDATION_ERROR", message: "Некорректные параметры запроса", details: error.issues } });
    }
    const statusCode = "statusCode" in error && typeof error.statusCode === "number" ? error.statusCode : hasExclusionViolation(error) ? 409 : 500;
    if (statusCode >= 500) request.log.error(error);
    const apiCode = "apiCode" in error && typeof error.apiCode === "string" ? error.apiCode : undefined;
    const code = apiCode ?? (hasExclusionViolation(error) ? "SLOT_TAKEN" : statusCode === 404 ? "NOT_FOUND" : statusCode === 403 ? "FORBIDDEN" : statusCode === 401 ? "UNAUTHORIZED" : "INTERNAL_ERROR");
    const message = code === "SLOT_TAKEN" ? "Это время уже занято" : statusCode === 404 ? "Данные не найдены" : statusCode === 403 ? "Источник запроса не разрешён" : statusCode >= 500 ? "Внутренняя ошибка сервера" : error.message;
    return reply.code(statusCode).send({ error: { code, message } });
  });

  app.addHook("onClose", async () => db.$disconnect());
  return app;
}

function hasExclusionViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const serialized = JSON.stringify(error);
  return serialized.includes("23P01") || serialized.includes("bookings_no_overlap");
}

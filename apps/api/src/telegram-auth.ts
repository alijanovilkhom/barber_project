import { createHmac, timingSafeEqual } from "node:crypto";
import type { FastifyRequest } from "fastify";

export type TelegramUser = { id: number; first_name: string; last_name?: string; username?: string; language_code?: string };

export function validateTelegramInitData(initData: string, botToken: string, maxAgeSeconds = 86_400, now = Date.now()): TelegramUser {
  const params = new URLSearchParams(initData);
  const receivedHash = params.get("hash") ?? "";
  const authDate = Number(params.get("auth_date"));
  const userJson = params.get("user");
  if (!receivedHash || !Number.isFinite(authDate) || !userJson) throw unauthorized("Incomplete Telegram data");
  params.delete("hash");
  const dataCheckString = [...params.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join("\n");
  const secret = createHmac("sha256", "WebAppData").update(botToken).digest();
  const calculatedHash = createHmac("sha256", secret).update(dataCheckString).digest("hex");
  const received = Buffer.from(receivedHash, "hex");
  const calculated = Buffer.from(calculatedHash, "hex");
  if (received.length !== calculated.length || !timingSafeEqual(received, calculated)) throw unauthorized("Invalid Telegram signature");
  const age = Math.floor(now / 1000) - authDate;
  if (age < -300 || age > maxAgeSeconds) throw unauthorized("Expired Telegram data");
  try {
    const user = JSON.parse(userJson) as TelegramUser;
    if (!Number.isSafeInteger(user.id) || !user.first_name) throw new Error("Invalid user");
    return user;
  } catch {
    throw unauthorized("Invalid Telegram user");
  }
}

export function telegramUserFromRequest(request: FastifyRequest, botToken?: string, required = true) {
  const header = request.headers.authorization;
  if (!header?.startsWith("tma ")) {
    if (required) throw unauthorized("Telegram authorization required");
    return null;
  }
  if (!botToken) throw Object.assign(new Error("Telegram bot is not configured"), { statusCode: 503, apiCode: "TELEGRAM_NOT_CONFIGURED" });
  return validateTelegramInitData(header.slice(4), botToken);
}

function unauthorized(message: string) {
  return Object.assign(new Error(message), { statusCode: 401, apiCode: "TELEGRAM_AUTH_INVALID" });
}

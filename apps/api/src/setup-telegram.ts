import "../../../packages/db/src/env.js";
import { createHash } from "node:crypto";
import { Bot } from "grammy";
import { readApiEnv } from "./env.js";

const env = readApiEnv();
if (!env.TELEGRAM_BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN is required");
if (!env.API_PUBLIC_URL) throw new Error("API_PUBLIC_URL is required");
const baseUrl = env.API_PUBLIC_URL.replace(/\/$/, "");
const miniappUrl = env.MINIAPP_PUBLIC_URL ?? `${baseUrl}/miniapp/`;
const secretToken = env.TELEGRAM_WEBHOOK_SECRET ?? createHash("sha256").update(`${env.TELEGRAM_BOT_TOKEN}:bravo-webhook`).digest("hex");
const bot = new Bot(env.TELEGRAM_BOT_TOKEN);

await bot.api.setWebhook(`${baseUrl}/telegram/webhook`, { secret_token: secretToken, allowed_updates: ["message"] });
await bot.api.setChatMenuButton({ menu_button: { type: "web_app", text: "Записаться", web_app: { url: miniappUrl } } });
await bot.api.setMyCommands([
  { command: "start", description: "Открыть BRAVO и записаться" },
  { command: "chatid", description: "Показать ID текущего чата" },
]);
const me = await bot.api.getMe();
console.log(`Telegram настроен: @${me.username}, Mini App: ${miniappUrl}`);

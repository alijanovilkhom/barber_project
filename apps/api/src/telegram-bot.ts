import { createHash } from "node:crypto";
import { Bot, InlineKeyboard, webhookCallback } from "grammy";
import type { FastifyInstance } from "fastify";
import type { DatabaseClient } from "@barber/db";
import type { ApiEnv } from "./env.ts";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Asia/Tashkent", day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit",
  }).format(value);
}

export function createTelegramBot(db: DatabaseClient, env: ApiEnv) {
  if (!env.TELEGRAM_BOT_TOKEN) return undefined;
  const bot = new Bot(env.TELEGRAM_BOT_TOKEN);
  const miniappUrl = env.MINIAPP_PUBLIC_URL ?? (env.API_PUBLIC_URL ? `${env.API_PUBLIC_URL.replace(/\/$/, "")}/miniapp/` : undefined);

  bot.command("start", async ctx => {
    if (!ctx.from) return;
    const payload = ctx.match?.trim();
    if (payload?.startsWith("b_")) {
      const token = payload.slice(2);
      const booking = await db.booking.findUnique({ where: { manageToken: token }, include: { client: true, barber: true } });
      if (!booking) return ctx.reply("Запись не найдена. Проверьте ссылку и попробуйте ещё раз.");
      const telegramId = BigInt(ctx.from.id);
      const occupied = await db.client.findUnique({ where: { telegramId } });
      if (occupied && occupied.id !== booking.clientId) return ctx.reply("Этот Telegram уже связан с другим клиентом.");
      await db.client.update({ where: { id: booking.clientId }, data: { telegramId, telegramChatId: BigInt(ctx.chat.id) } });
      return ctx.reply(`Готово. Запись у ${booking.barber.name} на ${formatDate(booking.startsAt)} привязана к Telegram.`, miniappUrl ? { reply_markup: new InlineKeyboard().webApp("Открыть мои записи", miniappUrl) } : undefined);
    }
    if (payload?.startsWith("barber_")) {
      const code = payload.slice(7);
      const key = `barber_link:${code}`;
      const record = await db.setting.findUnique({ where: { key } });
      const value = record?.value as { barberId?: string; expiresAt?: string } | undefined;
      if (!value?.barberId || !value.expiresAt || new Date(value.expiresAt) < new Date()) return ctx.reply("Ссылка недействительна или уже использована.");
      const barber = await db.barber.update({ where: { id: value.barberId }, data: { telegramChatId: BigInt(ctx.chat.id) } });
      await db.setting.delete({ where: { key } });
      return ctx.reply(`Готово, ${barber.name}. Уведомления о новых записях будут приходить сюда.`);
    }
    const keyboard = miniappUrl ? new InlineKeyboard().webApp("Записаться", miniappUrl) : undefined;
    return ctx.reply("Добро пожаловать в BRAVO. Здесь можно записаться, посмотреть свои записи, перенести или отменить визит.", keyboard ? { reply_markup: keyboard } : undefined);
  });

  bot.command("chatid", ctx => ctx.reply(`ID этого чата: ${ctx.chat.id}`));

  bot.catch(error => console.error("Telegram bot error", error.error));
  return bot;
}

export function registerTelegramWebhook(app: FastifyInstance, bot: Bot | undefined, env: ApiEnv) {
  if (!bot) return;
  const secretToken = env.TELEGRAM_WEBHOOK_SECRET ?? createHash("sha256").update(`${env.TELEGRAM_BOT_TOKEN}:bravo-webhook`).digest("hex");
  const handler = webhookCallback(bot, "fastify", { secretToken });
  app.post("/telegram/webhook", handler);
}

export async function notifyBooking(db: DatabaseClient, bot: Bot | undefined, adminChatId: string | undefined, bookingId: string, event: "created" | "cancelled" | "rescheduled") {
  if (!bot) return;
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { client: true, barber: true, services: true },
  });
  if (!booking) return;
  const labels = { created: "Новая запись", cancelled: "Запись отменена", rescheduled: "Запись перенесена" } as const;
  const text = `${labels[event]}\n${booking.services.map(item => item.name).join(", ")}\n${formatDate(booking.startsAt)}\nМастер: ${booking.barber.name}\nКлиент: ${booking.client.name}, ${booking.client.phone}`;
  const recipients = new Set<string>();
  if (booking.client.telegramChatId) recipients.add(booking.client.telegramChatId.toString());
  if (booking.barber.telegramChatId) recipients.add(booking.barber.telegramChatId.toString());
  if (adminChatId) recipients.add(adminChatId);
  await Promise.allSettled([...recipients].map(chatId => bot.api.sendMessage(chatId, text)));
}

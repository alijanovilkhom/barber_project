import "../../../packages/db/src/env.js";
import { randomBytes } from "node:crypto";
import { createDatabaseClient } from "@barber/db";

const slug = process.argv[2];
const username = process.env.TELEGRAM_BOT_USERNAME;
if (!slug) throw new Error("Укажите slug мастера: npm run telegram:barber-link -- <slug>");
if (!username) throw new Error("Добавьте TELEGRAM_BOT_USERNAME в .env");
const db = createDatabaseClient();
try {
  const barber = await db.barber.findUnique({ where: { slug } });
  if (!barber) throw new Error(`Мастер ${slug} не найден`);
  const code = randomBytes(18).toString("base64url");
  await db.setting.create({ data: { key: `barber_link:${code}`, value: { barberId: barber.id, expiresAt: new Date(Date.now() + 30 * 60_000).toISOString() } } });
  console.log(`Одноразовая ссылка для ${barber.name} (действует 30 минут):`);
  console.log(`https://t.me/${username}?start=barber_${code}`);
} finally {
  await db.$disconnect();
}

import "../../../packages/db/src/env.ts";
import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { createDatabaseClient } from "@barber/db";
import { buildApp } from "../src/app.ts";
import { tashkentDate } from "../src/availability.ts";

const botToken = "123456:test-miniapp-token";
function initData(userId: number) {
  const params = new URLSearchParams({ auth_date: String(Math.floor(Date.now() / 1000)), user: JSON.stringify({ id: userId, first_name: "Miniapp" }) });
  const check = [...params.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join("\n");
  const secret = createHmac("sha256", "WebAppData").update(botToken).digest();
  params.set("hash", createHmac("sha256", secret).update(check).digest("hex"));
  return params.toString();
}

test("Telegram user creates a booking and sees it in My bookings", async () => {
  const app = buildApp({ NODE_ENV: "test", API_HOST: "127.0.0.1", API_PORT: 3001, APP_URL: "http://localhost:3000", MINIAPP_URL: "http://localhost:5173", TELEGRAM_BOT_TOKEN: botToken });
  const cleanup = createDatabaseClient();
  const userId = 800_000_000 + Number(Date.now().toString().slice(-8));
  const phone = `+99895${Date.now().toString().slice(-7)}`;
  let token = "";
  const authorization = `tma ${initData(userId)}`;
  try {
    const auth = await app.inject({ method: "POST", url: "/api/v1/telegram/auth", headers: { authorization } });
    assert.equal(auth.statusCode, 200);
    const service = (await app.inject({ method: "GET", url: "/api/v1/services" })).json().data[0];
    const tomorrow = tashkentDate(new Date(Date.now() + 86_400_000));
    const query = new URLSearchParams({ serviceIds: service.id, barberId: "any", date: tomorrow });
    const slot = (await app.inject({ method: "GET", url: `/api/v1/availability?${query}` })).json().data.slots[0];
    const created = await app.inject({ method: "POST", url: "/api/v1/bookings", headers: { authorization }, payload: { serviceIds: [service.id], barberId: "any", startsAt: slot.startsAt, client: { name: "Miniapp Test", phone } } });
    assert.equal(created.statusCode, 201);
    token = created.json().data.manageToken;
    const mine = await app.inject({ method: "GET", url: "/api/v1/me/bookings", headers: { authorization } });
    assert.equal(mine.statusCode, 200);
    assert(mine.json().data.some((booking: { manageToken: string }) => booking.manageToken === token));
  } finally {
    if (token) await cleanup.booking.deleteMany({ where: { manageToken: token } });
    await cleanup.client.deleteMany({ where: { telegramId: BigInt(userId), bookings: { none: {} } } });
    await cleanup.$disconnect();
    await app.close();
  }
});

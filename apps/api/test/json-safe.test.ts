import assert from "node:assert/strict";
import { test } from "node:test";
import { jsonSafe } from "../src/json-safe.js";

test("serializes nested Prisma BigInt values without losing booking data", () => {
  const value = {
    data: {
      id: "booking-1",
      startsAt: new Date("2026-10-09T05:00:00.000Z"),
      client: { telegramId: 1234567890123456789n },
      barber: { telegramChatId: null },
      services: [{ price: 120000 }],
    },
  };

  const result = jsonSafe(value);
  assert.equal(result.data.client.telegramId, "1234567890123456789");
  assert.equal(result.data.startsAt, "2026-10-09T05:00:00.000Z");
  assert.equal(result.data.services[0].price, 120000);
});

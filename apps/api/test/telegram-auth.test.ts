import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { validateTelegramInitData } from "../src/telegram-auth.js";

const token = "123456:test-token";
const now = Date.UTC(2026, 9, 6, 10);

function signedInitData(authDate = Math.floor(now / 1000)) {
  const params = new URLSearchParams({ auth_date: String(authDate), query_id: "test-query", user: JSON.stringify({ id: 123456789, first_name: "Aziz" }) });
  const check = [...params.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join("\n");
  const secret = createHmac("sha256", "WebAppData").update(token).digest();
  params.set("hash", createHmac("sha256", secret).update(check).digest("hex"));
  return params.toString();
}

test("accepts valid signed Telegram initData", () => {
  assert.equal(validateTelegramInitData(signedInitData(), token, 86_400, now).id, 123456789);
});

test("rejects a modified Telegram user", () => {
  const modified = signedInitData().replace("Aziz", "Timur");
  assert.throws(() => validateTelegramInitData(modified, token, 86_400, now), /signature/i);
});

test("rejects expired Telegram initData", () => {
  assert.throws(() => validateTelegramInitData(signedInitData(Math.floor(now / 1000) - 90_000), token, 86_400, now), /expired/i);
});

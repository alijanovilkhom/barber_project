import "../../../packages/db/src/env.js";
import test from "node:test";
import assert from "node:assert/strict";
import { createDatabaseClient } from "@barber/db";
import { buildApp } from "../src/create-app.js";
import { tashkentDate } from "../src/availability.js";

test("only one concurrent request can reserve a barber slot", async () => {
  const app = buildApp({ NODE_ENV: "test", API_HOST: "127.0.0.1", API_PORT: 3001, APP_URL: "http://localhost:3000" });
  const cleanup = createDatabaseClient();
  const phones = [`+99890${Date.now().toString().slice(-7)}`, `+99891${Date.now().toString().slice(-7)}`];
  const tokens: string[] = [];
  try {
    const services = (await app.inject({ method: "GET", url: "/api/v1/services" })).json().data;
    const barbers = (await app.inject({ method: "GET", url: "/api/v1/barbers" })).json().data;
    const tomorrow = tashkentDate(new Date(Date.now() + 86_400_000));
    const query = new URLSearchParams({ serviceIds: services[0].id, barberId: barbers[0].id, date: tomorrow });
    const availability = (await app.inject({ method: "GET", url: `/api/v1/availability?${query}` })).json().data;
    assert(availability.slots.length > 0, "expected a free slot for race test");
    const payload = (index: number) => ({ serviceIds: [services[0].id], barberId: barbers[0].id, startsAt: availability.slots[0].startsAt, client: { name: `Race Test ${index}`, phone: phones[index] } });
    const responses = await Promise.all([0, 1].map(index => app.inject({ method: "POST", url: "/api/v1/bookings", payload: payload(index) })));
    for (const response of responses) if (response.statusCode === 201) tokens.push(response.json().data.manageToken);
    assert.deepEqual(responses.map(response => response.statusCode).sort(), [201, 409]);
    assert.equal(responses.find(response => response.statusCode === 409)?.json().error.code, "SLOT_TAKEN");
  } finally {
    if (tokens.length) await cleanup.booking.deleteMany({ where: { manageToken: { in: tokens } } });
    await cleanup.client.deleteMany({ where: { phone: { in: phones }, bookings: { none: {} } } });
    await cleanup.$disconnect();
    await app.close();
  }
});

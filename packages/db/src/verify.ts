import assert from "node:assert/strict";
import { createDatabaseClient } from "./client.js";
import { requireDatabaseUrl } from "./env.js";

const db = createDatabaseClient(requireDatabaseUrl("DIRECT_URL"));
try {
  const [services, barbers, settings, rls] = await Promise.all([
    db.service.findMany({ orderBy: { sortOrder: "asc" }, select: { slug: true, name: true, price: true, durationMin: true } }),
    db.barber.findMany({ orderBy: { sortOrder: "asc" }, select: { slug: true, name: true, _count: { select: { services: true, workingHours: true, breaks: true } } } }),
    db.setting.findMany(),
    db.$queryRaw<{ name: string; enabled: boolean }[]>`SELECT relname AS name, relrowsecurity AS enabled FROM pg_class JOIN pg_namespace ON pg_namespace.oid = relnamespace WHERE nspname = 'public' AND relkind = 'r' AND relname <> '_prisma_migrations'`,
  ]);
  assert(services.length >= 4, "Expected seeded services");
  assert(barbers.length >= 3, "Expected seeded barbers");
  assert.equal(settings.find(item => item.key === "timezone")?.value, "Asia/Tashkent");
  for (const slug of ["timur", "aziz", "daniyar"]) {
    const barber = barbers.find(item => item.slug === slug);
    assert(barber && barber._count.services >= 4 && barber._count.workingHours === 7, `Incomplete schedule/services for ${slug}`);
  }
  const tables = ["services", "barbers", "portfolio_items", "barber_services", "working_hours", "breaks", "time_off", "clients", "bookings", "booking_services", "reviews", "settings", "admin_users"];
  for (const table of tables) assert(rls.some(row => row.name === table && row.enabled), `Missing table or RLS: ${table}`);
  console.table(services.map(service => ({ ...service, price: service.price.toString() })));
  console.table(barbers.map(barber => ({ name: barber.name, ...barber._count })));
  console.log(`Verified ${tables.length} tables with RLS; ${settings.length} settings; timezone Asia/Tashkent.`);
} finally {
  await db.$disconnect();
}

import argon2 from "argon2";
import type { FastifyInstance } from "fastify";
import type { DatabaseClient } from "@barber/db";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { getAdminAnalytics } from "./admin-analytics.ts";
import type { ApiEnv } from "./env.ts";
import { adminCookieName, createAdminSession, requireAdmin, setAdminCookie } from "./admin-auth.ts";

const loginBody = z.object({ login: z.string().trim().min(3).max(80), password: z.string().min(8).max(200) });
const bookingQuery = z.object({ from: z.string().datetime().optional(), to: z.string().datetime().optional(), status: z.enum(["confirmed", "completed", "cancelled", "no_show"]).optional() });
const statusBody = z.object({ status: z.enum(["confirmed", "completed", "cancelled", "no_show"]) });
const idParam = z.object({ id: z.string().uuid() });
const serviceInput = z.object({ slug: z.string().trim().min(2).max(80).regex(/^[a-z0-9-]+$/), name: z.string().trim().min(2).max(100), description: z.string().trim().max(500).nullable().optional(), durationMin: z.number().int().min(5).max(480), price: z.number().min(0).max(100_000_000), isActive: z.boolean().default(true), sortOrder: z.number().int().default(0) });
const barberInput = z.object({ slug: z.string().trim().min(2).max(80).regex(/^[a-z0-9-]+$/), name: z.string().trim().min(2).max(100), bio: z.string().trim().max(1000).nullable().optional(), photoUrl: z.string().trim().max(500).nullable().optional(), experienceYears: z.number().int().min(0).max(80), isActive: z.boolean().default(true), sortOrder: z.number().int().default(0), serviceIds: z.array(z.string().uuid()).default([]) });
const scheduleInput = z.object({ hours: z.array(z.object({ weekday: z.number().int().min(0).max(6), start: z.string().regex(/^\d{2}:\d{2}$/), end: z.string().regex(/^\d{2}:\d{2}$/), off: z.boolean() })).length(7), breaks: z.array(z.object({ weekday: z.number().int().min(0).max(6), start: z.string().regex(/^\d{2}:\d{2}$/), end: z.string().regex(/^\d{2}:\d{2}$/) })) });
const reviewVisibility = z.object({ isPublic: z.boolean() });
const settingInput = z.object({ timezone: z.string().min(3).max(80), cancel_cutoff_min: z.number().int().min(0).max(10080), slot_step_min: z.number().int().min(5).max(120), booking_horizon_days: z.number().int().min(1).max(180), min_notice_min: z.number().int().min(0).max(10080), reminder_day_minutes: z.number().int().min(60).max(10080), reminder_short_minutes: z.number().int().min(5).max(1440), review_delay_min: z.number().int().min(0).max(10080), review_public_min_rating: z.number().int().min(1).max(5) });
const timeOffInput = z.object({ barberId: z.string().uuid().nullable(), startsAt: z.string().datetime(), endsAt: z.string().datetime(), type: z.enum(["day_off", "vacation", "sick_leave", "other"]), note: z.string().trim().max(300).nullable().optional() });
const portfolioInput = z.object({ imageUrl: z.string().trim().min(1).max(500), sortOrder: z.number().int().default(0) });
const manualBookingInput = z.object({ serviceIds: z.array(z.string().uuid()).min(1).max(10), barberId: z.string().uuid(), startsAt: z.string().datetime({ offset: true }), client: z.object({ name: z.string().trim().min(2).max(60), phone: z.string().trim().min(9).max(25) }) });

export function registerAdminRoutes(app: FastifyInstance, db: DatabaseClient, env: ApiEnv) {
  app.post("/api/v1/admin/login", { config: { rateLimit: { max: 5, timeWindow: "15 minutes" } } }, async (request, reply) => {
    const body = loginBody.parse(request.body);
    const admin = await db.adminUser.findUnique({ where: { login: body.login } });
    if (!admin || !(await argon2.verify(admin.passwordHash, body.password))) {
      throw Object.assign(new Error("Неверный логин или пароль"), { statusCode: 401, apiCode: "INVALID_CREDENTIALS" });
    }
    setAdminCookie(reply, createAdminSession(admin.id, env), env);
    return { data: { id: admin.id, login: admin.login } };
  });

  app.post("/api/v1/admin/logout", async (_request, reply) => {
    reply.clearCookie(adminCookieName, { path: "/" });
    return { data: { ok: true } };
  });

  app.get("/api/v1/admin/me", async request => {
    const session = requireAdmin(request, env);
    const admin = await db.adminUser.findUnique({ where: { id: session.adminId }, select: { id: true, login: true } });
    if (!admin) throw Object.assign(new Error("Authentication required"), { statusCode: 401, apiCode: "ADMIN_UNAUTHORIZED" });
    return { data: admin };
  });

  app.get("/api/v1/admin/bookings", async request => {
    requireAdmin(request, env);
    const query = bookingQuery.parse(request.query);
    const rows = await db.booking.findMany({
      where: { status: query.status, startsAt: query.from || query.to ? { gte: query.from ? new Date(query.from) : undefined, lte: query.to ? new Date(query.to) : undefined } : undefined },
      orderBy: { startsAt: "desc" }, take: 250,
      include: { client: { select: { name: true, phone: true } }, barber: { select: { id: true, name: true } }, services: { select: { serviceId: true, name: true } } },
    });
    return { data: rows.map(row => ({ ...row, totalPrice: Number(row.totalPrice), timeRange: undefined })) };
  });

  app.get("/api/v1/admin/analytics", async request => {
    requireAdmin(request, env);
    const query = z.object({ from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).parse(request.query);
    return { data: await getAdminAnalytics(db, query.from, query.to) };
  });

  app.post("/api/v1/admin/bookings/:id/status", async request => {
    requireAdmin(request, env);
    const { id } = idParam.parse(request.params); const { status } = statusBody.parse(request.body);
    const row = await db.booking.update({ where: { id }, data: { status }, include: { client: true, barber: true, services: true } });
    return { data: { ...row, totalPrice: Number(row.totalPrice), timeRange: undefined } };
  });

  app.get("/api/v1/admin/services", async request => { requireAdmin(request, env); const rows = await db.service.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }); return { data: rows.map(row => ({ ...row, price: Number(row.price) })) }; });
  app.post("/api/v1/admin/services", async request => { requireAdmin(request, env); const body = serviceInput.parse(request.body); const row = await db.service.create({ data: body }); return { data: { ...row, price: Number(row.price) } }; });
  app.put("/api/v1/admin/services/:id", async request => { requireAdmin(request, env); const { id } = idParam.parse(request.params); const body = serviceInput.parse(request.body); const row = await db.service.update({ where: { id }, data: body }); return { data: { ...row, price: Number(row.price) } }; });

  app.get("/api/v1/admin/barbers", async request => { requireAdmin(request, env); const rows = await db.barber.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include: { services: { select: { serviceId: true, isEnabled: true } } } }); return { data: rows.map(row => ({ ...row, serviceIds: row.services.filter(link => link.isEnabled).map(link => link.serviceId), services: undefined })) }; });
  app.post("/api/v1/admin/barbers", async request => { requireAdmin(request, env); const { serviceIds, ...body } = barberInput.parse(request.body); const row = await db.barber.create({ data: { ...body, services: { create: serviceIds.map(serviceId => ({ serviceId })) } } }); return { data: row }; });
  app.put("/api/v1/admin/barbers/:id", async request => { requireAdmin(request, env); const { id } = idParam.parse(request.params); const { serviceIds, ...body } = barberInput.parse(request.body); const row = await db.$transaction(async tx => { await tx.barberService.deleteMany({ where: { barberId: id } }); return tx.barber.update({ where: { id }, data: { ...body, services: { create: serviceIds.map(serviceId => ({ serviceId })) } } }); }); return { data: row }; });

  app.get("/api/v1/admin/barbers/:id/portfolio", async request => { requireAdmin(request, env); const { id } = idParam.parse(request.params); return { data: await db.portfolioItem.findMany({ where: { barberId: id }, orderBy: { sortOrder: "asc" } }) }; });
  app.post("/api/v1/admin/barbers/:id/portfolio", async request => { requireAdmin(request, env); const { id } = idParam.parse(request.params); const body = portfolioInput.parse(request.body); return { data: await db.portfolioItem.create({ data: { barberId: id, ...body } }) }; });
  app.delete("/api/v1/admin/portfolio/:id", async request => { requireAdmin(request, env); const { id } = idParam.parse(request.params); await db.portfolioItem.delete({ where: { id } }); return { data: { ok: true } }; });

  app.post("/api/v1/admin/barbers/:id/photo", async request => {
    requireAdmin(request, env); const { id } = idParam.parse(request.params); const file = await request.file();
    if (!file || !["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) throw Object.assign(new Error("Загрузите JPG, PNG или WebP"), { statusCode: 400, apiCode: "INVALID_IMAGE" });
    const bytes = await file.toBuffer(); const ext = file.mimetype === "image/jpeg" ? "jpg" : file.mimetype.split("/")[1]; const objectPath = `barbers/${id}/${randomUUID()}.${ext}`;
    const supabaseUrl = process.env.SUPABASE_URL; const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) throw Object.assign(new Error("Supabase Storage is not configured"), { statusCode: 503 });
    const body = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    const response = await fetch(`${supabaseUrl}/storage/v1/object/barbershop/${objectPath}`, { method: "POST", headers: { authorization: `Bearer ${serviceKey}`, apikey: serviceKey, "content-type": file.mimetype, "x-upsert": "true" }, body });
    if (!response.ok) throw Object.assign(new Error("Не удалось сохранить фотографию"), { statusCode: 502 });
    const photoUrl = `${supabaseUrl}/storage/v1/object/public/barbershop/${objectPath}`;
    const barber = await db.barber.update({ where: { id }, data: { photoUrl } });
    return { data: { photoUrl: barber.photoUrl } };
  });

  app.get("/api/v1/admin/barbers/:id/schedule", async request => {
    requireAdmin(request, env); const { id } = idParam.parse(request.params);
    const [hours, breaks, timeOff] = await Promise.all([db.workingHours.findMany({ where: { barberId: id }, orderBy: { weekday: "asc" } }), db.break.findMany({ where: { barberId: id }, orderBy: [{ weekday: "asc" }, { startTime: "asc" }] }), db.timeOff.findMany({ where: { OR: [{ barberId: id }, { barberId: null }], endsAt: { gte: new Date() } }, orderBy: { startsAt: "asc" }, take: 100 })]);
    const time = (value: Date) => `${String(value.getUTCHours()).padStart(2, "0")}:${String(value.getUTCMinutes()).padStart(2, "0")}`;
    return { data: { hours: Array.from({ length: 7 }, (_, weekday) => { const row = hours.find(item => item.weekday === weekday); return { weekday, start: row ? time(row.startTime) : "10:00", end: row ? time(row.endTime) : "20:00", off: !row }; }), breaks: breaks.map(row => ({ weekday: row.weekday, start: time(row.startTime), end: time(row.endTime) })), timeOff } };
  });
  app.put("/api/v1/admin/barbers/:id/schedule", async request => {
    requireAdmin(request, env); const { id } = idParam.parse(request.params); const body = scheduleInput.parse(request.body);
    for (const row of body.hours) if (!row.off && row.start >= row.end) throw Object.assign(new Error("Время открытия должно быть раньше закрытия"), { statusCode: 400, apiCode: "INVALID_SCHEDULE" });
    for (const row of body.breaks) if (row.start >= row.end) throw Object.assign(new Error("Обед должен начинаться раньше окончания"), { statusCode: 400, apiCode: "INVALID_SCHEDULE" });
    await db.$transaction(async tx => { await tx.workingHours.deleteMany({ where: { barberId: id } }); await tx.break.deleteMany({ where: { barberId: id } }); await tx.workingHours.createMany({ data: body.hours.filter(row => !row.off).map(row => ({ barberId: id, weekday: row.weekday, startTime: new Date(`1970-01-01T${row.start}:00Z`), endTime: new Date(`1970-01-01T${row.end}:00Z`) })) }); if (body.breaks.length) await tx.break.createMany({ data: body.breaks.map(row => ({ barberId: id, weekday: row.weekday, startTime: new Date(`1970-01-01T${row.start}:00Z`), endTime: new Date(`1970-01-01T${row.end}:00Z`) })) }); });
    return { data: { ok: true } };
  });
  app.post("/api/v1/admin/time-off", async request => { requireAdmin(request, env); const body = timeOffInput.parse(request.body); if (new Date(body.startsAt) >= new Date(body.endsAt)) throw Object.assign(new Error("Дата начала должна быть раньше окончания"), { statusCode: 400 }); return { data: await db.timeOff.create({ data: body }) }; });
  app.delete("/api/v1/admin/time-off/:id", async request => { requireAdmin(request, env); const { id } = idParam.parse(request.params); await db.timeOff.delete({ where: { id } }); return { data: { ok: true } }; });

  app.post("/api/v1/admin/bookings", async request => {
    requireAdmin(request, env); const body = manualBookingInput.parse(request.body);
    const digits = body.client.phone.replace(/\D/g, ""); if (!/^998\d{9}$/.test(digits)) throw Object.assign(new Error("Введите номер в формате +998 90 123 45 67"), { statusCode: 400 });
    const [services, links] = await Promise.all([db.service.findMany({ where: { id: { in: body.serviceIds }, isActive: true } }), db.barberService.findMany({ where: { barberId: body.barberId, serviceId: { in: body.serviceIds }, isEnabled: true } })]);
    if (services.length !== new Set(body.serviceIds).size || links.length !== services.length) throw Object.assign(new Error("Выбранные услуги недоступны для мастера"), { statusCode: 422 });
    const availability = await (await import("./availability.ts")).getAvailability(db, { serviceIds: body.serviceIds, barberId: body.barberId, date: new Date(new Date(body.startsAt).getTime() + 5 * 3600000).toISOString().slice(0, 10) });
    const slot = availability.slots.find(item => item.startsAt === new Date(body.startsAt).toISOString()); if (!slot) throw Object.assign(new Error("Это время уже занято или недоступно"), { statusCode: 409, apiCode: "SLOT_TAKEN" });
    const linkById = new Map(links.map(item => [item.serviceId, item]));
    const snapshots = services.map(service => ({ serviceId: service.id, name: service.name, durationMin: linkById.get(service.id)?.durationMin ?? service.durationMin, price: linkById.get(service.id)?.price ?? service.price }));
    const durationMin = snapshots.reduce((sum, item) => sum + item.durationMin, 0); const price = snapshots.reduce((sum, item) => sum + Number(item.price), 0); const phone = `+${digits}`;
    const booking = await db.$transaction(async tx => { const client = await tx.client.upsert({ where: { phone }, create: { phone, name: body.client.name }, update: { name: body.client.name } }); return tx.booking.create({ data: { clientId: client.id, barberId: body.barberId, startsAt: new Date(body.startsAt), endsAt: new Date(new Date(body.startsAt).getTime() + durationMin * 60000), totalDurationMin: durationMin, totalPrice: price, source: "admin", manageToken: randomUUID(), services: { create: snapshots } }, include: { client: true, barber: true, services: true } }); });
    return { data: { ...booking, totalPrice: Number(booking.totalPrice), timeRange: undefined } };
  });
  app.put("/api/v1/admin/bookings/:id/reschedule", async request => { requireAdmin(request, env); const { id } = idParam.parse(request.params); const body = z.object({ barberId: z.string().uuid(), startsAt: z.string().datetime({ offset: true }) }).parse(request.body); const existing = await db.booking.findUnique({ where: { id }, include: { services: true } }); if (!existing || existing.status !== "confirmed") throw Object.assign(new Error("Активная запись не найдена"), { statusCode: 404 }); const serviceIds = existing.services.map(row => row.serviceId); const day = new Date(new Date(body.startsAt).getTime()+5*3600000).toISOString().slice(0,10); const availability = await (await import("./availability.ts")).getAvailability(db,{serviceIds,barberId:body.barberId,date:day}); if (!availability.slots.some(slot=>slot.startsAt===new Date(body.startsAt).toISOString())) throw Object.assign(new Error("Это время уже занято или недоступно"),{statusCode:409,apiCode:"SLOT_TAKEN"}); const row=await db.booking.update({where:{id},data:{barberId:body.barberId,startsAt:new Date(body.startsAt),endsAt:new Date(new Date(body.startsAt).getTime()+existing.totalDurationMin*60000)},include:{client:true,barber:true,services:true}}); return {data:{...row,totalPrice:Number(row.totalPrice),timeRange:undefined}}; });

  app.get("/api/v1/admin/settings", async request => { requireAdmin(request, env); const keys = ["timezone", "cancel_cutoff_min", "slot_step_min", "booking_horizon_days", "min_notice_min", "reminder_day_minutes", "reminder_short_minutes", "review_delay_min", "review_public_min_rating"]; const rows = await db.setting.findMany({ where: { key: { in: keys } } }); return { data: Object.fromEntries(rows.map(row => [row.key, row.value])) }; });
  app.put("/api/v1/admin/settings", async request => { requireAdmin(request, env); const body = settingInput.parse(request.body); await db.$transaction(Object.entries(body).map(([key, value]) => db.setting.upsert({ where: { key }, create: { key, value }, update: { value } }))); return { data: body }; });

  app.get("/api/v1/admin/reviews", async request => { requireAdmin(request, env); const rows = await db.review.findMany({ orderBy: { createdAt: "desc" }, include: { client: { select: { name: true } }, barber: { select: { name: true } }, booking: { select: { startsAt: true } } } }); return { data: rows }; });
  app.put("/api/v1/admin/reviews/:id", async request => { requireAdmin(request, env); const { id } = idParam.parse(request.params); const { isPublic } = reviewVisibility.parse(request.body); return { data: await db.review.update({ where: { id }, data: { isPublic } }) }; });
}

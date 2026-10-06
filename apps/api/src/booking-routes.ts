import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import type { DatabaseClient } from "@barber/db";
import { z } from "zod";
import { getAvailability, getAvailableDays, tashkentDate, type AvailabilityInput } from "./availability.ts";
import { telegramUserFromRequest } from "./telegram-auth.ts";
import type { Bot } from "grammy";
import { notifyBooking } from "./telegram-bot.ts";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const availabilityQuery = z.object({
  serviceIds: z.string().min(1).transform(value => value.split(",").filter(Boolean)).pipe(z.array(z.string().uuid()).min(1).max(10)),
  barberId: z.union([z.literal("any"), z.string().uuid()]),
  date: z.string().regex(datePattern),
});
const daysQuery = z.object({
  serviceIds: z.string().min(1).transform(value => value.split(",").filter(Boolean)).pipe(z.array(z.string().uuid()).min(1).max(10)),
  barberId: z.union([z.literal("any"), z.string().uuid()]),
  from: z.string().regex(datePattern).optional(),
  days: z.coerce.number().int().min(1).max(31).default(14),
});
const bookingBody = z.object({
  serviceIds: z.array(z.string().uuid()).min(1).max(10),
  barberId: z.union([z.literal("any"), z.string().uuid()]),
  startsAt: z.string().datetime({ offset: true }),
  client: z.object({ name: z.string().trim().min(2).max(60), phone: z.string().trim().min(9).max(25) }),
});
const tokenParam = z.object({ token: z.string().uuid() });
const rescheduleBody = z.object({ barberId: z.union([z.literal("any"), z.string().uuid()]), startsAt: z.string().datetime({ offset: true }) });

function dateAndTime(iso: string) {
  const local = new Date(new Date(iso).getTime() + 5 * 60 * 60_000).toISOString();
  return { date: local.slice(0, 10), time: local.slice(11, 16), canonical: new Date(iso).toISOString() };
}

function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (!/^998\d{9}$/.test(digits)) throw Object.assign(new Error("Invalid phone"), { statusCode: 400, apiCode: "INVALID_PHONE" });
  return `+${digits}`;
}

async function selection(db: DatabaseClient, serviceIds: string[], barberId: string) {
  const [services, links] = await Promise.all([
    db.service.findMany({ where: { id: { in: serviceIds }, isActive: true } }),
    db.barberService.findMany({ where: { barberId, serviceId: { in: serviceIds }, isEnabled: true } }),
  ]);
  if (services.length !== new Set(serviceIds).size || links.length !== services.length) throw Object.assign(new Error("Unavailable service"), { statusCode: 422, apiCode: "SERVICE_UNAVAILABLE" });
  const overrides = new Map(links.map(link => [link.serviceId, link]));
  const snapshots = services.map(service => ({
    serviceId: service.id,
    name: service.name,
    durationMin: overrides.get(service.id)?.durationMin ?? service.durationMin,
    price: overrides.get(service.id)?.price ?? service.price,
  }));
  return {
    snapshots,
    durationMin: snapshots.reduce((sum, item) => sum + item.durationMin, 0),
    totalPrice: snapshots.reduce((sum, item) => sum + Number(item.price), 0),
  };
}

async function resolveSlot(db: DatabaseClient, input: AvailabilityInput, startsAt: string) {
  const requested = dateAndTime(startsAt);
  const availability = await getAvailability(db, { ...input, date: requested.date });
  const slot = availability.slots.find(item => item.startsAt === requested.canonical || item.time === requested.time);
  if (!slot) throw Object.assign(new Error("Slot taken"), { statusCode: 409, apiCode: "SLOT_TAKEN" });
  const barberId = input.barberId === "any" ? slot.barberIds[0] : input.barberId;
  if (!barberId || !slot.barberIds.includes(barberId)) throw Object.assign(new Error("Slot taken"), { statusCode: 409, apiCode: "SLOT_TAKEN" });
  return { barberId, startsAt: new Date(slot.startsAt) };
}

function bookingView(booking: any) {
  return {
    id: booking.id,
    manageToken: booking.manageToken,
    status: booking.status,
    startsAt: booking.startsAt,
    endsAt: booking.endsAt,
    totalPrice: Number(booking.totalPrice),
    totalDurationMin: booking.totalDurationMin,
    barber: booking.barber,
    client: booking.client,
    services: booking.services.map((item: any) => ({ ...item, price: Number(item.price) })),
  };
}

const bookingInclude = { barber: { select: { id: true, slug: true, name: true, photoUrl: true } }, client: { select: { name: true, phone: true } }, services: { select: { serviceId: true, name: true, durationMin: true, price: true } } } as const;

export function registerBookingRoutes(app: FastifyInstance, db: DatabaseClient, botToken?: string, bot?: Bot, adminChatId?: string) {
  app.get("/api/v1/availability", async request => {
    const query = availabilityQuery.parse(request.query);
    return { data: await getAvailability(db, query) };
  });

  app.get("/api/v1/availability/days", async request => {
    const query = daysQuery.parse(request.query);
    const from = query.from ?? tashkentDate();
    return { data: await getAvailableDays(db, { serviceIds: query.serviceIds, barberId: query.barberId, from, days: query.days }) };
  });

  app.post("/api/v1/bookings", async (request, reply) => {
    const body = bookingBody.parse(request.body);
    const telegramUser = telegramUserFromRequest(request, botToken, false);
    const requested = dateAndTime(body.startsAt);
    const slot = await resolveSlot(db, { serviceIds: body.serviceIds, barberId: body.barberId, date: requested.date }, body.startsAt);
    const selected = await selection(db, body.serviceIds, slot.barberId);
    const phone = normalizePhone(body.client.phone);
    const booking = await db.$transaction(async tx => {
      let client;
      if (telegramUser) {
        const telegramId = BigInt(telegramUser.id);
        const linked = await tx.client.findUnique({ where: { telegramId } });
        if (linked) client = await tx.client.update({ where: { id: linked.id }, data: { name: body.client.name, telegramChatId: telegramId } });
        else {
          const byPhone = await tx.client.findUnique({ where: { phone } });
          if (byPhone?.telegramId && byPhone.telegramId !== telegramId) throw Object.assign(new Error("Phone is linked to another Telegram account"), { statusCode: 409, apiCode: "PHONE_ALREADY_LINKED" });
          client = byPhone
            ? await tx.client.update({ where: { id: byPhone.id }, data: { name: body.client.name, telegramId, telegramChatId: telegramId } })
            : await tx.client.create({ data: { phone, name: body.client.name, telegramId, telegramChatId: telegramId } });
        }
      } else client = await tx.client.upsert({ where: { phone }, create: { phone, name: body.client.name }, update: { name: body.client.name } });
      return tx.booking.create({
        data: {
          clientId: client.id, barberId: slot.barberId, startsAt: slot.startsAt,
          endsAt: new Date(slot.startsAt.getTime() + selected.durationMin * 60_000),
          totalPrice: selected.totalPrice, totalDurationMin: selected.durationMin,
          manageToken: randomUUID(), source: "web",
          services: { create: selected.snapshots },
        },
        include: bookingInclude,
      });
    }, { maxWait: 10_000, timeout: 30_000 });
    void notifyBooking(db, bot, adminChatId, booking.id, "created").catch(error => app.log.error(error));
    return reply.code(201).send({ data: bookingView(booking) });
  });

  app.get("/api/v1/me/bookings", async request => {
    const user = telegramUserFromRequest(request, botToken);
    const bookings = await db.booking.findMany({
      where: { client: { telegramId: BigInt(user!.id) } },
      orderBy: { startsAt: "desc" },
      take: 50,
      include: bookingInclude,
    });
    return { data: bookings.map(bookingView) };
  });

  app.get("/api/v1/bookings/:token", async request => {
    const { token } = tokenParam.parse(request.params);
    const booking = await db.booking.findUnique({ where: { manageToken: token }, include: bookingInclude });
    if (!booking) throw Object.assign(new Error("Booking not found"), { statusCode: 404, apiCode: "BOOKING_NOT_FOUND" });
    return { data: bookingView(booking) };
  });

  app.post("/api/v1/bookings/:token/cancel", async request => {
    const { token } = tokenParam.parse(request.params);
    const booking = await db.booking.findUnique({ where: { manageToken: token } });
    if (!booking) throw Object.assign(new Error("Booking not found"), { statusCode: 404, apiCode: "BOOKING_NOT_FOUND" });
    if (booking.status !== "confirmed") throw Object.assign(new Error("Booking cannot be cancelled"), { statusCode: 409, apiCode: "BOOKING_NOT_ACTIVE" });
    const cutoff = await db.setting.findUnique({ where: { key: "cancel_cutoff_min" } });
    const minutes = typeof cutoff?.value === "number" ? cutoff.value : 30;
    if (booking.startsAt.getTime() - Date.now() < minutes * 60_000) throw Object.assign(new Error("Cancellation cutoff"), { statusCode: 422, apiCode: "CANCEL_TOO_LATE" });
    const updated = await db.booking.update({ where: { id: booking.id }, data: { status: "cancelled" }, include: bookingInclude });
    void notifyBooking(db, bot, adminChatId, updated.id, "cancelled").catch(error => app.log.error(error));
    return { data: bookingView(updated) };
  });

  app.post("/api/v1/bookings/:token/reschedule", async request => {
    const { token } = tokenParam.parse(request.params);
    const body = rescheduleBody.parse(request.body);
    const booking = await db.booking.findUnique({ where: { manageToken: token }, include: { services: true } });
    if (!booking) throw Object.assign(new Error("Booking not found"), { statusCode: 404, apiCode: "BOOKING_NOT_FOUND" });
    if (booking.status !== "confirmed") throw Object.assign(new Error("Booking cannot be rescheduled"), { statusCode: 409, apiCode: "BOOKING_NOT_ACTIVE" });
    const serviceIds = booking.services.map(item => item.serviceId);
    const requested = dateAndTime(body.startsAt);
    const slot = await resolveSlot(db, { serviceIds, barberId: body.barberId, date: requested.date }, body.startsAt);
    const selected = await selection(db, serviceIds, slot.barberId);
    const updated = await db.$transaction(async tx => {
      await tx.bookingService.deleteMany({ where: { bookingId: booking.id } });
      return tx.booking.update({
        where: { id: booking.id },
        data: {
          barberId: slot.barberId, startsAt: slot.startsAt, endsAt: new Date(slot.startsAt.getTime() + selected.durationMin * 60_000),
          totalDurationMin: selected.durationMin, totalPrice: selected.totalPrice, services: { create: selected.snapshots },
        },
        include: bookingInclude,
      });
    }, { maxWait: 10_000, timeout: 30_000 });
    void notifyBooking(db, bot, adminChatId, updated.id, "rescheduled").catch(error => app.log.error(error));
    return { data: bookingView(updated) };
  });
}

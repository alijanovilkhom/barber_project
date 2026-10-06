import type { DatabaseClient } from "@barber/db";

export type MinuteInterval = { start: number; end: number };
export type AvailabilityInput = { serviceIds: string[]; barberId: string; date: string };
export type Slot = { time: string; startsAt: string; barberIds: string[] };

const TASHKENT_OFFSET_MINUTES = 5 * 60;
const DAY_MS = 86_400_000;

export function generateSlotMinutes(input: {
  workStart: number;
  workEnd: number;
  duration: number;
  step: number;
  blocked: MinuteInterval[];
  earliest?: number;
}) {
  const slots: number[] = [];
  const first = Math.max(input.workStart, input.earliest ?? input.workStart);
  const aligned = Math.ceil(first / input.step) * input.step;
  for (let start = aligned; start + input.duration <= input.workEnd; start += input.step) {
    const end = start + input.duration;
    if (!input.blocked.some(block => start < block.end && end > block.start)) slots.push(start);
  }
  return slots;
}

export function localDateTimeToUtc(date: string, minute: number) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 0, minute - TASHKENT_OFFSET_MINUTES));
}

export function tashkentDate(date = new Date()) {
  return new Date(date.getTime() + TASHKENT_OFFSET_MINUTES * 60_000).toISOString().slice(0, 10);
}

export function minuteToTime(minute: number) {
  return `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
}

function wallMinute(value: Date) {
  return value.getUTCHours() * 60 + value.getUTCMinutes();
}

function absoluteInterval(date: string, startsAt: Date, endsAt: Date): MinuteInterval {
  const dayStart = localDateTimeToUtc(date, 0).getTime();
  return {
    start: Math.max(0, Math.floor((startsAt.getTime() - dayStart) / 60_000)),
    end: Math.min(1440, Math.ceil((endsAt.getTime() - dayStart) / 60_000)),
  };
}

async function settings(db: DatabaseClient) {
  const rows = await db.setting.findMany({ where: { key: { in: ["slot_step_min", "min_notice_min", "booking_horizon_days"] } } });
  const value = (key: string, fallback: number) => {
    const found = rows.find(row => row.key === key)?.value;
    return typeof found === "number" ? found : fallback;
  };
  return { step: value("slot_step_min", 15), minNotice: value("min_notice_min", 30), horizon: value("booking_horizon_days", 30) };
}

export async function getAvailability(db: DatabaseClient, input: AvailabilityInput, now = new Date()) {
  const config = await settings(db);
  const today = tashkentDate(now);
  const requestedDay = localDateTimeToUtc(input.date, 0).getTime();
  const todayStart = localDateTimeToUtc(today, 0).getTime();
  if (requestedDay < todayStart) return { date: input.date, durationMin: 0, slots: [] as Slot[], reason: "TOO_SOON" as const };
  if (requestedDay > todayStart + config.horizon * DAY_MS) return { date: input.date, durationMin: 0, slots: [] as Slot[], reason: "TOO_FAR" as const };

  const services = await db.service.findMany({ where: { id: { in: input.serviceIds }, isActive: true } });
  if (services.length !== new Set(input.serviceIds).size) throw Object.assign(new Error("Service not found"), { statusCode: 404, apiCode: "SERVICE_NOT_FOUND" });
  const barberWhere = input.barberId === "any" ? { isActive: true } : { id: input.barberId, isActive: true };
  const barbers = await db.barber.findMany({
    where: barberWhere,
    orderBy: { sortOrder: "asc" },
    include: {
      services: { where: { serviceId: { in: input.serviceIds }, isEnabled: true } },
      workingHours: true,
      breaks: true,
    },
  });
  if (input.barberId !== "any" && !barbers.length) throw Object.assign(new Error("Barber not found"), { statusCode: 404, apiCode: "BARBER_NOT_FOUND" });

  const dayStart = localDateTimeToUtc(input.date, 0);
  const dayEnd = new Date(dayStart.getTime() + DAY_MS);
  const weekday = new Date(`${input.date}T12:00:00Z`).getUTCDay();
  const allSlots = new Map<number, string[]>();
  let resultDuration = services.reduce((sum, service) => sum + service.durationMin, 0);
  const barberIds = barbers.map(barber => barber.id);
  const [allTimeOff, allBookings] = barberIds.length ? await Promise.all([
    db.timeOff.findMany({ where: { AND: [{ OR: [{ barberId: { in: barberIds } }, { barberId: null }] }, { startsAt: { lt: dayEnd } }, { endsAt: { gt: dayStart } }] } }),
    db.booking.findMany({ where: { barberId: { in: barberIds }, status: "confirmed", startsAt: { lt: dayEnd }, endsAt: { gt: dayStart } } }),
  ]) : [[], []];

  for (const barber of barbers) {
    if (barber.services.length !== services.length) continue;
    const work = barber.workingHours.find(item => item.weekday === weekday);
    if (!work) continue;
    const overrides = new Map(barber.services.map(item => [item.serviceId, item]));
    const duration = services.reduce((sum, service) => sum + (overrides.get(service.id)?.durationMin ?? service.durationMin), 0);
    resultDuration = duration;
    const timeOff = allTimeOff.filter(item => item.barberId === null || item.barberId === barber.id);
    const bookings = allBookings.filter(item => item.barberId === barber.id);
    const blocked: MinuteInterval[] = [
      ...barber.breaks.filter(item => item.weekday === weekday).map(item => ({ start: wallMinute(item.startTime), end: wallMinute(item.endTime) })),
      ...timeOff.map(item => absoluteInterval(input.date, item.startsAt, item.endsAt)),
      ...bookings.map(item => absoluteInterval(input.date, item.startsAt, item.endsAt)),
    ];
    const earliest = input.date === today ? Math.ceil((now.getTime() + config.minNotice * 60_000 - dayStart.getTime()) / 60_000) : undefined;
    for (const minute of generateSlotMinutes({ workStart: wallMinute(work.startTime), workEnd: wallMinute(work.endTime), duration, step: config.step, blocked, earliest })) {
      const list = allSlots.get(minute) ?? [];
      list.push(barber.id);
      allSlots.set(minute, list);
    }
  }
  const slots = [...allSlots.entries()].sort(([a], [b]) => a - b).map(([minute, barberIds]) => ({ time: minuteToTime(minute), startsAt: localDateTimeToUtc(input.date, minute).toISOString(), barberIds }));
  return { date: input.date, durationMin: resultDuration, slots };
}

export async function getAvailableDays(db: DatabaseClient, input: { serviceIds: string[]; barberId: string; from: string; days: number }, now = new Date()) {
  const config = await settings(db);
  const [services, barbers] = await Promise.all([
    db.service.findMany({ where: { id: { in: input.serviceIds }, isActive: true } }),
    db.barber.findMany({
      where: input.barberId === "any" ? { isActive: true } : { id: input.barberId, isActive: true },
      orderBy: { sortOrder: "asc" },
      include: { services: { where: { serviceId: { in: input.serviceIds }, isEnabled: true } }, workingHours: true, breaks: true },
    }),
  ]);
  if (services.length !== new Set(input.serviceIds).size) throw Object.assign(new Error("Service not found"), { statusCode: 404, apiCode: "SERVICE_NOT_FOUND" });
  if (input.barberId !== "any" && !barbers.length) throw Object.assign(new Error("Barber not found"), { statusCode: 404, apiCode: "BARBER_NOT_FOUND" });
  const dates = Array.from({ length: input.days }, (_, index) => new Date(`${input.from}T12:00:00Z`).getTime() + index * DAY_MS).map(value => new Date(value).toISOString().slice(0, 10));
  const rangeStart = localDateTimeToUtc(dates[0], 0);
  const rangeEnd = new Date(localDateTimeToUtc(dates.at(-1)!, 0).getTime() + DAY_MS);
  const barberIds = barbers.map(barber => barber.id);
  const [allTimeOff, allBookings] = barberIds.length ? await Promise.all([
    db.timeOff.findMany({ where: { AND: [{ OR: [{ barberId: { in: barberIds } }, { barberId: null }] }, { startsAt: { lt: rangeEnd } }, { endsAt: { gt: rangeStart } }] } }),
    db.booking.findMany({ where: { barberId: { in: barberIds }, status: "confirmed", startsAt: { lt: rangeEnd }, endsAt: { gt: rangeStart } } }),
  ]) : [[], []];
  const today = tashkentDate(now);
  const todayStart = localDateTimeToUtc(today, 0).getTime();

  return dates.map(date => {
    const dayStart = localDateTimeToUtc(date, 0);
    const dayEnd = new Date(dayStart.getTime() + DAY_MS);
    const outsideHorizon = dayStart.getTime() < todayStart || dayStart.getTime() > todayStart + config.horizon * DAY_MS;
    if (outsideHorizon) return { date, available: false, firstSlot: null as string | null };
    const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
    let firstSlot: number | null = null;
    for (const barber of barbers) {
      if (barber.services.length !== services.length) continue;
      const work = barber.workingHours.find(item => item.weekday === weekday);
      if (!work) continue;
      const overrides = new Map(barber.services.map(item => [item.serviceId, item]));
      const duration = services.reduce((sum, service) => sum + (overrides.get(service.id)?.durationMin ?? service.durationMin), 0);
      const blocked = [
        ...barber.breaks.filter(item => item.weekday === weekday).map(item => ({ start: wallMinute(item.startTime), end: wallMinute(item.endTime) })),
        ...allTimeOff.filter(item => (item.barberId === null || item.barberId === barber.id) && item.startsAt < dayEnd && item.endsAt > dayStart).map(item => absoluteInterval(date, item.startsAt, item.endsAt)),
        ...allBookings.filter(item => item.barberId === barber.id && item.startsAt < dayEnd && item.endsAt > dayStart).map(item => absoluteInterval(date, item.startsAt, item.endsAt)),
      ];
      const earliest = date === today ? Math.ceil((now.getTime() + config.minNotice * 60_000 - dayStart.getTime()) / 60_000) : undefined;
      const candidate = generateSlotMinutes({ workStart: wallMinute(work.startTime), workEnd: wallMinute(work.endTime), duration, step: config.step, blocked, earliest })[0];
      if (candidate !== undefined && (firstSlot === null || candidate < firstSlot)) firstSlot = candidate;
    }
    return { date, available: firstSlot !== null, firstSlot: firstSlot === null ? null : minuteToTime(firstSlot) };
  });
}

import type { DatabaseClient } from "@barber/db";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const zoneOffset = "+05:00";
const dayStart = (date: string) => new Date(`${date}T00:00:00${zoneOffset}`);
const isCalendarDate = (date: string) => {
  const parsed = new Date(`${date}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
};
const duration = (start: number, end: number) => Math.max(0, Math.round((end - start) / 60_000));
const overlap = (a0: number, a1: number, b0: number, b1: number) => duration(Math.max(a0, b0), Math.min(a1, b1));

export async function getAdminAnalytics(db: DatabaseClient, from: string, to: string) {
  if (!datePattern.test(from) || !datePattern.test(to) || !isCalendarDate(from) || !isCalendarDate(to)) {
    throw Object.assign(new Error("Укажите даты в формате YYYY-MM-DD"), { statusCode: 400 });
  }
  const start = dayStart(from);
  const until = dayStart(to); until.setTime(until.getTime() + 86_400_000);
  if (start >= until || until.getTime() - start.getTime() > 180 * 86_400_000) throw Object.assign(new Error("Период должен быть не длиннее 180 дней"), { statusCode: 400 });

  const [bookings, barbers, timeOff] = await Promise.all([
    db.booking.findMany({ where: { startsAt: { gte: start, lt: until } }, select: { id: true, clientId: true, barberId: true, startsAt: true, endsAt: true, totalPrice: true, totalDurationMin: true, status: true, services: { select: { serviceId: true, name: true, price: true, durationMin: true } } } }),
    db.barber.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true, workingHours: { select: { weekday: true, startTime: true, endTime: true } }, breaks: { select: { weekday: true, startTime: true, endTime: true } } } }),
    db.timeOff.findMany({ where: { startsAt: { lt: until }, endsAt: { gt: start } }, select: { barberId: true, startsAt: true, endsAt: true } }),
  ]);

  const done = bookings.filter(row => row.status === "completed");
  const countable = bookings.filter(row => row.status === "confirmed" || row.status === "completed");
  const serviceStats = new Map<string, { serviceId: string; name: string; count: number; revenue: number }>();
  for (const booking of countable) for (const item of booking.services) {
    const current = serviceStats.get(item.serviceId) ?? { serviceId: item.serviceId, name: item.name, count: 0, revenue: 0 };
    current.count++; current.revenue += Number(item.price); serviceStats.set(item.serviceId, current);
  }

  const clientCounts = new Map<string, number>();
  for (const booking of done) clientCounts.set(booking.clientId, (clientCounts.get(booking.clientId) ?? 0) + 1);
  const clientTotal = clientCounts.size;
  const returning = [...clientCounts.values()].filter(count => count > 1).length;

  const heatmap = Array.from({ length: 7 }, () => Array<number>(24).fill(0));
  for (const booking of countable) {
    const local = new Date(booking.startsAt.getTime() + 5 * 60 * 60_000);
    heatmap[local.getUTCDay()][local.getUTCHours()]++;
  }

  const barberLoad = barbers.map(barber => {
    let availableMinutes = 0;
    for (let cursor = new Date(`${from}T00:00:00Z`); cursor <= new Date(`${to}T00:00:00Z`); cursor.setUTCDate(cursor.getUTCDate() + 1)) {
      const key = cursor.toISOString().slice(0, 10);
      const weekday = cursor.getUTCDay();
      const hours = barber.workingHours.find(row => row.weekday === weekday);
      if (!hours) continue;
      const startMinute = hours.startTime.getUTCHours() * 60 + hours.startTime.getUTCMinutes();
      const endMinute = hours.endTime.getUTCHours() * 60 + hours.endTime.getUTCMinutes();
      const localStart = dayStart(key).getTime() + startMinute * 60_000;
      const localEnd = dayStart(key).getTime() + endMinute * 60_000;
      let dailyAvailable = duration(localStart, localEnd);
      for (const pause of barber.breaks.filter(row => row.weekday === weekday)) {
        const p0 = dayStart(key).getTime() + (pause.startTime.getUTCHours() * 60 + pause.startTime.getUTCMinutes()) * 60_000;
        const p1 = dayStart(key).getTime() + (pause.endTime.getUTCHours() * 60 + pause.endTime.getUTCMinutes()) * 60_000;
        dailyAvailable -= overlap(localStart, localEnd, p0, p1);
      }
      for (const off of timeOff.filter(row => row.barberId === barber.id || row.barberId === null)) dailyAvailable -= overlap(localStart, localEnd, off.startsAt.getTime(), off.endsAt.getTime());
      availableMinutes += Math.max(0, dailyAvailable);
    }
    const bookedMinutes = bookings.filter(row => row.barberId === barber.id && (row.status === "confirmed" || row.status === "completed"))
      .reduce((sum, row) => sum + overlap(start.getTime(), until.getTime(), row.startsAt.getTime(), row.endsAt.getTime()), 0);
    return { id: barber.id, name: barber.name, availableMinutes, bookedMinutes, utilization: availableMinutes ? Math.min(100, Math.round(bookedMinutes / availableMinutes * 100)) : 0 };
  });

  return {
    period: { from, to },
    summary: {
      revenue: done.reduce((sum, row) => sum + Number(row.totalPrice), 0),
      completed: done.length,
      bookings: bookings.length,
      cancelled: bookings.filter(row => row.status === "cancelled").length,
      noShow: bookings.filter(row => row.status === "no_show").length,
      uniqueClients: clientTotal,
      returningClients: returning,
      returningRate: clientTotal ? Math.round(returning / clientTotal * 100) : 0,
    },
    popularServices: [...serviceStats.values()].sort((a, b) => b.count - a.count || b.revenue - a.revenue),
    barberLoad,
    heatmap,
  };
}

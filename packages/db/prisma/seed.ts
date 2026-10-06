import { createDatabaseClient } from "../src/client.ts";
import { requireDatabaseUrl } from "../src/env.ts";

const db = createDatabaseClient(requireDatabaseUrl("DIRECT_URL"));
const services = [
  { slug: "haircut", name: "Мужская стрижка", description: "Форма, которая работает на вас каждый день.", durationMin: 45, price: 120000 },
  { slug: "beard", name: "Оформление бороды", description: "Чёткий контур и безупречная симметрия.", durationMin: 30, price: 80000 },
  { slug: "combo", name: "Стрижка + борода", description: "Полное обновление образа за один визит.", durationMin: 75, price: 180000 },
  { slug: "shave", name: "Королевское бритьё", description: "Тёплое полотенце, опасная бритва, ритуал.", durationMin: 40, price: 110000 },
];
const barbers = [
  { slug: "timur", name: "Тимур", experienceYears: 8, photoUrl: "/images/barber-1.jpg", bio: "Классика, которая всегда выглядит современно." },
  { slug: "aziz", name: "Азиз", experienceYears: 5, photoUrl: "/images/barber-2.jpg", bio: "Точные линии и внимание к каждой детали." },
  { slug: "daniyar", name: "Данияр", experienceYears: 6, photoUrl: "/images/barber-daniyar-portrait.jpg", bio: "Умеет найти форму под ваш характер." },
];
const settings = {
  cancel_cutoff_min: 30,
  slot_step_min: 15,
  booking_horizon_days: 30,
  min_notice_min: 30,
  reminder_day_minutes: 1440,
  reminder_short_minutes: 30,
  review_delay_min: 60,
  timezone: "Asia/Tashkent",
  review_public_min_rating: 4,
};
const wallTime = (hour: number) => new Date(Date.UTC(1970, 0, 1, hour));

try {
  await db.$transaction(async tx => {
    const storedServices = [];
    for (const [sortOrder, service] of services.entries()) {
      storedServices.push(await tx.service.upsert({ where: { slug: service.slug }, create: { ...service, sortOrder }, update: {} }));
    }
    for (const [sortOrder, barber] of barbers.entries()) {
      const stored = await tx.barber.upsert({ where: { slug: barber.slug }, create: { ...barber, sortOrder }, update: {} });
      for (const service of storedServices) {
        await tx.barberService.upsert({
          where: { barberId_serviceId: { barberId: stored.id, serviceId: service.id } },
          create: { barberId: stored.id, serviceId: service.id }, update: {},
        });
      }
      for (let weekday = 0; weekday < 7; weekday++) {
        await tx.workingHours.upsert({
          where: { barberId_weekday: { barberId: stored.id, weekday } },
          create: { barberId: stored.id, weekday, startTime: wallTime(10), endTime: wallTime(20) }, update: {},
        });
        await tx.break.upsert({
          where: { barberId_weekday_startTime: { barberId: stored.id, weekday, startTime: wallTime(14) } },
          create: { barberId: stored.id, weekday, startTime: wallTime(14), endTime: wallTime(15) }, update: {},
        });
      }
    }
    for (const [key, value] of Object.entries(settings)) {
      await tx.setting.upsert({ where: { key }, create: { key, value }, update: {} });
    }
  }, { maxWait: 15_000, timeout: 120_000 });
  console.log("Seed complete: 4 services, 3 barbers, schedules and settings. Existing rows were preserved.");
} finally {
  await db.$disconnect();
}

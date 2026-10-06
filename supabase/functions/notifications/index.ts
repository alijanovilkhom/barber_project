import { createClient } from "@supabase/supabase-js";

type EventType = "day" | "short" | "review";
type Booking = {
  id: string;
  starts_at: string;
  ends_at: string;
  manage_token: string;
  reminder_day_sent_at: string | null;
  reminder_30m_sent_at: string | null;
  review_requested_at: string | null;
  client: { name: string; telegram_chat_id: number | string | null };
  barber: { name: string };
  booking_services: Array<{ name: string }>;
};

const jsonHeaders = { "content-type": "application/json; charset=utf-8" };
const required = (name: string) => {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is required`);
  return value;
};
const iso = (value: number) => new Date(value).toISOString();
const formatDate = (value: string) => new Intl.DateTimeFormat("ru-RU", {
  timeZone: "Asia/Tashkent", day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit",
}).format(new Date(value));

Deno.serve(async request => {
  try {
    const cronSecret = required("CRON_SECRET");
    if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: jsonHeaders });
    }
    const supabase = createClient(required("SUPABASE_URL"), required("SUPABASE_SERVICE_ROLE_KEY"), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const telegramToken = required("TELEGRAM_BOT_TOKEN");
    const now = Date.now();
    const settings = await loadSettings(supabase);
    const counts = { completed: 0, day: 0, short: 0, review: 0, failed: 0 };

    const { data: completed, error: completeError } = await supabase
      .from("bookings")
      .update({ status: "completed", auto_completed_at: iso(now) })
      .eq("status", "confirmed")
      .is("auto_completed_at", null)
      .lte("ends_at", iso(now))
      .select("id");
    if (completeError) throw completeError;
    counts.completed = completed?.length ?? 0;

    counts.day = await processWindow(supabase, telegramToken, "day", now, settings.day, counts);
    counts.short = await processWindow(supabase, telegramToken, "short", now, settings.short, counts);
    counts.review = await processReviews(supabase, telegramToken, now, settings.review, counts);
    return new Response(JSON.stringify({ ok: true, ...counts }), { headers: jsonHeaders });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: "notification_run_failed" }), { status: 500, headers: jsonHeaders });
  }
});

async function loadSettings(supabase: ReturnType<typeof createClient>) {
  const { data, error } = await supabase.from("settings").select("key,value").in("key", ["reminder_day_minutes", "reminder_short_minutes", "review_delay_min"]);
  if (error) throw error;
  const values = new Map((data ?? []).map(item => [item.key, Number(item.value)]));
  return { day: values.get("reminder_day_minutes") || 1440, short: values.get("reminder_short_minutes") || 30, review: values.get("review_delay_min") || 60 };
}

function bookingSelect() {
  return "id,starts_at,ends_at,manage_token,reminder_day_sent_at,reminder_30m_sent_at,review_requested_at,client:clients(name,telegram_chat_id),barber:barbers(name),booking_services(name)";
}

async function processWindow(supabase: ReturnType<typeof createClient>, token: string, type: "day" | "short", now: number, minutes: number, counts: { failed: number }) {
  const field = type === "day" ? "reminder_day_sent_at" : "reminder_30m_sent_at";
  const tolerance = type === "day" ? 10 : 5;
  const target = now + minutes * 60_000;
  const { data, error } = await supabase.from("bookings").select(bookingSelect()).eq("status", "confirmed").is(field, null)
    .gte("starts_at", iso(target - tolerance * 60_000)).lt("starts_at", iso(target + tolerance * 60_000)).limit(100);
  if (error) throw error;
  return deliver(supabase, token, data as unknown as Booking[], type, field, counts);
}

async function processReviews(supabase: ReturnType<typeof createClient>, token: string, now: number, delayMinutes: number, counts: { failed: number }) {
  const { data, error } = await supabase.from("bookings").select(bookingSelect()).eq("status", "completed").is("review_requested_at", null)
    .lte("ends_at", iso(now - delayMinutes * 60_000)).limit(100);
  if (error) throw error;
  return deliver(supabase, token, data as unknown as Booking[], "review", "review_requested_at", counts);
}

async function deliver(supabase: ReturnType<typeof createClient>, token: string, bookings: Booking[], event: EventType, field: string, counts: { failed: number }) {
  let sent = 0;
  for (const booking of bookings) {
    const claimedAt = new Date().toISOString();
    const { data: claimed, error } = await supabase.from("bookings").update({ [field]: claimedAt }).eq("id", booking.id).is(field, null).select("id").maybeSingle();
    if (error) throw error;
    if (!claimed) continue;
    const chatId = booking.client?.telegram_chat_id;
    if (!chatId) continue;
    try {
      await sendTelegram(token, String(chatId), messageFor(booking, event));
      sent++;
    } catch (error) {
      counts.failed++;
      console.error(`Telegram delivery failed for ${booking.id}`, error);
      await supabase.from("bookings").update({ [field]: null }).eq("id", booking.id).eq(field, claimedAt);
    }
  }
  return sent;
}

function messageFor(booking: Booking, event: EventType) {
  const service = booking.booking_services.map(item => item.name).join(", ");
  if (event === "review") return `Спасибо за визит в BRAVO! Оцените работу мастера ${booking.barber.name}. Открыть запись: https://t.me/bravo_barber_bot?start=b_${booking.manage_token}`;
  const when = event === "day" ? "завтра" : "примерно через 30 минут";
  return `Напоминаем: вы записаны в BRAVO ${when}.\n${service}\n${formatDate(booking.starts_at)}\nМастер: ${booking.barber.name}`;
}

async function sendTelegram(token: string, chatId: string, text: string) {
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST", headers: jsonHeaders, body: JSON.stringify({ chat_id: chatId, text }),
  });
  if (!response.ok) throw new Error(`Telegram returned ${response.status}`);
}

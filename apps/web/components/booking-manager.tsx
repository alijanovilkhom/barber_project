"use client";

import Link from "next/link";
import { CalendarDays, CheckCircle2, ChevronLeft, Clock3, LoaderCircle, RotateCcw, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { cancelBooking, loadAvailability, rescheduleBooking, type AvailabilitySlot, type BookingResult } from "@/lib/booking-api";
import { formatPrice } from "@/lib/data";

function localDate(iso: string) {
  return new Intl.DateTimeFormat("ru-RU", { dateStyle: "full", timeStyle: "short", timeZone: "Asia/Tashkent" }).format(new Date(iso));
}

function today() {
  return new Date(Date.now() + 5 * 60 * 60_000).toISOString().slice(0, 10);
}

export function BookingManager({ initialBooking }: { initialBooking: BookingResult }) {
  const [booking, setBooking] = useState(initialBooking);
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const serviceIds = useMemo(() => booking.services.map(service => service.serviceId), [booking.services]);

  async function findSlots(value: string) {
    setDate(value); setSlots([]); setMessage("");
    if (!value) return;
    setLoading(true);
    try { setSlots((await loadAvailability(serviceIds, booking.barber.id, value)).slots); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Не удалось загрузить время"); }
    finally { setLoading(false); }
  }

  async function cancel() {
    if (!window.confirm("Отменить эту запись?")) return;
    setLoading(true); setMessage("");
    try { setBooking(await cancelBooking(booking.manageToken)); setMessage("Запись отменена."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Не удалось отменить запись"); }
    finally { setLoading(false); }
  }

  async function reschedule(slot: AvailabilitySlot) {
    setLoading(true); setMessage("");
    try {
      setBooking(await rescheduleBooking(booking.manageToken, { barberId: booking.barber.id, startsAt: slot.startsAt }));
      setSlots([]); setDate(""); setMessage("Запись перенесена на новое время.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Не удалось перенести запись"); }
    finally { setLoading(false); }
  }

  return <section className="booking-page"><div className="container booking-container">
    <Link href="/" className="back-home"><ChevronLeft size={17} /> На главную</Link>
    <div className="booking-heading"><span className="eyebrow"><span className="eyebrow-line" /> ВАША ЗАПИСЬ</span><h1>Всё под <em>контролем.</em></h1><p>Здесь можно проверить детали, перенести или отменить визит.</p></div>
    <div className="booking-layout"><div className="booking-main"><div className="booking-panel">
      <div className="panel-head"><span className="panel-index">BRAVO</span><h2>{booking.status === "confirmed" ? "Запись подтверждена" : "Запись отменена"}</h2><p>{booking.status === "confirmed" ? "Ждём вас в назначенное время." : "Это бронирование больше не занимает время мастера."}</p></div>
      <div className="confirmation-card">
        <div><span>Услуга</span><strong>{booking.services.map(service => service.name).join(", ")}</strong></div>
        <div><span>Барбер</span><strong>{booking.barber.name}</strong></div>
        <div><span>Когда</span><strong>{localDate(booking.startsAt)}</strong></div>
        <div><span>Гость</span><strong>{booking.client.name}</strong></div>
        <div><span>Стоимость</span><strong>{formatPrice(booking.totalPrice)}</strong></div>
      </div>
      {message && <div className="form-error" role="status">{message}</div>}
      {booking.status === "confirmed" && <div className="contact-form">
        <label htmlFor="new-date">Перенести на другую дату</label>
        <input id="new-date" type="date" min={today()} value={date} onChange={event => void findSlots(event.target.value)} />
        {loading && <div className="slots-label"><LoaderCircle className="spin" size={17} /> Загружаем…</div>}
        {!loading && date && !slots.length && <p>На эту дату свободного времени нет.</p>}
        {!!slots.length && <><div className="slots-label"><Clock3 size={17} /> ВЫБЕРИТЕ НОВОЕ ВРЕМЯ</div><div className="time-grid">{slots.map(slot => <button key={slot.startsAt} className="time-option" onClick={() => void reschedule(slot)} disabled={loading}>{slot.time}</button>)}</div></>}
        <button className="button button-outline" onClick={() => void cancel()} disabled={loading}><XCircle size={17} /> Отменить запись</button>
      </div>}
      {booking.status === "cancelled" && <div className="confirmation-actions"><Link href="/book" className="button button-gold"><RotateCcw size={17} /> Создать новую запись</Link></div>}
    </div></div>
    <aside className="booking-summary"><span className="summary-label">СТАТУС</span>{booking.status === "confirmed" ? <CheckCircle2 size={34} /> : <XCircle size={34} />}<h3>{booking.status === "confirmed" ? "Подтверждена" : "Отменена"}</h3><div className="summary-line"><CalendarDays size={18} /><div><span>Дата и время</span><strong>{localDate(booking.startsAt)}</strong></div></div><p>Время указано по Ташкенту.</p></aside>
    </div>
  </div></section>;
}

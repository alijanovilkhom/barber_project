"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, CalendarDays, Check, CheckCircle2, ChevronLeft, Clock3, LoaderCircle, RotateCcw, Scissors, UserRound, UsersRound } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatPrice, type Barber, type Service } from "@/lib/data";
import { createBooking, loadAvailability, loadAvailableDays, type AvailabilitySlot } from "@/lib/booking-api";

const steps = ["Услуга", "Барбер", "Дата", "Время", "Контакты"];
type SlotState = "idle" | "loading" | "ready" | "empty" | "error";

function dateOptions() {
  const nowInTashkent = new Date(Date.now() + 5 * 60 * 60 * 1000);
  const todayUtc = Date.UTC(nowInTashkent.getUTCFullYear(), nowInTashkent.getUTCMonth(), nowInTashkent.getUTCDate());
  return Array.from({ length: 14 }, (_, index) => {
    const date = new Date(todayUtc + index * 86400000);
    return {
      key: date.toISOString().slice(0, 10),
      weekday: new Intl.DateTimeFormat("ru-RU", { weekday: "short", timeZone: "UTC" }).format(date).replace(".", ""),
      day: new Intl.DateTimeFormat("ru-RU", { day: "numeric", timeZone: "UTC" }).format(date),
      month: new Intl.DateTimeFormat("ru-RU", { month: "short", timeZone: "UTC" }).format(date).replace(".", ""),
      full: new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", weekday: "long", timeZone: "UTC" }).format(date),
      sunday: date.getUTCDay() === 0,
      saturday: date.getUTCDay() === 6,
    };
  });
}

type BookingFlowProps = { services: Service[]; barbers: Barber[] };

export function BookingFlow({ services, barbers }: BookingFlowProps) {
  const params = useSearchParams();
  const initialService = params.get("service") ?? "";
  const initialBarber = params.get("barber") ?? "any";
  const forceSlotError = params.get("slots") === "error";
  const [step, setStep] = useState(0);
  const [serviceId, setServiceId] = useState(services.find(item => item.id === initialService || item.slug === initialService)?.id ?? "");
  const [barberId, setBarberId] = useState(initialBarber === "any" ? "any" : barbers.find(item => item.id === initialBarber || item.slug === initialBarber)?.id ?? "any");
  const dates = useMemo(() => dateOptions(), []);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [slotState, setSlotState] = useState<SlotState>("idle");
  const [availableDates, setAvailableDates] = useState<Record<string, boolean>>({});
  const slotRequest = useRef(0);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reference, setReference] = useState("");
  const [confirmedBarber, setConfirmedBarber] = useState("");

  const selectedService = services.find(item => item.id === serviceId);
  const selectedBarber = barbers.find(item => item.id === barberId);
  const selectedDate = dates.find(item => item.key === date);

  useEffect(() => {
    if (!serviceId || !barberId || !dates[0]) return;
    let active = true;
    loadAvailableDays([serviceId], barberId, dates[0].key, dates.length)
      .then(days => { if (active) setAvailableDates(Object.fromEntries(days.map(day => [day.date, day.available]))); })
      .catch(() => { if (active) setAvailableDates({}); });
    return () => { active = false; };
  }, [serviceId, barberId, dates]);

  function loadSlots(retry = false) {
    if (!date) return;
    const request = ++slotRequest.current;
    setSlotState("loading");
    setSlots([]);
    const operation = forceSlotError && !retry ? Promise.reject(new Error("Forced error")) : loadAvailability([serviceId], barberId, date).then(result => result.slots);
    operation
      .then(result => { if (request === slotRequest.current) { setSlots(result); setSlotState(result.length ? "ready" : "empty"); } })
      .catch(() => { if (request === slotRequest.current) setSlotState("error"); });
  }

  const canContinue = useMemo(() => [Boolean(serviceId), Boolean(barberId), Boolean(date), Boolean(time), Boolean(name.trim() && phone.trim())][step] ?? false, [step, serviceId, barberId, date, time, name, phone]);

  async function goNext() {
    if (step === 4) {
      const digits = phone.replace(/\D/g, "");
      if (name.trim().length < 2) return setFormError("Укажите имя — минимум 2 символа.");
      if (!/^998\d{9}$/.test(digits)) return setFormError("Введите номер в формате +998 90 123 45 67.");
      setFormError("");
      const selectedSlot = slots.find(slot => slot.time === time);
      if (!selectedSlot) return setFormError("Выберите свободное время ещё раз.");
      setSubmitting(true);
      try {
        const booking = await createBooking({ serviceIds: [serviceId], barberId, startsAt: selectedSlot.startsAt, client: { name: name.trim(), phone } });
        setSubmitting(false);
        setReference(booking.manageToken);
        setConfirmedBarber(booking.barber.name);
        setStep(5);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch (error) {
        setSubmitting(false);
        const code = error && typeof error === "object" && "code" in error ? error.code : "";
        if (code === "SLOT_TAKEN") {
          setFormError("Это время только что заняли. Выберите другой свободный слот.");
          setTime("");
          setStep(3);
          loadSlots(true);
        } else setFormError(error instanceof Error ? error.message : "Не удалось создать запись. Попробуйте ещё раз.");
      }
      return;
    }
    if (!canContinue) return;
    if (step === 2) loadSlots();
    setStep(value => value + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function reset() {
    setStep(0); setServiceId(""); setBarberId("any"); setDate(""); setTime("");
    setName(""); setPhone(""); setReference(""); setConfirmedBarber(""); setFormError("");
  }

  return <section className="booking-page">
    <div className="container booking-container">
      <Link href="/" className="back-home"><ChevronLeft size={17} /> На главную</Link>
      {step < 5 ? <>
        <div className="booking-heading"><span className="eyebrow"><span className="eyebrow-line" /> ОНЛАЙН-ЗАПИСЬ</span><h1>Ваше время <em>выглядеть лучше.</em></h1><p>Несколько простых шагов — и место в кресле ваше.</p></div>
        <div className="booking-stepper" aria-label="Шаги записи">{steps.map((label, index) => <div className={`stepper-item ${index === step ? "current" : ""} ${index < step ? "completed" : ""}`} key={label}><span>{index < step ? <Check size={15} /> : `0${index + 1}`}</span><strong>{label}</strong></div>)}</div>
        <div className="booking-layout"><div className="booking-main">
          {step === 0 && <div className="booking-panel"><div className="panel-head"><span className="panel-index">01 / 05</span><h2>Выберите услугу</h2><p>С чего начнём ваше преображение?</p></div><div className="booking-service-list">{services.map(service => <button key={service.id} className={`booking-service ${service.id === serviceId ? "selected" : ""}`} onClick={() => { setServiceId(service.id); setTime(""); }} aria-pressed={service.id === serviceId}><span className="service-radio">{service.id === serviceId && <Check size={15} />}</span><span className="booking-service-copy"><strong>{service.name}</strong><small>{service.description}</small><span><Clock3 size={14} /> {service.duration} мин</span></span><b>{formatPrice(service.price)}</b></button>)}</div></div>}

          {step === 1 && <div className="booking-panel"><div className="panel-head"><span className="panel-index">02 / 05</span><h2>Выберите барбера</h2><p>Доверьтесь любимому мастеру или первому свободному.</p></div><div className="booking-barber-grid"><button className={`booking-barber any-barber ${barberId === "any" ? "selected" : ""}`} onClick={() => { setBarberId("any"); setTime(""); }} aria-pressed={barberId === "any"}><span className="barber-option-art"><UsersRound size={34} /></span><span className="barber-option-copy"><strong>Любой свободный</strong><small>Найдём мастера на удобное для вас время</small></span><span className="option-check">{barberId === "any" && <Check size={16} />}</span></button>{barbers.map(barber => <button className={`booking-barber ${barberId === barber.id ? "selected" : ""}`} key={barber.id} onClick={() => { setBarberId(barber.id); setTime(""); }} aria-pressed={barberId === barber.id}><span className="barber-option-art barber-option-photo"><Image src={barber.photo} alt="" fill sizes="70px" /></span><span className="barber-option-copy"><strong>{barber.name}</strong><small>{barber.role} · {barber.experience}</small></span><span className="option-check">{barberId === barber.id && <Check size={16} />}</span></button>)}</div></div>}

          {step === 2 && <div className="booking-panel"><div className="panel-head"><span className="panel-index">03 / 05</span><h2>Выберите дату</h2><p>Доступна запись на ближайшие две недели.</p></div><div className="calendar-head"><CalendarDays size={20} /><strong>{dates.length ? new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${dates[0].key}T12:00:00Z`)) : "Загрузка календаря"}</strong></div><div className="date-grid">{dates.map(item => { const unavailable = availableDates[item.key] === false; return <button key={item.key} disabled={unavailable} className={`date-option ${date === item.key ? "selected" : ""}`} onClick={() => { setDate(item.key); setTime(""); }} aria-pressed={date === item.key} aria-label={`${item.full}${unavailable ? ", нет свободного времени" : ""}`}><small>{item.weekday}</small><strong>{item.day}</strong><span>{unavailable ? "занято" : item.month}</span></button>; })}</div><p className="calendar-note">Время показано по Ташкенту (UTC+5). Недоступные дни рассчитаны по расписанию мастеров.</p></div>}

          {step === 3 && <div className="booking-panel"><div className="panel-head"><span className="panel-index">04 / 05</span><h2>Выберите время</h2><p>{selectedDate ? selectedDate.full : "Выбранная дата"} · часовой пояс Ташкента</p></div>{formError && <div className="form-error" role="alert">{formError}</div>}{slotState === "loading" && <div className="state-box" role="status"><LoaderCircle className="spin" size={29} /><strong>Ищем свободное время…</strong><span>Обычно это занимает пару секунд.</span></div>}{slotState === "empty" && <div className="state-box"><CalendarDays size={30} /><strong>На эту дату мест нет</strong><span>Выберите другой день — свободное время обязательно найдётся.</span><button className="button button-outline" onClick={() => setStep(2)}>Выбрать другую дату</button></div>}{slotState === "error" && <div className="state-box" role="alert"><RotateCcw size={29} /><strong>Не удалось загрузить время</strong><span>Попробуйте ещё раз.</span><button className="button button-outline" onClick={() => loadSlots(true)}>Повторить</button></div>}{slotState === "ready" && <><div className="slots-label"><Clock3 size={17} /> СВОБОДНЫЕ СЛОТЫ</div><div className="time-grid">{slots.map(slot => <button key={slot.startsAt} className={`time-option ${time === slot.time ? "selected" : ""}`} onClick={() => { setTime(slot.time); setFormError(""); }} aria-pressed={time === slot.time}>{slot.time}</button>)}</div><p className="calendar-note">Список обновляется из реального расписания мастеров.</p></>}</div>}

          {step === 4 && <div className="booking-panel"><div className="panel-head"><span className="panel-index">05 / 05</span><h2>Ваши контакты</h2><p>Остался последний шаг. Как к вам обращаться?</p></div><div className="contact-form"><label htmlFor="client-name">Ваше имя <span>*</span></label><input id="client-name" autoComplete="name" value={name} onChange={event => { setName(event.target.value); setFormError(""); }} placeholder="Например, Азиз" maxLength={60} /><label htmlFor="client-phone">Номер телефона <span>*</span></label><input id="client-phone" type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={event => { setPhone(event.target.value); setFormError(""); }} placeholder="+998 90 123 45 67" maxLength={25} /><p>Используем номер только для связи по записи.</p>{formError && <div className="form-error" role="alert">{formError}</div>}<div className="demo-disclaimer">После подтверждения вы получите персональную ссылку для отмены или переноса записи.</div></div></div>}

          <div className="booking-controls">{step > 0 && <button className="back-step" onClick={() => setStep(value => value - 1)}><ArrowLeft size={18} /> Назад</button>}<button className="button button-gold button-large continue-button" onClick={goNext} disabled={!canContinue || submitting}>{submitting ? <><LoaderCircle className="spin" size={18} /> Подтверждаем…</> : <>{step === 4 ? "Подтвердить запись" : "Продолжить"} <ArrowRight size={18} /></>}</button></div>
        </div><aside className="booking-summary"><span className="summary-label">ВАША ЗАПИСЬ</span><h3>Всё в одном месте.</h3><div className="summary-line"><Scissors size={18} /><div><span>Услуга</span><strong>{selectedService?.name ?? "Пока не выбрана"}</strong></div></div><div className="summary-line"><UserRound size={18} /><div><span>Барбер</span><strong>{barberId === "any" ? "Любой свободный" : selectedBarber?.name ?? "Не выбран"}</strong></div></div><div className="summary-line"><CalendarDays size={18} /><div><span>Дата и время</span><strong>{selectedDate ? `${selectedDate.full}${time ? `, ${time}` : ""}` : "Пока не выбраны"}</strong></div></div><div className="summary-total"><span>Итого</span><strong>{selectedService ? formatPrice(selectedService.price) : "—"}</strong></div><p>Оплата после визита · время по Ташкенту</p></aside></div>
      </> : <div className="confirmation"><div className="confirmation-icon"><CheckCircle2 size={44} /></div><span className="eyebrow"><span className="eyebrow-line" /> ЗАПИСЬ ПОДТВЕРЖДЕНА</span><h1>Выглядит <em>отлично!</em></h1><p>Место в кресле сохранено за вами.</p><div className="confirmation-card"><span className="summary-label">ПОДТВЕРЖДЁННАЯ ЗАПИСЬ</span><div><span>Услуга</span><strong>{selectedService?.name}</strong></div><div><span>Барбер</span><strong>{confirmedBarber || selectedBarber?.name}</strong></div><div><span>Когда</span><strong>{selectedDate?.full}, {time}</strong></div><div><span>Гость</span><strong>{name.trim()}</strong></div><div><span>Стоимость</span><strong>{selectedService && formatPrice(selectedService.price)}</strong></div></div><div className="confirmation-note">Сохраните персональную ссылку: через неё можно отменить или перенести запись.</div><div className="confirmation-actions"><Link href={`/booking/${reference}`} className="button button-gold">Управлять записью <ArrowRight size={17} /></Link><a href={`https://t.me/bravo_barber_bot?start=b_${reference}`} className="button button-outline">Получать уведомления в Telegram</a><button className="button button-outline" onClick={reset}>Записаться ещё раз</button></div></div>}
    </div>
  </section>;
}

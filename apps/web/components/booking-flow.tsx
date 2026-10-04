"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, CalendarDays, Check, CheckCircle2, ChevronLeft, Clock3, LoaderCircle, RotateCcw, Scissors, UserRound, UsersRound } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { barbers, formatPrice, mockSlots, services } from "@/lib/data";

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

function getMockSlots(date: string, barber: string, forceError: boolean): Promise<string[]> {
  return new Promise((resolve, reject) => {
    window.setTimeout(() => {
      if (forceError) return reject(new Error("Не удалось загрузить время"));
      const day = new Date(`${date}T12:00:00Z`).getUTCDay();
      if (day === 0) return resolve([]);
      resolve(mockSlots.filter(slot => !(day === 6 && slot === "10:00") && !(barber === "timur" && slot === "15:00")));
    }, 450);
  });
}

export function BookingFlow() {
  const params = useSearchParams();
  const initialService = params.get("service") ?? "";
  const initialBarber = params.get("barber") ?? "any";
  const forceSlotError = params.get("slots") === "error";
  const [step, setStep] = useState(0);
  const [serviceId, setServiceId] = useState(services.some(item => item.id === initialService) ? initialService : "");
  const [barberId, setBarberId] = useState(initialBarber === "any" || barbers.some(item => item.id === initialBarber) ? initialBarber : "any");
  const dates = useMemo(() => dateOptions(), []);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [slotState, setSlotState] = useState<SlotState>("idle");
  const slotRequest = useRef(0);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reference, setReference] = useState("");

  const selectedService = services.find(item => item.id === serviceId);
  const selectedBarber = barbers.find(item => item.id === barberId);
  const selectedDate = dates.find(item => item.key === date);

  function loadSlots(retry = false) {
    if (!date) return;
    const request = ++slotRequest.current;
    setSlotState("loading");
    setSlots([]);
    getMockSlots(date, barberId, forceSlotError && !retry)
      .then(result => { if (request === slotRequest.current) { setSlots(result); setSlotState(result.length ? "ready" : "empty"); } })
      .catch(() => { if (request === slotRequest.current) setSlotState("error"); });
  }

  const canContinue = useMemo(() => [Boolean(serviceId), Boolean(barberId), Boolean(date), Boolean(time), Boolean(name.trim() && phone.trim())][step] ?? false, [step, serviceId, barberId, date, time, name, phone]);

  function goNext() {
    if (step === 4) {
      const digits = phone.replace(/\D/g, "");
      if (name.trim().length < 2) return setFormError("Укажите имя — минимум 2 символа.");
      if (!/^998\d{9}$/.test(digits)) return setFormError("Введите номер в формате +998 90 123 45 67.");
      setFormError("");
      setSubmitting(true);
      window.setTimeout(() => {
        setSubmitting(false);
        setReference(`BR-${Date.now().toString().slice(-6)}`);
        setStep(5);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }, 700);
      return;
    }
    if (!canContinue) return;
    if (step === 2) loadSlots();
    setStep(value => value + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function reset() {
    setStep(0); setServiceId(""); setBarberId("any"); setDate(""); setTime("");
    setName(""); setPhone(""); setReference(""); setFormError("");
  }

  return <section className="booking-page">
    <div className="container booking-container">
      <Link href="/" className="back-home"><ChevronLeft size={17} /> На главную</Link>
      {step < 5 ? <>
        <div className="booking-heading"><span className="eyebrow"><span className="eyebrow-line" /> ОНЛАЙН-ЗАПИСЬ</span><h1>Ваше время <em>выглядеть лучше.</em></h1><p>Несколько простых шагов — и место в кресле ваше.</p></div>
        <div className="booking-stepper" aria-label="Шаги записи">{steps.map((label, index) => <div className={`stepper-item ${index === step ? "current" : ""} ${index < step ? "completed" : ""}`} key={label}><span>{index < step ? <Check size={15} /> : `0${index + 1}`}</span><strong>{label}</strong></div>)}</div>
        <div className="booking-layout"><div className="booking-main">
          {step === 0 && <div className="booking-panel"><div className="panel-head"><span className="panel-index">01 / 05</span><h2>Выберите услугу</h2><p>С чего начнём ваше преображение?</p></div><div className="booking-service-list">{services.map(service => <button key={service.id} className={`booking-service ${service.id === serviceId ? "selected" : ""}`} onClick={() => { setServiceId(service.id); setTime(""); }} aria-pressed={service.id === serviceId}><span className="service-radio">{service.id === serviceId && <Check size={15} />}</span><span className="booking-service-copy"><strong>{service.name}</strong><small>{service.description}</small><span><Clock3 size={14} /> {service.duration} мин</span></span><b>{formatPrice(service.price)}</b></button>)}</div></div>}

          {step === 1 && <div className="booking-panel"><div className="panel-head"><span className="panel-index">02 / 05</span><h2>Выберите барбера</h2><p>Доверьтесь любимому мастеру или первому свободному.</p></div><div className="booking-barber-grid"><button className={`booking-barber any-barber ${barberId === "any" ? "selected" : ""}`} onClick={() => { setBarberId("any"); setTime(""); }} aria-pressed={barberId === "any"}><span className="barber-option-art"><UsersRound size={34} /></span><span className="barber-option-copy"><strong>Любой свободный</strong><small>Найдём мастера на удобное для вас время</small></span><span className="option-check">{barberId === "any" && <Check size={16} />}</span></button>{barbers.map(barber => <button className={`booking-barber ${barberId === barber.id ? "selected" : ""}`} key={barber.id} onClick={() => { setBarberId(barber.id); setTime(""); }} aria-pressed={barberId === barber.id}><span className={`barber-option-art ${barber.accent}`}><span>{barber.initials}</span></span><span className="barber-option-copy"><strong>{barber.name}</strong><small>{barber.role} · {barber.experience}</small></span><span className="option-check">{barberId === barber.id && <Check size={16} />}</span></button>)}</div></div>}

          {step === 2 && <div className="booking-panel"><div className="panel-head"><span className="panel-index">03 / 05</span><h2>Выберите дату</h2><p>Доступна запись на ближайшие две недели.</p></div><div className="calendar-head"><CalendarDays size={20} /><strong>{dates.length ? new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${dates[0].key}T12:00:00Z`)) : "Загрузка календаря"}</strong></div><div className="date-grid">{dates.map(item => <button key={item.key} className={`date-option ${date === item.key ? "selected" : ""}`} onClick={() => { setDate(item.key); setTime(""); }} aria-pressed={date === item.key} aria-label={item.full}><small>{item.weekday}</small><strong>{item.day}</strong><span>{item.month}</span></button>)}</div><p className="calendar-note">Время показано по Ташкенту (UTC+5).</p></div>}

          {step === 3 && <div className="booking-panel"><div className="panel-head"><span className="panel-index">04 / 05</span><h2>Выберите время</h2><p>{selectedDate ? selectedDate.full : "Выбранная дата"} · часовой пояс Ташкента</p></div>{slotState === "loading" && <div className="state-box" role="status"><LoaderCircle className="spin" size={29} /><strong>Ищем свободное время…</strong><span>Обычно это занимает пару секунд.</span></div>}{slotState === "empty" && <div className="state-box"><CalendarDays size={30} /><strong>На эту дату мест нет</strong><span>Выберите другой день — свободное время обязательно найдётся.</span><button className="button button-outline" onClick={() => setStep(2)}>Выбрать другую дату</button></div>}{slotState === "error" && <div className="state-box" role="alert"><RotateCcw size={29} /><strong>Не удалось загрузить время</strong><span>Попробуйте ещё раз.</span><button className="button button-outline" onClick={() => loadSlots(true)}>Повторить</button></div>}{slotState === "ready" && <><div className="slots-label"><Clock3 size={17} /> СВОБОДНЫЕ СЛОТЫ</div><div className="time-grid">{slots.map(slot => <button key={slot} className={`time-option ${time === slot ? "selected" : ""}`} onClick={() => setTime(slot)} aria-pressed={time === slot}>{slot}</button>)}</div><p className="calendar-note">Свободное время здесь демонстрационное и не бронируется.</p></>}</div>}

          {step === 4 && <div className="booking-panel"><div className="panel-head"><span className="panel-index">05 / 05</span><h2>Ваши контакты</h2><p>Остался последний шаг. Как к вам обращаться?</p></div><div className="contact-form"><label htmlFor="client-name">Ваше имя <span>*</span></label><input id="client-name" autoComplete="name" value={name} onChange={event => { setName(event.target.value); setFormError(""); }} placeholder="Например, Азиз" maxLength={60} /><label htmlFor="client-phone">Номер телефона <span>*</span></label><input id="client-phone" type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={event => { setPhone(event.target.value); setFormError(""); }} placeholder="+998 90 123 45 67" maxLength={25} /><p>Используем номер только для связи по записи.</p>{formError && <div className="form-error" role="alert">{formError}</div>}<div className="demo-disclaimer">Это учебная форма: подтверждение появится на экране, но запись пока не сохраняется и уведомление не отправляется.</div></div></div>}

          <div className="booking-controls">{step > 0 && <button className="back-step" onClick={() => setStep(value => value - 1)}><ArrowLeft size={18} /> Назад</button>}<button className="button button-gold button-large continue-button" onClick={goNext} disabled={!canContinue || submitting}>{submitting ? <><LoaderCircle className="spin" size={18} /> Подтверждаем…</> : <>{step === 4 ? "Подтвердить запись" : "Продолжить"} <ArrowRight size={18} /></>}</button></div>
        </div><aside className="booking-summary"><span className="summary-label">ВАША ЗАПИСЬ</span><h3>Всё в одном месте.</h3><div className="summary-line"><Scissors size={18} /><div><span>Услуга</span><strong>{selectedService?.name ?? "Пока не выбрана"}</strong></div></div><div className="summary-line"><UserRound size={18} /><div><span>Барбер</span><strong>{barberId === "any" ? "Любой свободный" : selectedBarber?.name ?? "Не выбран"}</strong></div></div><div className="summary-line"><CalendarDays size={18} /><div><span>Дата и время</span><strong>{selectedDate ? `${selectedDate.full}${time ? `, ${time}` : ""}` : "Пока не выбраны"}</strong></div></div><div className="summary-total"><span>Итого</span><strong>{selectedService ? formatPrice(selectedService.price) : "—"}</strong></div><p>Оплата после визита · время по Ташкенту</p></aside></div>
      </> : <div className="confirmation"><div className="confirmation-icon"><CheckCircle2 size={44} /></div><span className="eyebrow"><span className="eyebrow-line" /> ГОТОВО</span><h1>Выглядит <em>отлично!</em></h1><p>Вы прошли сценарий записи. Ниже — выбранные детали.</p><div className="confirmation-card"><span className="summary-label">ДЕМО-ПОДТВЕРЖДЕНИЕ · {reference}</span><div><span>Услуга</span><strong>{selectedService?.name}</strong></div><div><span>Барбер</span><strong>{barberId === "any" ? "Любой свободный" : selectedBarber?.name}</strong></div><div><span>Когда</span><strong>{selectedDate?.full}, {time}</strong></div><div><span>Гость</span><strong>{name.trim()}</strong></div><div><span>Стоимость</span><strong>{selectedService && formatPrice(selectedService.price)}</strong></div></div><div className="confirmation-note">Это демонстрация интерфейса. Реальная запись появится после подключения backend на этапе 5.</div><div className="confirmation-actions"><button className="button button-gold" onClick={reset}>Записаться ещё раз <ArrowRight size={17} /></button><Link href="/" className="button button-outline">На главную</Link></div></div>}
    </div>
  </section>;
}

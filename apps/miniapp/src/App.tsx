import { useEffect, useMemo, useState } from "react";
import { api, setInitData, type Barber, type Booking, type Service, type Slot } from "./api";

type View = "book" | "mine";
const money = (value: number) => new Intl.NumberFormat("ru-RU").format(value) + " сум";
const localDate = (iso: string) => new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Tashkent" }).format(new Date(iso));
const webUrl = import.meta.env.VITE_WEB_URL;
const mediaUrl = (value: string) => value.startsWith("/") ? (webUrl ? `${webUrl}${value}` : `${window.location.origin}/media${value}`) : value;

function dates() {
  const today = new Date(Date.now() + 5 * 60 * 60_000);
  const start = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Array.from({ length: 14 }, (_, index) => new Date(start + index * 86_400_000).toISOString().slice(0, 10));
}

function applyTelegramTheme() {
  const webApp = window.Telegram?.WebApp;
  if (!webApp) return;
  const root = document.documentElement;
  const theme = webApp.themeParams;
  if (theme.bg_color) root.style.setProperty("--tg-bg", theme.bg_color);
  if (theme.text_color) root.style.setProperty("--tg-text", theme.text_color);
  if (theme.hint_color) root.style.setProperty("--tg-hint", theme.hint_color);
  if (theme.button_color) root.style.setProperty("--tg-button", theme.button_color);
  if (theme.button_text_color) root.style.setProperty("--tg-button-text", theme.button_text_color);
  root.dataset.scheme = webApp.colorScheme;
}

export function App() {
  const webApp = window.Telegram?.WebApp;
  const [view, setView] = useState<View>("book");
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [serviceId, setServiceId] = useState("");
  const [barberId, setBarberId] = useState("any");
  const [date, setDate] = useState("");
  const [slot, setSlot] = useState<Slot | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [step, setStep] = useState(0);
  const [name, setName] = useState(webApp?.initDataUnsafe.user?.first_name ?? "");
  const [phone, setPhone] = useState("");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [created, setCreated] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const days = useMemo(dates, []);

  useEffect(() => {
    const telegram = window.Telegram?.WebApp;
    telegram?.ready(); telegram?.expand(); applyTelegramTheme();
    telegram?.onEvent("themeChanged", applyTelegramTheme);
    const initData = telegram?.initData ?? "";
    setInitData(initData);
    Promise.all([api.services(), api.barbers(), initData ? api.auth() : Promise.resolve(null)])
      .then(([serviceList, barberList, auth]) => {
        setServices(serviceList); setBarbers(barberList); setAuthenticated(Boolean(auth));
        if (auth?.user.first_name) setName(`${auth.user.first_name}${auth.user.last_name ? ` ${auth.user.last_name}` : ""}`);
      })
      .catch(reason => setError(reason instanceof Error ? reason.message : "Не удалось загрузить данные"))
      .finally(() => setLoading(false));
    return () => telegram?.offEvent("themeChanged", applyTelegramTheme);
  }, []);

  async function findSlots(selectedDate: string) {
    setDate(selectedDate); setSlot(null); setSlots([]); setLoading(true); setError("");
    try { setSlots((await api.availability(serviceId, barberId, selectedDate)).slots); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Не удалось загрузить время"); }
    finally { setLoading(false); }
  }

  async function confirm() {
    if (!slot) return;
    setLoading(true); setError("");
    try {
      const booking = await api.createBooking({ serviceIds: [serviceId], barberId, startsAt: slot.startsAt, client: { name, phone } });
      setCreated(booking); setStep(5); webApp?.HapticFeedback?.notificationOccurred("success");
    } catch (reason) {
      const code = reason && typeof reason === "object" && "code" in reason ? reason.code : "";
      if (code === "SLOT_TAKEN") { setStep(3); setSlot(null); await findSlots(date); }
      setError(reason instanceof Error ? reason.message : "Не удалось создать запись");
      webApp?.HapticFeedback?.notificationOccurred("error");
    } finally { setLoading(false); }
  }

  async function showMine() {
    setView("mine"); setError("");
    if (!authenticated) return;
    setLoading(true);
    try { setBookings(await api.myBookings()); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Не удалось загрузить записи"); }
    finally { setLoading(false); }
  }

  const selectedService = services.find(item => item.id === serviceId);
  if (loading && !services.length) return <div className="center"><span className="spinner" />Загружаем BRAVO…</div>;

  return <main>
    <header><div><span className="monogram">B</span><div><strong>BRAVO.</strong><small>BARBERSHOP · TASHKENT</small></div></div><nav><button className={view === "book" ? "active" : ""} onClick={() => setView("book")}>Запись</button><button className={view === "mine" ? "active" : ""} onClick={() => void showMine()}>Мои записи</button></nav></header>
    {!webApp?.initData && <div className="preview">Режим предпросмотра. «Мои записи» доступны после запуска внутри Telegram.</div>}
    {error && <div className="error" role="alert">{error}</div>}
    {view === "mine" ? <MyBookings bookings={bookings} authenticated={authenticated} loading={loading} onChange={setBookings} /> :
      <section className="flow">
        <div className="intro"><span>ОНЛАЙН-ЗАПИСЬ</span><h1>{step === 5 ? "Запись подтверждена." : "Ваше время выглядеть лучше."}</h1></div>
        {step < 5 && <div className="progress">{[0,1,2,3,4].map(value => <i key={value} className={value <= step ? "done" : ""} />)}</div>}
        {step === 0 && <Panel title="Выберите услугу">{services.map(service => <button className={`option ${serviceId === service.id ? "selected" : ""}`} key={service.id} onClick={() => setServiceId(service.id)}><span><strong>{service.name}</strong><small>{service.durationMin} мин · {service.description}</small></span><b>{money(service.price)}</b></button>)}<Next disabled={!serviceId} onClick={() => setStep(1)} /></Panel>}
        {step === 1 && <Panel title="Выберите мастера"><button className={`option ${barberId === "any" ? "selected" : ""}`} onClick={() => setBarberId("any")}><span><strong>Любой свободный</strong><small>Подберём мастера на выбранное время</small></span></button>{barbers.map(barber => <button className={`option barber ${barberId === barber.id ? "selected" : ""}`} key={barber.id} onClick={() => setBarberId(barber.id)}>{barber.photoUrl && <img src={mediaUrl(barber.photoUrl)} alt={`Мастер ${barber.name}`} />}<span><strong>{barber.name}</strong><small>{barber.experienceYears} лет опыта</small></span></button>)}<BackNext back={() => setStep(0)} next={() => setStep(2)} /></Panel>}
        {step === 2 && <Panel title="Выберите дату"><div className="date-grid">{days.map(value => <button key={value} className={date === value ? "selected" : ""} onClick={() => void findSlots(value)}><small>{new Intl.DateTimeFormat("ru-RU", { weekday: "short", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`))}</small><strong>{value.slice(8)}</strong><span>{new Intl.DateTimeFormat("ru-RU", { month: "short", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`))}</span></button>)}</div><BackNext back={() => setStep(1)} next={() => setStep(3)} disabled={!date || loading} /></Panel>}
        {step === 3 && <Panel title="Выберите время">{loading ? <div className="center"><span className="spinner" />Ищем время…</div> : slots.length ? <div className="slot-grid">{slots.map(item => <button className={slot?.startsAt === item.startsAt ? "selected" : ""} key={item.startsAt} onClick={() => setSlot(item)}>{item.time}</button>)}</div> : <p className="empty">На выбранную дату свободных мест нет.</p>}<BackNext back={() => setStep(2)} next={() => setStep(4)} disabled={!slot} /></Panel>}
        {step === 4 && <Panel title="Ваши контакты"><label>Имя<input value={name} onChange={event => setName(event.target.value)} autoComplete="name" /></label><label>Телефон<input value={phone} onChange={event => setPhone(event.target.value)} type="tel" inputMode="tel" placeholder="+998 90 123 45 67" autoComplete="tel" /></label><div className="summary"><span>{selectedService?.name}</span><strong>{date}, {slot?.time}</strong><b>{selectedService && money(selectedService.price)}</b></div><BackNext back={() => setStep(3)} next={() => void confirm()} disabled={name.trim().length < 2 || phone.replace(/\D/g, "").length !== 12 || loading} final /></Panel>}
        {step === 5 && created && <div className="success"><span>✓</span><h2>Место в кресле ваше</h2><p>{created.barber.name}<br />{localDate(created.startsAt)}</p><strong>{money(created.totalPrice)}</strong><button className="primary" onClick={() => void showMine()}>Открыть мои записи</button><button className="secondary" onClick={() => { setStep(0); setCreated(null); setServiceId(""); setDate(""); setSlot(null); }}>Записаться ещё раз</button></div>}
      </section>}
  </main>;
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) { return <div className="panel"><h2>{title}</h2>{children}</div>; }
function Next({ disabled, onClick }: { disabled?: boolean; onClick(): void }) { return <button className="primary next" disabled={disabled} onClick={onClick}>Продолжить</button>; }
function BackNext({ back, next, disabled, final }: { back(): void; next(): void; disabled?: boolean; final?: boolean }) { return <div className="actions"><button className="secondary" onClick={back}>Назад</button><button className="primary" disabled={disabled} onClick={next}>{final ? "Подтвердить" : "Продолжить"}</button></div>; }

function MyBookings({ bookings, authenticated, loading, onChange }: { bookings: Booking[]; authenticated: boolean; loading: boolean; onChange(value: Booking[]): void }) {
  const [moving, setMoving] = useState<string | null>(null);
  const [moveDate, setMoveDate] = useState("");
  const [moveSlots, setMoveSlots] = useState<Slot[]>([]);
  const [busy, setBusy] = useState(false);
  if (!authenticated) return <section className="empty-state"><h2>Откройте Mini App в Telegram</h2><p>Telegram безопасно подтвердит вашу личность и покажет связанные записи.</p></section>;
  if (loading) return <div className="center"><span className="spinner" />Загружаем записи…</div>;
  if (!bookings.length) return <section className="empty-state"><h2>Записей пока нет</h2><p>Создайте первую запись во вкладке «Запись».</p></section>;
  async function cancel(booking: Booking) { setBusy(true); try { const updated = await api.cancel(booking.manageToken); onChange(bookings.map(item => item.id === updated.id ? updated : item)); } finally { setBusy(false); } }
  async function findMoveSlots(booking: Booking, value: string) { setMoveDate(value); setBusy(true); try { setMoveSlots((await api.availability(booking.services[0].serviceId, booking.barber.id, value)).slots); } finally { setBusy(false); } }
  async function move(booking: Booking, selected: Slot) { setBusy(true); try { const updated = await api.reschedule(booking.manageToken, booking.barber.id, selected.startsAt); onChange(bookings.map(item => item.id === updated.id ? updated : item)); setMoving(null); setMoveSlots([]); } finally { setBusy(false); } }
  return <section className="booking-list"><div className="intro"><span>ВАШИ ВИЗИТЫ</span><h1>Мои записи.</h1></div>{bookings.map(booking => <article key={booking.id}><span className={`status ${booking.status}`}>{booking.status === "confirmed" ? "Подтверждена" : "Отменена"}</span><h2>{booking.services.map(item => item.name).join(", ")}</h2><p>{booking.barber.name} · {localDate(booking.startsAt)}</p><strong>{money(booking.totalPrice)}</strong>{booking.status === "confirmed" && <div className="record-actions"><button onClick={() => setMoving(moving === booking.id ? null : booking.id)}>Перенести</button><button onClick={() => void cancel(booking)} disabled={busy}>Отменить</button></div>}{moving === booking.id && <div className="move"><input type="date" value={moveDate} min={dates()[0]} onChange={event => void findMoveSlots(booking, event.target.value)} />{moveSlots.map(item => <button key={item.startsAt} onClick={() => void move(booking, item)}>{item.time}</button>)}</div>}</article>)}</section>;
}

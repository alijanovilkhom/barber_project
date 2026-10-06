"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, LoaderCircle, Plus, X } from "lucide-react";
import { adminRequest, type AdminBooking } from "@/lib/admin-api";
import { loadAvailability, type AvailabilitySlot } from "@/lib/booking-api";

type Service = { id: string; name: string; durationMin: number; isActive: boolean };
type Barber = { id: string; name: string; isActive: boolean; serviceIds: string[] };
type DialogMode = "create" | "move" | null;

const statusLabel = { confirmed: "Подтверждена", completed: "Завершена", cancelled: "Отменена", no_show: "Неявка" };
const today = () => new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString().slice(0, 10);

export function AdminBookings() {
  const router = useRouter();
  const [rows, setRows] = useState<AdminBooking[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [dialog, setDialog] = useState<DialogMode>(null);
  const [moving, setMoving] = useState<AdminBooking | null>(null);
  const [serviceId, setServiceId] = useState("");
  const [barberId, setBarberId] = useState("");
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [startsAt, setStartsAt] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [dialogError, setDialogError] = useState("");
  const [busy, setBusy] = useState(false);
  const [changingStatus, setChangingStatus] = useState("");

  async function load() {
    setError("");
    try { setRows(await adminRequest("/api/v1/admin/bookings")); }
    catch (value) {
      const requestError = value as Error & { status?: number };
      if (requestError.status === 401) return router.replace("/admin/login");
      setError(requestError.message);
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);
  useEffect(() => {
    void Promise.all([adminRequest<Service[]>("/api/v1/admin/services"), adminRequest<Barber[]>("/api/v1/admin/barbers")])
      .then(([serviceRows, barberRows]) => { setServices(serviceRows.filter(item => item.isActive)); setBarbers(barberRows.filter(item => item.isActive)); })
      .catch(value => setError(value instanceof Error ? value.message : "Не удалось загрузить справочники"));
  }, []);

  useEffect(() => {
    if (!dialog) return;
    function closeOnEscape(event: KeyboardEvent) { if (event.key === "Escape" && !busy) closeDialog(); }
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", closeOnEscape); };
  }, [dialog, busy]);

  useEffect(() => {
    const serviceIds = dialog === "move" ? moving?.services.map(item => item.serviceId) ?? [] : serviceId ? [serviceId] : [];
    if (!serviceIds.length || !barberId || !date) { setSlots([]); return; }
    let active = true;
    setSlotsLoading(true); setStartsAt(""); setDialogError("");
    loadAvailability(serviceIds, barberId, date)
      .then(data => { if (active) setSlots(data.slots); })
      .catch(value => { if (active) setDialogError(value instanceof Error ? value.message : "Не удалось загрузить время"); })
      .finally(() => { if (active) setSlotsLoading(false); });
    return () => { active = false; };
  }, [dialog, moving, serviceId, barberId, date]);

  function resetForm() {
    setServiceId(""); setBarberId(""); setDate(""); setSlots([]); setStartsAt("");
    setName(""); setPhone(""); setDialogError(""); setMoving(null);
  }
  function openCreate() { resetForm(); setDialog("create"); }
  function openMove(row: AdminBooking) { resetForm(); setMoving(row); setBarberId(row.barber.id); setDialog("move"); }
  function closeDialog() { if (!busy) { setDialog(null); resetForm(); } }

  async function changeStatus(id: string, status: AdminBooking["status"]) {
    setChangingStatus(id); setNotice(""); setError("");
    try {
      await adminRequest(`/api/v1/admin/bookings/${id}/status`, { method: "POST", body: JSON.stringify({ status }) });
      setRows(current => current.map(row => row.id === id ? { ...row, status } : row));
      setNotice("Статус записи обновлён");
    } catch (value) { setError(value instanceof Error ? value.message : "Не удалось изменить статус"); }
    finally { setChangingStatus(""); }
  }

  async function create(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setDialogError("");
    try {
      await adminRequest("/api/v1/admin/bookings", { method: "POST", body: JSON.stringify({ serviceIds: [serviceId], barberId, startsAt, client: { name: name.trim(), phone } }) });
      setDialog(null); resetForm(); setNotice("Запись создана"); await load();
    } catch (value) { setDialogError(value instanceof Error ? value.message : "Не удалось создать запись"); }
    finally { setBusy(false); }
  }

  async function reschedule(event: React.FormEvent) {
    event.preventDefault(); if (!moving || !startsAt) return;
    setBusy(true); setDialogError("");
    try {
      await adminRequest(`/api/v1/admin/bookings/${moving.id}/reschedule`, { method: "PUT", body: JSON.stringify({ barberId, startsAt }) });
      setDialog(null); resetForm(); setNotice("Запись перенесена"); await load();
    } catch (value) { setDialogError(value instanceof Error ? value.message : "Не удалось перенести запись"); }
    finally { setBusy(false); }
  }

  const eligibleBarbers = barbers.filter(barber => dialog === "move"
    ? moving?.services.every(service => barber.serviceIds.includes(service.serviceId))
    : serviceId && barber.serviceIds.includes(serviceId));

  return <>
    <header className="admin-page-head"><div><span>РАСПИСАНИЕ</span><h1>Записи</h1><p>Последние визиты и актуальный статус клиентов.</p></div><button onClick={openCreate} className="admin-primary"><Plus size={18} /> Новая запись</button></header>
    {notice && <p className="admin-notice" role="status">{notice}</p>}
    {error && <p className="admin-error" role="alert">{error}</p>}
    <section className="admin-panel">{loading ? <div className="admin-state"><LoaderCircle className="spin" />Загрузка записей…</div> : rows.length === 0 ? <div className="admin-empty"><CalendarDays size={30} /><strong>Записей пока нет</strong></div> : <div className="admin-table-wrap"><table><thead><tr><th>Дата</th><th>Клиент</th><th>Услуга</th><th>Мастер</th><th>Статус</th><th>Сумма</th><th aria-label="Действия" /></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td><strong>{new Intl.DateTimeFormat("ru-RU", { timeZone: "Asia/Tashkent", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(row.startsAt))}</strong></td><td>{row.client.name}<small>{row.client.phone}</small></td><td>{row.services.map(service => service.name).join(", ")}</td><td>{row.barber.name}</td><td><select disabled={changingStatus === row.id} value={row.status} onChange={event => void changeStatus(row.id, event.target.value as AdminBooking["status"])} className={`status-${row.status}`}>{Object.entries(statusLabel).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></td><td>{new Intl.NumberFormat("ru-RU").format(row.totalPrice)} сум</td><td>{row.status === "confirmed" && <button className="admin-secondary admin-compact" onClick={() => openMove(row)}>Перенести</button>}</td></tr>)}</tbody></table></div>}</section>

    {dialog && <div className="admin-modal-backdrop" onMouseDown={event => event.target === event.currentTarget && closeDialog()}>
      <form className="admin-modal admin-booking-modal" onSubmit={dialog === "create" ? create : reschedule} role="dialog" aria-modal="true" aria-labelledby="booking-dialog-title">
        <header><div><span className="admin-kicker">{dialog === "create" ? "НОВАЯ ЗАПИСЬ" : "ИЗМЕНЕНИЕ ВРЕМЕНИ"}</span><h2 id="booking-dialog-title">{dialog === "create" ? "Добавить клиента" : "Перенести запись"}</h2></div><button type="button" className="admin-modal-close" onClick={closeDialog} aria-label="Закрыть"><X size={20} /></button></header>
        {dialog === "move" && moving && <div className="admin-modal-summary"><strong>{moving.client.name}</strong><span>{moving.services.map(service => service.name).join(", ")}</span></div>}
        <div className="admin-form-grid">
          {dialog === "create" && <label>Услуга<select required value={serviceId} onChange={event => { setServiceId(event.target.value); setBarberId(""); }}><option value="">Выбрать услугу</option>{services.map(service => <option key={service.id} value={service.id}>{service.name} · {service.durationMin} мин</option>)}</select></label>}
          <label>Мастер<select required value={barberId} disabled={dialog === "create" && !serviceId} onChange={event => setBarberId(event.target.value)}><option value="">Выбрать мастера</option>{eligibleBarbers.map(barber => <option key={barber.id} value={barber.id}>{barber.name}</option>)}</select></label>
          <label>Дата<input required type="date" min={today()} value={date} onChange={event => setDate(event.target.value)} /></label>
          <label>Свободное время<select required value={startsAt} disabled={!date || slotsLoading} onChange={event => setStartsAt(event.target.value)}><option value="">{slotsLoading ? "Загружаем…" : slots.length ? "Выбрать время" : "Нет доступных слотов"}</option>{slots.map(slot => <option key={slot.startsAt} value={slot.startsAt}>{slot.time}</option>)}</select></label>
          {dialog === "create" && <><label>Имя клиента<input required minLength={2} maxLength={60} autoComplete="name" value={name} onChange={event => setName(event.target.value)} placeholder="Например, Азиз" /></label><label>Телефон<input required type="tel" autoComplete="tel" placeholder="+998 90 123 45 67" value={phone} onChange={event => setPhone(event.target.value)} /></label></>}
        </div>
        {dialogError && <p className="admin-error" role="alert">{dialogError}</p>}
        <footer className="admin-modal-actions"><button className="admin-secondary" type="button" onClick={closeDialog} disabled={busy}>Отмена</button><button className="admin-primary" disabled={busy || !startsAt}>{busy ? <><LoaderCircle className="spin" size={17} /> Сохраняем…</> : dialog === "create" ? "Создать запись" : "Сохранить время"}</button></footer>
      </form>
    </div>}
  </>;
}

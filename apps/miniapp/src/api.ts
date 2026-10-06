const base = import.meta.env.VITE_API_URL ?? `${window.location.origin}/api/v1`;

export type Service = { id: string; name: string; description: string | null; durationMin: number; price: number };
export type Barber = { id: string; name: string; photoUrl: string | null; bio: string | null; experienceYears: number };
export type Slot = { time: string; startsAt: string; barberIds: string[] };
export type Booking = { id: string; manageToken: string; status: string; startsAt: string; totalPrice: number; barber: { id: string; name: string }; client: { name: string; phone: string }; services: { serviceId: string; name: string }[] };

let initData = "";
export function setInitData(value: string) { initData = value; }

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${base}${path}`, { ...init, headers: { "Content-Type": "application/json", ...(initData ? { Authorization: `tma ${initData}` } : {}), ...init?.headers } });
  const body = await response.json();
  if (!response.ok) throw Object.assign(new Error(body.error?.message ?? "Ошибка запроса"), { code: body.error?.code, status: response.status });
  return body.data as T;
}

export const api = {
  auth: () => request<{ user: { id: number; first_name: string; last_name?: string } }>("/telegram/auth", { method: "POST", body: "{}" }),
  services: () => request<Service[]>("/services"),
  barbers: () => request<Barber[]>("/barbers"),
  availability: (serviceId: string, barberId: string, date: string) => request<{ slots: Slot[] }>(`/availability?${new URLSearchParams({ serviceIds: serviceId, barberId, date })}`),
  createBooking: (body: unknown) => request<Booking>("/bookings", { method: "POST", body: JSON.stringify(body) }),
  myBookings: () => request<Booking[]>("/me/bookings"),
  cancel: (token: string) => request<Booking>(`/bookings/${token}/cancel`, { method: "POST", body: "{}" }),
  reschedule: (token: string, barberId: string, startsAt: string) => request<Booking>(`/bookings/${token}/reschedule`, { method: "POST", body: JSON.stringify({ barberId, startsAt }) }),
};

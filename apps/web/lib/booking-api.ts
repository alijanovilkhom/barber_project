const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? (process.env.NODE_ENV === "production" ? "" : "http://127.0.0.1:3001");

export type AvailabilitySlot = { time: string; startsAt: string; barberIds: string[] };
export type BookingResult = {
  id: string;
  manageToken: string;
  status: string;
  startsAt: string;
  endsAt: string;
  totalPrice: number;
  totalDurationMin: number;
  barber: { id: string; name: string; photoUrl: string | null };
  client: { name: string; phone: string };
  services: { serviceId: string; name: string; durationMin: number; price: number }[];
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  const body = await response.json();
  if (!response.ok) throw Object.assign(new Error(body.error?.message ?? "Ошибка запроса"), { code: body.error?.code, status: response.status });
  return body.data as T;
}

export function loadAvailability(serviceIds: string[], barberId: string, date: string) {
  const query = new URLSearchParams({ serviceIds: serviceIds.join(","), barberId, date });
  return request<{ date: string; durationMin: number; slots: AvailabilitySlot[] }>(`/api/v1/availability?${query}`);
}

export function loadAvailableDays(serviceIds: string[], barberId: string, from: string, days = 14) {
  const query = new URLSearchParams({ serviceIds: serviceIds.join(","), barberId, from, days: String(days) });
  return request<{ date: string; available: boolean; firstSlot: string | null }[]>(`/api/v1/availability/days?${query}`);
}

export function createBooking(input: { serviceIds: string[]; barberId: string; startsAt: string; client: { name: string; phone: string } }) {
  return request<BookingResult>("/api/v1/bookings", { method: "POST", body: JSON.stringify(input) });
}

export function getBooking(token: string) {
  return request<BookingResult>(`/api/v1/bookings/${token}`);
}

export function cancelBooking(token: string) {
  return request<BookingResult>(`/api/v1/bookings/${token}/cancel`, { method: "POST", body: "{}" });
}

export function rescheduleBooking(token: string, input: { barberId: string; startsAt: string }) {
  return request<BookingResult>(`/api/v1/bookings/${token}/reschedule`, { method: "POST", body: JSON.stringify(input) });
}

const adminApiUrl = process.env.NEXT_PUBLIC_API_URL ?? (process.env.NODE_ENV === "production" ? "" : "http://127.0.0.1:3001");

export type AdminBooking = {
  id: string; status: "confirmed" | "completed" | "cancelled" | "no_show"; startsAt: string; totalPrice: number;
  client: { name: string; phone: string }; barber: { id: string; name: string }; services: Array<{ serviceId:string; name: string }>;
};

export async function adminRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${adminApiUrl}${path}`, {
    ...init, credentials: "include", headers: { "content-type": "application/json", ...init?.headers },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(body?.error?.message ?? "Ошибка запроса"), { status: response.status, code: body?.error?.code });
  return body.data as T;
}

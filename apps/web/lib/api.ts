import type { Barber, Service } from "./data";

const apiUrl = process.env.API_URL ?? "http://127.0.0.1:3001";

type ApiService = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  durationMin: number;
  price: number;
};

type ApiBarber = {
  id: string;
  slug: string;
  name: string;
  photoUrl: string | null;
  bio: string | null;
  experienceYears: number;
};

async function request<T>(path: string): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`API request failed with ${response.status}`);
  return response.json() as Promise<T>;
}

export async function getServices(): Promise<Service[]> {
  const response = await request<{ data: ApiService[] }>("/api/v1/services");
  return response.data.map((service, index) => ({
    id: service.id,
    slug: service.slug,
    number: String(index + 1).padStart(2, "0"),
    name: service.name,
    description: service.description ?? "",
    duration: service.durationMin,
    price: service.price,
  }));
}

export async function getBarbers(): Promise<Barber[]> {
  const response = await request<{ data: ApiBarber[] }>("/api/v1/barbers");
  return response.data.map((barber, index) => ({
    id: barber.id,
    slug: barber.slug,
    name: barber.name,
    role: barber.experienceYears >= 8 ? "Старший барбер" : "Барбер",
    experience: `${barber.experienceYears} ${yearWord(barber.experienceYears)} опыта`,
    photo: barber.photoUrl ?? "/images/hero-video-poster.jpg",
    initials: barber.name.slice(0, 1),
    accent: `portrait-${index + 1}`,
    bio: barber.bio ?? "Точный подход к форме и деталям.",
  }));
}

function yearWord(value: number) {
  if (value % 10 === 1 && value % 100 !== 11) return "год";
  if ([2, 3, 4].includes(value % 10) && ![12, 13, 14].includes(value % 100)) return "года";
  return "лет";
}

import { BookingFlow } from "@/components/booking-flow";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Suspense } from "react";
import { getBarbers, getServices } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function BookPage() {
  const [services, barbers] = await Promise.all([getServices(), getBarbers()]);
  return <><SiteHeader /><main><Suspense fallback={<div className="booking-loading">Загружаем запись…</div>}><BookingFlow services={services} barbers={barbers} /></Suspense></main><SiteFooter /></>;
}

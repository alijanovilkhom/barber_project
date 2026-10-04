import { BookingFlow } from "@/components/booking-flow";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Suspense } from "react";

export default function BookPage() {
  return <><SiteHeader /><main><Suspense fallback={<div className="booking-loading">Загружаем запись…</div>}><BookingFlow /></Suspense></main><SiteFooter /></>;
}

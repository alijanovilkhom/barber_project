import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { BookingManager } from "@/components/booking-manager";
import { getBooking } from "@/lib/booking-api";

export const dynamic = "force-dynamic";

export default async function BookingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const booking = await getBooking(token).catch(error => {
    if (error && typeof error === "object" && "status" in error && error.status === 404) return null;
    throw error;
  });
  if (!booking) notFound();
  return <><SiteHeader /><main><BookingManager initialBooking={booking} /></main><SiteFooter /></>;
}

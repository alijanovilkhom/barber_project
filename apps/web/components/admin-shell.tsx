"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, CalendarDays, Clock3, LogOut, Scissors, Settings, Star, UsersRound } from "lucide-react";
import { adminRequest } from "@/lib/admin-api";

const links = [
  { href: "/admin", label: "Записи", icon: CalendarDays }, { href: "/admin/services", label: "Услуги", icon: Scissors },
  { href: "/admin/barbers", label: "Мастера", icon: UsersRound }, { href: "/admin/reviews", label: "Отзывы", icon: Star },
  { href: "/admin/analytics", label: "Аналитика", icon: BarChart3 },
  { href: "/admin/schedule", label: "График", icon: Clock3 },
  { href: "/admin/settings", label: "Настройки", icon: Settings },
];
export function AdminShell({ children }: { children: React.ReactNode }) {
  const path = usePathname(); const router = useRouter();
  async function logout() {
    try { await adminRequest("/api/v1/admin/logout", { method: "POST" }); }
    finally { router.replace("/admin/login"); router.refresh(); }
  }
  return <div className="admin-app"><aside className="admin-sidebar"><Link href="/admin" className="admin-brand"><span>B</span><strong>BRAVO<small>УПРАВЛЕНИЕ</small></strong></Link><nav>{links.map(item => <Link key={item.href} href={item.href} className={path === item.href ? "active" : ""}><item.icon size={18} />{item.label}</Link>)}</nav><button className="admin-logout" onClick={logout}><LogOut size={17} /> Выйти</button></aside><main className="admin-main">{children}</main></div>;
}

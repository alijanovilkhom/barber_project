import "./admin.css";
import "./analytics.css";
import { AdminAuthGuard } from "@/components/admin-auth-guard";

export const metadata = { title: "Управление — BRAVO" };
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminAuthGuard>{children}</AdminAuthGuard>;
}

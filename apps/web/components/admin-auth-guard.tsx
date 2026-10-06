"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { adminRequest } from "@/lib/admin-api";

type AuthState = "checking" | "authenticated" | "unavailable";

export function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/admin/login";
  const [state, setState] = useState<AuthState>(isLoginPage ? "authenticated" : "checking");

  useEffect(() => {
    if (isLoginPage) {
      setState("authenticated");
      return;
    }

    let active = true;
    setState("checking");
    adminRequest("/api/v1/admin/me")
      .then(() => {
        if (active) setState("authenticated");
      })
      .catch((error: unknown) => {
        if (!active) return;
        if (typeof error === "object" && error && "status" in error && error.status === 401) {
          router.replace("/admin/login");
          return;
        }
        setState("unavailable");
      });

    return () => {
      active = false;
    };
  }, [isLoginPage, router]);

  if (!isLoginPage && state === "checking") {
    return <main className="admin-auth-check" aria-label="Проверка доступа"><LoaderCircle className="spin" size={28} /></main>;
  }

  if (!isLoginPage && state === "unavailable") {
    return <main className="admin-auth-check"><p>Не удалось связаться с сервером. Обновите страницу через несколько секунд.</p></main>;
  }

  return children;
}

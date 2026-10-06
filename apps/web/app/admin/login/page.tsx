"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, LoaderCircle } from "lucide-react";
import { adminRequest } from "@/lib/admin-api";

export default function AdminLoginPage() {
  const router = useRouter(); const [login, setLogin] = useState(""); const [password, setPassword] = useState("");
  const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setError("");
    try { await adminRequest("/api/v1/admin/login", { method: "POST", body: JSON.stringify({ login, password }) }); router.replace("/admin"); }
    catch (value) { setError(value instanceof Error ? value.message : "Не удалось войти"); setLoading(false); }
  }
  return <main className="admin-login"><section className="admin-login-card">
    <div className="admin-monogram">B</div><span className="admin-kicker">BRAVO · УПРАВЛЕНИЕ</span><h1>Вход для команды</h1><p>Записи, расписание и услуги в одном месте.</p>
    <form onSubmit={submit}><label>Логин<input autoComplete="username" value={login} onChange={e => setLogin(e.target.value)} required /></label><label>Пароль<input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} /></label>{error && <div className="admin-error" role="alert">{error}</div>}<button disabled={loading}>{loading ? <LoaderCircle className="spin" size={18} /> : <LockKeyhole size={18} />} Войти</button></form>
  </section></main>;
}

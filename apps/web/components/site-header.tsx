"use client";

import Link from "next/link";
import { ArrowUpRight, Menu, Moon, Sun, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function SiteHeader({ overlayHero = false }: { overlayHero?: boolean }) {
  const headerRef = useRef<HTMLElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("light");

  useEffect(() => {
    const current = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
    const frame = window.requestAnimationFrame(() => setTheme(current));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!overlayHero) return;
    const update = () => { if (headerRef.current) headerRef.current.dataset.scrolled = String(window.scrollY > 40); };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [overlayHero]);

  function toggleTheme() {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("bravo-theme", next); } catch { /* The theme still works when storage is unavailable. */ }
    setTheme(next);
  }

  return <header ref={headerRef} className={`site-header${overlayHero ? " header-over-hero" : ""}${menuOpen ? " menu-is-open" : ""}`}>
    <div className="container header-inner">
      <Link href="/" className="brand" aria-label="BRAVO — на главную" onClick={() => setMenuOpen(false)}><span className="brand-name">BRAVO<span>.</span><small>BARBERSHOP · TASHKENT</small></span></Link>
      <nav id="primary-navigation" className={`nav-links ${menuOpen ? "nav-open" : ""}`} aria-label="Главная навигация">
        <Link href="/#services" onClick={() => setMenuOpen(false)}>Услуги</Link>
        <Link href="/#barbers" onClick={() => setMenuOpen(false)}>Мастера</Link>
        <Link href="/#gallery" onClick={() => setMenuOpen(false)}>Галерея</Link>
        <Link href="/#about" onClick={() => setMenuOpen(false)}>О нас</Link>
        <Link href="/#reviews" onClick={() => setMenuOpen(false)}>Отзывы</Link>
        <Link href="/#contacts" onClick={() => setMenuOpen(false)}>Контакты</Link>
      </nav>
      <div className="header-actions">
        <button className="icon-button theme-button" onClick={toggleTheme} aria-label={theme === "dark" ? "Включить светлую тему" : "Включить тёмную тему"}>{theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}</button>
        <Link href="/book" className="button button-primary header-cta">Записаться <ArrowUpRight size={16} /></Link>
        <button className="icon-button menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? "Закрыть меню" : "Открыть меню"} aria-expanded={menuOpen} aria-controls="primary-navigation">{menuOpen ? <X size={23} /> : <Menu size={23} />}</button>
      </div>
    </div>
  </header>;
}

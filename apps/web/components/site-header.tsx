"use client";

import Link from "next/link";
import { ArrowUpRight, Menu, Moon, Sun, X } from "lucide-react";
import { useEffect, useState } from "react";

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const saved = localStorage.getItem("bravo-theme");
    if (saved === "light") {
      document.documentElement.dataset.theme = "light";
      const frame = window.requestAnimationFrame(() => setTheme("light"));
      return () => window.cancelAnimationFrame(frame);
    }
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("bravo-theme", next);
    setTheme(next);
  }

  return <header className="site-header">
    <div className="container header-inner">
      <Link href="/" className="brand" aria-label="BRAVO — на главную" onClick={() => setMenuOpen(false)}>
        <span className="brand-mark">B<span>.</span></span><span className="brand-name">BRAVO<small>BARBERSHOP</small></span>
      </Link>
      <nav className={`nav-links ${menuOpen ? "nav-open" : ""}`} aria-label="Главная навигация">
        <Link href="/#services" onClick={() => setMenuOpen(false)}>Услуги</Link>
        <Link href="/#barbers" onClick={() => setMenuOpen(false)}>Мастера</Link>
        <Link href="/#reviews" onClick={() => setMenuOpen(false)}>Отзывы</Link>
        <Link href="/#contacts" onClick={() => setMenuOpen(false)}>Контакты</Link>
      </nav>
      <div className="header-actions">
        <button className="icon-button theme-button" onClick={toggleTheme} aria-label={theme === "dark" ? "Включить светлую тему" : "Включить тёмную тему"}>{theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}</button>
        <Link href="/book" className="button button-gold header-cta">Записаться <ArrowUpRight size={17} /></Link>
        <button className="icon-button menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? "Закрыть меню" : "Открыть меню"} aria-expanded={menuOpen}>{menuOpen ? <X size={23} /> : <Menu size={23} />}</button>
      </div>
    </div>
  </header>;
}

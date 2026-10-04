import Link from "next/link";
import { ArrowUpRight, Instagram } from "lucide-react";

export function SiteFooter() {
  return <footer className="site-footer">
    <div className="container footer-top">
      <div><Link href="/" className="brand"><span className="brand-mark">B<span>.</span></span><span className="brand-name">BRAVO<small>BARBERSHOP</small></span></Link><p>Хорошая стрижка меняет больше,<br />чем кажется.</p></div>
      <div><span className="footer-label">Навигация</span><Link href="/#services">Услуги</Link><Link href="/#barbers">Мастера</Link><Link href="/book">Онлайн-запись</Link></div>
      <div><span className="footer-label">На связи</span><a href="tel:+998901234567">+998 90 123 45 67</a><a href="mailto:hello@bravo.uz">hello@bravo.uz</a><a href="https://www.instagram.com/" target="_blank" rel="noreferrer">Instagram <Instagram size={15} /></a></div>
    </div>
    <div className="container footer-bottom"><span>© {new Date().getFullYear()} BRAVO Barbershop</span><span>Учебный проект · данные для демонстрации</span><Link href="/#top">Наверх <ArrowUpRight size={14} /></Link></div>
  </footer>;
}

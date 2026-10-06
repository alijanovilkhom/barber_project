import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowUpRight, Clock3, MapPin, Phone } from "lucide-react";
import { formatPrice } from "@/lib/data";
import { getBarbers, getServices } from "@/lib/api";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { HeroVideo } from "@/components/hero-video";
import { ReviewRail } from "@/components/review-rail";

const yandexMapUrl = "https://yandex.com/maps/10335/tashkent/house/YkAYdAJpQEEAQFprfX54cXliZA%3D%3D/";
const yandexRouteUrl = "https://yandex.com/maps/10335/tashkent/?rtext=~41.290511%2C69.259947&rtt=auto";
const yandexEmbedUrl = "https://yandex.com/map-widget/v1/?ll=69.259947%2C41.290511&z=16&pt=69.259947%2C41.290511%2Cpm2rdm&lang=ru_RU";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [services, barbers] = await Promise.all([getServices(), getBarbers()]);
  return <>
    <SiteHeader overlayHero />
    <main id="top" className="home-main">
      <section className="hero" aria-labelledby="hero-title">
        <HeroVideo />
        <div className="hero-copy">
          <div className="hero-copy-inner">
            <span className="eyebrow"><span className="eyebrow-line" /> BARBERSHOP · TASHKENT</span>
            <h1 id="hero-title">BRAVO.<br /><em>Точность</em><br />в характере.</h1>
            <p>Стрижки и уход за бородой с вниманием к форме, деталям и вашему времени.</p>
            <div className="hero-actions">
              <Link href="/book" className="button button-primary button-large">Записаться онлайн <ArrowUpRight size={18} /></Link>
            </div>
          </div>
          <div className="hero-foot"><a href="#about" aria-label="К следующему разделу"><ArrowDown size={18} /></a></div>
        </div>
      </section>

      <section id="about" className="intro section-padding" aria-labelledby="about-title">
        <div className="container intro-grid">
          <div className="section-kicker"><span className="eyebrow"><span className="eyebrow-line" /> НАШ ПОДХОД</span><span className="section-index">01 — 06</span></div>
          <div className="intro-main"><h2 id="about-title">Хорошая стрижка<br />говорит <em>за вас.</em></h2><div className="intro-bottom"><p>Мы начинаем с разговора и заканчиваем тогда, когда форма сидит безупречно. Спокойный сервис, точная работа и время, посвящённое только вам.</p><span>Мастерство без лишнего шума.</span></div></div>
        </div>
      </section>

      <section id="services" className="services-section section-padding" aria-labelledby="services-title">
        <div className="container">
          <div className="section-head"><div><span className="eyebrow"><span className="eyebrow-line" /> РИТУАЛ И ТОЧНОСТЬ</span><h2 id="services-title">Услуги <em>и цены.</em></h2></div><p>Понятный выбор. Никаких неожиданностей после визита.</p></div>
          <div className="service-list">{services.map(service => <Link href={`/book?service=${service.id}`} className="service-row" key={service.id} aria-label={`${service.name}, ${service.duration} минут, ${formatPrice(service.price)}. Записаться`}>
            <span className="service-number">{service.number}</span>
            <div className="service-title"><h3>{service.name}</h3><p>{service.description}</p></div>
            <span className="service-duration">{service.duration} мин</span>
            <span className="service-price">{formatPrice(service.price)}</span>
            <span className="service-arrow"><ArrowUpRight size={22} /></span>
          </Link>)}</div>
          <p className="services-note">Каждая услуга начинается с консультации мастера. Стоимость указана в сумах (UZS).</p>
        </div>
      </section>

      <section id="barbers" className="barbers-section section-padding" aria-labelledby="barbers-title">
        <div className="container">
          <div className="section-head"><div><span className="eyebrow"><span className="eyebrow-line" /> ЛЮДИ BRAVO</span><h2 id="barbers-title">Мастера<br /><em>своего дела.</em></h2></div><p>У каждого свой почерк. У всех один стандарт — внимание к вам.</p></div>
          <div className="barber-grid">{barbers.map((barber, index) => <article className="barber-card" key={barber.id}>
            <div className="barber-portrait"><Image src={barber.photo} alt={`Портрет мастера ${barber.name}`} fill sizes="(max-width: 650px) 100vw, (max-width: 900px) 50vw, 33vw" /><span className="barber-portrait-number">{String(index + 1).padStart(2, "0")} / {String(barbers.length).padStart(2, "0")}</span></div>
            <div className="barber-info"><div><span className="barber-role">{barber.role} · {barber.experience}</span><h3>{barber.name}</h3><p>{barber.bio}</p></div><Link href={`/book?barber=${barber.id}`} className="barber-book" aria-label={`Записаться к мастеру ${barber.name}`}>Записаться <ArrowUpRight size={18} /></Link></div>
          </article>)}</div>
        </div>
      </section>

      <section id="gallery" className="gallery-section section-padding" aria-labelledby="gallery-title">
        <div className="container">
          <div className="section-head"><div><span className="eyebrow"><span className="eyebrow-line" /> ВНУТРИ BRAVO</span><h2 id="gallery-title">Внимание <em>видно.</em></h2></div><p>Атмосфера начинается с пространства и продолжается в каждой детали работы.</p></div>
          <div className="gallery-layout">
            <figure className="gallery-feature"><div className="gallery-image gallery-reveal"><Image src="/images/barbershop-1.jpg" alt="Зал барбершопа с кирпичной стеной, креслами и работающим мастером" fill sizes="(max-width: 800px) 100vw, 55vw" /></div><figcaption><span>01 / ПРОСТРАНСТВО</span><span>Место, где можно замедлиться.</span></figcaption></figure>
            <div className="gallery-side">
              <figure><div className="gallery-image"><Image src="/images/barbershop-2.jpg" alt="Барбер оформляет бороду клиенту" fill sizes="(max-width: 800px) 100vw, 40vw" /></div><figcaption><span>02 / МАСТЕРСТВО</span><span>Точность в движении.</span></figcaption></figure>
              <figure><div className="gallery-image"><Image src="/images/barbershop-3.jpg" alt="Рабочее место барбера с инструментами для стрижки" fill sizes="(max-width: 800px) 100vw, 40vw" /></div><figcaption><span>03 / ДЕТАЛИ</span><span>Важен каждый инструмент.</span></figcaption></figure>
            </div>
          </div>
          <p className="visual-disclaimer">Фотографии пространства и работы иллюстративные.</p>
        </div>
      </section>

      <ReviewRail />

      <section className="cta-section"><div className="container cta-inner"><div><span className="eyebrow"><span className="eyebrow-line" /> ВАШЕ ВРЕМЯ</span><h2>Увидимся<br /><em>в кресле.</em></h2></div><div><p>Выберите услугу, мастера и удобное время. Остальное — за нами.</p><Link href="/book" className="button button-light button-large">Выбрать время <ArrowUpRight size={18} /></Link></div></div></section>

      <section id="contacts" className="contacts-section section-padding" aria-labelledby="contacts-title"><div className="container">
        <div className="section-head"><div><span className="eyebrow"><span className="eyebrow-line" /> НАЙТИ НАС ПРОСТО</span><h2 id="contacts-title">До встречи<br /><em>в Ташкенте.</em></h2></div><p>Запишитесь онлайн или позвоните — мы поможем выбрать удобное время.</p></div>
        <div className="contacts-grid"><div className="contacts-content">
          <div className="contact-item"><MapPin size={20} /><div><span>Адрес</span><strong>Ташкент, ул. Шота Руставели, 35</strong><a href={yandexRouteUrl} target="_blank" rel="noreferrer">Построить маршрут <ArrowUpRight size={16} /></a></div></div>
          <div className="contact-item"><Clock3 size={20} /><div><span>Часы работы</span><strong>Ежедневно, 10:00–20:00</strong></div></div>
          <div className="contact-item"><Phone size={20} /><div><span>Телефон</span><a href="tel:+998901234567">+998 90 123 45 67</a></div></div>
          <Link href="/book" className="button button-primary">Записаться <ArrowUpRight size={17} /></Link>
          <span className="demo-note">Адрес, контакты и данные для записи приведены для демонстрации.</span>
        </div><div className="map-card"><iframe title="Яндекс Карта: улица Шота Руставели, 35, Ташкент" src={yandexEmbedUrl} loading="lazy" referrerPolicy="strict-origin-when-cross-origin" /><a href={yandexMapUrl} target="_blank" rel="noreferrer">Открыть в Яндекс Картах <ArrowUpRight size={16} /></a></div></div>
      </div></section>
    </main>
    <Link href="/book" className="mobile-booking-bar">Записаться онлайн <ArrowUpRight size={18} /></Link>
    <SiteFooter />
  </>;
}

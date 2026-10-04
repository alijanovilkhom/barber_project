import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUpRight, Clock3, MapPin, Scissors, Star } from "lucide-react";
import { barbers, formatPrice, reviews, services } from "@/lib/data";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export default function Home() {
  return <>
    <SiteHeader />
    <main id="top">
      <section className="hero">
        <div className="hero-image" />
        <div className="hero-shade" />
        <div className="container hero-content">
          <div className="eyebrow hero-eyebrow"><span className="eyebrow-line" /> БАРБЕРШОП В ТАШКЕНТЕ</div>
          <h1>Твой стиль.<br /><em>Наше дело.</em></h1>
          <p>Место, где мастерство встречается с характером. Приходите за стрижкой. Возвращайтесь за ощущением.</p>
          <div className="hero-actions"><Link href="/book" className="button button-gold button-large">Записаться онлайн <ArrowUpRight size={19} /></Link><a href="#services" className="text-link">Посмотреть услуги <ArrowRight size={17} /></a></div>
          <div className="hero-bottom"><span>ТОЧНОСТЬ В КАЖДОЙ ДЕТАЛИ</span><a href="#about" aria-label="Прокрутить вниз"><ArrowDown size={18} /></a><span>EST. 2026 · TASHKENT</span></div>
        </div>
      </section>

      <section id="about" className="intro section-padding">
        <div className="container intro-grid"><div><span className="eyebrow"><span className="eyebrow-line" /> НАША ФИЛОСОФИЯ</span><h2>Больше, чем<br /><em>просто стрижка.</em></h2></div><div className="intro-copy"><p>Мы верим, что уверенность начинается с деталей. Поэтому слушаем, советуем и работаем до тех пор, пока результат не станет вашим.</p><div className="intro-stats"><div><strong>01</strong><span>Индивидуальный подход</span></div><div><strong>100%</strong><span>Внимания к деталям</span></div></div></div></div>
      </section>

      <section id="services" className="services-section section-padding">
        <div className="container"><div className="section-head"><div><span className="eyebrow"><span className="eyebrow-line" /> ЧТО МЫ ДЕЛАЕМ</span><h2>Наши <em>услуги</em></h2></div><p>Только то, в чём мы действительно хороши. Каждая услуга — время для себя.</p></div><div className="service-list">{services.map(service => <Link href={`/book?service=${service.id}`} className="service-row" key={service.id}><span className="service-number">{service.number}</span><div className="service-title"><h3>{service.name}</h3><p>{service.description}</p></div><span className="service-duration"><Clock3 size={15} /> {service.duration} мин</span><span className="service-price">{formatPrice(service.price)}</span><span className="service-arrow"><ArrowUpRight size={21} /></span></Link>)}</div><div className="services-note"><Scissors size={17} /><span>В стоимость каждой услуги входит консультация мастера.</span></div></div>
      </section>

      <section id="barbers" className="barbers-section section-padding">
        <div className="container"><div className="section-head"><div><span className="eyebrow"><span className="eyebrow-line" /> ЛЮДИ BRAVO</span><h2>Знакомьтесь: <em>мастера</em></h2></div><p>У каждого свой почерк. У всех один стандарт качества.</p></div><div className="barber-grid">{barbers.map((barber, index) => <article className="barber-card" key={barber.id}><div className={`barber-portrait ${barber.accent}`}><span className="barber-portrait-number">0{index + 1} / 03</span><span className="portrait-monogram">{barber.initials}</span><span className="portrait-line" /></div><div className="barber-info"><div><span className="barber-role">{barber.role} · {barber.experience}</span><h3>{barber.name}</h3><p>{barber.bio}</p></div><Link href={`/book?barber=${barber.id}`} className="circle-link" aria-label={`Записаться к мастеру ${barber.name}`}><ArrowUpRight size={20} /></Link></div></article>)}</div></div>
      </section>

      <section className="quote-banner"><div className="container quote-inner"><span className="quote-mark">“</span><p>Стиль — это способ рассказать о себе<br />без единого слова.</p><span className="quote-small">BRAVO BARBERSHOP</span></div></section>

      <section id="reviews" className="reviews-section section-padding"><div className="container"><div className="section-head"><div><span className="eyebrow"><span className="eyebrow-line" /> ИЗ ПЕРВЫХ УСТ</span><h2>Что говорят <em>гости</em></h2></div><div className="rating-pill"><Star size={17} fill="currentColor" /> 5.0 <span>любят возвращаться</span></div></div><div className="reviews-grid">{reviews.map(review => <article className="review-card" key={review.name}><div className="review-stars" aria-label="5 из 5">★★★★★</div><p>«{review.text}»</p><div className="review-author"><span className="review-avatar">{review.name[0]}</span><div><strong>{review.name}</strong><span>{review.date}</span></div><span className="review-verified">ГОСТЬ BRAVO</span></div></article>)}</div></div></section>

      <section className="cta-section"><div className="container cta-inner"><div><span className="eyebrow"><span className="eyebrow-line" /> ВРЕМЯ ДЛЯ СЕБЯ</span><h2>Хороший день<br />начинается <em>здесь.</em></h2></div><div><p>Выберите удобное время. Об остальном позаботимся мы.</p><Link href="/book" className="button button-dark button-large">Выбрать время <ArrowUpRight size={19} /></Link></div></div></section>

      <section id="contacts" className="contacts-section section-padding"><div className="container contacts-grid"><div className="contacts-content"><span className="eyebrow"><span className="eyebrow-line" /> ГДЕ НАС НАЙТИ</span><h2>Заходите <em>в гости.</em></h2><p>Мы всегда рады новым лицам и старым друзьям.</p><div className="contact-item"><MapPin size={20} /><div><span>Адрес</span><strong>Ташкент, ул. Шота Руставели, 35</strong></div></div><div className="contact-item"><Clock3 size={20} /><div><span>Часы работы</span><strong>Ежедневно, 10:00–20:00</strong></div></div><div className="contact-item"><Scissors size={20} /><div><span>Телефон</span><a href="tel:+998901234567">+998 90 123 45 67</a></div></div><span className="demo-note">Адрес и контакты приведены для демонстрации.</span></div><div className="map-card"><iframe title="Карта района барбершопа в Ташкенте" src="https://www.openstreetmap.org/export/embed.html?bbox=69.250%2C41.275%2C69.285%2C41.300&layer=mapnik&marker=41.2875%2C69.2675" loading="lazy" referrerPolicy="no-referrer-when-downgrade" /><a href="https://www.openstreetmap.org/?mlat=41.2875&mlon=69.2675#map=15/41.2875/69.2675" target="_blank" rel="noreferrer">Открыть карту <ArrowUpRight size={15} /></a></div></div></section>
    </main>
    <SiteFooter />
  </>;
}

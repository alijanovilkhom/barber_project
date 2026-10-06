"use client";

import { Star } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { reviews } from "@/lib/data";

type JourneyMetrics = {
  start: number;
  travel: number;
};

export function ReviewRail() {
  const sectionRef = useRef<HTMLElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const metricsRef = useRef<JourneyMetrics>({ start: 0, travel: 0 });
  const [activeReview, setActiveReview] = useState(0);

  useEffect(() => {
    const section = sectionRef.current;
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!section || !viewport || !track) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let cancelled = false;

    function update() {
      frame = 0;
      const { start, travel } = metricsRef.current;
      if (!travel) return;
      const progress = Math.min(1, Math.max(0, (window.scrollY - start) / travel));
      track!.style.transform = `translate3d(${-progress * travel}px, 0, 0)`;
      setActiveReview(Math.round(progress * (reviews.length - 1)));
    }

    function requestUpdate() {
      if (!frame) frame = window.requestAnimationFrame(update);
    }

    function measure() {
      if (cancelled) return;
      section!.classList.remove("is-scroll-ready");
      section!.classList.remove("is-scroll-native");
      section!.style.removeProperty("height");
      track!.style.removeProperty("transform");

      const headerOffset = window.innerWidth <= 650 ? 68 : window.innerWidth <= 900 ? 72 : 84;
      const stickyHeight = window.innerHeight - headerOffset;
      if (reducedMotion.matches || stickyHeight < (window.innerWidth <= 650 ? 670 : 650)) {
        metricsRef.current = { start: 0, travel: 0 };
        section!.classList.add("is-scroll-native");
        return;
      }

      const travel = Math.max(0, track!.scrollWidth - viewport!.clientWidth);
      if (!travel) {
        metricsRef.current = { start: 0, travel: 0 };
        section!.classList.add("is-scroll-native");
        return;
      }
      const sectionTop = section!.getBoundingClientRect().top + window.scrollY;

      section!.classList.add("is-scroll-ready");
      const stageHeight = section!.querySelector(".reviews-sticky")!.getBoundingClientRect().height;
      section!.style.height = `${stageHeight + travel}px`;
      metricsRef.current = { start: sectionTop - headerOffset, travel };
      update();
    }

    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(viewport);
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", measure);
    reducedMotion.addEventListener("change", measure);
    document.fonts.ready.then(measure);
    measure();

    return () => {
      cancelled = true;
      if (frame) window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", measure);
      reducedMotion.removeEventListener("change", measure);
    };
  }, []);

  function goToReview(index: number) {
    const { start, travel } = metricsRef.current;
    if (!travel) {
      const card = trackRef.current?.children[index] as HTMLElement | undefined;
      card?.scrollIntoView({ behavior: "auto", inline: "center", block: "nearest" });
      return;
    }
    window.scrollTo({ top: start + travel * (index / (reviews.length - 1)), behavior: "smooth" });
  }

  function handleNativeScroll() {
    if (metricsRef.current.travel) return;
    const viewport = viewportRef.current;
    if (!viewport) return;
    const travel = viewport.scrollWidth - viewport.clientWidth;
    setActiveReview(travel ? Math.round(viewport.scrollLeft / travel * (reviews.length - 1)) : 0);
  }

  function handleRailKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!metricsRef.current.travel) return;
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    goToReview(Math.min(reviews.length - 1, Math.max(0, activeReview + (event.key === "ArrowRight" ? 1 : -1))));
  }

  return <section id="reviews" className="reviews-section reviews-journey" aria-labelledby="reviews-title" ref={sectionRef}>
    <div className="reviews-sticky">
      <div className="container reviews-heading">
        <div className="section-head">
          <div><span className="eyebrow"><span className="eyebrow-line" /> СЛОВО ГОСТЯ</span><h2 id="reviews-title">Лучше всего<br /><em>скажут они.</em></h2></div>
          <div className="reviews-summary"><span><Star size={16} fill="currentColor" /> 5.0</span><p>Демонстрационные отзывы о сервисе, мастерах и атмосфере BRAVO.</p></div>
        </div>
      </div>

      <div className="reviews-viewport" ref={viewportRef} tabIndex={0} role="region" aria-label="Горизонтальная лента отзывов" onScroll={handleNativeScroll} onKeyDown={handleRailKeyDown}>
        <div className="reviews-track" ref={trackRef}>
          {reviews.map((review, index) => <blockquote className={`review-card ${index === activeReview ? "is-active" : ""}`} key={review.name} aria-label={`Отзыв ${index + 1} из ${reviews.length}`}>
            <div className="review-card-rating"><Star size={17} fill="currentColor" /><strong>5.0</strong><span>ОТЗЫВ ГОСТЯ</span></div>
            <p>«{review.text}»</p>
            <footer><span className="review-avatar" aria-hidden="true">{review.name.charAt(0)}</span><span><strong>{review.name}</strong><small>{review.date}</small></span></footer>
          </blockquote>)}
        </div>
      </div>

      <div className="container reviews-navigation" aria-label="Навигация по отзывам">
        <span className="reviews-counter">{String(activeReview + 1).padStart(2, "0")} / {String(reviews.length).padStart(2, "0")}</span>
        <div className="reviews-dots">{reviews.map((review, index) => <button type="button" className={index === activeReview ? "is-active" : ""} onClick={() => goToReview(index)} aria-label={`Показать отзыв ${index + 1}: ${review.name}`} aria-current={index === activeReview ? "true" : undefined} key={review.name} />)}</div>
        <span className="reviews-scroll-note">Прокрутите, чтобы увидеть все отзывы</span>
      </div>
    </div>
  </section>;
}

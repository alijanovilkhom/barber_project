"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

const clips = [
  "/videos/clip-1.mp4",
  "/videos/clip-2.mp4",
  "/videos/clip-3.mp4",
  "/videos/clip-4.mp4",
];

const crossfadeMs = 1400;
const firstFrameSeconds = 3;

export function HeroVideo() {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const videosRef = useRef<(HTMLVideoElement | null)[]>([]);
  const [motionAllowed, setMotionAllowed] = useState(false);
  const [visibleSlot, setVisibleSlot] = useState<number | null>(null);
  const [clipIndex, setClipIndex] = useState(0);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const frame = window.requestAnimationFrame(() => setMotionAllowed(!preference.matches));
    const updatePreference = () => {
      setMotionAllowed(!preference.matches);
      if (preference.matches) {
        setVisibleSlot(null);
        setClipIndex(0);
      }
    };
    preference.addEventListener("change", updatePreference);
    return () => {
      window.cancelAnimationFrame(frame);
      preference.removeEventListener("change", updatePreference);
    };
  }, []);

  useEffect(() => {
    if (!motionAllowed) return;
    const videos = videosRef.current;
    const first = videos[0];
    const second = videos[1];
    if (!first || !second) return;

    let currentSlot = 0;
    let currentIndex = 0;
    let queued = false;
    let switching = false;
    let disposed = false;
    let inViewport = true;
    let fadeTimer: number | undefined;

    function queueNext() {
      if (queued) return;
      const next = videos[1 - currentSlot];
      if (!next) return;
      next.src = clips[(currentIndex + 1) % clips.length];
      next.load();
      queued = true;
    }

    async function crossfade() {
      if (!queued || switching || document.hidden || !inViewport) return;
      const nextSlot = 1 - currentSlot;
      const next = videos[nextSlot];
      const old = videos[currentSlot];
      if (!next || !old || next.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;

      switching = true;
      try {
        await next.play();
      } catch {
        switching = false;
        return;
      }
      if (disposed) return;

      currentSlot = nextSlot;
      currentIndex = (currentIndex + 1) % clips.length;
      setVisibleSlot(nextSlot);
      setClipIndex(currentIndex);
      fadeTimer = window.setTimeout(() => {
        old.pause();
        old.removeAttribute("src");
        old.load();
        queued = false;
        switching = false;
      }, crossfadeMs);
    }

    function handleTimeUpdate(slot: number) {
      if (slot !== currentSlot || switching) return;
      const current = videos[slot];
      if (!current || !Number.isFinite(current.duration)) return;
      const remaining = current.duration - current.currentTime;
      if (remaining <= 5) queueNext();
      if (remaining <= crossfadeMs / 1000) void crossfade();
    }

    function handleEnded(slot: number) {
      if (slot !== currentSlot || switching) return;
      queueNext();
      void crossfade();
    }

    function handleCanPlay(slot: number) {
      if (slot === currentSlot || !queued) return;
      const current = videos[currentSlot];
      if (current && (current.ended || current.duration - current.currentTime <= crossfadeMs / 1000)) {
        void crossfade();
      }
    }

    const timeHandlers = videos.map((_, slot) => () => handleTimeUpdate(slot));
    const endedHandlers = videos.map((_, slot) => () => handleEnded(slot));
    const canPlayHandlers = videos.map((_, slot) => () => handleCanPlay(slot));
    videos.forEach((video, slot) => {
      video?.addEventListener("timeupdate", timeHandlers[slot]);
      video?.addEventListener("ended", endedHandlers[slot]);
      video?.addEventListener("canplay", canPlayHandlers[slot]);
    });

    const startFirst = () => { if (!document.hidden && inViewport) void first.play().catch(() => {}); };
    const seekFirst = () => { first.currentTime = firstFrameSeconds; };
    const showFirst = () => setVisibleSlot(0);
    const syncPlayback = () => {
      if (document.hidden || !inViewport) {
        videos.forEach(video => video?.pause());
      } else {
        const active = videos[currentSlot];
        if (active?.ended) {
          queueNext();
          void crossfade();
        } else {
          void active?.play().catch(() => {});
        }
      }
    };
    const handleVisibility = () => syncPlayback();
    const observer = new IntersectionObserver(entries => {
      inViewport = Boolean(entries[0]?.isIntersecting);
      syncPlayback();
    }, { threshold: 0.01 });

    first.addEventListener("loadedmetadata", seekFirst, { once: true });
    first.addEventListener("seeked", startFirst, { once: true });
    first.addEventListener("playing", showFirst, { once: true });
    document.addEventListener("visibilitychange", handleVisibility);
    if (stageRef.current) observer.observe(stageRef.current);
    first.src = clips[0];
    first.load();

    return () => {
      disposed = true;
      window.clearTimeout(fadeTimer);
      observer.disconnect();
      document.removeEventListener("visibilitychange", handleVisibility);
      first.removeEventListener("loadedmetadata", seekFirst);
      first.removeEventListener("seeked", startFirst);
      first.removeEventListener("playing", showFirst);
      videos.forEach((video, slot) => {
        video?.removeEventListener("timeupdate", timeHandlers[slot]);
        video?.removeEventListener("ended", endedHandlers[slot]);
        video?.removeEventListener("canplay", canPlayHandlers[slot]);
        video?.pause();
        video?.removeAttribute("src");
        video?.load();
      });
    };
  }, [motionAllowed]);

  return <div ref={stageRef} className="hero-video-stage" aria-hidden="true">
    <Image className="hero-video-poster" src="/images/hero-video-poster.jpg" alt="" fill priority sizes="100vw" />
    {[0, 1].map(slot => <video
      key={slot}
      ref={node => { videosRef.current[slot] = node; }}
      className={`hero-video ${visibleSlot === slot ? "is-active" : ""}`}
      muted
      playsInline
      preload="none"
      tabIndex={-1}
    />)}
    <span className="hero-video-index">0{clipIndex + 1} / 04</span>
  </div>;
}

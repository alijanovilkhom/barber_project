"use client";

import { RotateCcw } from "lucide-react";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="booking-page"><div className="container booking-container"><div className="state-box" role="alert"><strong>Не удалось загрузить данные</strong><span>Проверьте соединение и попробуйте ещё раз.</span><button className="button button-outline" onClick={reset}><RotateCcw size={17} /> Повторить</button></div></div></main>;
}

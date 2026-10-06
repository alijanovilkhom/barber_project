import type { Metadata } from "next";
import "@fontsource-variable/onest/index.css";
import "@fontsource/prata/400.css";
import "./globals.css";
import "./design.css";

export const metadata: Metadata = {
  title: "BRAVO — барбершоп в Ташкенте",
  description: "Стрижки с характером. Выберите услугу и удобное время онлайн.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru" data-theme="dark" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: `try{var theme=localStorage.getItem("bravo-theme");document.documentElement.dataset.theme=theme==="light"?"light":"dark";}catch{document.documentElement.dataset.theme="dark"}` }} /></head><body>{children}</body></html>;
}

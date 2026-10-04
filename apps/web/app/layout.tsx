import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BRAVO — барбершоп в Ташкенте",
  description: "Стрижки с характером. Выберите услугу и удобное время онлайн.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru"><body>{children}</body></html>;
}

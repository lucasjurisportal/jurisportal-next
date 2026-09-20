import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jurisportal | Menos burocracia. Mais advocacia.",
  description:
    "Processos, publicações, intimações, prazos e a rotina do escritório organizados em um só lugar.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import { Inter, Roboto_Mono } from "next/font/google";
import "./globals.css";

// 1. Configuration des polices
const fontSans = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const fontMono = Roboto_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ImmoFacile C.I",
  description: "Gestion immobilière intelligente",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={`${fontSans.variable} ${fontMono.variable} antialiased bg-[#0B1120]`}>
        {/* 2. Plus de Sidebar ici, juste le contenu de la page */}
        {children}
      </body>
    </html>
  );
}

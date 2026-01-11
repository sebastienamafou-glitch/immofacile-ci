import type { Metadata, Viewport } from "next";
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

// 2. Configuration PWA (Barre de statut & Zoom)
export const viewport: Viewport = {
  themeColor: '#0B1120', // La couleur exacte de votre fond pour une immersion totale
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Empêche le zoom accidentel sur mobile (sensation app native)
};

export const metadata: Metadata = {
  title: "ImmoFacile C.I",
  description: "Gestion immobilière intelligente",
  manifest: '/manifest.json', // Lien explicite vers le manifeste (optionnel mais recommandé)
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={`${fontSans.variable} ${fontMono.variable} antialiased bg-[#0B1120]`}>
        {/* Le Layout s'occupe juste d'envelopper l'app, la Sidebar est gérée dans dashboard/layout.tsx */}
        {children}
      </body>
    </html>
  );
}

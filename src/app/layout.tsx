import type { Metadata, Viewport } from "next";
import { Inter, Roboto_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner"; // ✅ 1. IMPORT OBLIGATOIRE

// 1. Configuration des polices
const fontSans = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const fontMono = Roboto_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// 2. Configuration PWA
export const viewport: Viewport = {
  themeColor: '#0B1120',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "ImmoFacile C.I",
  description: "Gestion immobilière intelligente",
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={`${fontSans.variable} ${fontMono.variable} antialiased bg-[#0B1120]`}>
        {children}
        
        {/* ✅ 2. LE COMPOSANT QUI AFFICHE LES POPUPS (INDISPENSABLE) */}
        <Toaster position="top-right" richColors theme="dark" closeButton />
      </body>
    </html>
  );
}

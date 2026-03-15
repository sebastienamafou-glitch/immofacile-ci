import * as Sentry from "@sentry/nextjs";
import type { Metadata, Viewport } from "next";
import { Inter, Roboto_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner"; 
import { Providers } from "@/components/Providers";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import { GoogleAnalytics } from '@next/third-parties/google';
import AuthSync from "@/components/shared/AuthSync"; 
import CookieBanner from "@/components/shared/CookieBanner";

const fontSans = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const fontMono = Roboto_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: '#0B1120',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Babimmo C.I",
    description: "Gestion immobilière intelligente en Côte d'Ivoire",
    manifest: '/manifest.json',
    appleWebApp: {
      capable: true,
      statusBarStyle: 'black-translucent',
      title: "Babimmo",
    },
    verification: {
      google: "luOxhCBCEgEEIEC6u3FCbHoDGezlCVm-KRz4alzLXs0",
    },
    other: {
      ...Sentry.getTraceData()
    }
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="dark">
      <body className={`${fontSans.variable} ${fontMono.variable} antialiased bg-[#0B1120] text-slate-200`}>
        <Providers>
          {/* <AuthSync /> */ }   {/* ⬅️ NEUTRALISÉ */}
          <ServiceWorkerRegister />
          {children}
          <Toaster position="top-right" richColors theme="dark" closeButton />
        </Providers>
        
        {/* <CookieBanner /> */ } {/* ⬅️ NEUTRALISÉ */}
      </body>
    </html>
  );
}

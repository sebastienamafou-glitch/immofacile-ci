import * as Sentry from "@sentry/nextjs"; // ✅ Import Sentry
import type { Metadata, Viewport } from "next";
import { Inter, Roboto_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner"; 
import { Providers } from "@/components/Providers";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

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

// ✅ Modification Sentry : On passe de const metadata à generateMetadata()
export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "ImmoFacile C.I",
    description: "Gestion immobilière intelligente en Côte d'Ivoire",
    manifest: '/manifest.json',
    appleWebApp: {
      capable: true,
      statusBarStyle: 'black-translucent',
      title: "ImmoFacile",
    },
    // ✅ AJOUT : Vérification Google Search Console
    verification: {
      google: "googleb0109549a71dafd5",
    },
    other: {
      // C'est ici que la magie opère : Sentry injecte des balises meta pour lier 
      // les erreurs du navigateur à celles du serveur.
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
          <ServiceWorkerRegister />
          {children}
          <Toaster position="top-right" richColors theme="dark" closeButton />
        </Providers>
      </body>
    </html>
  );
}

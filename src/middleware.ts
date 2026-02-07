import NextAuth from "next-auth";
import authConfig from "@/auth.config";
import { NextResponse } from "next/server";



const { auth } = NextAuth(authConfig);

// 1. ROUTES PUBLIQUES (Accessibles sans connexion)
const PUBLIC_ROUTES = [
  '/',           // Landing page
  '/pricing',    // Page de prix
  '/login', 
  '/register', 
  '/auth/error', // Page d'erreur NextAuth
  '/api/webhooks/cinetpay', // Webhooks (Stripe/CinetPay/Wave)
  '/api/webhooks/stripe'
];

// 2. ROUTES PROTÉGÉES PAR RÔLE
const ADMIN_ROUTES = '/admin';
const AGENCY_ROUTES = '/agency';

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  // @ts-ignore
  const userRole = req.auth?.user?.role; 

  const isApiAuthRoute = nextUrl.pathname.startsWith('/api/auth');
  const isWebhook = nextUrl.pathname.startsWith('/api/webhooks');
  const isPublicRoute = PUBLIC_ROUTES.some(route => 
    nextUrl.pathname === route || nextUrl.pathname.startsWith('/api/webhooks')
  );

  // A. SÉCURITÉ TECHNIQUE (API & Webhooks)
  if (isApiAuthRoute || isWebhook) {
    return NextResponse.next();
  }

  // B. REDIRECTION DES UTILISATEURS NON CONNECTÉS
  if (!isLoggedIn && !isPublicRoute) {
    let callbackUrl = nextUrl.pathname;
    if (nextUrl.search) callbackUrl += nextUrl.search;
    const encodedCallbackUrl = encodeURIComponent(callbackUrl);
    return NextResponse.redirect(new URL(`/login?callbackUrl=${encodedCallbackUrl}`, nextUrl));
  }

  // C. REDIRECTION DES UTILISATEURS CONNECTÉS
  if (isLoggedIn) {
    // 🛑 CORRECTIF ANTI-BOUCLE INFINIE 🛑
    // Nous avons désactivé ce bloc. Cela permet d'accéder à /login même si on est connecté,
    // ce qui casse la boucle de redirection "Login <-> Dashboard".
    /*
    if (nextUrl.pathname === '/login' || nextUrl.pathname === '/register') {
      return NextResponse.redirect(new URL("/dashboard", nextUrl));
    }
    */

    // 2. SÉCURITÉ RBAC (Contrôle d'accès par rôle)
    
    // Protection Espace ADMIN (Seul SUPER_ADMIN passe)
    if (nextUrl.pathname.startsWith(ADMIN_ROUTES) && userRole !== 'SUPER_ADMIN') {
      return NextResponse.redirect(new URL("/dashboard", nextUrl));
    }

    // Protection Espace AGENCE
    if (nextUrl.pathname.startsWith(AGENCY_ROUTES)) {
      const allowedAgencyRoles = ['AGENCY_ADMIN', 'AGENT', 'SUPER_ADMIN'];
      if (!allowedAgencyRoles.includes(userRole)) {
        return NextResponse.redirect(new URL("/dashboard", nextUrl));
      }
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
};

import NextAuth from "next-auth";
import authConfig from "@/auth.config";
import { NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// 1. INITIALISATION DU RATE LIMITER
let ratelimit: Ratelimit | null = null;
try {
  if (process.env.UPSTASH_REDIS_REST_URL) {
    ratelimit = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(20, "10 s"),
      analytics: true,
    });
  }
} catch (e) {
  console.warn("⚠️ Rate Limiting désactivé");
}

const { auth } = NextAuth(authConfig);

// ✅ LISTE COMPLÈTE DES ROUTES PUBLIQUES
const PUBLIC_ROUTES = [
  '/', 
  '/login',  
  '/signup', 
  '/ambassador-signup', 
  '/auth/error',
  '/agency', 
  '/owner', 
  '/invest', 
  '/demo-investor', 
  '/akwaba', 
  '/plaquette', 
  '/devis', 
  '/search', 
  '/properties', 
  '/pricing',
  '/privacy', 
  '/confirm',
  '/terms', 
  '/compliance', 
  '/forgot-password', 
  '/reset-password',
  '/api/webhooks/cinetpay', 
  '/api/webhooks/stripe',
  '/api/public',
  '/api/signup'
];

// @ts-ignore
export default auth(async (req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  
  // Extraction des données de session
  // @ts-ignore
  const userRole = req.auth?.user?.role; 
  // @ts-ignore
  const userAgencyId = req.auth?.user?.agencyId; 

  const path = nextUrl.pathname;

  // ============================================================
  // 🚨 RETOUR DE LA REDIRECTION 301 OBLIGATOIRE
  // ============================================================
  const host = req.headers.get("host");
  if (host && host.includes("babimmo-ci.vercel.app")) {
    const targetUrl = new URL(`https://www.babimmo.ci${path}`);
    if (nextUrl.search) targetUrl.search = nextUrl.search;
    return NextResponse.redirect(targetUrl, 301);
  }

  const ip = req.ip ?? req.headers.get("x-forwarded-for") ?? "127.0.0.1";

  // ============================================================
  // 🛡️ SÉCURITÉ : RATE LIMITING
  // ============================================================
  const isStatic = path.startsWith("/_next") || path.includes(".");
  
  if (ratelimit && !isStatic) {
    const isSensitive = path === "/login" || path === "/register" || path === "/forgot-password";
    if (isSensitive) {
      const { success } = await ratelimit.limit(`ratelimit_auth_${ip}`);
      if (!success) return new NextResponse("Trop de requêtes.", { status: 429 });
    }
  }

  const isApiAuthRoute = path.startsWith('/api/auth');
  const isPublicRoute = PUBLIC_ROUTES.some(route => 
    path === route || (route !== '/' && path.startsWith(`${route}/`))
  );

  // ============================================================
  // 🧭 AIGUILLEUR INTELLIGENT APRÈS CONNEXION
  // ============================================================
  if (isApiAuthRoute || isPublicRoute) {
      if (isLoggedIn && path === '/login') {
          if (userRole === 'SUPER_ADMIN') return NextResponse.redirect(new URL("/dashboard/superadmin", nextUrl)); 
          if (userRole === 'AGENCY_ADMIN') return NextResponse.redirect(new URL("/dashboard/agency", nextUrl));
          if (userRole === 'AGENT') return NextResponse.redirect(new URL("/dashboard/agent", nextUrl)); 
          if (userRole === 'AMBASSADOR') return NextResponse.redirect(new URL("/dashboard/ambassador", nextUrl));
          if (userRole === 'OWNER') return NextResponse.redirect(new URL("/dashboard/owner", nextUrl));
          if (userRole === 'TENANT') return NextResponse.redirect(new URL("/dashboard/tenant", nextUrl));
          if (userRole === 'INVESTOR') return NextResponse.redirect(new URL("/dashboard/investor", nextUrl));
          if (userRole === 'ARTISAN') return NextResponse.redirect(new URL("/dashboard/artisan", nextUrl));
          
          // 🔥 Si le rôle est basique ("USER"), manquant ou "GUEST", on autorise l'accès 
          // au login pour forcer une reconnexion et récupérer le nouveau rôle.
          if (!userRole || userRole === 'USER' || userRole === 'GUEST') {
              return NextResponse.next();
          }

          return NextResponse.redirect(new URL("/login", nextUrl));
      }
      return NextResponse.next();
  }

  if (!isLoggedIn) {
    let callbackUrl = path;
    if (nextUrl.search) callbackUrl += nextUrl.search;
    return NextResponse.redirect(new URL(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`, nextUrl));
  }

  // ============================================================
  // 🛡️ SÉCURITÉ : CLOISONNEMENT STRICT DES DASHBOARDS
  // ============================================================
  if (isLoggedIn && userRole) {
    
    // 🔥 On remplace les redirections "/dashboard" par "/login" pour briser la boucle
    if (path.startsWith('/dashboard/superadmin') && userRole !== 'SUPER_ADMIN') {
       return NextResponse.redirect(new URL("/login", nextUrl));
    }

    if (path.startsWith('/dashboard/agency')) {
        const canAccessAgency = userRole === 'SUPER_ADMIN' || userRole === 'AGENCY_ADMIN';
        if (!canAccessAgency) return NextResponse.redirect(new URL("/login", nextUrl));
    }

    if (path.startsWith('/dashboard/agent')) {
        const canAccessAgent = userRole === 'SUPER_ADMIN' || userRole === 'AGENT';
        if (!canAccessAgent) return NextResponse.redirect(new URL("/login", nextUrl));
    }

    if (path.startsWith('/dashboard/ambassador')) {
        const canAccessAmbassador = userRole === 'SUPER_ADMIN' || userRole === 'AMBASSADOR';
        if (!canAccessAmbassador) return NextResponse.redirect(new URL("/login", nextUrl));
    }

    if (path.startsWith('/dashboard/owner') && userRole !== 'OWNER' && userRole !== 'SUPER_ADMIN') {
       return NextResponse.redirect(new URL("/login", nextUrl));
    }

    if (path.startsWith('/dashboard/tenant') && userRole !== 'TENANT' && userRole !== 'SUPER_ADMIN') {
       return NextResponse.redirect(new URL("/login", nextUrl));
    }
  }
  
  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)', '/dashboard/:path*'],
};

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
  '/api/signup',
  '/api/cron',
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
  // 🚨 RETOUR DE LA REDIRECTION 301 OBLIGATOIRE (Strict immofacile.ci)
  // ============================================================
  const host = req.headers.get("host");
  const isLocalhost = host?.includes("localhost") || host?.includes("127.0.0.1");
  const isCanonical = host === "www.immofacile.ci";

  if (host && !isLocalhost && !isCanonical) {
    const targetUrl = new URL(`https://www.immofacile.ci${path}`);
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
          // ✅ NOUVEAU : Interception directe pour les nouveaux inscrits
          if (userRole === 'UNASSIGNED') return NextResponse.redirect(new URL("/onboarding", nextUrl));

          if (userRole === 'SUPER_ADMIN') return NextResponse.redirect(new URL("/dashboard/superadmin", nextUrl)); 
          if (userRole === 'AGENCY_ADMIN') return NextResponse.redirect(new URL("/dashboard/agency", nextUrl));
          if (userRole === 'AGENT') return NextResponse.redirect(new URL("/dashboard/agent", nextUrl)); 
          if (userRole === 'AMBASSADOR') return NextResponse.redirect(new URL("/dashboard/ambassador", nextUrl));
          if (userRole === 'OWNER') return NextResponse.redirect(new URL("/dashboard/owner", nextUrl));
          if (userRole === 'TENANT') return NextResponse.redirect(new URL("/dashboard/tenant", nextUrl));
          if (userRole === 'INVESTOR') return NextResponse.redirect(new URL("/dashboard/investor", nextUrl));
          if (userRole === 'ARTISAN') return NextResponse.redirect(new URL("/dashboard/artisan", nextUrl));
          
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
  // 🚀 NOUVEAU : VERROUILLAGE GLOBAL DE L'ONBOARDING
  // ============================================================
  if (isLoggedIn) {
    const isUnassigned = userRole === 'UNASSIGNED';
    const isOnboardingPage = path === '/onboarding';

    // Règle 1 : Si non assigné et qu'il tente de naviguer ailleurs, on le force sur onboarding
    if (isUnassigned && !isOnboardingPage && !path.startsWith('/api')) {
      return NextResponse.redirect(new URL("/onboarding", nextUrl));
    }

    // Règle 2 : Si déjà assigné et qu'il tente de refaire l'onboarding, on l'éjecte vers son dashboard
    if (!isUnassigned && isOnboardingPage) {
       return NextResponse.redirect(new URL("/dashboard", nextUrl));
    }
  }

  // ============================================================
  // 🛡️ SÉCURITÉ : CLOISONNEMENT STRICT DES DASHBOARDS
  // ============================================================
  if (isLoggedIn && userRole) {
    
    // 1. Protection des sous-dossiers spécifiques
    if (path.startsWith('/dashboard/superadmin') && userRole !== 'SUPER_ADMIN') {
       return NextResponse.redirect(new URL("/dashboard", nextUrl));
    }

    if (path.startsWith('/dashboard/agency') && userRole !== 'SUPER_ADMIN' && userRole !== 'AGENCY_ADMIN') {
        return NextResponse.redirect(new URL("/dashboard", nextUrl));
    }

    if (path.startsWith('/dashboard/agent') && userRole !== 'SUPER_ADMIN' && userRole !== 'AGENT') {
        return NextResponse.redirect(new URL("/dashboard", nextUrl));
    }

    if (path.startsWith('/dashboard/ambassador') && userRole !== 'SUPER_ADMIN' && userRole !== 'AMBASSADOR') {
        return NextResponse.redirect(new URL("/dashboard", nextUrl));
    }

    if (path.startsWith('/dashboard/owner') && userRole !== 'SUPER_ADMIN' && userRole !== 'OWNER') {
       return NextResponse.redirect(new URL("/dashboard", nextUrl));
    }

    if (path.startsWith('/dashboard/tenant') && userRole !== 'SUPER_ADMIN' && userRole !== 'TENANT') {
       return NextResponse.redirect(new URL("/dashboard", nextUrl));
    }

    // ✅ NOUVELLES RÈGLES OUBLIÉES
    if (path.startsWith('/dashboard/invest') && userRole !== 'SUPER_ADMIN' && userRole !== 'INVESTOR') {
       return NextResponse.redirect(new URL("/dashboard", nextUrl));
    }

    if (path.startsWith('/dashboard/artisan') && userRole !== 'SUPER_ADMIN' && userRole !== 'ARTISAN') {
       return NextResponse.redirect(new URL("/dashboard", nextUrl));
    }

    // 2. Gestion de la racine /dashboard (Aiguilleur principal)
    // Si l'utilisateur va sur /dashboard (ou une page générique comme /dashboard/settings),
    // on l'autorise à rester. S'il va STRICTEMENT sur /dashboard, on le redirige vers son espace spécifique.
    if (path === '/dashboard') {
        if (userRole === 'UNASSIGNED') return NextResponse.redirect(new URL("/onboarding", nextUrl));
        if (userRole === 'SUPER_ADMIN') return NextResponse.redirect(new URL("/dashboard/superadmin", nextUrl));
        if (userRole === 'AGENCY_ADMIN') return NextResponse.redirect(new URL("/dashboard/agency", nextUrl));
        if (userRole === 'AGENT') return NextResponse.redirect(new URL("/dashboard/agent", nextUrl));
        if (userRole === 'AMBASSADOR') return NextResponse.redirect(new URL("/dashboard/ambassador", nextUrl));
        if (userRole === 'OWNER') return NextResponse.redirect(new URL("/dashboard/owner", nextUrl));
        if (userRole === 'TENANT') return NextResponse.redirect(new URL("/dashboard/tenant", nextUrl));
        if (userRole === 'INVESTOR') return NextResponse.redirect(new URL("/dashboard/invest", nextUrl));
        if (userRole === 'ARTISAN') return NextResponse.redirect(new URL("/dashboard/artisan", nextUrl));
    }
  }
  
  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)', '/dashboard/:path*'],
};

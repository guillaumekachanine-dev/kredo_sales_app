import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isDesignLabPreview =
    process.env.VERCEL_ENV !== "production" &&
    pathname.startsWith("/design-lab")

  if (isDesignLabPreview) {
    return NextResponse.next({ request })
  }

  // Endpoints machine-à-machine : appelés par n8n / les crons, JAMAIS par un
  // navigateur. Ils n'ont pas de session Supabase à rafraîchir et assurent
  // eux-mêmes leur vérification (HMAC pour le callback n8n, secret partagé pour
  // les crons). Le court-circuit est placé AVANT createServerClient : sur ces
  // routes on ne construisait un client et on ne vérifiait un JWT que pour
  // constater, quelques lignes plus bas, qu'il n'y en avait pas.
  //
  // /login et /auth/callback restent volontairement dans le flux complet :
  // /login a besoin de la session pour rediriger un utilisateur déjà connecté
  // vers /cockpit, et /auth/callback pose les cookies de session.
  const isMachineEndpoint =
    pathname.startsWith("/api/n8n/callback") ||
    pathname === "/api/reports/weekly-manager/cron-trigger" ||
    pathname === "/api/reports/workspace-diagnostic/cron-trigger"

  if (isMachineEndpoint) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Validation de session — IMPORTANT : ne pas ajouter de logique entre createServerClient et l'appel auth.
  // getClaims() vérifie le JWT LOCALEMENT (clé de signature asymétrique) → zéro aller-retour réseau,
  // contrairement à getUser() qui interroge l'API Auth Supabase à chaque navigation.
  // ⚠️ Nécessite une clé de signature asymétrique côté dashboard (Auth → Signing Keys).
  //    Sans elle, getClaims() retombe sur une vérification réseau (donc migrer la clé pour le gain).
  const { data: claimsData } = await supabase.auth.getClaims()
  const user = claimsData?.claims ?? null

  // Routes publiques restantes (les endpoints machine-à-machine sont déjà
  // sortis plus haut) : elles ont besoin du client Supabase — /login pour
  // rediriger un utilisateur déjà connecté, /auth/callback pour la session.
  const isPublic =
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth/callback")

  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("next", pathname)
    return NextResponse.redirect(url)
  }

  if (user && pathname === "/login") {
    const next = request.nextUrl.searchParams.get("next") ?? "/cockpit"
    const url = request.nextUrl.clone()
    url.pathname = next
    url.search = ""
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Exclut les fichiers statiques Next.js et les assets publics servis tels
     * quels depuis /public. Sans ces exclusions, une requête non authentifiée
     * pour /sw.js ou /manifest.json déclenchait une vérification de session
     * puis une redirection 307 vers /login — pour un fichier statique qui n'a
     * rien à protéger (le service worker se ré-enregistre notamment hors
     * session, cf. PwaRegistrar). Les extensions de police et d'icône sont
     * ajoutées pour la même raison que celles d'images déjà présentes.
     */
    "/((?!_next/static|_next/image|favicon.ico|icon.png|sw\\.js|manifest\\.json|robots\\.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|otf)$).*)",
  ],
}

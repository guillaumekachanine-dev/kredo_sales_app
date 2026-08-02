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

  // Routes sans session à traiter ici — court-circuit placé AVANT
  // createServerClient : on y construisait un client et on y vérifiait un JWT
  // pour constater ensuite qu'il n'y en avait pas.
  //   · endpoints machine-à-machine (n8n, crons) : jamais appelés par un
  //     navigateur, ils assurent eux-mêmes leur vérification HMAC ;
  //   · /auth/callback : crée son propre client et fait l'échange de code
  //     lui-même (src/app/auth/callback/route.ts).
  // ⚠️ Une route HMAC oubliée ici échoue SILENCIEUSEMENT : elle est redirigée
  // vers /login, n8n suit la redirection et reçoit un 200 HTML qu'il prend pour
  // un succès. Toute nouvelle route appelant verifyHmac doit être ajoutée.
  const skipsSession =
    pathname.startsWith("/api/n8n/callback") ||
    pathname.startsWith("/auth/callback") ||
    pathname === "/api/reports/weekly-manager/cron-trigger" ||
    pathname === "/api/reports/workspace-diagnostic/cron-trigger"

  if (skipsSession) {
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

  // Seule route publique qui a encore besoin du client : /login doit connaître
  // la session pour rediriger un utilisateur déjà connecté vers /cockpit.
  const isLoginPage = pathname.startsWith("/login")

  if (!user && !isLoginPage) {
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
     * session, cf. PwaRegistrar).
     * `favicon.ico` et `icon.png` ne sont plus listés nommément : le groupe
     * d'extensions les couvre déjà. Les 3 fichiers restants le sont, eux, parce
     * que leurs extensions (.js/.json/.txt) sont trop larges pour être exclues
     * en bloc sans risquer d'exclure une future route.
     */
    "/((?!_next/static|_next/image|sw\\.js|manifest\\.json|robots\\.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|otf)$).*)",
  ],
}

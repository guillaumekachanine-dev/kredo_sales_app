import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isDesignLabPath =
    pathname === "/design-lab" || pathname.startsWith("/design-lab/")
  const isPreviewDesignLab =
    isDesignLabPath && process.env.VERCEL_ENV === "preview"
  const isLocalDesignLab =
    isDesignLabPath &&
    process.env.NODE_ENV === "development" &&
    !process.env.VERCEL_ENV
  const isBlockedDesignLab =
    isDesignLabPath &&
    (process.env.VERCEL_ENV === "production" ||
      process.env.NODE_ENV === "production")

  if (isPreviewDesignLab || isLocalDesignLab) {
    return NextResponse.next({ request })
  }

  if (isBlockedDesignLab) {
    return new NextResponse(null, { status: 404 })
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

  // Routes publiques : login + callback
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
     * Exclut les fichiers statiques Next.js et les assets publics.
     * Traite toutes les routes app sauf _next/static, _next/image, favicon.ico.
     */
    "/((?!_next/static|_next/image|favicon.ico|icon.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}

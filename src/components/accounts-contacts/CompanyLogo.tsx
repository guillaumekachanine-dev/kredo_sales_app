import Image from "next/image"
import { cn } from "@/lib/utils"

type Size = "xs" | "sm" | "md" | "lg" | "xl" | "2xl"

const SIZES: Record<Size, { px: number; text: string }> = {
  xs: { px: 18, text: "text-[8px]" },
  sm: { px: 24, text: "text-[9px]" },
  md: { px: 32, text: "text-[11px]" },
  lg: { px: 48, text: "text-sm" },
  xl: { px: 64, text: "text-base" },
  "2xl": { px: 80, text: "text-lg" },
}

function initials(name: string): string {
  return name
    .split(/[\s\-_]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("")
}

export function CompanyLogo({
  name,
  logoPath,
  website,
  size = "md",
  fill = false,
  /**
   * En mode liste dense (tableau comptes, tableau contacts), passer `denseList={true}`
   * pour sauter l'appel favicon Google et afficher directement les initiales quand
   * aucun logoPath n'est disponible.
   * Cela évite N requêtes réseau tierces par rendu de liste, une par ligne.
   */
  denseList = false,
  className,
}: {
  name: string
  logoPath?: string | null
  website?: string | null
  size?: Size
  fill?: boolean
  denseList?: boolean
  className?: string
}) {
  const { px, text } = SIZES[size]
  const sizeStyle = fill ? undefined : { width: px, height: px }

  const base = cn(
    "shrink-0 overflow-hidden rounded border border-border bg-surface flex items-center justify-center",
    fill && "w-full h-full",
    className
  )

  if (logoPath) {
    return (
      <div className={base} style={sizeStyle}>
        {logoPath.startsWith("http") ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoPath}
            alt={`Logo ${name}`}
            width={px}
            height={px}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-contain"
          />
        ) : (
          <Image
            src={logoPath}
            alt={`Logo ${name}`}
            width={px}
            height={px}
            loading="lazy"
            className="object-contain w-full h-full"
          />
        )}
      </div>
    )
  }

  // En liste dense, on ne déclenche pas de requête favicon externe —
  // on affiche directement les initiales pour éviter N appels vers Google.
  const faviconUrl = denseList ? null : getFaviconUrl(website)

  if (faviconUrl) {
    return (
      <div className={base} style={sizeStyle}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={faviconUrl}
          alt={`Logo ${name}`}
          width={px}
          height={px}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-contain p-0.5"
        />
      </div>
    )
  }

  return (
    <div
      className={cn(base, "bg-primary/8 border-primary/20", text, "font-bold text-primary")}
      style={sizeStyle}
      aria-label={`Logo ${name}`}
    >
      {initials(name)}
    </div>
  )
}

function getFaviconUrl(website?: string | null): string | null {
  if (!website) return null

  try {
    const parsed = new URL(website.startsWith("http") ? website : `https://${website}`)
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(parsed.hostname)}&sz=64`
  } catch {
    return null
  }
}

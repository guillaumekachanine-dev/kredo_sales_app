import Image from "next/image"
import { cn } from "@/lib/utils"

type Size = "sm" | "md" | "lg" | "xl"

const SIZES: Record<Size, { px: number; text: string }> = {
  sm: { px: 24, text: "text-[9px]" },
  md: { px: 32, text: "text-[11px]" },
  lg: { px: 48, text: "text-sm" },
  xl: { px: 64, text: "text-base" },
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
  className,
}: {
  name: string
  logoPath?: string | null
  website?: string | null
  size?: Size
  className?: string
}) {
  const { px, text } = SIZES[size]

  const base = cn(
    "shrink-0 overflow-hidden rounded border border-border bg-surface flex items-center justify-center",
    className
  )

  if (logoPath) {
    return (
      <div className={base} style={{ width: px, height: px }}>
        {logoPath.startsWith("http") ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoPath} alt={`Logo ${name}`} width={px} height={px} className="h-full w-full object-contain" />
        ) : (
          <Image
            src={logoPath}
            alt={`Logo ${name}`}
            width={px}
            height={px}
            className="object-contain w-full h-full"
          />
        )}
      </div>
    )
  }

  const faviconUrl = getFaviconUrl(website)

  if (faviconUrl) {
    return (
      <div className={base} style={{ width: px, height: px }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={faviconUrl} alt={`Logo ${name}`} width={px} height={px} className="h-full w-full object-contain p-0.5" />
      </div>
    )
  }

  return (
    <div
      className={cn(base, "bg-primary/8 border-primary/20", text, "font-bold text-primary")}
      style={{ width: px, height: px }}
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

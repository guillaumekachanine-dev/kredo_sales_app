import Image from "next/image"
import { cn } from "@/lib/utils"

type Size = "sm" | "md" | "lg"

const SIZES: Record<Size, { px: number; text: string }> = {
  sm: { px: 24, text: "text-[9px]" },
  md: { px: 32, text: "text-[11px]" },
  lg: { px: 48, text: "text-sm" },
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
  size = "md",
}: {
  name: string
  logoPath?: string | null
  size?: Size
}) {
  const { px, text } = SIZES[size]

  const base = cn(
    "shrink-0 overflow-hidden rounded border border-border bg-surface flex items-center justify-center",
  )

  if (logoPath) {
    return (
      <div className={base} style={{ width: px, height: px }}>
        <Image
          src={logoPath}
          alt={`Logo ${name}`}
          width={px}
          height={px}
          className="object-contain w-full h-full"
        />
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

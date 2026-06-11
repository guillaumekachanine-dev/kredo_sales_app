"use client"

import { useMemo } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { buildBreadcrumbTrail } from "@/lib/navigation/breadcrumb"
import { useBreadcrumbStore } from "@/lib/navigation/breadcrumb-store"
import { cn } from "@/lib/utils"

// Fil d'Ariane de localisation (Finder/Explorer). Déduit de l'URL + registre
// de labels dynamiques. Chaque segment amont est cliquable → saut direct.
export function Breadcrumb() {
  const pathname = usePathname()
  const labels = useBreadcrumbStore((s) => s.labels)

  const trail = useMemo(
    () => buildBreadcrumbTrail(pathname, labels),
    [pathname, labels],
  )

  return (
    <nav aria-label="Fil d'Ariane" className="flex items-center gap-1.5 text-xs min-w-0">
      {trail.map((crumb, i) => {
        const isLast = i === trail.length - 1
        return (
          <span key={crumb.href} className="flex items-center gap-1.5 min-w-0">
            {i > 0 && <span className="text-border shrink-0">/</span>}
            {isLast ? (
              <span
                aria-current="page"
                className={cn(
                  "font-semibold text-heading truncate",
                  crumb.pending && "text-muted animate-pulse",
                )}
              >
                {crumb.label}
              </span>
            ) : crumb.pending ? (
              <span className="text-muted font-medium animate-pulse">{crumb.label}</span>
            ) : (
              <Link
                href={crumb.href}
                className="text-muted font-medium hover:text-heading transition-colors truncate shrink-0"
              >
                {crumb.label}
              </Link>
            )}
          </span>
        )
      })}
    </nav>
  )
}

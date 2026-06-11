import { cn } from "@/lib/utils"
import { Breadcrumb } from "./Breadcrumb"

interface AppHeaderProps {
  className?: string
}

export function AppHeader({ className }: AppHeaderProps) {
  return (
    <header className={cn("bg-surface border-b border-border px-8 h-14 flex items-center justify-between gap-4 shrink-0 select-none", className)}>
      {/* Left side: fil d'Ariane de localisation (Finder-style) */}
      <Breadcrumb />

      {/* Right side: Connection status or search */}
      <div className="flex items-center gap-4 shrink-0">
        {/* Simple live notification dot */}
        <div className="flex items-center gap-2 text-[10px] text-muted">
          <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
          <span>Réseau Opérationnel</span>
        </div>
      </div>
    </header>
  )
}

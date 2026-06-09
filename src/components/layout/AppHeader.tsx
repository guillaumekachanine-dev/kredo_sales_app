import { cn } from "@/lib/utils"

interface AppHeaderProps {
  className?: string
}

export function AppHeader({ className }: AppHeaderProps) {
  return (
    <header className={cn("bg-surface border-b border-border px-8 h-14 flex items-center justify-between shrink-0 select-none", className)}>
      {/* Left side: Breadcrumb / context placeholder */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-muted font-medium">KREDO</span>
        <span className="text-border">/</span>
        <span className="text-heading font-semibold">Workspace de pilotage</span>
      </div>

      {/* Right side: Connection status or search */}
      <div className="flex items-center gap-4">
        {/* Simple live notification dot */}
        <div className="flex items-center gap-2 text-[10px] text-muted">
          <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
          <span>Réseau Opérationnel</span>
        </div>
      </div>
    </header>
  )
}

import { ReactNode } from "react"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"

interface BusinessIntelligenceHeaderProps {
  onPlaybooksClick?: () => void
}

export function BusinessIntelligenceHeader({ onPlaybooksClick }: BusinessIntelligenceHeaderProps) {
  return (
    <header className="flex flex-col md:flex-row items-start md:items-center justify-between py-6 px-8 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
      <div>
        <div className="flex items-center space-x-2 mb-1">
          <Badge variant="brass" className="text-xs uppercase tracking-wider font-semibold">
            Intelligence
          </Badge>
        </div>
        <h1 className="text-2xl font-bold text-[var(--color-text-main)]">
          Business Intelligence
        </h1>
        <p className="text-sm text-[var(--color-muted)] mt-1">
          Priorisez les comptes, détectez les fenêtres de marché et déclenchez les prochaines actions.
        </p>
      </div>

      <div className="mt-4 md:mt-0 flex items-center space-x-3">
        <Button variant="secondary" onClick={onPlaybooksClick}>
          Consulter les playbooks
        </Button>
        <Button variant="ghost">Agenda</Button>
        <Button variant="ghost">Alertes</Button>
      </div>
    </header>
  )
}

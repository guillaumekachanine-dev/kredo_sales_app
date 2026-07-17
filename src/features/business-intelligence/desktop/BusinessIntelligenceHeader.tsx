import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/Button"
import { HeaderAlerts } from "@/components/ui/HeaderAlerts"

interface BusinessIntelligenceHeaderProps {
  onPlaybooksClick?: () => void
  onStudiesClick?: () => void
}

export function BusinessIntelligenceHeader({ onPlaybooksClick, onStudiesClick }: BusinessIntelligenceHeaderProps) {
  const router = useRouter()

  return (
    <header className="flex flex-col gap-5 border-b border-border/80 bg-surface px-5 py-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-heading">
          Business Intelligence
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Priorisez les comptes, détectez les fenêtres de marché et déclenchez les prochaines actions.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" onClick={onStudiesClick} className="min-h-10">
          Études sectorielles
        </Button>
        <Button variant="secondary" onClick={onPlaybooksClick}>
          Consulter les playbooks
        </Button>
        <Button variant="ghost" onClick={() => router.push("/agenda")}>
          Agenda
        </Button>
        <HeaderAlerts />
      </div>
    </header>
  )
}

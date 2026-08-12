import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/Button"

interface BusinessIntelligenceHeaderProps {
  onPlaybooksClick?: () => void
  onStudiesClick?: () => void
  minimal?: boolean
}

export function BusinessIntelligenceHeader({ onPlaybooksClick, onStudiesClick, minimal = false }: BusinessIntelligenceHeaderProps) {
  const router = useRouter()

  return (
    <header className={`mx-auto flex w-full flex-col gap-4 border-b border-border/40 px-4 lg:flex-row lg:items-center lg:justify-between lg:px-8 ${minimal ? "max-w-none py-4" : "max-w-[1600px] py-8"}`}>
      <div className="space-y-1">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-heading">
          Business Intelligence
        </h1>
        {!minimal ? <p className="max-w-2xl text-xs text-muted">
          Priorisez les comptes, détectez les fenêtres de marché et déclenchez les prochaines actions.
        </p> : null}
      </div>

      {!minimal ? <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="sm" className="!border-border/40 !bg-surface/30 !text-body hover:!border-primary hover:!bg-primary/5 hover:!text-primary" onClick={onStudiesClick}>
          Études sectorielles
        </Button>
        <Button variant="secondary" size="sm" className="!border-border/40 !bg-surface/30 !text-body hover:!border-primary hover:!bg-primary/5 hover:!text-primary" onClick={onPlaybooksClick}>
          Consulter les playbooks
        </Button>
        <Button variant="ghost" size="sm" className="!text-body hover:!border-primary hover:!bg-primary/5 hover:!text-primary" onClick={() => router.push("/agenda")}>
          Agenda
        </Button>
      </div> : null}
    </header>
  )
}

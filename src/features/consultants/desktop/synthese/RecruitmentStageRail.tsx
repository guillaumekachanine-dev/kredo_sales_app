import { useId } from "react"
import type { RecruitmentPipeline } from "@/features/consultants/data/consultants-synthese.types"

interface RecruitmentStageRailProps {
  pipeline: RecruitmentPipeline
}

export function RecruitmentStageRail({ pipeline }: RecruitmentStageRailProps) {
  const titleId = useId()

  return (
    <section aria-labelledby={titleId} className="rounded-lg border border-edito-border bg-edito-surface">
      <header className="border-b border-edito-border px-4 py-3.5">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-edito-navy">Recrutement</p>
        <h2 id={titleId} className="mt-1 text-sm font-bold text-edito-heading">
          Processus actifs par étape
        </h2>
        <p className="mt-1 text-[11px] leading-snug text-edito-muted">Photographie actuelle</p>
      </header>
      <div className="px-4 py-3.5">
        <p className="mb-3 text-xs text-edito-body">
          <span className="font-bold tabular-nums text-edito-ink">{pipeline.totalActive}</span>{" "}
          candidat{pipeline.totalActive > 1 ? "s" : ""} en processus de recrutement
        </p>
        {pipeline.totalActive === 0 ? (
          <p className="py-3 text-center text-xs text-edito-muted">Aucun processus actif.</p>
        ) : (
          <ol className="relative space-y-0.5 before:absolute before:bottom-4 before:left-[0.3rem] before:top-4 before:w-px before:bg-edito-border">
            {pipeline.byStep.map((stage) => (
              <li key={stage.step} className="relative grid grid-cols-[0.75rem_minmax(0,1fr)_1.25rem] items-center gap-2 py-1.5">
                <span
                  aria-hidden
                  className={
                    stage.count > 0
                      ? "z-10 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-edito-surface"
                      : "z-10 h-2.5 w-2.5 rounded-full border border-primary bg-edito-surface ring-2 ring-edito-surface"
                  }
                />
                <span className="text-xs leading-snug text-edito-body">{stage.label}</span>
                <span className="text-right text-sm font-bold tabular-nums text-edito-ink">{stage.count}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  )
}

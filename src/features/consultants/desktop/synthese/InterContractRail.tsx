import { formatEuro } from "@/lib/formatters"
import type { InterContractCollaborator } from "@/features/consultants/data/consultants-synthese.types"

interface InterContractRailProps {
  collaborators: readonly InterContractCollaborator[]
}

export function InterContractRail({ collaborators }: InterContractRailProps) {
  return (
    <section className="flex min-h-0 flex-1 flex-col rounded-lg border border-edito-border bg-edito-surface">
      <header className="border-b border-edito-border px-4 py-3.5">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-edito-navy">Disponibilité</p>
        <h2 className="mt-1 text-sm font-bold text-edito-heading">Collaborateurs en intercontrat</h2>
      </header>
      {collaborators.length === 0 ? (
        <p className="flex flex-1 items-center justify-center px-4 py-6 text-center text-xs text-edito-muted">
          Aucun collaborateur en intercontrat.
        </p>
      ) : (
        <ul className="divide-y divide-edito-border px-4">
          {collaborators.map((collaborator) => (
            <li key={collaborator.collaboratorId} className="py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-edito-ink">
                    {collaborator.fullName ?? "—"}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] text-edito-muted">
                    {[collaborator.jobTitle, collaborator.practiceLabel].filter(Boolean).join(" · ") || "—"}
                  </p>
                </div>
                {collaborator.compensationVisible && collaborator.cjm != null ? (
                  <span className="shrink-0 text-[11px] font-semibold tabular-nums text-edito-body">
                    CJM {formatEuro(collaborator.cjm)}
                  </span>
                ) : null}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] leading-snug text-edito-muted">
                <span>
                  {collaborator.lastMissionTitle
                    ? `Dernière mission : ${collaborator.lastMissionTitle}`
                    : "Dernière mission : —"}
                </span>
                <span>
                  Positionnements : {collaborator.activePositionings == null ? "—" : collaborator.activePositionings}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

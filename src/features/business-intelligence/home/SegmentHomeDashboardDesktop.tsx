import type { BusinessIntelligenceSegmentWorkspace } from "../data/business-intelligence-workspace-types"
import type { BiChapter } from "../navigation/business-intelligence-chapters"
import { AnalyticalCoverageMapDesktop } from "../coverage/AnalyticalCoverageMapDesktop"
import {
  buildSegmentHomeKpis,
  formatStudyDate,
  parseCadre,
  parseMarketThesis,
  parseMessageSectoriel,
  provenanceLabel,
} from "./home-model"
import { CorpusConfidenceBanner } from "../shared/CorpusConfidenceBanner"
import { DoncCallout } from "../shared/DoncCallout"
import { SourceChipList } from "../shared/SourceChip"

type LoadedWorkspace = Extract<BusinessIntelligenceSegmentWorkspace, { state: "ready" | "empty" }>

export function SegmentHomeDashboardDesktop({
  workspace,
  onNavigate,
  onOpenPlaybook,
}: {
  workspace: LoadedWorkspace
  onNavigate: (chapter: BiChapter) => void
  onOpenPlaybook: () => void
}) {
  const kpis = buildSegmentHomeKpis(workspace)
  const rawPlaybook = workspace.knowledge.playbook
  const messageSectoriel = parseMessageSectoriel(rawPlaybook)
  const theses = parseMarketThesis(rawPlaybook)
  const cadre = parseCadre(rawPlaybook)

  const resolveSource = (srcId: number) => workspace.sourceResolution?.[srcId] ?? null

  return (
    <div className="space-y-6">
      {/* Bandeau de confiance du corpus */}
      {workspace.corpusMetadata ? (
        <CorpusConfidenceBanner
          qualityVerdict={workspace.corpusMetadata.qualityVerdict}
          activationState={workspace.corpusMetadata.activationState}
          snapshotDate={workspace.corpusMetadata.snapshotDate}
          gaps={workspace.corpusMetadata.gaps}
        />
      ) : null}

      {/* En-tête du segment */}
      <section
        className="rounded-xl border border-edito-border bg-edito-surface p-6 shadow-sm"
        aria-labelledby="segment-home-desktop-title"
      >
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-edito-muted">
            {workspace.segment.macro?.name ?? "Macro-secteur non renseigné"}
          </p>
          <h2 id="segment-home-desktop-title" className="mt-1 font-heading text-2xl font-bold text-edito-navy">
            {workspace.segment.name}
          </h2>
          <p className="mt-1 text-xs text-edito-body">
            {formatStudyDate(workspace.knowledge.studySnapshotDate)} —{" "}
            <span className="font-semibold text-edito-navy">{workspace.portfolio.accounts.length}</span> compte
            {workspace.portfolio.accounts.length > 1 ? "s" : ""} qualifié
            {workspace.portfolio.accounts.length > 1 ? "s" : ""}
          </p>
        </div>
      </section>

      {/* Cartographie de Couverture Analytique */}
      <AnalyticalCoverageMapDesktop
        coverage={workspace.coverage}
        onNavigate={onNavigate}
        onOpenPlaybook={onOpenPlaybook}
      />

      {/* Workspace sans contenu */}
      {workspace.state === "empty" ? (
        <section className="rounded-xl border-l-4 border-edito-brass bg-edito-surface p-5 shadow-sm">
          <h2 className="font-heading text-base font-bold text-edito-navy">Workspace sans contenu</h2>
          <p className="mt-2 text-sm leading-relaxed text-edito-body">
            Ce segment est valide, mais aucune donnée analytique ni aucun compte ne sont disponibles pour le moment.
          </p>
        </section>
      ) : null}

      {/* Message Sectoriel & Synthèse de Marché */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(18rem,1fr)]">
        <div className="space-y-4 rounded-xl border border-edito-border bg-edito-surface p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-edito-border pb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-edito-navy">
              Synthèse & Fenêtre d&rsquo;opportunité
            </h2>
            {provenanceLabel(workspace.knowledge.descriptionLevel) ? (
              <span className="inline-flex items-center rounded border border-edito-border bg-edito-chip px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-edito-muted">
                {provenanceLabel(workspace.knowledge.descriptionLevel)}
              </span>
            ) : null}
          </div>

          {/* Message sectoriel de synthèse */}
          {messageSectoriel ? (
            <div className="rounded-lg border-l-4 border-edito-brass bg-edito-amber-soft/30 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-edito-brass">
                Message Sectoriel de Synthèse
              </p>
              <p className="mt-1 text-sm font-semibold italic leading-relaxed text-edito-navy">
                « {messageSectoriel} »
              </p>
            </div>
          ) : null}

          {/* Description analytique */}
          {workspace.knowledge.description ? (
            <p className="text-sm leading-relaxed text-edito-body whitespace-pre-line">
              {workspace.knowledge.description}
            </p>
          ) : (
            <p className="text-sm italic text-edito-muted">Aucune synthèse textuelle disponible pour ce segment.</p>
          )}
        </div>

        {/* Indicateurs clés */}
        <div className="rounded-xl border border-edito-border bg-edito-surface p-6 shadow-sm">
          <h2 className="border-b border-edito-border pb-3 text-xs font-bold uppercase tracking-wider text-edito-navy">
            Indicateurs de Référence
          </h2>
          <dl className="mt-2 divide-y divide-edito-border/70">
            {kpis.map((kpi) => (
              <div key={kpi.label} className="flex items-baseline justify-between gap-3 py-3">
                <dt className="text-xs font-medium text-edito-muted">{kpi.label}</dt>
                <dd className="text-right text-sm font-bold text-edito-navy">
                  {kpi.value}
                  {provenanceLabel(kpi.level) ? (
                    <span className="ml-2 inline-flex items-center rounded bg-edito-chip px-1.5 py-0.5 text-[9px] font-semibold uppercase text-edito-muted">
                      {provenanceLabel(kpi.level)}
                    </span>
                  ) : null}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Thèses de Marché (5 Thèses) */}
      {theses.length > 0 ? (
        <section className="rounded-xl border border-edito-border bg-edito-surface p-6 shadow-sm">
          <div className="border-b border-edito-border pb-3">
            <h2 className="font-heading text-sm font-bold uppercase tracking-wider text-edito-navy">
              Thèses de Marché & Enjeux Commercialement Qualifiés
            </h2>
            <p className="mt-0.5 text-xs text-edito-muted">
              {theses.length} thèse{theses.length > 1 ? "s" : ""} d&rsquo;analyse et enseignements de vente associés
            </p>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {theses.map((thesis) => (
              <div
                key={thesis.id}
                className="flex flex-col justify-between rounded-lg border border-edito-border bg-edito-canvas/30 p-4 transition-colors hover:border-edito-border/80"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 border-b border-edito-border/40 pb-2">
                    <span className="rounded bg-edito-navy px-2 py-0.5 text-[10px] font-bold text-white">
                      Thèse {thesis.id}
                    </span>
                    <SourceChipList srcIds={thesis.srcIds} resolve={resolveSource} />
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-edito-navy font-semibold">
                    {thesis.these}
                  </p>
                </div>
                {thesis.doncCommercialement ? (
                  <div className="mt-4">
                    <DoncCallout text={thesis.doncCommercialement} />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Cadre & Périmètre de l&rsquo;Étude Sectorielle */}
      {cadre ? (
        <section className="rounded-xl border border-edito-border bg-edito-surface p-6 shadow-sm">
          <div className="border-b border-edito-border pb-3">
            <h2 className="font-heading text-sm font-bold uppercase tracking-wider text-edito-navy">
              Cadre & Périmètre de l&rsquo;Étude Sectorielle
            </h2>
          </div>
          <div className="mt-4 grid gap-6 md:grid-cols-3">
            {cadre.perimetre ? (
              <div className="rounded-lg border border-edito-border/70 bg-edito-canvas/40 p-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-edito-navy">Périmètre Étudié</h3>
                <p className="mt-2 text-xs leading-relaxed text-edito-body">{cadre.perimetre}</p>
              </div>
            ) : null}

            {cadre.horsChamp.length > 0 ? (
              <div className="rounded-lg border border-edito-border/70 bg-edito-canvas/40 p-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-edito-navy">Hors Champ</h3>
                <ul className="mt-2 space-y-1.5">
                  {cadre.horsChamp.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-1.5 text-xs text-edito-muted">
                      <span className="text-edito-brass">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {cadre.regleComparabilite ? (
              <div className="rounded-lg border border-edito-brass/40 bg-edito-amber-soft/20 p-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-edito-brass">
                  Règle de Comparabilité
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-edito-ink">{cadre.regleComparabilite}</p>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

    </div>
  )
}

"use client"

// ─── Lecteur « Rapport complet » (Account Intelligence, Lot 1) ──────────────
// `02` §4 : le rapport tout-d'un-bloc est un composant de VISUALISATION du même
// artefact, jamais une seconde génération. `content_text`, quand INTEL-030 le
// remplit, n'est que la concaténation des `narrative[]` (nœud `V4 Prepare
// Callback`) — sans les titres de section ; le canal externe ne le remplit pas.
// Le lecteur repart donc de `content_json` : même texte, titres en plus, et un
// rendu identique quel que soit le producteur. Il n'y a rien à persister de plus.

import { formatDayMonthYear } from "@/lib/formatting/date-fr"
import { formatSiren, type AccountKnowledgeV4ReportView } from "@/lib/intelligence/account-knowledge-v4-view"
import { AppDialog } from "@/components/ui/AppDialog"
import { cn } from "@/lib/utils"
import { AnchoringBanner, KnowledgeGapsBlock, SourceEntry } from "./AccountKnowledgeV4Parts"

export function AccountKnowledgeV4ReportReader({
  open,
  onOpenChange,
  view,
  companyName,
  isMobile = false,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  view: AccountKnowledgeV4ReportView
  companyName: string
  isMobile?: boolean
}) {
  const identity = [
    view.entity.legalName,
    view.entity.siren ? `SIREN ${formatSiren(view.entity.siren)}` : null,
    view.entity.nafCode ? `NAF ${view.entity.nafCode}` : null,
    view.entity.headquarters,
  ].filter(Boolean)

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      dataTheme="edito-bright-cockpit"
      title={
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-edito-muted">Rapport complet</p>
          <h2 className="mt-0.5 font-heading text-base font-bold text-edito-navy">
            Connaissance entreprise — {companyName}
          </h2>
          <p className="mt-1 text-[11px] text-edito-muted">
            {identity.join(" · ")}
            {view.generatedAt ? ` · rédigé le ${formatDayMonthYear(view.generatedAt)}` : ""}
          </p>
        </div>
      }
      className={cn(
        "bg-edito-surface",
        isMobile ? "!w-[calc(100vw-1rem)]" : "sm:!max-w-3xl",
      )}
      maxHeightClassName="max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-4rem)]"
      bodyClassName="pr-2"
    >
      <article className="mx-auto max-w-2xl space-y-6 pb-4">
        <AnchoringBanner banner={view.banner} producerLabel={view.producer.label} isMobile={isMobile} />

        {view.sections.map((section) => (
          <section key={section.key} aria-labelledby={`v4-reader-${section.key}`} className="space-y-3">
            <h3
              id={`v4-reader-${section.key}`}
              className="flex items-baseline gap-2 border-b border-edito-border pb-1.5 text-xs font-bold uppercase tracking-wider text-edito-heading"
            >
              <span className="font-mono text-[10px] text-edito-brass">{String(section.number).padStart(2, "0")}</span>
              {section.title}
            </h3>
            {section.narrative.length > 0 ? (
              <div className={cn("space-y-3 leading-relaxed text-edito-body", isMobile ? "text-xs" : "text-sm")}>
                {section.narrative.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            ) : null}
            <KnowledgeGapsBlock gaps={section.gaps} isMobile={isMobile} />
          </section>
        ))}

        {view.bibliography.length > 0 ? (
          <section aria-labelledby="v4-reader-sources" className="space-y-3">
            <h3
              id="v4-reader-sources"
              className="border-b border-edito-border pb-1.5 text-xs font-bold uppercase tracking-wider text-edito-heading"
            >
              Sources — {view.bibliography.length}
            </h3>
            <ol className="space-y-2.5">
              {view.bibliography.map((source) => (
                <SourceEntry key={source.id} source={source} isMobile={isMobile} />
              ))}
            </ol>
          </section>
        ) : null}
      </article>
    </AppDialog>
  )
}

import type { SectorSnapshotView } from "@/lib/intelligence/sector-snapshot-data"
import { SectionBlock } from "./intelligence-parts"

// ADR-0012 Lot 3 — rendu du snapshot sectoriel déterministe (étape 2). Distinct
// de SectorAnalysisContent (forme FOLIO libre) : ici la donnée est structurée
// et mutualisée (sector_intelligence + tables sector_*), pas un bloc de texte
// par compte. Fichier séparé pour ne pas alourdir les vues Desktop/Mobile déjà
// volumineuses (même raison que AccountKnowledgeBlocks.tsx).

const URGENCY_LABELS: Record<string, string> = {
  low: "Faible",
  medium: "Moyenne",
  high: "Haute",
  critical: "Critique",
}

function formatDate(value: string | null): string | null {
  if (!value) return null
  try {
    return new Date(value).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
  } catch {
    return value
  }
}

export function SectorSnapshotContent({ data }: { data: SectorSnapshotView }) {
  const hasMarketStats = data.attractivenessScore !== null || data.marketSizeEurBn !== null || data.marketGrowthPct !== null
  const hasPlaybook =
    data.playbook.personas.length > 0 ||
    data.playbook.objections.length > 0 ||
    data.playbook.entryPoints.length > 0 ||
    data.playbook.roiArguments.length > 0

  return (
    <div className="space-y-4">
      <SectionBlock
        title={data.name}
        action={
          <span className="text-[11px] font-semibold text-muted">
            {data.exposedAccountsCount} compte{data.exposedAccountsCount > 1 ? "s" : ""} du portefeuille
          </span>
        }
      >
        {data.description && (
          <p className="text-xs leading-relaxed text-body mb-3">{data.description}</p>
        )}
        {hasMarketStats && (
          <div className="grid grid-cols-3 gap-2">
            {data.attractivenessScore !== null && (
              <div className="rounded border border-border/60 bg-canvas/40 p-2.5 text-center">
                <p className="text-lg font-bold text-heading">{data.attractivenessScore}/5</p>
                <p className="text-[10px] text-muted uppercase tracking-wider">Attractivité</p>
              </div>
            )}
            {data.marketSizeEurBn !== null && (
              <div className="rounded border border-border/60 bg-canvas/40 p-2.5 text-center">
                <p className="text-lg font-bold text-heading">{data.marketSizeEurBn} Md€</p>
                <p className="text-[10px] text-muted uppercase tracking-wider">Taille marché</p>
              </div>
            )}
            {data.marketGrowthPct !== null && (
              <div className="rounded border border-border/60 bg-canvas/40 p-2.5 text-center">
                <p className="text-lg font-bold text-heading">{data.marketGrowthPct}%</p>
                <p className="text-[10px] text-muted uppercase tracking-wider">Croissance</p>
              </div>
            )}
          </div>
        )}
      </SectionBlock>

      {data.openCommercialWindows.length > 0 && (
        <SectionBlock title="Fenêtres commerciales ouvertes" className="border-brand-brass/30 bg-brand-brass/5">
          <ul className="space-y-1.5">
            {data.openCommercialWindows.map((label, i) => (
              <li key={i} className="text-xs font-semibold text-heading">→ {label}</li>
            ))}
          </ul>
        </SectionBlock>
      )}

      {data.painPoints.length > 0 && (
        <SectionBlock title={`Pain points sectoriels (${data.painPoints.length})`}>
          <div className="space-y-1.5">
            {data.painPoints.map((pp) => (
              <div key={pp.id} className="rounded border border-border/60 bg-canvas/40 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-heading">{pp.title}</p>
                  <span className="shrink-0 rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] font-semibold text-body">
                    {pp.frequencyCount}×
                  </span>
                </div>
                {pp.description && <p className="mt-1 text-[11px] leading-relaxed text-body">{pp.description}</p>}
                {pp.kredoPractice && (
                  <p className="mt-1 text-[10px] text-muted">Practice KREDO : {pp.kredoPractice}</p>
                )}
              </div>
            ))}
          </div>
        </SectionBlock>
      )}

      {data.regulatoryItems.length > 0 && (
        <SectionBlock title="Calendrier réglementaire">
          <div className="space-y-1.5">
            {data.regulatoryItems.map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-3 rounded border border-border/60 bg-canvas/40 px-3 py-2">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-heading">{item.name}</p>
                  {item.authority && <p className="text-[10px] text-muted">{item.authority}</p>}
                  {item.commercialAngle && <p className="mt-1 text-[11px] leading-relaxed text-body">{item.commercialAngle}</p>}
                </div>
                <div className="shrink-0 text-right">
                  {formatDate(item.deadlineDate) && (
                    <p className="text-[11px] font-semibold text-heading">{formatDate(item.deadlineDate)}</p>
                  )}
                  <span className="rounded border border-border bg-surface px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-body">
                    {URGENCY_LABELS[item.urgency] ?? item.urgency}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </SectionBlock>
      )}

      {data.events.length > 0 && (
        <SectionBlock title="Événements commerciaux">
          <div className="space-y-1.5">
            {data.events.map((event) => (
              <div key={event.id} className="rounded border border-border/60 bg-canvas/40 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-heading">{event.title}</p>
                  {formatDate(event.eventDate) && (
                    <span className="shrink-0 text-[11px] font-semibold text-muted">{formatDate(event.eventDate)}</span>
                  )}
                </div>
                {event.commercialOpportunity && (
                  <p className="mt-1 text-[11px] leading-relaxed text-body">{event.commercialOpportunity}</p>
                )}
              </div>
            ))}
          </div>
        </SectionBlock>
      )}

      {data.news.length > 0 && (
        <SectionBlock title="Actualités sectorielles">
          <div className="space-y-1.5">
            {data.news.map((item) => (
              <div key={item.id} className="rounded border border-border/60 bg-canvas/40 px-3 py-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-xs font-bold text-heading">{item.title}</p>
                  {item.isTriggerEvent && (
                    <span className="rounded border border-brand-brass/30 bg-brand-brass/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-brand-brass">
                      Déclencheur
                    </span>
                  )}
                </div>
                {item.summary && <p className="mt-1 text-[11px] leading-relaxed text-body">{item.summary}</p>}
              </div>
            ))}
          </div>
        </SectionBlock>
      )}

      {hasPlaybook && (
        <SectionBlock title="Playbook sectoriel">
          <div className="space-y-3">
            {data.playbook.personas.length > 0 && (
              <div>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted">Personas ({data.playbook.personas.length})</p>
              </div>
            )}
            {data.playbook.objections.length > 0 && (
              <div>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted">Objections ({data.playbook.objections.length})</p>
              </div>
            )}
            {data.playbook.entryPoints.length > 0 && (
              <div>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted">Points d&apos;entrée ({data.playbook.entryPoints.length})</p>
              </div>
            )}
            {data.playbook.roiArguments.length > 0 && (
              <div>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted">Arguments ROI ({data.playbook.roiArguments.length})</p>
              </div>
            )}
            <p className="text-[11px] text-muted italic">
              Détail consultable dans Business Intelligence.
            </p>
          </div>
        </SectionBlock>
      )}

      {data.painPoints.length === 0 && data.regulatoryItems.length === 0 && data.events.length === 0 && data.news.length === 0 && !hasPlaybook && (
        <p className="text-xs text-muted italic">
          Fiche sectorielle créée mais pas encore enrichie (pain points, réglementaire, playbook à compléter).
        </p>
      )}
    </div>
  )
}

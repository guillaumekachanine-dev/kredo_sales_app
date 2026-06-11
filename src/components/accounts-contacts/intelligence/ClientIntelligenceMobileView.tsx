"use client"

import Link from "next/link"
import { CompanyLogo } from "@/components/accounts-contacts/CompanyLogo"
import type { ClientIntelligenceData, IntelligenceSource } from "@/lib/intelligence/intelligence-data"
import {
  FreshnessLine,
  lifecycleLabel,
  ProvenanceBadge,
  ScorePill,
  SectionBlock,
  SignalList,
} from "./intelligence-parts"

// Mobile = action rapide : « entre deux RDV, que faire sur ce compte ? »
// Pas de matrice ni de tableau dense — cartes synthétiques + gros boutons.
export function ClientIntelligenceMobileView({ data }: { data: ClientIntelligenceData }) {
  const { company, client, sector, freshness, signals } = data
  const analysisSource: IntelligenceSource = client?.source ?? "none"

  return (
    <div className="flex flex-col gap-4 p-4 pb-24">
      <Link href={`/prospection/accounts?drawer=${company.id}`} className="text-[11px] font-semibold text-muted">
        ← Comptes &amp; contacts
      </Link>

      {/* Header compact */}
      <div className="flex items-start gap-3">
        <CompanyLogo name={company.name} logoPath={company.logoPath} website={company.website} size="lg" />
        <div className="min-w-0">
          <h1 className="truncate font-heading text-lg font-bold text-heading">{company.name}</h1>
          <p className="text-[11px] text-body">
            {company.sector} · {lifecycleLabel(company.lifecycleStatus)}
          </p>
          <div className="mt-1.5">
            <ProvenanceBadge source={analysisSource} />
          </div>
        </div>
      </div>

      {/* Score + fraîcheur */}
      <div className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3">
        <ScorePill score={company.aiScore} />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-heading">Priorité : {company.priority}</p>
          <FreshnessLine
            latestRunAt={freshness.latestRunAt}
            latestRunStatus={freshness.latestRunStatus}
            fallbackSource={analysisSource}
          />
        </div>
      </div>

      {/* Synthèse courte */}
      <SectionBlock title="Synthèse IA" action={client ? <ProvenanceBadge source={client.source} /> : undefined}>
        <p className="line-clamp-6 whitespace-pre-line text-sm leading-relaxed text-body">
          {client?.data.synthese || "Aucune synthèse disponible."}
        </p>
      </SectionBlock>

      {/* Signaux */}
      <SectionBlock title="Signaux récents">
        <SignalList signals={signals} />
      </SectionBlock>

      {sector && (
        <SectionBlock title="Secteur" action={<ProvenanceBadge source={sector.source} />}>
          <p className="line-clamp-5 whitespace-pre-line text-sm leading-relaxed text-body">{sector.data.synthese}</p>
        </SectionBlock>
      )}

      {/* Actions rapides (touch targets ≥ 44px) */}
      <div className="grid grid-cols-2 gap-3">
        <a
          href={company.website ?? undefined}
          target="_blank"
          rel="noreferrer"
          className="flex min-h-[44px] items-center justify-center rounded-lg border border-border bg-surface px-3 text-xs font-semibold text-body aria-disabled:opacity-50"
          aria-disabled={!company.website}
        >
          Site web
        </a>
        <button
          type="button"
          disabled
          className="min-h-[44px] cursor-not-allowed rounded-lg border border-border bg-surface px-3 text-xs font-semibold text-muted opacity-60"
        >
          Générer un pitch
        </button>
      </div>
    </div>
  )
}

"use client"

// Gestion des sources — Lot 6 · restitution du rapport d'import de
// cartographie concurrentielle. Composant partagé entre le détail ouvert
// depuis la section « Historique » du wizard, DocumentPreviewPanel (desktop)
// et DocumentMobileDetail (mobile) — une seule représentation du rapport.

import Link from "next/link"
import { cn } from "@/lib/utils"
import { isCompetitiveMapImportReportContent } from "@/features/competitive-map/domain/competitive-map-import-report"

function formatDateTimeFR(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function CompetitiveMapImportReportContent({ contentJson }: { contentJson: unknown }) {
  const content = isCompetitiveMapImportReportContent(contentJson) ? contentJson : null

  if (!content) {
    return (
      <div className="p-4 text-center text-xs text-muted">
        Données de l&apos;import de cartographie non disponibles.
      </div>
    )
  }

  const { counts } = content

  return (
    <div className="flex flex-col gap-5 py-2">
      <div className="rounded-[var(--radius-medium)] border border-border/60 bg-canvas/40 p-4">
        <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
          Import de cartographie
        </span>
        <h3 className="mt-2 text-base font-bold text-heading">{content.sectorName}</h3>
        <p className="mt-0.5 text-xs text-muted">{formatDateTimeFR(content.importedAt)}</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-[var(--radius-medium)] border border-border bg-surface/60 p-3.5 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Analysés</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-heading">{counts.analyzed}</p>
        </div>
        <div className="rounded-[var(--radius-medium)] border border-border bg-surface/60 p-3.5 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Importés</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-success">{counts.imported}</p>
        </div>
        <div className="rounded-[var(--radius-medium)] border border-border bg-surface/60 p-3.5 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Rejetés</p>
          <p className={cn("mt-1 text-2xl font-bold tracking-tight", counts.rejected > 0 ? "text-danger" : "text-heading")}>
            {counts.rejected}
          </p>
        </div>
      </div>

      <div className="rounded-[var(--radius-medium)] border border-border bg-canvas/40 p-3.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Fichier source</p>
        <p className="mt-1 text-sm font-medium text-heading">{content.sourceFileName}</p>
        {content.sourceJson !== null ? (
          <details className="mt-2 text-xs">
            <summary className="cursor-pointer font-medium text-primary hover:underline">Voir le JSON source</summary>
            <pre className="mt-2 max-h-64 overflow-auto rounded border border-border bg-canvas p-3 text-[11px] leading-relaxed text-body">
              {JSON.stringify(content.sourceJson, null, 2)}
            </pre>
          </details>
        ) : content.sourceTruncated ? (
          <p className="mt-2 text-[11px] text-muted">
            Fichier trop volumineux pour être archivé — seul le bilan a été conservé.
          </p>
        ) : null}
      </div>

      {(counts.created > 0 || counts.attached > 0 || counts.excluded > 0 || counts.failed > 0) && (
        <div className="space-y-1.5 text-xs text-body">
          {counts.created > 0 && <p>{counts.created} comptes créés</p>}
          {counts.attached > 0 && <p>{counts.attached} comptes rattachés au CRM</p>}
          {counts.excluded > 0 && <p className="text-muted">{counts.excluded} comptes exclus à l&apos;arbitrage</p>}
          {counts.failed > 0 && <p className="text-danger">{counts.failed} comptes en erreur d&apos;import</p>}
        </div>
      )}

      {content.createdAccounts.length > 0 && (
        <div>
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted">Comptes créés</h4>
          <ul className="mt-1.5 space-y-1">
            {content.createdAccounts.map((c) => (
              <li key={c.companyId}>
                <Link href={`/prospection/accounts/${c.companyId}`} className="text-xs font-semibold text-primary hover:underline">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {content.errors.length > 0 && (
        <div>
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-danger">Erreurs</h4>
          <ul className="mt-1.5 space-y-1">
            {content.errors.map((e, i) => (
              <li key={i} className="text-[11px] text-danger">
                {e.name ?? "?"} — {e.code}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

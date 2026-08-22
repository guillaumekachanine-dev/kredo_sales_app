"use client"

// Gestion des sources — Lot 6 · restitution du rapport d'import de
// cartographie concurrentielle. Composant partagé entre le détail ouvert
// depuis la section « Historique » du wizard, DocumentPreviewPanel (desktop)
// et DocumentMobileDetail (mobile) — une seule représentation du rapport.

import Link from "next/link"
import { cn } from "@/lib/utils"
import { isCompetitiveMapImportReportContent } from "@/features/competitive-map/domain/competitive-map-import-report"
import {
  parseCompetitiveMapOutput,
  COMPETITIVE_MAP_CATEGORY_LABELS,
  type CompetitiveMapAccountInput,
  type CompetitiveMapJsonValue,
} from "@/features/competitive-map/domain/competitive-map-output"

const PROFILE_FIELD_LABELS: Record<string, string> = {
  proposition_valeur: "Proposition de valeur",
  modele_economique: "Modèle économique",
  a_ne_pas_dire: "À ne pas dire",
  metier_chaine_valeur: "Métier dans la chaîne de valeur",
  maillon: "Maillon",
  dependances_cles: "Dépendances clés",
  differenciateurs: "Différenciateurs",
  priorites_strategiques: "Priorités stratégiques",
  chantiers_technologiques: "Chantiers technologiques",
  trigger_events: "Trigger events",
  trous: "Trous / zones d'ombre",
  sources: "Sources",
  contrats_majeurs: "Contrats majeurs",
  chaine_valeur: "Chaîne de valeur",
  grilles: "Grilles",
  couche_esn: "Couche ESN",
  traduction_commerciale: "Traduction commerciale",
}

function moneyLabel(value: number | null): string {
  if (value === null) return "—"
  return `${value.toLocaleString("fr-FR")} M€`
}

function ProfileValue({ value }: { value: CompetitiveMapJsonValue }) {
  if (value === null || value === undefined) return null
  if (typeof value === "string") {
    return <p className="text-xs leading-relaxed text-body">{value}</p>
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return <p className="text-xs leading-relaxed text-body">{String(value)}</p>
  }
  if (Array.isArray(value)) {
    return (
      <ul className="list-disc space-y-0.5 pl-4 text-xs leading-relaxed text-body">
        {value.map((item, i) => (
          <li key={i}>{typeof item === "object" && item !== null ? JSON.stringify(item) : String(item)}</li>
        ))}
      </ul>
    )
  }
  const entries = Object.entries(value).filter(([, v]) => v !== undefined && v !== null)
  if (entries.length === 0) return null
  return (
    <dl className="space-y-1 text-xs leading-relaxed text-body">
      {entries.map(([key, v]) => (
        <div key={key} className="flex gap-1.5">
          <dt className="shrink-0 font-semibold text-heading">{key} :</dt>
          <dd className="min-w-0">{typeof v === "object" ? JSON.stringify(v) : String(v)}</dd>
        </div>
      ))}
    </dl>
  )
}

function AccountDetailCard({ account }: { account: CompetitiveMapAccountInput }) {
  const profileEntries = Object.entries(account.profil).filter(([, v]) => v !== undefined && v !== null)

  return (
    <div className="rounded-[var(--radius-medium)] border border-border bg-surface/60 p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h5 className="text-sm font-bold text-heading">{account.nom}</h5>
        <div className="flex items-center gap-1.5">
          {account.estCompteEtalon && (
            <span className="rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[9px] font-black uppercase text-amber-900">
              Étalon
            </span>
          )}
          <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-primary">
            {COMPETITIVE_MAP_CATEGORY_LABELS[account.categorie]}
          </span>
        </div>
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded border border-border/60 bg-canvas/40 p-2">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-muted">CA</p>
          <p className="mt-0.5 text-xs font-bold text-heading">{moneyLabel(account.caMeur)}</p>
        </div>
        <div className="rounded border border-border/60 bg-canvas/40 p-2">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-muted">Effectif France</p>
          <p className="mt-0.5 text-xs font-bold text-heading">{account.effectifFrance ?? "—"}</p>
        </div>
        <div className="rounded border border-border/60 bg-canvas/40 p-2">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-muted">Appétence</p>
          <p className="mt-0.5 text-xs font-bold text-heading">{account.appetenceScore !== null ? `${account.appetenceScore}/35` : "—"}</p>
        </div>
        <div className="rounded border border-border/60 bg-canvas/40 p-2">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-muted">Accessibilité</p>
          <p className="mt-0.5 text-xs font-bold text-heading">{account.accessibiliteScore !== null ? `${account.accessibiliteScore}/5` : "—"}</p>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted">
        <span>Confiance : <strong className="text-body">{account.confiance}</strong></span>
        <span>Empreinte métier : <strong className="text-body">{account.empreinteMetier ?? "—"}/5</strong></span>
        <span>Maturité numérique : <strong className="text-body">{account.maturiteNumerique ?? "—"}/5</strong></span>
        {account.perimetreCa && <span>Périmètre CA : <strong className="text-body">{account.perimetreCa}</strong></span>}
        {account.exercice && <span>Exercice : <strong className="text-body">{account.exercice}</strong></span>}
      </div>

      {account.justificationCategorie && (
        <div className="mt-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Positionnement</p>
          <p className="mt-1 text-xs leading-relaxed text-body">{account.justificationCategorie}</p>
        </div>
      )}

      {account.angleEntree && (
        <div className="mt-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Angle d&apos;entrée</p>
          <p className="mt-1 text-xs leading-relaxed text-body">{account.angleEntree}</p>
        </div>
      )}

      {profileEntries.length > 0 && (
        <div className="mt-3 space-y-2.5 border-t border-border/60 pt-2.5">
          {profileEntries.map(([key, value]) => (
            <div key={key}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted">
                {PROFILE_FIELD_LABELS[key] ?? key}
              </p>
              <div className="mt-1">
                <ProfileValue value={value as CompetitiveMapJsonValue} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

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

type CompetitiveMapImportReportContentProps = {
  contentJson: unknown
  /**
   * "full" (défaut) : visionneuse de document (bibliothèque /reports, desktop et mobile) —
   * détail complet par compte. "summary" : historique du wizard d'import — bilan uniquement,
   * le détail brut n'a pas sa place dans ce panneau de dépannage rapide.
   */
  variant?: "full" | "summary"
}

export function CompetitiveMapImportReportContent({ contentJson, variant = "full" }: CompetitiveMapImportReportContentProps) {
  const content = isCompetitiveMapImportReportContent(contentJson) ? contentJson : null

  if (!content) {
    return (
      <div className="p-4 text-center text-xs text-muted">
        Données de l&apos;import de cartographie non disponibles.
      </div>
    )
  }

  const { counts } = content
  const parsedSource =
    variant === "full" && content.sourceJson !== null ? parseCompetitiveMapOutput(content.sourceJson) : null
  const accounts = parsedSource && "data" in parsedSource ? parsedSource.data.comptes : []

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
        {content.sourceTruncated && (
          <p className="mt-2 text-[11px] text-muted">
            Fichier trop volumineux pour être archivé — seul le bilan a été conservé.
          </p>
        )}
      </div>

      {accounts.length > 0 && (
        <div>
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted">
            Détail des comptes analysés ({accounts.length})
          </h4>
          <div className="mt-2 space-y-3">
            {accounts.map((account) => (
              <AccountDetailCard key={account.nom} account={account} />
            ))}
          </div>
        </div>
      )}

      {variant === "full" && content.sourceJson !== null && (
        <details className="text-xs">
          <summary className="cursor-pointer font-medium text-primary hover:underline">
            Voir le JSON source brut
          </summary>
          <pre className="mt-2 max-h-64 overflow-auto rounded border border-border bg-canvas p-3 text-[11px] leading-relaxed text-body">
            {JSON.stringify(content.sourceJson, null, 2)}
          </pre>
        </details>
      )}

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

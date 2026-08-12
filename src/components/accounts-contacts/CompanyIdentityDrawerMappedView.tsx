"use client"

// ADR-0019 Lot 6 — drawer minimal pour un compte `mapped` (D-1/D-3) : c'est
// une citation issue d'une cartographie concurrentielle, pas un compte réel.
// Pas d'onglets, pas de contacts/opportunités/missions (D-3 en garantit
// l'absence) — uniquement l'identité connue, l'analyse cartographique
// (D-4 : jamais dans les colonnes canoniques de `companies`) et un unique
// CTA « Convertir », qui appelle la même Server Action que les deux autres
// portes d'entrée de l'ADR (D-2).

import { useEffect, useState, useTransition } from "react"
import { CompanyLogo } from "@/components/accounts-contacts/CompanyLogo"
import { Field, SectionBlock } from "@/components/accounts-contacts/intelligence/intelligence-parts"
import { promoteAccountDepth } from "@/features/account-lifecycle/actions/promote-account-depth"
import {
  ACCOUNT_DEPTH_BADGE_TONE,
  ACCOUNT_DEPTH_LEVEL_LABELS,
  ACCOUNT_ORIGIN_LABELS,
} from "@/features/account-lifecycle/domain/depth-level"
import {
  getCompetitiveMapCitation,
  type CompetitiveMapCitation,
} from "@/features/competitive-map/data/get-competitive-map-citation"
import { formatDate } from "@/lib/formatters"
import { cn } from "@/lib/utils"

type MappedCompany = {
  id: string
  name: string
  sector: string | null
  segment: string | null
  website: string | null
  metadata: Record<string, unknown> | null
  origin: string
}

function formatMeur(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "Non renseigné"
  return `${value.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} M€`
}

function scoreLabel(value: number | null, max: number): string {
  return value === null ? "Non évalué" : `${value} / ${max}`
}

const CONFIANCE_LABELS: Record<string, string> = {
  haute: "Haute",
  moyenne: "Moyenne",
  faible: "Faible",
}

export function CompanyIdentityDrawerMappedView({
  company,
  onConverted,
}: {
  company: MappedCompany
  onConverted: () => void
}) {
  const [citation, setCitation] = useState<CompetitiveMapCitation | null>(null)
  const [citationLoading, setCitationLoading] = useState(true)
  const [convertPending, startConvert] = useTransition()
  const [convertError, setConvertError] = useState<string | null>(null)

  useEffect(() => {
    // Pas de reset explicite à `true` ici : le composant est remonté à chaque
    // changement de compte (le drawer vide `data` avant de recharger), donc
    // l'état initial du `useState` couvre déjà ce cas.
    let cancelled = false
    getCompetitiveMapCitation(company.id).then((result) => {
      if (!cancelled) {
        setCitation(result)
        setCitationLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [company.id])

  const handleConvert = () => {
    setConvertError(null)
    startConvert(async () => {
      const { error, promoted } = await promoteAccountDepth(company.id, "noted")
      if (error) {
        setConvertError(error)
        return
      }
      if (promoted) onConverted()
    })
  }

  const { entry, facts } = citation ?? { entry: null, facts: null }
  const hasFacts = facts && (facts.revenueEstimateMeur !== null || facts.headcountFrance !== null)

  return (
    <div className="flex flex-col gap-5">
      {/* Header — identité minimale, sans les actions Scan/Veille/Cockpit du drawer plein */}
      <div className="relative flex flex-col gap-3 rounded-[var(--radius-medium)] border border-border bg-surface-hover p-4">
        <div className="flex items-center gap-4">
          <CompanyLogo
            name={company.name}
            logoPath={(company.metadata?.logo_path as string) || null}
            website={company.website}
            size="xl"
            className="rounded-full w-14 h-14 shrink-0"
          />
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-bold leading-tight text-heading sm:text-lg">{company.name}</h3>
            {(company.sector || company.segment) && (
              <span className="mt-0.5 block truncate text-[11px] font-medium leading-tight text-muted">
                {[company.sector, company.segment].filter(Boolean).join(" - ")}
              </span>
            )}
          </div>
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-1 rounded border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider",
              ACCOUNT_DEPTH_BADGE_TONE.mapped
            )}
          >
            {ACCOUNT_DEPTH_LEVEL_LABELS.mapped}
          </span>
        </div>
        <p className="text-xs text-body">
          {ACCOUNT_ORIGIN_LABELS[company.origin] ?? company.origin} — ce compte n’est qu’une citation, il n’entre
          pas dans les statistiques ni les sélecteurs commerciaux tant qu’il n’a pas été converti.
        </p>
      </div>

      {citationLoading ? (
        <div className="animate-pulse space-y-3">
          <div className="h-24 rounded-[var(--radius-medium)] bg-border/20" />
          <div className="h-24 rounded-[var(--radius-medium)] bg-border/20" />
        </div>
      ) : (
        <>
          {entry && (
            <SectionBlock
              title="Analyse cartographique"
              action={
                <span className="rounded border border-border bg-canvas/50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-body">
                  {entry.categoryLabel}
                </span>
              }
            >
              <div className="space-y-3">
                {entry.positioning && <Field label="Positionnement" value={entry.positioning} />}
                <div className="grid gap-2 sm:grid-cols-2">
                  {entry.forces && <Field label="Forces" value={entry.forces} />}
                  {entry.vulnerabilite && <Field label="Vulnérabilité" value={entry.vulnerabilite} />}
                </div>
                {entry.angleEntree && <Field label="Angle d'entrée" value={entry.angleEntree} />}
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Field label="Empreinte métier" value={scoreLabel(entry.empreinteMetier, 5)} />
                  <Field label="Maturité numérique" value={scoreLabel(entry.maturiteNumerique, 5)} />
                  <Field
                    label="Appétence"
                    value={
                      entry.appetenceScore === null
                        ? "Non évalué"
                        : `${scoreLabel(entry.appetenceScore, 35)}${entry.appetenceProvisoire ? " (provisoire)" : ""}`
                    }
                  />
                  <Field label="Confiance" value={CONFIANCE_LABELS[entry.confiance] ?? entry.confiance} />
                </div>
                <p className="text-[11px] text-muted">Étude datée du {formatDate(entry.studySnapshotDate)}.</p>
              </div>
            </SectionBlock>
          )}

          {hasFacts && (
            <SectionBlock title="Chiffres cités par l'étude">
              <div className="space-y-2">
                <div className="grid gap-2 sm:grid-cols-2">
                  <Field label="CA estimé" value={formatMeur(facts!.revenueEstimateMeur)} />
                  <Field label="Effectif France" value={facts!.headcountFrance ?? "Non renseigné"} />
                </div>
                <p className="text-[11px] font-semibold text-warning">
                  Provisoire, non audité — {facts!.revenuePerimetre ? `périmètre : ${facts!.revenuePerimetre}` : "périmètre non précisé"}
                  {facts!.revenueExercice ? `, exercice ${facts!.revenueExercice}` : ""}. Un CA groupe n’est pas un CA
                  de périmètre : ne pas citer tel quel en rendez-vous.
                </p>
              </div>
            </SectionBlock>
          )}
        </>
      )}

      <div className="mt-2 flex flex-col gap-2 border-t border-border pt-5">
        <p className="text-xs text-body">
          Convertir fait sortir ce compte de l’état « citation » : il devient un pense-bête CRM normal, visible dans
          les statistiques et sélectionnable pour une opportunité ou une mission. Le socle (SIREN/NAF/taille) reste
          ensuite à qualifier via le scan.
        </p>
        {convertError && <p className="text-xs font-semibold text-danger">{convertError}</p>}
        <button
          type="button"
          onClick={handleConvert}
          disabled={convertPending}
          className="inline-flex min-h-[38px] shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-bold text-primary-fg shadow-sm transition-all hover:bg-primary/95 active:scale-98 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {convertPending ? "Conversion…" : "Convertir en compte CRM"}
        </button>
      </div>
    </div>
  )
}

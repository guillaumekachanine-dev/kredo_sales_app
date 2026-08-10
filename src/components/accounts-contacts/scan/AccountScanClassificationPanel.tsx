"use client"

import { useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { StatusPill } from "@/components/ui/StatusPill"
import type { AccountScanClassification } from "@/lib/n8n/types"
import {
  CLASSIFICATION_AXES,
  CLASSIFICATION_AXIS_LABELS,
  MANDATORY_CLASSIFICATION_AXES,
  MODELE_ECO_LABELS,
  MOMENT_LABELS,
  REGIME_ACHAT_LABELS,
  defaultAcceptedAxes,
  isModeleEco,
  isMoment,
  isRegimeAchat,
  validateClassificationProposal,
  type ClassificationAxis,
  type CurrentClassificationState,
} from "@/features/account-lifecycle/domain/account-classification"

// ADR-0019 Lot 4 — revue des 7 axes de classification proposés par le scan.
//
// Responsive CSS (un seul arbre) et non adaptive plein : c'est une fiche de
// revue, pas un écran d'analyse dense — cf. ADR-0006, « CRUD, fiches,
// formulaires » → responsive. Aucun DataTable ici, il est proscrit en mobile.
//
// L'utilisateur coche/décoche chaque axe mais l'écriture reste UNE transaction :
// les contrôles §10 du référentiel portent sur plusieurs champs à la fois.

const TIER_LABELS: Record<string, string> = {
  grand_compte: "Grand compte",
  eti: "ETI",
  pme: "PME",
}

const RELATION_LABELS: Record<string, string> = {
  prospect: "Prospect",
  client: "Client",
  ancien_client: "Ancien client",
  pair_partenaire: "Pair / partenaire",
}

const TEST_LABELS: Record<string, string> = {
  concurrence: "Concurrence",
  acheteurs: "Acheteurs",
  contraintes: "Contraintes",
  offres: "Offres",
}

function axisValueLabel(
  axis: ClassificationAxis,
  classification: AccountScanClassification,
): string {
  switch (axis) {
    case "segment":
      return classification.segmentSlug || "—"
    case "regime_achat":
      return isRegimeAchat(classification.regimeAchat)
        ? REGIME_ACHAT_LABELS[classification.regimeAchat]
        : "—"
    case "modele_eco":
      return isModeleEco(classification.modeleEco) ? MODELE_ECO_LABELS[classification.modeleEco] : "—"
    case "moment":
      return isMoment(classification.moment) ? MOMENT_LABELS[classification.moment] : "—"
    case "tier":
      return classification.tier ? TIER_LABELS[classification.tier] ?? classification.tier : "Non déterminé"
    case "vertical_client":
      return classification.verticalClient.length > 0 ? classification.verticalClient.join(", ") : "—"
    case "relation_type":
      return classification.relationType
        ? RELATION_LABELS[classification.relationType] ?? classification.relationType
        : "—"
  }
}

interface AccountScanClassificationPanelProps {
  classification: AccountScanClassification
  current: CurrentClassificationState
  applying: boolean
  /** Axes refusés par la base au dernier envoi (garde-fou §12.9). */
  skippedAxes: { axis: string; reason: string }[]
  appliedAxes: ClassificationAxis[]
  errorMessage: string | null
  onApply: (axes: ClassificationAxis[]) => void
}

export function AccountScanClassificationPanel({
  classification,
  current,
  applying,
  skippedAxes,
  appliedAxes,
  errorMessage,
  onApply,
}: AccountScanClassificationPanelProps) {
  const [accepted, setAccepted] = useState<Set<ClassificationAxis>>(
    () => new Set(defaultAcceptedAxes(classification)),
  )

  const acceptedList = useMemo(
    () => CLASSIFICATION_AXES.filter((axis) => accepted.has(axis)),
    [accepted],
  )

  // Les mêmes contrôles tournent côté base : les rejouer ici évite un aller-
  // retour serveur pour une erreur qu'on peut nommer tout de suite, jamais pour
  // s'y substituer — la RPC reste seule juge.
  const violations = useMemo(
    () => validateClassificationProposal(classification, acceptedList, current),
    [classification, acceptedList, current],
  )

  const blocked = violations.length > 0 || acceptedList.length === 0

  function toggle(axis: ClassificationAxis) {
    setAccepted((prev) => {
      const next = new Set(prev)
      if (next.has(axis)) next.delete(axis)
      else next.add(axis)
      return next
    })
  }

  const failedTests = Object.entries(classification.tests).filter(([, ok]) => !ok)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-xs font-bold uppercase tracking-wider text-heading">
            Classification proposée
          </h3>
          <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-muted">
            {classification.activiteDominante}
          </p>
        </div>
        <StatusPill
          variant={
            classification.classificationConfiance === "haute"
              ? "success"
              : classification.classificationConfiance === "moyenne"
                ? "warning"
                : "danger"
          }
          label={`Confiance ${classification.classificationConfiance}`}
        />
      </div>

      {/* Les 4 tests du §6.3 — ce qui fonde le rattachement au segment. */}
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(classification.tests).map(([name, passed]) => (
          <span
            key={name}
            className={cn(
              "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-bold",
              passed
                ? "border-success/25 bg-success/10 text-success"
                : "border-warning/25 bg-warning/10 text-warning",
            )}
          >
            {passed ? "✓" : "✕"} {TEST_LABELS[name] ?? name}
          </span>
        ))}
      </div>

      {classification.classificationNote ? (
        <p className="rounded border-l-2 border-warning bg-warning/5 px-3 py-2 text-[11px] leading-relaxed text-body">
          {classification.classificationNote}
        </p>
      ) : null}

      <ul className="divide-y divide-border rounded border border-border">
        {CLASSIFICATION_AXES.map((axis) => {
          const isMandatory = (MANDATORY_CLASSIFICATION_AXES as readonly ClassificationAxis[]).includes(axis)
          const wasApplied = appliedAxes.includes(axis)
          const skipped = skippedAxes.find((s) => s.axis === axis)

          return (
            <li key={axis} className="flex items-start gap-3 p-3">
              <input
                type="checkbox"
                id={`axis-${axis}`}
                checked={accepted.has(axis)}
                onChange={() => toggle(axis)}
                disabled={applying}
                className="mt-0.5 size-4 shrink-0 cursor-pointer accent-primary"
              />
              <div className="min-w-0 flex-1">
                <label
                  htmlFor={`axis-${axis}`}
                  className="flex cursor-pointer flex-wrap items-center gap-1.5 text-[11px] font-bold text-heading"
                >
                  {CLASSIFICATION_AXIS_LABELS[axis]}
                  {isMandatory ? (
                    <span className="text-[9px] font-bold uppercase tracking-wider text-muted">
                      obligatoire
                    </span>
                  ) : null}
                  {wasApplied ? <StatusPill variant="success" label="Appliqué" /> : null}
                </label>
                <p className="mt-0.5 break-words text-xs text-body">{axisValueLabel(axis, classification)}</p>
                {axis === "moment" && classification.momentPreuve ? (
                  <p className="mt-1 text-[10px] italic leading-relaxed text-muted">
                    Preuve · {classification.momentPreuve}
                  </p>
                ) : null}
                {skipped ? (
                  <p className="mt-1 text-[10px] font-semibold leading-relaxed text-danger">{skipped.reason}</p>
                ) : null}
              </div>
            </li>
          )
        })}
      </ul>

      {classification.alternativesEcartees.length > 0 ? (
        <details className="rounded border border-border px-3 py-2">
          <summary className="cursor-pointer text-[11px] font-bold text-heading">
            Alternatives écartées ({classification.alternativesEcartees.length})
          </summary>
          <ul className="mt-2 space-y-1.5">
            {classification.alternativesEcartees.map((alt) => (
              <li key={alt.segmentSlug} className="text-[11px] leading-relaxed text-body">
                <span className="font-semibold text-heading">{alt.segmentSlug}</span> — {alt.motif}
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {violations.length > 0 ? (
        <ul className="space-y-1 rounded border border-danger/30 bg-danger/5 px-3 py-2">
          {violations.map((violation, index) => (
            <li key={`${violation.rule}-${index}`} className="text-[11px] leading-relaxed text-danger">
              <span className="font-bold">{violation.rule}</span> · {violation.message}
            </li>
          ))}
        </ul>
      ) : null}

      {failedTests.length > 0 && classification.classificationConfiance !== "haute" ? (
        <p className="text-[10px] leading-relaxed text-muted">
          {failedTests.length} test(s) en échec : le rattachement reste discutable, la note ci-dessus doit dire
          quoi vérifier.
        </p>
      ) : null}

      {errorMessage ? (
        <p className="rounded border border-danger/30 bg-danger/5 px-3 py-2 text-[11px] font-semibold text-danger">
          {errorMessage}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => onApply(acceptedList)}
          disabled={blocked || applying}
          className={cn(
            "min-h-[44px] rounded border border-primary bg-primary px-4 text-xs font-bold text-primary-fg transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-[36px]",
          )}
        >
          {applying ? "Application…" : `Appliquer la classification (${acceptedList.length})`}
        </button>
      </div>
    </div>
  )
}

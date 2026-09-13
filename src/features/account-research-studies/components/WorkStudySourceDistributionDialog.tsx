"use client"

// ─── Modale de distribution Source Corpus Work vers Gestion des sources (Lot 3) ──
//
// Permet d'arbitrer les autorités/domaines utilisés par l'étude ChatGPT Work,
// de vérifier les correspondances existantes dans `source_catalog`, de qualifier
// obligatoirement les nouvelles sources (catégorie Kredo, temporalité) et de
// confirmer la création ou mise à jour idempotente du corpus de compte.

import { useEffect, useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { AppDialog } from "@/components/ui/AppDialog"
import { Button } from "@/components/ui/Button"
import { cn } from "@/lib/utils"

import {
  distributeWorkStudySourcesAction,
  prepareWorkSourceDistributionAction,
} from "../actions/study-actions"
import type {
  AccountSourceArbitration,
  AccountSourceCorpusPreparation,
} from "../../source-management/domain/account-source-corpus"
import {
  KREDO_SOURCE_CATEGORY_ORDER,
  type KredoSourceCategory,
  type SourceContentTemporality,
} from "../../source-management/domain/source-management-contracts"

type Step = "summary" | "arbitrate" | "confirm" | "success"

const TEMPORALITY_LABELS: Record<SourceContentTemporality, string> = {
  static: "Statique (rapports, études)",
  periodic: "Périodique (revues, baromètres)",
  continuous: "Continu (actualités, flux)",
}

export interface WorkStudySourceDistributionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  studyId: string
  companyName: string
  isMobile?: boolean
  onSuccess?: (corpusId: string) => void
}

export function WorkStudySourceDistributionDialog({
  open,
  onOpenChange,
  studyId,
  companyName,
  isMobile = false,
  onSuccess,
}: WorkStudySourceDistributionDialogProps) {
  const router = useRouter()
  const [step, setStep] = useState<Step>("summary")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [prep, setPrep] = useState<AccountSourceCorpusPreparation | null>(null)
  const [isPending, startTransition] = useTransition()
  const [createdCorpusId, setCreatedCorpusId] = useState<string | null>(null)

  // État local des arbitrages : clé = domain
  const [decisions, setDecisions] = useState<
    Record<
      string,
      {
        selected: boolean
        kredoCategory?: KredoSourceCategory
        contentTemporality?: SourceContentTemporality
      }
    >
  >({})

  // Sélections groupées pour les nouvelles sources
  const [bulkCategory, setBulkCategory] = useState<KredoSourceCategory | "">("")
  const [bulkTemporality, setBulkTemporality] = useState<SourceContentTemporality | "">("")

  // Chargement de la préparation côté serveur avec vérification d'intégrité
  useEffect(() => {
    if (!open) return
    let active = true

    void prepareWorkSourceDistributionAction(studyId).then((res) => {
      if (!active) return
      setLoading(false)
      if (!res.ok) {
        setError(res.error)
        return
      }
      setPrep(res.value)

      // Initialisation des décisions par défaut : toutes sélectionnées
      const initial: Record<
        string,
        {
          selected: boolean
          kredoCategory?: KredoSourceCategory
          contentTemporality?: SourceContentTemporality
        }
      > = {}

      for (const c of res.value.candidates) {
        initial[c.domain] = {
          selected: true,
          kredoCategory: c.existingCategory ?? undefined,
          contentTemporality: c.existingTemporality ?? undefined,
        }
      }
      setDecisions(initial)
    })

    return () => {
      active = false
    }
  }, [open, studyId])

  // Statistiques dérivées des décisions
  const stats = useMemo(() => {
    if (!prep) return { selected: 0, reused: 0, newSelected: 0, excluded: 0, invalidNew: 0 }
    let selected = 0
    let reused = 0
    let newSelected = 0
    let excluded = 0
    let invalidNew = 0

    for (const c of prep.candidates) {
      const dec = decisions[c.domain]
      if (!dec || !dec.selected) {
        excluded++
        continue
      }
      selected++
      if (c.isNewSource) {
        newSelected++
        if (!dec.kredoCategory || !dec.contentTemporality) {
          invalidNew++
        }
      } else {
        reused++
      }
    }

    return { selected, reused, newSelected, excluded, invalidNew }
  }, [prep, decisions])

  // Application en masse pour les nouvelles sources
  const applyBulkCategory = (cat: KredoSourceCategory) => {
    if (!prep) return
    setDecisions((prev) => {
      const next = { ...prev }
      for (const c of prep.candidates) {
        if (c.isNewSource && next[c.domain]?.selected) {
          next[c.domain] = {
            ...next[c.domain],
            kredoCategory: cat,
          }
        }
      }
      return next
    })
  }

  const applyBulkTemporality = (temp: SourceContentTemporality) => {
    if (!prep) return
    setDecisions((prev) => {
      const next = { ...prev }
      for (const c of prep.candidates) {
        if (c.isNewSource && next[c.domain]?.selected) {
          next[c.domain] = {
            ...next[c.domain],
            contentTemporality: temp,
          }
        }
      }
      return next
    })
  }

  const toggleSelect = (domain: string) => {
    setDecisions((prev) => ({
      ...prev,
      [domain]: {
        ...prev[domain],
        selected: !prev[domain]?.selected,
      },
    }))
  }

  const updateCandidateCategory = (domain: string, cat: KredoSourceCategory) => {
    setDecisions((prev) => ({
      ...prev,
      [domain]: {
        ...prev[domain],
        kredoCategory: cat,
      },
    }))
  }

  const updateCandidateTemporality = (domain: string, temp: SourceContentTemporality) => {
    setDecisions((prev) => ({
      ...prev,
      [domain]: {
        ...prev[domain],
        contentTemporality: temp,
      },
    }))
  }

  // Soumission finale de l'arbitrage
  const handleConfirmDistribution = () => {
    if (!prep) return
    setError(null)

    const arbitrations: AccountSourceArbitration[] = prep.candidates.map((c) => {
      const dec = decisions[c.domain]
      return {
        domain: c.domain,
        selected: Boolean(dec?.selected),
        kredoCategory: dec?.kredoCategory,
        contentTemporality: dec?.contentTemporality,
      }
    })

    startTransition(async () => {
      const res = await distributeWorkStudySourcesAction({
        studyId: prep.studyId,
        arbitrations,
        reason: `Distribution des sources de l'étude Work pour ${prep.companyName}`,
      })

      if (!res.ok) {
        setError(res.error)
        return
      }

      setCreatedCorpusId(res.value.corpusId)
      setStep("success")
      if (res.value.corpusId) {
        onSuccess?.(res.value.corpusId)
      }
      router.refresh()
    })
  }

  const canProceedFromArbitration = stats.selected > 0 && stats.invalidNew === 0

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      dataTheme="edito-bright-cockpit"
      title={
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-edito-muted">
            Gestion des sources — {companyName}
          </p>
          <h2 className="mt-0.5 font-heading text-base font-bold text-edito-navy">
            {step === "summary" && "Distribution des sources de l'étude"}
            {step === "arbitrate" && "Arbitrage des autorités et qualification"}
            {step === "confirm" && "Confirmer l'ajout à la bibliothèque"}
            {step === "success" && "Sources ajoutées à la bibliothèque"}
          </h2>
        </div>
      }
      className={cn(
        "bg-edito-surface",
        isMobile ? "!w-[calc(100vw-1rem)]" : "sm:!max-w-3xl",
      )}
      maxHeightClassName="max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-4rem)]"
    >
      <div className="space-y-4 pb-2">
        {error ? (
          <p role="alert" className="rounded border border-danger/40 bg-danger/10 px-3.5 py-2.5 text-xs font-medium text-danger">
            {error}
          </p>
        ) : null}

        {loading ? (
          <div className="py-8 text-center space-y-3" aria-live="polite">
            <p className="text-sm font-semibold text-edito-heading">
              Analyse du Source Corpus et comparaison avec le catalogue…
            </p>
            <div className="mx-auto h-1.5 w-48 overflow-hidden rounded bg-edito-chip">
              <div className="h-full w-full animate-pulse bg-edito-navy" />
            </div>
            <p className="text-xs text-edito-muted">
              Vérification du SHA-256 de l&apos;original et dédoublonnage par domaine.
            </p>
          </div>
        ) : !prep ? (
          <p className="text-xs text-edito-muted">Impossible de charger le corpus de l&apos;étude.</p>
        ) : (
          <>
            {/* ── ÉTAPE 1 : RÉSUMÉ & CHIFFRES CLÉS ────────────────────── */}
            {step === "summary" && (
              <div className="space-y-4">
                <div className="rounded-lg border border-edito-border bg-edito-canvas/60 p-4">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded bg-edito-surface p-3 border border-edito-border">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-edito-muted">Autorités</p>
                      <p className="mt-1 font-heading text-lg font-bold text-edito-navy">{prep.totalAuthorities}</p>
                      <p className="text-[10px] text-edito-muted">Domaines uniques</p>
                    </div>
                    <div className="rounded bg-edito-surface p-3 border border-edito-border">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-edito-muted">Documents</p>
                      <p className="mt-1 font-heading text-lg font-bold text-edito-navy">{prep.totalDocuments}</p>
                      <p className="text-[10px] text-edito-muted">Conservés en provenance</p>
                    </div>
                    <div className="rounded bg-edito-surface p-3 border border-edito-border">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-edito-muted">Déjà dans Kredo</p>
                      <p className="mt-1 font-heading text-lg font-bold text-emerald-700">{prep.existingCount}</p>
                      <p className="text-[10px] text-edito-muted">Réutilisées sans doublon</p>
                    </div>
                    <div className="rounded bg-edito-surface p-3 border border-edito-border">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-edito-muted">Nouvelles</p>
                      <p className="mt-1 font-heading text-lg font-bold text-brand-brass">{prep.newCount}</p>
                      <p className="text-[10px] text-edito-muted">À qualifier</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-edito-border bg-edito-surface p-3.5 text-xs text-edito-body space-y-2">
                  <p className="font-semibold text-edito-heading">
                    Principe de distribution contrôlée :
                  </p>
                  <ul className="list-disc pl-4 space-y-1 text-edito-muted">
                    <li>
                      <strong>1 autorité / domaine = 1 source catalogue</strong> : les {prep.totalDocuments} URL ne créent pas {prep.totalDocuments} sources distinctes.
                    </li>
                    <li>
                      <strong>Préservation du catalogue</strong> : les sources déjà enregistrées conservent leur configuration (RSS, temporalité, catégorie) et reçoivent l&apos;usage d&apos;étude.
                    </li>
                    <li>
                      <strong>Zéro veille non sollicitée</strong> : le corpus est créé en brouillon, sans déclenchement d&apos;actualités, de digests ni de crons.
                    </li>
                  </ul>
                </div>

                {prep.isAlreadyDistributed ? (
                  <div className="rounded border border-brand-brass/40 bg-brand-brass/10 p-3 text-xs text-brand-brass">
                    ℹ️ Cette étude a déjà un corpus de compte associé. Une nouvelle distribution mettra à jour ce corpus sans duplication.
                  </div>
                ) : null}

                <div className="flex justify-end pt-2">
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => setStep("arbitrate")}
                    className="cursor-pointer"
                  >
                    Examiner et qualifier les sources →
                  </Button>
                </div>
              </div>
            )}

            {/* ── ÉTAPE 2 : ARBITRAGE & QUALIFICATION ──────────────────── */}
            {step === "arbitrate" && (
              <div className="space-y-4">
                {/* Actions groupées pour les nouvelles sources */}
                {prep.newCount > 0 ? (
                  <div className="rounded-lg border border-edito-border bg-edito-canvas p-3 text-xs space-y-2.5">
                    <p className="font-bold text-edito-navy uppercase tracking-wider text-[10px]">
                      Qualification rapide des {prep.newCount} nouvelles sources :
                    </p>
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      <div className="flex items-center gap-2">
                        <select
                          value={bulkCategory}
                          onChange={(e) => {
                            const val = e.target.value as KredoSourceCategory
                            setBulkCategory(val)
                            if (val) applyBulkCategory(val)
                          }}
                          className="w-full rounded border border-edito-border bg-edito-surface px-2.5 py-1.5 text-xs text-edito-heading focus:border-edito-navy focus:outline-none"
                        >
                          <option value="">Catégorie par défaut pour les nouvelles…</option>
                          {KREDO_SOURCE_CATEGORY_ORDER.map((cat: KredoSourceCategory) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-2">
                        <select
                          value={bulkTemporality}
                          onChange={(e) => {
                            const val = e.target.value as SourceContentTemporality
                            setBulkTemporality(val)
                            if (val) applyBulkTemporality(val)
                          }}
                          className="w-full rounded border border-edito-border bg-edito-surface px-2.5 py-1.5 text-xs text-edito-heading focus:border-edito-navy focus:outline-none"
                        >
                          <option value="">Temporalité par défaut pour les nouvelles…</option>
                          <option value="static">{TEMPORALITY_LABELS.static}</option>
                          <option value="periodic">{TEMPORALITY_LABELS.periodic}</option>
                          <option value="continuous">{TEMPORALITY_LABELS.continuous}</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* Liste des autorités candidates */}
                <div className="space-y-2 max-h-[46vh] overflow-y-auto pr-1">
                  {prep.candidates.map((c) => {
                    const dec = decisions[c.domain] ?? { selected: true }
                    const isSelected = dec.selected
                    const needsQualification = c.isNewSource && isSelected && (!dec.kredoCategory || !dec.contentTemporality)

                    return (
                      <div
                        key={c.domain}
                        className={cn(
                          "rounded-xl border p-3 transition-colors",
                          isSelected
                            ? "border-edito-border bg-edito-surface"
                            : "border-edito-border/50 bg-edito-canvas/40 opacity-60",
                          needsQualification && "border-danger/40 bg-danger/[0.02]",
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <label className="flex items-start gap-3 min-w-0 flex-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelect(c.domain)}
                              className="mt-1 size-4 rounded border-edito-border text-edito-navy focus:ring-edito-navy cursor-pointer"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <p className="font-semibold text-xs text-edito-heading truncate">
                                  {c.name}
                                </p>
                                <span className="font-mono text-[11px] text-edito-muted">
                                  ({c.domain})
                                </span>
                                {c.isNewSource ? (
                                  <span className="rounded bg-brand-brass/15 px-1.5 py-0.2 text-[9px] font-bold text-brand-brass">
                                    Nouvelle source
                                  </span>
                                ) : (
                                  <span className="rounded bg-emerald-100 px-1.5 py-0.2 text-[9px] font-bold text-emerald-800">
                                    ✓ Déjà dans Kredo
                                  </span>
                                )}
                                <span className="rounded bg-edito-chip px-1.5 py-0.2 text-[9px] text-edito-body font-medium">
                                  {c.documentsCount} doc{c.documentsCount > 1 ? "s" : ""}
                                </span>
                              </div>

                              {c.publisher ? (
                                <p className="text-[11px] text-edito-muted mt-0.5">
                                  Éditeur : {c.publisher}
                                </p>
                              ) : null}
                            </div>
                          </label>
                        </div>

                        {/* Zone de qualification opérationnelle */}
                        {isSelected ? (
                          <div className="mt-2.5 pt-2.5 border-t border-edito-border/60">
                            {c.isNewSource ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                <div>
                                  <label className="block text-[10px] font-bold uppercase text-edito-muted mb-1">
                                    Catégorie Kredo <span className="text-danger">*</span>
                                  </label>
                                  <select
                                    value={dec.kredoCategory ?? ""}
                                    onChange={(e) => updateCandidateCategory(c.domain, e.target.value as KredoSourceCategory)}
                                    className={cn(
                                      "w-full rounded border px-2 py-1 text-xs text-edito-heading focus:outline-none",
                                      !dec.kredoCategory
                                        ? "border-danger/60 bg-danger/5"
                                        : "border-edito-border bg-edito-canvas",
                                    )}
                                  >
                                    <option value="">Sélectionner une catégorie…</option>
                                    {KREDO_SOURCE_CATEGORY_ORDER.map((cat: KredoSourceCategory) => (
                                      <option key={cat} value={cat}>
                                        {cat}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div>
                                  <label className="block text-[10px] font-bold uppercase text-edito-muted mb-1">
                                    Temporalité <span className="text-danger">*</span>
                                  </label>
                                  <select
                                    value={dec.contentTemporality ?? ""}
                                    onChange={(e) => updateCandidateTemporality(c.domain, e.target.value as SourceContentTemporality)}
                                    className={cn(
                                      "w-full rounded border px-2 py-1 text-xs text-edito-heading focus:outline-none",
                                      !dec.contentTemporality
                                        ? "border-danger/60 bg-danger/5"
                                        : "border-edito-border bg-edito-canvas",
                                    )}
                                  >
                                    <option value="">Sélectionner une temporalité…</option>
                                    <option value="static">Statique (rapports, études)</option>
                                    <option value="periodic">Périodique (revues, baromètres)</option>
                                    <option value="continuous">Continu (actualités, flux)</option>
                                  </select>
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-wrap items-center gap-2 text-[11px] text-edito-muted">
                                <span>Catégorie : <strong>{c.existingCategory ?? "Non renseignée"}</strong></span>
                                <span>·</span>
                                <span>Temporalité : <strong>{c.existingTemporality ?? "Non renseignée"}</strong></span>
                                <span>·</span>
                                <span className="text-emerald-700 italic">Configuration canonique conservée</span>
                              </div>
                            )}
                          </div>
                        ) : null}
                      </div>
                    )
                  })}
                </div>

                {/* Barre de résumé de l'arbitrage et navigation */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-edito-border pt-3">
                  <div className="text-xs text-edito-body space-y-0.5">
                    <p>
                      <strong>{stats.selected}</strong> source{stats.selected > 1 ? "s" : ""} sélectionnée{stats.selected > 1 ? "s" : ""} ({stats.reused} existante{stats.reused > 1 ? "s" : ""}, {stats.newSelected} nouvelle{stats.newSelected > 1 ? "s" : ""})
                      {stats.excluded > 0 ? ` · ${stats.excluded} exclue${stats.excluded > 1 ? "s" : ""}` : ""}
                    </p>
                    {stats.invalidNew > 0 ? (
                      <p className="text-danger text-[11px] font-semibold">
                        ⚠️ {stats.invalidNew} nouvelle{stats.invalidNew > 1 ? "s" : ""} source{stats.invalidNew > 1 ? "s" : ""} doiv{stats.invalidNew > 1 ? "ent" : "t"} être qualifiée{stats.invalidNew > 1 ? "s" : ""} (catégorie et temporalité).
                      </p>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setStep("summary")}
                      className="cursor-pointer"
                    >
                      ← Retour
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={!canProceedFromArbitration}
                      onClick={() => setStep("confirm")}
                      className="cursor-pointer"
                    >
                      Continuer vers la confirmation →
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* ── ÉTAPE 3 : CONFIRMATION ──────────────────────────────── */}
            {step === "confirm" && (
              <div className="space-y-4">
                <div className="rounded-lg border border-edito-border bg-edito-canvas p-4 space-y-3 text-xs">
                  <h3 className="font-heading text-sm font-bold text-edito-navy">
                    Récapitulatif de l&apos;ajout
                  </h3>
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                    <div className="rounded bg-edito-surface p-2.5 border border-edito-border">
                      <p className="text-[10px] uppercase font-bold text-edito-muted">Sources réutilisées</p>
                      <p className="text-base font-bold text-emerald-700 mt-0.5">{stats.reused}</p>
                      <p className="text-[10px] text-edito-muted">Catalogue non modifié, usage étendu</p>
                    </div>
                    <div className="rounded bg-edito-surface p-2.5 border border-edito-border">
                      <p className="text-[10px] uppercase font-bold text-edito-muted">Nouvelles sources</p>
                      <p className="text-base font-bold text-brand-brass mt-0.5">{stats.newSelected}</p>
                      <p className="text-[10px] text-edito-muted">Qualifiées et ajoutées au catalogue</p>
                    </div>
                    <div className="rounded bg-edito-surface p-2.5 border border-edito-border">
                      <p className="text-[10px] uppercase font-bold text-edito-muted">Sources exclues</p>
                      <p className="text-base font-bold text-edito-muted mt-0.5">{stats.excluded}</p>
                      <p className="text-[10px] text-edito-muted">Non injectées dans le corpus</p>
                    </div>
                  </div>

                  <div className="rounded bg-edito-surface p-3 border border-edito-border text-[11px] space-y-1 text-edito-body">
                    <p>
                      <strong>Corpus de compte rattaché :</strong> {prep.studyTitle}
                    </p>
                    <p>
                      <strong>Statut du corpus :</strong> Brouillon (draft) · aucune activation automatique de veille ni de cron
                    </p>
                    <p>
                      <strong>Provenance conservée :</strong> les {prep.totalDocuments} URL d&apos;origine restent archivées dans Storage
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={isPending}
                    onClick={() => setStep("arbitrate")}
                    className="cursor-pointer"
                  >
                    ← Modifier l&apos;arbitrage
                  </Button>
                  <Button
                    variant="brass"
                    size="md"
                    loading={isPending}
                    onClick={handleConfirmDistribution}
                    className="cursor-pointer"
                  >
                    {isPending ? "Distribution en cours…" : "Ajouter à la bibliothèque"}
                  </Button>
                </div>
              </div>
            )}

            {/* ── ÉTAPE 4 : SUCCÈS ───────────────────────────────────── */}
            {step === "success" && (
              <div className="space-y-4 py-4 text-center">
                <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-xl font-bold">
                  ✓
                </div>
                <div className="space-y-1">
                  <h3 className="font-heading text-base font-bold text-edito-navy">
                    Corpus de compte enregistré avec succès !
                  </h3>
                  <p className="text-xs text-edito-muted max-w-md mx-auto">
                    {stats.selected} sources ont été distribuées vers la bibliothèque « Gestion des sources ».
                    Le corpus est disponible sous le périmètre compte de {prep.companyName}.
                  </p>
                  {createdCorpusId ? (
                    <p className="font-mono text-[10px] text-edito-muted">
                      ID du corpus : {createdCorpusId}
                    </p>
                  ) : null}
                </div>

                <div className="flex justify-center gap-3 pt-2">
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => {
                      onOpenChange(false)
                    }}
                    className="cursor-pointer"
                  >
                    Fermer
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppDialog>
  )
}

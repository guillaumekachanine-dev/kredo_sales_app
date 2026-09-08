"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { MatchingProfileSummary } from "../data/profile-matching.types"
import { TIER_LABELS, TIER_TONES } from "@/components/staffing/matching/matching-ui-utils"
import { runOpportunityMatching } from "@/lib/staffing-matching/actions"
import { cn } from "@/lib/utils"

interface ProfileMatchingDetailProps {
  profile: MatchingProfileSummary | null
  openOpportunityCount: number
  evaluatedOpportunityCount: number
}

function formatDate(iso: string | null): string {
  if (!iso) return "Non précisé"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  })
}

export function ProfileMatchingDetail({
  profile,
  openOpportunityCount,
  evaluatedOpportunityCount,
}: ProfileMatchingDetailProps) {
  let router: ReturnType<typeof useRouter> | null = null
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    router = useRouter()
  } catch {
    // Non-router context (e.g. static tests)
  }
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [recalcFeedback, setRecalcFeedback] = useState<{
    oppId: string
    ok: boolean
    message: string
  } | null>(null)

  if (!profile) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center text-sm text-white/40">
        Sélectionnez un collaborateur ou un candidat pour visualiser ses opportunités compatibles.
      </div>
    )
  }

  // Si aucun match n'est explicitement sélectionné, on sélectionne par défaut le premier
  const activeMatch =
    profile.matches.find((m) => m.opportunityId === selectedMatchId) ??
    profile.matches[0] ??
    null

  const handleRerunMatching = (opportunityId: string) => {
    setRecalcFeedback(null)
    startTransition(async () => {
      const res = await runOpportunityMatching(opportunityId)
      if (res.ok) {
        setRecalcFeedback({
          oppId: opportunityId,
          ok: true,
          message: `Matching recalculé (${res.persistedCount} profils évalués).`,
        })
        router?.refresh()
      } else {
        setRecalcFeedback({
          oppId: opportunityId,
          ok: false,
          message: res.error || "Échec du recalcul du besoin.",
        })
      }
    })
  }

  const { coverage } = profile

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto bg-transparent p-5 space-y-5">
      {/* En-tête profil */}
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-heading text-lg font-bold text-white">
                {profile.fullName}
              </h2>
              <span
                className={cn(
                  "rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                  profile.sourceType === "collaborator"
                    ? "bg-sky-500/15 text-sky-300 border border-sky-500/20"
                    : "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20",
                )}
              >
                {profile.sourceType === "collaborator" ? "Collaborateur" : "Candidat"}
              </span>
            </div>

            <p className="mt-0.5 text-xs text-white/70">
              {profile.currentTitle || "Titre non renseigné"}
              {profile.practiceLabel ? ` · ${profile.practiceLabel}` : ""}
            </p>

            {profile.availabilityLabel ? (
              <p className="mt-1 text-[11px] text-white/50">
                Disponibilité : <span className="text-white/80 font-medium">{profile.availabilityLabel}</span>
              </p>
            ) : null}
          </div>

          {/* Cartouche Couverture */}
          <div className="rounded-lg border border-white/10 bg-[#0f122c] px-3 py-2 text-right">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-white/40">
              Couverture matching
            </p>
            <p className="mt-0.5 font-heading text-sm font-bold tabular-nums text-white">
              {coverage.scoredOpportunityCountForProfile}{" "}
              <span className="text-xs font-normal text-white/60">besoin(s) compatible(s)</span>
            </p>
            <p className="mt-0.5 text-[10px] tabular-nums text-brand-brass">
              {coverage.evaluatedOpportunityCount} / {coverage.openOpportunityCount} besoins ouverts évalués
            </p>
          </div>
        </div>
      </div>

      {/* Cas 1 : Aucun besoin ouvert dans le workspace */}
      {openOpportunityCount === 0 ? (
        <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-8 text-center">
          <p className="text-sm font-semibold text-white">Aucun besoin commercial ouvert</p>
          <p className="mt-1 text-xs text-white/50">
            Toutes les opportunités actuelles sont en phase terminale ou archivées.
          </p>
        </div>
      ) : profile.matches.length === 0 ? (
        /* Cas 2 : Besoins ouverts mais aucun score pour ce profil */
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-8 text-center space-y-2">
          <p className="text-sm font-semibold text-white">
            Aucun résultat de matching disponible pour ce profil
          </p>
          <p className="max-w-md mx-auto text-xs text-white/60 leading-relaxed">
            Une partie des besoins ouverts n’a peut-être pas encore été évaluée ({evaluatedOpportunityCount} évalués sur {openOpportunityCount} besoins ouverts).
            L’absence de score ne signifie pas que le profil est incompatible.
          </p>
        </div>
      ) : (
        /* Cas 3 : Liste des besoins compatibles et détail du besoin actif */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Liste des besoins compatibles (gauche ou 5 cols) */}
          <div className="lg:col-span-5 space-y-2.5">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-white/50">
              Besoins compatibles ({profile.matches.length})
            </h3>

            <div className="space-y-2">
              {profile.matches.map((match) => {
                const isMatchSelected = activeMatch?.opportunityId === match.opportunityId
                const tone = TIER_TONES[match.tier]
                const tierLabel = TIER_LABELS[match.tier]

                return (
                  <button
                    key={match.opportunityId}
                    type="button"
                    onClick={() => {
                      setSelectedMatchId(match.opportunityId)
                      setRecalcFeedback(null)
                    }}
                    className={cn(
                      "w-full rounded-xl border p-3.5 text-left transition-all",
                      isMatchSelected
                        ? "border-brand-brass bg-brand-brass/10 ring-1 ring-brand-brass/40 shadow-lg shadow-black/20"
                        : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-heading text-lg font-bold tabular-nums text-white">
                        {Math.round(match.overallScore)}
                        <span className="text-xs font-normal text-white/40">/100</span>
                      </span>

                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                          tone === "success" && "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
                          tone === "info" && "bg-sky-500/20 text-sky-300 border border-sky-500/30",
                          tone === "warning" && "bg-amber-500/20 text-amber-300 border border-amber-500/30",
                          tone === "neutral" && "bg-white/10 text-white/70 border border-white/15",
                        )}
                      >
                        {tierLabel}
                      </span>
                    </div>

                    <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-white/40 truncate">
                      {match.clientName ?? "Client non spécifié"}
                    </p>

                    <p className="mt-0.5 text-xs font-semibold text-white line-clamp-1">
                      {match.opportunityTitle}
                    </p>

                    <div className="mt-2.5 flex items-center justify-between gap-2 text-[10px] text-white/50 border-t border-white/5 pt-2">
                      <span className="truncate">{match.stageLabel}</span>
                      {match.targetDailyRate ? (
                        <span className="shrink-0 font-medium tabular-nums text-white/70">
                          {match.targetDailyRate} €/j
                        </span>
                      ) : null}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Volet détail du match actif (droite ou 7 cols) */}
          {activeMatch ? (
            <div className="lg:col-span-7 rounded-xl border border-white/10 bg-white/[0.03] p-4.5 space-y-4">
              {/* En-tête besoin */}
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-4">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-brand-brass">
                    {activeMatch.clientName ?? "Client confidentiel"}
                  </p>
                  <h4 className="mt-0.5 font-heading text-base font-bold text-white">
                    {activeMatch.opportunityTitle}
                  </h4>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white/60">
                    <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-white/80">
                      {activeMatch.stageLabel}
                    </span>
                    {activeMatch.startDate ? (
                      <span>Démarrage : {formatDate(activeMatch.startDate)}</span>
                    ) : null}
                    {activeMatch.targetDailyRate ? (
                      <span>· TJM cible : {activeMatch.targetDailyRate} €/j</span>
                    ) : null}
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-heading text-2xl font-bold tabular-nums text-white">
                    {Math.round(activeMatch.overallScore)}
                    <span className="text-sm font-normal text-white/40">/100</span>
                  </span>
                  <p className="text-[10px] text-white/40">
                    {activeMatch.confidence !== null ? `Confiance ${activeMatch.confidence} %` : "Score calculé"}
                  </p>
                </div>
              </div>

              {/* Actions sur le besoin */}
              <div className="flex flex-wrap items-center gap-2.5">
                <Link
                  href={`/missions/opps/${activeMatch.opportunityId}`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-brass px-3.5 py-1.5 text-xs font-semibold text-slate-950 transition-colors hover:bg-brand-brass/90"
                >
                  Ouvrir le besoin
                  <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                </Link>

                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleRerunMatching(activeMatch.opportunityId)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/[0.08] hover:border-white/25",
                    isPending && "opacity-50 cursor-not-allowed",
                  )}
                >
                  <svg className={cn("size-3.5", isPending && "animate-spin")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                  {isPending ? "Recalcul en cours…" : "Relancer le matching de ce besoin"}
                </button>
              </div>

              {/* Feedback recalcul */}
              {recalcFeedback && recalcFeedback.oppId === activeMatch.opportunityId ? (
                <div
                  className={cn(
                    "rounded-lg p-2.5 text-xs font-medium",
                    recalcFeedback.ok
                      ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                      : "bg-rose-500/15 text-rose-300 border border-rose-500/30",
                  )}
                >
                  {recalcFeedback.message}
                </div>
              ) : null}

              {/* Points forts */}
              {activeMatch.pros.length > 0 ? (
                <div className="space-y-1.5 border-t border-white/10 pt-3">
                  <h5 className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                    Points forts & alignements
                  </h5>
                  <ul className="space-y-1">
                    {activeMatch.pros.map((pro) => (
                      <li key={pro} className="flex items-start gap-2 text-xs text-white/80">
                        <svg className="mt-0.5 size-3.5 shrink-0 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                        <span>{pro}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {/* Points à valider */}
              {activeMatch.cons.length > 0 ? (
                <div className="space-y-1.5 border-t border-white/10 pt-3">
                  <h5 className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                    Points d’attention / à valider
                  </h5>
                  <ul className="space-y-1">
                    {activeMatch.cons.map((con) => (
                      <li key={con} className="flex items-start gap-2 text-xs text-white/80">
                        <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-amber-400" />
                        <span>{con}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {/* Données manquantes */}
              {activeMatch.missingData.length > 0 ? (
                <div className="space-y-1.5 border-t border-white/10 pt-3">
                  <h5 className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                    Données manquantes / non évaluées
                  </h5>
                  <p className="text-xs text-white/60">
                    {activeMatch.missingData.join(" · ")}
                  </p>
                </div>
              ) : null}

              {/* Critères C1-C6 détaillés */}
              <div className="space-y-2.5 border-t border-white/10 pt-3">
                <h5 className="text-[10px] font-bold uppercase tracking-wider text-white/50">
                  Critères détaillés (moteur déterministe)
                </h5>

                <div className="space-y-2">
                  {activeMatch.components.length === 0 ? (
                    <p className="text-xs text-white/40 italic">
                      Détail par composante non disponible pour ce score (modèle antérieur ou synthétique).
                    </p>
                  ) : (
                    activeMatch.components.map((c) => {
                      const score = Math.max(0, Math.min(100, c.normalizedScore))
                      return (
                        <div
                          key={c.componentKey}
                          className="rounded-lg border border-white/5 bg-white/[0.02] p-2.5 text-xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-white/90">
                              {c.componentLabel}
                            </span>
                            <span className="font-medium tabular-nums text-white">
                              {c.applicable ? `${Math.round(score)}/100` : "Non évaluable"}
                            </span>
                          </div>

                          {/* Barre de score */}
                          <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all duration-300",
                                !c.applicable
                                  ? "bg-white/20"
                                  : score >= 80
                                    ? "bg-emerald-400"
                                    : score >= 60
                                      ? "bg-sky-400"
                                      : score >= 40
                                        ? "bg-amber-400"
                                        : "bg-rose-400",
                              )}
                              style={{ width: `${c.applicable ? score : 100}%` }}
                            />
                          </div>

                          {c.explanation ? (
                            <p className="text-[11px] text-white/60 leading-snug">
                              {c.explanation}
                            </p>
                          ) : null}
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              {/* Traçabilité / Fraîcheur */}
              <div className="border-t border-white/10 pt-3 text-[10px] text-white/40 flex items-center justify-between">
                <span>
                  {activeMatch.computedAt
                    ? `Calculé le ${formatDate(activeMatch.computedAt)}`
                    : "Date de calcul non enregistrée"}
                </span>
                <span>
                  {activeMatch.modelVersion ? `Modèle ${activeMatch.modelVersion}` : "Moteur unique"}
                </span>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}

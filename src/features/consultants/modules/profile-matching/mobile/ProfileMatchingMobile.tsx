"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import type {
  ProfileMatchingViewModel,
  ProfileOpportunityMatch,
} from "../data/profile-matching.types"
import { ProfileMatchingMobileDrawer } from "./ProfileMatchingMobileDrawer"
import { TIER_LABELS, TIER_TONES } from "@/components/staffing/matching/matching-ui-utils"
import { cn } from "@/lib/utils"

interface ProfileMatchingMobileProps {
  vm: ProfileMatchingViewModel
  selectedPersonId?: string | null
  backHref: string
}

function formatDate(iso: string | null): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  })
}

export function ProfileMatchingMobile({
  vm,
  selectedPersonId,
  backHref,
}: ProfileMatchingMobileProps) {
  const [showAll, setShowAll] = useState(false)
  const [selectedMatch, setSelectedMatch] = useState<ProfileOpportunityMatch | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Résolution du profil sélectionné
  const profile = useMemo(() => {
    if (selectedPersonId) {
      const found = vm.profiles.find((p) => p.personId === selectedPersonId)
      if (found) return found
    }
    return vm.profiles[0] ?? null
  }, [vm.profiles, selectedPersonId])

  if (!profile) {
    return (
      <div className="flex flex-col gap-4 p-4 pb-24">
        <Link
          href={backHref}
          className="inline-flex min-h-[44px] items-center gap-1.5 text-xs font-semibold text-primary"
        >
          <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Retour aux consultants
        </Link>
        <div className="rounded-xl border border-dashed border-border bg-surface p-8 text-center text-xs text-muted">
          Aucun profil disponible pour le matching.
        </div>
      </div>
    )
  }

  const matches = profile.matches
  const INITIAL_VISIBLE_COUNT = 4
  const visibleMatches = showAll ? matches : matches.slice(0, INITIAL_VISIBLE_COUNT)
  const hasMore = matches.length > INITIAL_VISIBLE_COUNT && !showAll
  const remainingCount = matches.length - INITIAL_VISIBLE_COUNT
  const { coverage } = profile

  const handleOpenMatch = (match: ProfileOpportunityMatch) => {
    setSelectedMatch(match)
    setDrawerOpen(true)
  }

  return (
    <div className="flex flex-col gap-4 p-4 pb-24">
      {/* Bouton retour */}
      <div>
        <Link
          href={backHref}
          className="inline-flex min-h-[44px] items-center gap-1.5 text-xs font-semibold text-primary transition-colors hover:text-primary-hover"
        >
          <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Retour
        </Link>
      </div>

      {/* En-tête profil */}
      <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
              Matching profil
            </span>
            <h1 className="mt-0.5 truncate font-heading text-xl font-bold text-heading">
              {profile.fullName}
            </h1>
            <p className="mt-0.5 truncate text-xs text-body">
              {profile.currentTitle || "Profil"}
              {profile.practiceLabel ? ` · ${profile.practiceLabel}` : ""}
            </p>
          </div>

          <span
            className={cn(
              "shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
              profile.sourceType === "collaborator"
                ? "bg-primary/10 text-primary"
                : "bg-success/15 text-success",
            )}
          >
            {profile.sourceType === "collaborator" ? "Collab" : "Candidat"}
          </span>
        </div>

        {/* Bannière couverture */}
        <div className="mt-3.5 flex items-center justify-between gap-2 rounded-lg border border-border/80 bg-canvas px-3 py-2 text-xs">
          <span className="font-semibold text-heading">
            {matches.length} besoin{matches.length > 1 ? "s" : ""} compatible{matches.length > 1 ? "s" : ""}
          </span>
          <span className="text-[11px] text-muted tabular-nums">
            {coverage.evaluatedOpportunityCount}/{coverage.openOpportunityCount} évalués
          </span>
        </div>
      </div>

      {/* Liste des cartes de matching */}
      {vm.openOpportunityCount === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface p-6 text-center text-xs text-muted">
          Aucun besoin ouvert actuellement.
        </div>
      ) : matches.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-6 text-center space-y-1.5">
          <p className="text-sm font-semibold text-heading">
            Aucun résultat de matching disponible pour ce profil
          </p>
          <p className="text-xs text-muted">
            Une partie des besoins ouverts n’a peut-être pas encore été évaluée ({coverage.evaluatedOpportunityCount} sur {coverage.openOpportunityCount}).
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted px-1">
            Besoins compatibles classés par score
          </h2>

          <div className="space-y-2.5">
            {visibleMatches.map((match) => {
              const tierLabel = TIER_LABELS[match.tier]
              const tone = TIER_TONES[match.tier]

              return (
                <button
                  key={match.opportunityId}
                  type="button"
                  onClick={() => handleOpenMatch(match)}
                  className="w-full min-h-[44px] rounded-xl border border-border bg-surface p-3.5 text-left transition-colors hover:bg-surface-hover active:bg-surface-hover shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted truncate">
                        {match.clientName ?? "Client confidentiel"}
                      </p>
                      <h3 className="mt-0.5 text-sm font-bold text-heading line-clamp-1">
                        {match.opportunityTitle}
                      </h3>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-heading text-lg font-bold tabular-nums text-heading">
                        {Math.round(match.overallScore)}
                        <span className="text-xs font-normal text-muted">/100</span>
                      </span>
                    </div>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-border/60 pt-2 text-[11px] text-muted">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        tone === "success" && "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30",
                        tone === "info" && "bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30",
                        tone === "warning" && "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30",
                        tone === "neutral" && "bg-muted/15 text-muted border border-border",
                      )}
                    >
                      {tierLabel}
                    </span>

                    <span className="truncate">
                      {match.stageLabel}
                      {match.startDate ? ` · Dém. ${formatDate(match.startDate)}` : ""}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Bouton pour afficher la suite */}
          {hasMore ? (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="flex min-h-[44px] w-full items-center justify-center rounded-xl border border-border bg-surface px-4 text-xs font-semibold text-body transition-colors hover:bg-surface-hover"
            >
              Afficher les autres besoins ({remainingCount} restant{remainingCount > 1 ? "s" : ""})
            </button>
          ) : null}
        </div>
      )}

      {/* Drawer mobile de détail */}
      <ProfileMatchingMobileDrawer
        match={selectedMatch}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </div>
  )
}

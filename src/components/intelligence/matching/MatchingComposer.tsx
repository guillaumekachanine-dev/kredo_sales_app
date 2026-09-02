"use client"

import { useEffect, useState } from "react"
import { fetchMatchableOpportunities } from "@/lib/staffing-matching/matchable-opportunities-client-queries"
import {
  filterMatchableOpportunities,
  type MatchableOpportunity,
} from "@/lib/staffing-matching/matchable-opportunities"
import { useOpportunityMatching } from "@/lib/staffing-matching/use-opportunity-matching"
import { MatchingResultsDesktop } from "@/components/staffing/matching/MatchingResultsDesktop"
import { MatchingResultsMobile } from "@/components/staffing/matching/MatchingResultsMobile"
import { profileSourceKey } from "@/components/staffing/matching/matching-ui-utils"
import { CockpitBrightHeader, CockpitBrightSection } from "../CockpitBrightSection"

/**
 * Point d'entrée « Matcher les profils » du Cockpit Intelligence.
 *
 * Le moteur canonique (`runOpportunityMatching`) exige un besoin ; en mode Page
 * le panneau n'en a aucun. Ce composeur ajoute la seule chose qui manquait — le
 * choix du besoin — puis délègue tout le reste à l'orchestration partagée
 * (`useOpportunityMatching`) et aux vues de résultats existantes. Aucun second
 * moteur de matching : c'est l'invariant §6 du programme.
 */
export function MatchingComposer({
  variant,
  onBack,
}: {
  variant: "mobile" | "desktop"
  onBack: () => void
}) {
  const [selected, setSelected] = useState<MatchableOpportunity | null>(null)

  if (selected) {
    return (
      <MatchingRun
        key={selected.id}
        opportunity={selected}
        variant={variant}
        onBack={() => setSelected(null)}
      />
    )
  }

  return (
    <CockpitBrightSection>
      <CockpitBrightHeader
        title="Matcher les profils"
        kicker={["Moteur", "déterministe"]}
        onBack={onBack}
      />
      <OpportunityPicker onSelect={setSelected} />
    </CockpitBrightSection>
  )
}

function OpportunityPicker({ onSelect }: { onSelect: (opportunity: MatchableOpportunity) => void }) {
  const [opportunities, setOpportunities] = useState<MatchableOpportunity[] | null>(null)
  const [query, setQuery] = useState("")

  useEffect(() => {
    let cancelled = false
    void fetchMatchableOpportunities().then((rows) => {
      if (!cancelled) setOpportunities(rows)
    })
    return () => { cancelled = true }
  }, [])

  if (opportunities === null) {
    return (
      <div className="flex items-center gap-3 border-b border-edito-border px-5 py-6 text-xs font-semibold text-edito-muted animate-pulse">
        <span className="size-4 animate-spin rounded-full border-2 border-brand-primary border-t-transparent" />
        <span>Chargement des besoins…</span>
      </div>
    )
  }

  if (opportunities.length === 0) {
    return (
      <p className="px-5 py-8 text-xs leading-relaxed text-edito-muted">
        Aucun besoin ouvert à matcher. Les besoins gagnés, perdus ou abandonnés sont exclus.
      </p>
    )
  }

  const filtered = filterMatchableOpportunities(opportunities, query)

  return (
    <div className="space-y-3 px-5 py-5">
      <p className="text-[11px] leading-relaxed text-edito-muted">
        Choisir le besoin à pourvoir. Le matching classe candidats et collaborateurs disponibles
        sur les compétences, la séniorité, le TJM, la disponibilité et la practice.
      </p>

      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Rechercher un besoin ou un client"
        aria-label="Rechercher un besoin"
        className="min-h-11 w-full rounded-[var(--radius-medium)] border border-edito-border bg-edito-surface px-3 text-sm text-edito-body placeholder:text-edito-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
      />

      {filtered.length === 0 ? (
        <p className="py-4 text-xs text-edito-muted">Aucun besoin ne correspond à cette recherche.</p>
      ) : (
        <ul className="divide-y divide-edito-border">
          {filtered.map((opportunity) => (
            <li key={opportunity.id}>
              <button
                type="button"
                onClick={() => onSelect(opportunity)}
                className="flex min-h-12 w-full flex-col items-start gap-0.5 py-3 text-left transition-colors hover:bg-edito-canvas/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
              >
                <span className="text-sm font-bold leading-tight text-edito-body">{opportunity.title}</span>
                <span className="text-[11px] text-edito-muted">
                  {[opportunity.companyName, opportunity.stageLabel].filter(Boolean).join(" · ")}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function MatchingRun({
  opportunity,
  variant,
  onBack,
}: {
  opportunity: MatchableOpportunity
  variant: "mobile" | "desktop"
  onBack: () => void
}) {
  const matching = useOpportunityMatching(opportunity.id)

  return (
    <CockpitBrightSection>
      <CockpitBrightHeader title={opportunity.title} kicker={["Moteur", "déterministe"]} onBack={onBack} />

      <div className="px-5 py-5">
        {matching.phase === "idle" ? (
          <div className="space-y-3">
            <p className="text-[11px] leading-relaxed text-edito-muted">
              Analyse déterministe sur le vivier candidats et les collaborateurs disponibles ou bientôt
              disponibles. Aucune IA générative, aucun envoi de donnée externe.
            </p>
            <button
              type="button"
              onClick={() => void matching.run()}
              className="inline-flex min-h-12 w-full items-center justify-center rounded-[var(--radius-medium)] bg-brand-primary px-4 text-sm font-bold text-primary-fg transition-colors hover:bg-brand-primary-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
            >
              Lancer le matching
            </button>
          </div>
        ) : null}

        {matching.phase === "loading" ? (
          <p role="status" aria-live="polite" className="flex items-center gap-3 py-6 text-xs font-semibold text-edito-muted animate-pulse">
            <span className="size-4 animate-spin rounded-full border-2 border-brand-primary border-t-transparent" />
            Calcul en cours…
          </p>
        ) : null}

        {matching.phase === "error" ? (
          <div role="alert" className="space-y-2 border-l-2 border-danger pl-4 text-xs leading-relaxed text-edito-body">
            <p>{matching.errorMessage ?? "Erreur inattendue."}</p>
            <button type="button" onClick={() => void matching.run()} className="min-h-11 font-bold underline underline-offset-2">
              Réessayer
            </button>
          </div>
        ) : null}

        {matching.phase === "results" && matching.result ? (
          matching.result.rankedProfiles.length === 0 ? (
            <p className="py-6 text-xs leading-relaxed text-edito-muted">
              Aucun profil disponible ou bientôt disponible ne correspond au périmètre de ce besoin.
            </p>
          ) : variant === "mobile" ? (
            <MatchingResultsMobile
              result={matching.result}
              selectedSourceKey={matching.selectedSourceKey}
              onSelect={matching.setSelectedSourceKey}
              presentStateByKey={matching.presentStateByKey}
              onPresent={(key) => void matching.present(key)}
            />
          ) : (
            <MatchingResultsDesktop
              result={matching.result}
              onSelect={matching.setSelectedSourceKey}
              presentStateByKey={matching.presentStateByKey}
              selectedProfile={
                matching.result.rankedProfiles.find(
                  (profile) => profileSourceKey(profile) === matching.selectedSourceKey,
                ) ?? matching.result.rankedProfiles[0]
              }
            />
          )
        ) : null}
      </div>
    </CockpitBrightSection>
  )
}

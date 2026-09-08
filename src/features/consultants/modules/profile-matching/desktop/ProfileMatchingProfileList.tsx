"use client"

import { useMemo, useState } from "react"
import type { MatchingProfileSummary } from "../data/profile-matching.types"
import { cn } from "@/lib/utils"

interface ProfileMatchingProfileListProps {
  profiles: MatchingProfileSummary[]
  selectedPersonId: string | null
  onSelectProfile: (personId: string) => void
}

type ProfileTypeFilter = "all" | "collaborator" | "candidate"

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

export function ProfileMatchingProfileList({
  profiles,
  selectedPersonId,
  onSelectProfile,
}: ProfileMatchingProfileListProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState<ProfileTypeFilter>("all")
  const [selectedPractice, setSelectedPractice] = useState<string>("all")

  // Practices uniques disponibles
  const practiceOptions = useMemo(() => {
    const map = new Map<string, string>()
    for (const p of profiles) {
      if (p.practiceSlug && p.practiceLabel) {
        map.set(p.practiceSlug, p.practiceLabel)
      }
    }
    return Array.from(map.entries())
      .map(([slug, label]) => ({ slug, label }))
      .sort((a, b) => a.label.localeCompare(b.label, "fr"))
  }, [profiles])

  // Filtrage combiné
  const filteredProfiles = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return profiles.filter((p) => {
      const matchesSearch =
        !q ||
        p.fullName.toLowerCase().includes(q) ||
        (p.currentTitle && p.currentTitle.toLowerCase().includes(q)) ||
        (p.practiceLabel && p.practiceLabel.toLowerCase().includes(q))

      const matchesType =
        typeFilter === "all" || p.sourceType === typeFilter

      const matchesPractice =
        selectedPractice === "all" || p.practiceSlug === selectedPractice

      return matchesSearch && matchesType && matchesPractice
    })
  }, [profiles, searchQuery, typeFilter, selectedPractice])

  return (
    <div className="flex h-full min-h-0 flex-col bg-transparent">
      {/* Contrôles de filtrage */}
      <div className="flex shrink-0 flex-col gap-2.5 border-b border-white/10 p-3">
        {/* Champ de recherche */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher nom, fonction, practice…"
            className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs text-white placeholder:text-white/40 focus:border-brand-brass focus:outline-none focus:ring-1 focus:ring-brand-brass/40"
            aria-label="Rechercher par nom, titre ou practice"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white text-xs"
              aria-label="Effacer la recherche"
            >
              ×
            </button>
          ) : null}
        </div>

        {/* Filtre par type (Tous / Collaborateurs / Candidats) */}
        <div className="grid grid-cols-3 gap-1 rounded-lg border border-white/10 bg-white/[0.02] p-0.5 text-[11px] font-semibold">
          <button
            type="button"
            onClick={() => setTypeFilter("all")}
            className={cn(
              "rounded px-2 py-1 transition-colors text-center",
              typeFilter === "all"
                ? "bg-brand-brass/20 text-brand-brass"
                : "text-white/60 hover:text-white hover:bg-white/[0.04]",
            )}
          >
            Tous ({profiles.length})
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter("collaborator")}
            className={cn(
              "rounded px-2 py-1 transition-colors text-center",
              typeFilter === "collaborator"
                ? "bg-brand-brass/20 text-brand-brass"
                : "text-white/60 hover:text-white hover:bg-white/[0.04]",
            )}
          >
            Collabs
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter("candidate")}
            className={cn(
              "rounded px-2 py-1 transition-colors text-center",
              typeFilter === "candidate"
                ? "bg-brand-brass/20 text-brand-brass"
                : "text-white/60 hover:text-white hover:bg-white/[0.04]",
            )}
          >
            Candidats
          </button>
        </div>

        {/* Filtre par Practice */}
        {practiceOptions.length > 0 ? (
          <select
            value={selectedPractice}
            onChange={(e) => setSelectedPractice(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-[#0f122c] px-2.5 py-1.5 text-xs text-white focus:border-brand-brass focus:outline-none focus:ring-1 focus:ring-brand-brass/40"
            aria-label="Filtrer par practice"
          >
            <option value="all">Toutes les practices ({practiceOptions.length})</option>
            {practiceOptions.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.label}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      {/* Liste des profils */}
      <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-white/5">
        {filteredProfiles.length === 0 ? (
          <div className="p-6 text-center text-xs text-white/40">
            Aucun profil ne correspond aux critères sélectionnés.
          </div>
        ) : (
          filteredProfiles.map((profile) => {
            const isSelected = profile.personId === selectedPersonId
            const matchCount = profile.matches.length
            const topScore = matchCount > 0 ? Math.round(profile.matches[0].overallScore) : null

            return (
              <button
                key={`${profile.sourceType}-${profile.personId}`}
                type="button"
                onClick={() => onSelectProfile(profile.personId)}
                className={cn(
                  "group flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors",
                  isSelected
                    ? "border-l-2 border-brand-brass bg-brand-brass/10"
                    : "hover:bg-white/[0.03] border-l-2 border-transparent",
                )}
              >
                {/* Avatar avec initiales */}
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors",
                    profile.sourceType === "collaborator"
                      ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                      : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
                  )}
                  aria-hidden="true"
                >
                  {getInitials(profile.fullName)}
                </span>

                {/* Identité */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1.5">
                    <p className="truncate text-xs font-semibold text-white group-hover:text-white">
                      {profile.fullName}
                    </p>
                    <span
                      className={cn(
                        "shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                        profile.sourceType === "collaborator"
                          ? "bg-sky-500/15 text-sky-300"
                          : "bg-emerald-500/15 text-emerald-300",
                      )}
                    >
                      {profile.sourceType === "collaborator" ? "Collab" : "Candidat"}
                    </span>
                  </div>

                  <p className="mt-0.5 truncate text-[11px] text-white/60">
                    {profile.currentTitle || profile.practiceLabel || "Profil"}
                  </p>

                  <div className="mt-1 flex items-center justify-between gap-2 text-[10px] text-white/40">
                    <span className="truncate">{profile.practiceLabel ?? "Practice non spécifiée"}</span>
                    {matchCount > 0 ? (
                      <span className="shrink-0 font-medium tabular-nums text-brand-brass">
                        {matchCount} besoin{matchCount > 1 ? "s" : ""}{topScore !== null ? ` (max ${topScore})` : ""}
                      </span>
                    ) : (
                      <span className="shrink-0 text-white/30">0 besoin</span>
                    )}
                  </div>
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}

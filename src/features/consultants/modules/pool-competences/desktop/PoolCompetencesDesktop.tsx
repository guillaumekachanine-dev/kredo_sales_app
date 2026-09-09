"use client"

import { useRouter } from "next/navigation"
import { AppDialog } from "@/components/ui/AppDialog"
import type { ConsultantsSkillsData } from "@/features/consultants/data/get-consultants-skills"
import { PoolCompetencesMap } from "@/features/consultants/skills/PoolCompetencesMap"

// ─────────────────────────────────────────────────────────────────────────────
//  Module Desktop « Pool de compétences » (Phase 7.2 — TRANSFORM chapitre → module).
//
//  Ce wrapper ne gère QUE la surface du module : primitive de modale KREDO
//  (`AppDialog`), titre, fermeture URL-driven et défilement. La cartographie
//  (practices ↔ compétences ↔ demande), la Data (`getConsultantsSkills`) et
//  toute la logique métier restent portées **à l'identique** par
//  `PoolCompetencesMap` (`src/features/consultants/skills/`). Aucun redesign,
//  aucun changement métier, aucune dépendance nouvelle.
//
//  Adaptive Design (ADR-0006) : ce composant n'est monté que dans la branche
//  Desktop. Le Mobile rend `PoolCompetencesMap` directement via son accès
//  historique `?section=pool-competences` (dette adaptative SKILLS-1).
// ─────────────────────────────────────────────────────────────────────────────

export interface PoolCompetencesDesktopProps {
  data: ConsultantsSkillsData
  /** État de repli à la fermeture ([×] / Échap / clic backdrop). */
  closeHref: string
  onClose?: () => void
}

export function PoolCompetencesDesktop({
  data,
  closeHref,
  onClose,
}: PoolCompetencesDesktopProps) {
  let router: ReturnType<typeof useRouter> | null = null
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    router = useRouter()
  } catch {
    // Contexte hors routeur (tests de rendu statique)
  }

  const handleClose = () => {
    if (onClose) {
      onClose()
    } else if (router) {
      router.push(closeHref)
    } else if (typeof window !== "undefined") {
      window.location.assign(closeHref)
    }
  }

  return (
    <AppDialog
      open
      onOpenChange={(next) => {
        if (!next) handleClose()
      }}
      title={
        <h2 className="font-heading text-lg font-black text-heading">Pool de compétences</h2>
      }
      description="Cartographie des practices, des compétences rattachées et des signaux de demande."
      className="!h-[min(92dvh,860px)] !w-[min(calc(100vw-1rem),1480px)] !max-w-none"
      maxHeightClassName="max-h-[min(92dvh,860px)]"
      bodyClassName="!pr-0"
      headerClassName="border-b border-border/30 pb-3"
    >
      <PoolCompetencesMap dataset={data.dataset} collaborators={data.collaborators} />
    </AppDialog>
  )
}

"use client"

import { useMemo, useState } from "react"
import { useDrawerState } from "@/hooks/use-drawer-state"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { StatusPill } from "@/components/ui/StatusPill"
import {
  MobileDataList,
  MobileEntitySummary,
  MobileHeroInsight,
  MobilePageHeader,
} from "@/components/ui/mobile"
import { CandidateDrawer } from "./components/CandidateDrawer"
import { NewCandidateDrawer } from "./components/NewCandidateDrawer"
import {
  AVAILABILITY_BUCKET_META,
  PIPELINE_STATE_META,
  candidateAvatarTone,
  candidateInitials,
  formatSalaryK,
} from "@/features/consultants/candidates/candidates-view"
import type { ConsultantsCandidatesViewModel } from "@/features/consultants/candidates/data/consultants-candidates.types"

// ─────────────────────────────────────────────────────────────────────────────
//  Consultants Workspace — chapitre Candidats, vue Mobile (Lot 8)
//
//  Cartes orientées action (patron `CollaboratorsMobile`). L'édition inline
//  (§ 14.4) passe par le drawer sur Mobile — les sélecteurs denses ne sont pas
//  adaptés au tactile. Distribution Desktop/Mobile côté serveur (page.tsx).
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  vm: ConsultantsCandidatesViewModel
}

type Segment = "priority" | "in_process" | "all"

export function CandidatesMobile({ vm }: Props) {
  const [segment, setSegment] = useState<Segment>("priority")
  const [newOpen, setNewOpen] = useState(false)
  const { open: drawerOpen, selectedId, openDrawer, setOpen: setDrawerOpen } = useDrawerState()

  const items = useMemo(() => {
    if (segment === "in_process") {
      return vm.rows.filter((r) => r.pipelineState === "in_process")
    }
    if (segment === "priority") {
      return vm.rows.filter(
        (r) => r.pipelineState !== "closed" && r.availabilityBucket === "immediate",
      )
    }
    return vm.rows.filter((r) => r.pipelineState !== "closed")
  }, [vm.rows, segment])

  const availableNow = vm.rows.filter(
    (r) => r.pipelineState === "pool" && r.availabilityBucket === "immediate",
  ).length

  const segments: { key: Segment; label: string; count: number }[] = [
    { key: "priority", label: "Prioritaires", count: availableNow },
    { key: "in_process", label: "En process", count: vm.counts.inProcess },
    { key: "all", label: "Vivier", count: vm.counts.pool + vm.counts.inProcess },
  ]

  return (
    <div className="flex flex-col gap-4 p-4 pb-24">
      <MobilePageHeader
        eyebrow="Consultants"
        title="Vivier Candidats"
        description="Vivier de recrutement et processus en cours."
      />

      <MobileHeroInsight
        eyebrow="Décision prioritaire"
        title={
          availableNow > 0
            ? `${availableNow} profil${availableNow > 1 ? "s" : ""} disponible${availableNow > 1 ? "s" : ""} à placer`
            : "Vivier sans disponibilité immédiate"
        }
        value={`${availableNow}/${vm.counts.pool}`}
        summary={
          availableNow > 0
            ? "Positionnez les candidats disponibles sur les besoins ouverts."
            : "Aucun candidat du vivier n'est disponible immédiatement."
        }
        tone={availableNow > 0 ? "success" : "warning"}
        confidence={`${vm.counts.qualifiedThisYear} qualifiés ${vm.referenceYear}`}
        sourceLabel="Vue candidats"
      />

      <div className="flex items-center gap-2">
        {segments.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setSegment(s.key)}
            aria-pressed={segment === s.key}
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-medium)] border px-2 text-xs font-semibold transition-colors"
            style={{
              borderColor: segment === s.key ? "var(--color-primary)" : "var(--color-border)",
              background: segment === s.key ? "var(--color-primary)" : "var(--color-surface)",
              color: segment === s.key ? "#fff" : "var(--color-body)",
            }}
          >
            {s.label}
            <span className="text-[10px] opacity-80">{s.count}</span>
          </button>
        ))}
      </div>

      <Button variant="secondary" size="sm" fullWidth onClick={() => setNewOpen(true)}>
        + Nouveau candidat
      </Button>

      <MobileDataList
        ariaLabel="Liste mobile des candidats"
        items={items}
        getItemId={(row) => row.candidateId}
        header={
          <div className="flex items-center justify-between gap-3 px-1">
            <h2 className="text-[length:var(--font-size-label-sm)] font-semibold uppercase tracking-[0.08em] text-muted">
              Candidats
            </h2>
            <Badge variant="neutral" size="md">
              {items.length}
            </Badge>
          </div>
        }
        renderItem={(row) => {
          const pipeline = PIPELINE_STATE_META[row.pipelineState]
          const availability = AVAILABILITY_BUCKET_META[row.availabilityBucket]
          return (
            <MobileEntitySummary
              visual={
                <span
                  className={`inline-flex size-10 items-center justify-center rounded-[var(--radius-round)] text-sm font-semibold ${candidateAvatarTone(row.fullName)}`}
                >
                  {candidateInitials(row.fullName)}
                </span>
              }
              title={row.fullName}
              subtitle={
                [row.currentTitle, row.practiceLabel].filter(Boolean).join(" · ") ||
                "Profil non renseigné"
              }
              status={<StatusPill label={pipeline.short} variant={pipeline.variant} />}
              facts={[
                { label: "Disponibilité", value: availability.label },
                { label: "Séniorité", value: row.seniority ?? "Non renseignée" },
                { label: "Prétentions", value: formatSalaryK(row.expectedSalary) },
                {
                  label: "Prochaine action",
                  value: row.nextAction ?? (row.pipelineState === "pool" ? "Vivier" : "—"),
                },
              ]}
              primaryAction={
                <Button
                  variant="secondary"
                  size="sm"
                  fullWidth
                  onClick={() => openDrawer(row.candidateId)}
                >
                  Voir le dossier
                </Button>
              }
            />
          )
        }}
      />

      <CandidateDrawer
        candidateId={selectedId}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
      <NewCandidateDrawer open={newOpen} onOpenChange={setNewOpen} />
    </div>
  )
}

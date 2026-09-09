"use client"

import { useMemo, useState } from "react"
import { useDrawerState } from "@/hooks/use-drawer-state"
import { cn } from "@/lib/utils"
import { formatDateShort } from "@/lib/formatters"
import { Button } from "@/components/ui/Button"
import { Select } from "@/components/ui/Select"
import { StatusPill } from "@/components/ui/StatusPill"
import { StructuredList, type StructuredListColumn } from "@/components/ui/StructuredList"
import { CandidateDrawer } from "./components/CandidateDrawer"
import { NewCandidateDrawer } from "./components/NewCandidateDrawer"
import { CandidateInlineControls } from "@/features/consultants/candidates/CandidateInlineControls"
import { openReportGeneration } from "@/lib/reports/report-generation"
import {
  AVAILABILITY_BUCKET_META,
  PIPELINE_STATE_META,
  candidateAvatarTone,
  candidateInitials,
  formatSalaryK,
} from "@/features/consultants/candidates/candidates-view"
import type {
  ConsultantsCandidateRow,
  ConsultantsCandidatesViewModel,
} from "@/features/consultants/candidates/data/consultants-candidates.types"

// ─────────────────────────────────────────────────────────────────────────────
//  Consultants Workspace — chapitre Candidats, vue Desktop (Lot 8)
//
//  Table `StructuredList` maison (patron `CollaboratorsDesktop`), colonnes
//  § 14.3, édition inline § 14.4. Drawers réutilisés : `CandidateDrawer`
//  (candidate-centric) + `NewCandidateDrawer`. Aucune bibliothèque, tokens
//  `var(--color-*)` uniquement.
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  vm: ConsultantsCandidatesViewModel
}

type PipelineFilter = "all" | "pool" | "in_process" | "closed"
type AvailabilityFilter = "all" | "immediate" | "scheduled" | "unknown"

function StatCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string
  value: string
  sub: string
  tone: "primary" | "info" | "success"
}) {
  const rail = {
    primary: "bg-primary",
    info: "bg-info",
    success: "bg-success",
  }[tone]
  const ink = {
    primary: "text-primary",
    info: "text-info",
    success: "text-success",
  }[tone]

  return (
    <div className="relative overflow-hidden rounded-[var(--radius-medium)] border border-border bg-surface px-4 py-3">
      <span className={cn("absolute inset-x-0 top-0 h-0.5", rail)} />
      <p className="truncate text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
        {label}
      </p>
      <p className={cn("mt-1.5 font-heading text-[26px] font-black leading-none tracking-tight", ink)}>
        {value}
      </p>
      <p className="mt-1 truncate text-[11px] text-muted">{sub}</p>
    </div>
  )
}

export function CandidatesDesktop({ vm }: Props) {
  const [pipeline, setPipeline] = useState<PipelineFilter>("all")
  const [practice, setPractice] = useState("all")
  const [availability, setAvailability] = useState<AvailabilityFilter>("all")
  const [newOpen, setNewOpen] = useState(false)
  const { open: drawerOpen, selectedId, openDrawer, setOpen: setDrawerOpen } = useDrawerState()

  const practiceOptions = useMemo(
    () =>
      Array.from(
        new Map(
          vm.rows
            .filter((r) => r.practiceKey && r.practiceLabel)
            .map((r) => [r.practiceKey as string, r.practiceLabel as string]),
        ),
      ).sort((a, b) => a[1].localeCompare(b[1], "fr")),
    [vm.rows],
  )

  const filtered = useMemo(
    () =>
      vm.rows.filter((row) => {
        if (pipeline !== "all" && row.pipelineState !== pipeline) return false
        if (practice !== "all" && row.practiceKey !== practice) return false
        if (availability !== "all" && row.availabilityBucket !== availability) return false
        return true
      }),
    [vm.rows, pipeline, practice, availability],
  )

  const columns: StructuredListColumn<ConsultantsCandidateRow>[] = [
    {
      id: "candidate",
      header: "Candidat",
      width: "15rem",
      render: (row) => (
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
              candidateAvatarTone(row.fullName),
            )}
          >
            {candidateInitials(row.fullName)}
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="truncate font-semibold text-heading transition-colors group-hover:text-primary">
              {row.fullName}
            </span>
            <span className="truncate text-[10px] text-muted">
              {row.availabilityLabel ?? "Disponibilité non renseignée"}
            </span>
          </div>
        </div>
      ),
    },
    {
      id: "profile",
      header: "Profil",
      width: "12rem",
      render: (row) => (
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-body">{row.currentTitle ?? "—"}</span>
          <span className="truncate text-[10px] text-muted">
            {[row.practiceLabel, row.seniority].filter(Boolean).join(" • ") || "—"}
          </span>
        </div>
      ),
    },
    {
      id: "availability",
      header: "Disponibilité",
      width: "9.5rem",
      render: (row) => {
        const meta = AVAILABILITY_BUCKET_META[row.availabilityBucket]
        return (
          <div className="flex flex-col gap-1">
            <StatusPill label={meta.label} variant={meta.variant} />
            <span className="text-[10px] text-muted">
              {row.availableFrom ? formatDateShort(row.availableFrom) : "—"}
              {row.noticePeriodDays ? ` · préavis ${row.noticePeriodDays} j` : ""}
            </span>
          </div>
        )
      },
    },
    {
      id: "location",
      header: "Domiciliation",
      width: "8rem",
      render: (row) => (
        <span className="truncate text-body">{row.location ?? "—"}</span>
      ),
    },
    {
      id: "expectations",
      header: "Prétentions",
      align: "right",
      width: "6.5rem",
      render: (row) => (
        <div className="flex flex-col items-end">
          <span className="font-semibold tabular-nums text-heading">
            {formatSalaryK(row.expectedSalary)}
          </span>
          <span className="text-[10px] text-muted">
            {row.expectedDailyRate ? `TJM ${row.expectedDailyRate} €` : "—"}
          </span>
        </div>
      ),
    },
    {
      id: "stage",
      header: "Étape / statut",
      width: "11rem",
      render: (row) => <CandidateInlineControls row={row} />,
    },
    {
      id: "next-action",
      header: "Prochaine action",
      width: "13rem",
      render: (row) => (
        <span className="line-clamp-2 text-[11px] text-body">
          {row.nextAction ?? (
            <span className="text-muted">
              {row.pipelineState === "pool" ? "Vivier — pas de besoin actif" : "—"}
            </span>
          )}
        </span>
      ),
    },
  ]

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-6">
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          label={`Qualifiés ${vm.referenceYear}`}
          value={String(vm.counts.qualifiedThisYear)}
          sub={`sur ${vm.counts.total} candidats suivis`}
          tone="primary"
        />
        <StatCard
          label="Vivier actif"
          value={String(vm.counts.pool)}
          sub={`${vm.counts.withoutPositioning} sans besoin rattaché`}
          tone="info"
        />
        <StatCard
          label="En process"
          value={String(vm.counts.inProcess)}
          sub="processus ou positionnement en cours"
          tone="success"
        />
      </div>

      <section
        className="flex flex-col gap-4 rounded-[var(--radius-medium)] border p-5"
        style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
      >
        <div
          className="flex flex-col gap-3 border-b pb-4 lg:flex-row lg:items-center lg:justify-between"
          style={{ borderColor: "var(--color-border)" }}
        >
          <h2 className="text-sm font-bold text-heading">
            Vivier ({filtered.length}
            {filtered.length !== vm.rows.length ? ` / ${vm.rows.length}` : ""})
          </h2>

          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={pipeline}
              onChange={(e) => setPipeline(e.target.value as PipelineFilter)}
              size="sm"
              className="w-auto text-xs font-medium"
              aria-label="Filtrer par état de pipeline"
            >
              <option value="all">Tous les états</option>
              <option value="pool">{PIPELINE_STATE_META.pool.label}</option>
              <option value="in_process">{PIPELINE_STATE_META.in_process.label}</option>
              <option value="closed">{PIPELINE_STATE_META.closed.label}</option>
            </Select>

            <Select
              value={practice}
              onChange={(e) => setPractice(e.target.value)}
              size="sm"
              className="w-auto text-xs font-medium"
              aria-label="Filtrer par practice"
            >
              <option value="all">Toutes les practices</option>
              {practiceOptions.map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </Select>

            <Select
              value={availability}
              onChange={(e) => setAvailability(e.target.value as AvailabilityFilter)}
              size="sm"
              className="w-auto text-xs font-medium"
              aria-label="Filtrer par disponibilité"
            >
              <option value="all">Toutes dispos</option>
              <option value="immediate">{AVAILABILITY_BUCKET_META.immediate.label}</option>
              <option value="scheduled">{AVAILABILITY_BUCKET_META.scheduled.label}</option>
              <option value="unknown">{AVAILABILITY_BUCKET_META.unknown.label}</option>
            </Select>

            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                openReportGeneration({
                  origin: "recruitment",
                  reportType: "activity_recruitment",
                })
              }
            >
              Nouveau rapport
            </Button>

            <Button variant="primary" size="sm" onClick={() => setNewOpen(true)}>
              + Nouveau candidat
            </Button>
          </div>
        </div>

        <StructuredList
          density="default"
          items={filtered}
          getItemId={(row) => row.candidateId}
          onItemClick={(row) => openDrawer(row.candidateId)}
          selectedItemId={drawerOpen && selectedId ? selectedId : undefined}
          ariaLabel="Vivier candidats"
          emptyState="Aucun candidat ne correspond aux filtres sélectionnés."
          columns={columns}
        />

        {vm.dataNotes.length > 0 && (
          <details className="text-[11px] text-muted">
            <summary className="cursor-pointer select-none font-semibold">
              Notes méthodologiques
            </summary>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              {vm.dataNotes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </details>
        )}
      </section>

      <CandidateDrawer
        candidateId={selectedId}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
      <NewCandidateDrawer open={newOpen} onOpenChange={setNewOpen} />
    </div>
  )
}

"use client"

import { useState, useTransition } from "react"
import { cn } from "@/lib/utils"
import { DataTable, type DataTableColumn, type DataTableSort, sortDataTableRows, getNextDataTableSort } from "@/components/ui/data-table/DataTable"
import type { ClientIntelligenceIssue, ClientIntelligenceContact } from "@/lib/intelligence/intelligence-data"
import { setAccountIssueStatus } from "./set-account-issue-status"

// ADR-0012 Lot 4 — rendu de la cartographie des enjeux (table account_issues,
// spine matérialisée). Fichier séparé, même raison que AccountKnowledgeBlocks.tsx
// (vues Desktop/Mobile déjà volumineuses).

const CATEGORY_LABELS: Record<string, string> = {
  business: "Business",
  it: "IT",
  data: "Data",
  cloud: "Cloud",
  cyber: "Cyber",
  delivery: "Delivery",
  regulatory: "Réglementaire",
  people: "People",
}

const EVIDENCE_LABELS: Record<string, string> = {
  observed: "Observé",
  inferred: "Déduit",
  weak: "Faible",
}

function ScoreBadgeMini({ value, label }: { value: number; label: string }) {
  const tone =
    value >= 4 ? "border-danger/30 bg-danger/10 text-danger" :
    value === 3 ? "border-warning/30 bg-warning/10 text-warning" :
    "border-border bg-surface text-muted"
  return (
    <span className={cn("inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-bold", tone)} title={label}>
      {value}
    </span>
  )
}

function EvidenceBadge({ evidenceLevel }: { evidenceLevel: string }) {
  return (
    <span className="rounded border border-border bg-surface px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-body">
      {EVIDENCE_LABELS[evidenceLevel] ?? evidenceLevel}
    </span>
  )
}

// ─── Desktop — table triable ────────────────────────────────────────────────

export function AccountIssuesTable({
  issues,
  contacts,
  onDismiss,
}: {
  issues: ClientIntelligenceIssue[]
  contacts: ClientIntelligenceContact[]
  onDismiss: (issueId: string) => void
}) {
  const [sort, setSort] = useState<DataTableSort | null>({ columnId: "importance", direction: "desc" })
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  function contactNames(ids: string[]): string {
    if (ids.length === 0) return "—"
    return ids
      .map((id) => contacts.find((c) => c.id === id)?.fullName ?? null)
      .filter((n): n is string => Boolean(n))
      .join(", ") || "—"
  }

  function handleDismiss(issueId: string) {
    setPendingId(issueId)
    startTransition(async () => {
      const { error } = await setAccountIssueStatus(issueId, "dismissed")
      setPendingId(null)
      if (!error) onDismiss(issueId)
    })
  }

  const columns: DataTableColumn<ClientIntelligenceIssue>[] = [
    {
      id: "title",
      header: "Enjeu",
      sortable: true,
      accessor: (row) => row.title,
      cell: (row) => (
        <div className="min-w-0 max-w-[20rem]">
          <p className="truncate text-xs font-bold text-heading">{row.title}</p>
          <p className="mt-0.5 rounded border border-border bg-canvas/50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted inline-block">
            {CATEGORY_LABELS[row.category] ?? row.category}
          </p>
        </div>
      ),
    },
    {
      id: "importance",
      header: "Importance",
      sortable: true,
      align: "center",
      accessor: (row) => row.importance,
      cell: (row) => <ScoreBadgeMini value={row.importance} label="Importance" />,
    },
    {
      id: "urgency",
      header: "Urgence",
      sortable: true,
      align: "center",
      accessor: (row) => row.urgency,
      cell: (row) => <ScoreBadgeMini value={row.urgency} label="Urgence" />,
    },
    {
      id: "kredoFit",
      header: "Actionnabilité KREDO",
      sortable: true,
      align: "center",
      accessor: (row) => row.kredoFit,
      cell: (row) => <ScoreBadgeMini value={row.kredoFit} label="Actionnabilité KREDO" />,
    },
    {
      id: "evidence",
      header: "Preuve",
      align: "center",
      cell: (row) => <EvidenceBadge evidenceLevel={row.evidenceLevel} />,
    },
    {
      id: "contacts",
      header: "Contacts",
      cell: (row) => <span className="text-[11px] text-body">{contactNames(row.contactIds)}</span>,
    },
    {
      id: "probe",
      header: "Prochaine question",
      cell: (row) => (
        <span className="text-[11px] italic text-body">{row.recommendedNextProbe ?? "—"}</span>
      ),
    },
    {
      id: "actions",
      header: "",
      align: "right",
      cell: (row) => (
        <button
          type="button"
          disabled={pendingId === row.id}
          onClick={() => handleDismiss(row.id)}
          className="rounded border border-border px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted hover:text-danger hover:border-danger/30 disabled:opacity-50"
        >
          Écarter
        </button>
      ),
    },
  ]

  const sortedRows = sortDataTableRows(issues, columns, sort)

  return (
    <DataTable
      rows={sortedRows}
      columns={columns}
      getRowId={(row) => row.id}
      sort={sort}
      onSortChange={(next) => setSort(next ?? getNextDataTableSort(sort, "importance"))}
      ariaLabel="Cartographie des enjeux"
      emptyState={
        <div className="flex min-h-32 flex-col items-center justify-center text-center">
          <p className="text-sm font-semibold text-heading">Aucun enjeu identifié pour l&apos;instant</p>
          <p className="mt-1 text-xs text-muted">Lance la cartographie pour générer une première proposition.</p>
        </div>
      }
    />
  )
}

// ─── Mobile — top enjeux ─────────────────────────────────────────────────────

export function AccountIssuesTopList({
  issues,
  contacts,
  onDismiss,
}: {
  issues: ClientIntelligenceIssue[]
  contacts: ClientIntelligenceContact[]
  onDismiss: (issueId: string) => void
}) {
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const top = [...issues].sort((a, b) => (b.importance + b.urgency) - (a.importance + a.urgency)).slice(0, 3)

  function handleDismiss(issueId: string) {
    setPendingId(issueId)
    startTransition(async () => {
      const { error } = await setAccountIssueStatus(issueId, "dismissed")
      setPendingId(null)
      if (!error) onDismiss(issueId)
    })
  }

  if (top.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border bg-canvas/30 px-4 py-8 text-center min-h-[140px]">
        <span className="text-xs font-bold uppercase tracking-wider text-muted">Aucun enjeu identifié pour l&apos;instant.</span>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {top.map((issue) => {
        const contactNames = issue.contactIds
          .map((id) => contacts.find((c) => c.id === id)?.fullName ?? null)
          .filter((n): n is string => Boolean(n))
        return (
          <div key={issue.id} className="rounded-lg border border-border bg-surface p-3.5 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-bold text-heading">{issue.title}</p>
                <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
                  {CATEGORY_LABELS[issue.category] ?? issue.category}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <ScoreBadgeMini value={issue.importance} label="Importance" />
                <ScoreBadgeMini value={issue.urgency} label="Urgence" />
              </div>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-body">{issue.problemStatement}</p>
            {issue.recommendedNextProbe && (
              <p className="mt-2 rounded border border-brand-brass/30 bg-brand-brass/5 px-2.5 py-1.5 text-[11px] italic text-heading">
                → {issue.recommendedNextProbe}
              </p>
            )}
            {contactNames.length > 0 && (
              <p className="mt-1.5 text-[10px] text-muted">Contact{contactNames.length > 1 ? "s" : ""} : {contactNames.join(", ")}</p>
            )}
            <button
              type="button"
              disabled={pendingId === issue.id}
              onClick={() => handleDismiss(issue.id)}
              className="mt-2 text-[10px] font-bold uppercase tracking-wider text-muted hover:text-danger disabled:opacity-50"
            >
              Écarter
            </button>
          </div>
        )
      })}
    </div>
  )
}

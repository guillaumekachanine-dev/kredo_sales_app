"use client"

import React, { useState, useMemo } from "react"
import { useEventDrawerStore } from "@/hooks/use-event-drawer-store"
import { useStaffingDrawerStore } from "@/hooks/use-staffing-drawer-store"
import { getEventResourceSignedUrl } from "@/lib/agenda/event-drawer-actions"
import type { StaffingDrawerViewModel } from "@/types/staffing-drawer"

// ─── Types ────────────────────────────────────────────────────────────────────

interface EventResourceFile {
  name: string
  bucket?: string
  storage_path?: string
}

interface DrawerEvent {
  id: string
  title: string
  event_type: string
  status: string
  starts_at: string
  ends_at: string | null
  description: string | null
  metadata: { resources?: EventResourceFile[] } | null
  organizer_id: string | null
}

interface TabRessourcesProps {
  data: StaffingDrawerViewModel
  events: DrawerEvent[]
  profiles: Record<string, { full_name: string | null }>
}

interface ResourceDef {
  key: string
  label: string
  event: DrawerEvent | null
  files: EventResourceFile[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalize(value: string) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase()
}

function matchesAny(text: string, values: string[]) {
  return values.some((v) => text.includes(v))
}

function formatDateFrLong(iso: string | null) {
  if (!iso) return "—"
  const d = new Date(iso)
  const date = d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
  const hours   = d.getHours()
  const minutes = d.getMinutes()
  const time    = minutes === 0 ? `${hours}h` : `${hours}h${String(minutes).padStart(2, "0")}`
  return `${date}, ${time}`
}

// ─── Document icon ─────────────────────────────────────────────────────────────

function DocIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? "w-6 h-6"}
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <line x1="10" y1="9"  x2="8" y2="9" />
    </svg>
  )
}

// ─── Resource row ──────────────────────────────────────────────────────────────

function ResourceRow({
  def,
  profiles,
  onNavigate,
  onDownload,
  downloadingFile,
}: {
  def: ResourceDef
  profiles: Record<string, { full_name: string | null }>
  onNavigate: (id: string) => void
  onDownload: (bucket: string, path: string, name: string) => void
  downloadingFile: string | null
}) {
  const { event, files } = def
  const organizer = event?.organizer_id
    ? (profiles[event.organizer_id]?.full_name ?? "—")
    : "—"
  const firstFile = files[0] ?? null
  const hasFile   = Boolean(firstFile?.bucket && firstFile?.storage_path)
  const isDownloading = firstFile ? downloadingFile === firstFile.name : false

  return (
    <div
      className="flex items-stretch gap-3 py-3 select-none"
      style={{ borderBottom: "1px solid var(--color-border)" }}
    >
      {/* Left — label + info */}
      <div className="flex-1 min-w-0">
        {/* Category with triangle bullet */}
        <div className="flex items-center gap-1.5 mb-1.5">
          <span
            style={{
              display: "inline-block",
              width: 0,
              height: 0,
              borderTop: "4px solid transparent",
              borderBottom: "4px solid transparent",
              borderLeft: "6px solid var(--color-primary)",
              flexShrink: 0,
            }}
          />
          <span
            className="text-[10px] font-bold uppercase tracking-wider"
            style={{ color: "var(--color-muted)" }}
          >
            {def.label}
          </span>
        </div>

        {event ? (
          <div className="space-y-0.5 pl-[10px]">
            <p className="text-xs" style={{ color: "var(--color-body)" }}>
              <span className="font-medium" style={{ color: "var(--color-muted)" }}>Date :</span>{" "}
              {formatDateFrLong(event.starts_at)}
            </p>
            <p className="text-xs" style={{ color: "var(--color-body)" }}>
              <span className="font-medium" style={{ color: "var(--color-muted)" }}>Organisateur :</span>{" "}
              {organizer}
            </p>
            <button
              onClick={() => onNavigate(event.id)}
              className="mt-1.5 text-[10px] font-bold bg-transparent border-0 p-0 cursor-pointer hover:underline"
              style={{ color: "var(--color-primary)" }}
            >
              ↳ Consulter l&apos;événement
            </button>
          </div>
        ) : (
          <p className="pl-[10px] text-xs italic" style={{ color: "var(--color-muted)" }}>
            Aucun document disponible
          </p>
        )}
      </div>

      {/* Right — document icon button */}
      <div className="flex items-center justify-center shrink-0 pl-1">
        {hasFile ? (
          <button
            onClick={() =>
              onDownload(firstFile!.bucket!, firstFile!.storage_path!, firstFile!.name)
            }
            disabled={isDownloading}
            title={firstFile?.name}
            className="flex items-center justify-center rounded-lg border cursor-pointer transition-colors"
            style={{
              width: 44,
              height: 44,
              borderColor: "var(--color-primary)",
              background: "color-mix(in srgb, var(--color-primary) 8%, transparent)",
              color: "var(--color-primary)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background =
                "color-mix(in srgb, var(--color-primary) 14%, transparent)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background =
                "color-mix(in srgb, var(--color-primary) 8%, transparent)"
            }}
          >
            {isDownloading ? (
              <svg
                className="w-5 h-5 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <circle cx="12" cy="12" r="10" strokeOpacity={0.25} />
                <path d="M12 2a10 10 0 0 1 10 10" />
              </svg>
            ) : (
              <DocIcon className="w-5 h-5" />
            )}
          </button>
        ) : (
          <div
            className="flex items-center justify-center rounded-lg border"
            style={{
              width: 44,
              height: 44,
              borderColor: "var(--color-border)",
              background: "var(--color-canvas)",
              color: "var(--color-border)",
            }}
          >
            <DocIcon className="w-5 h-5" />
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export function TabRessources({ data, events, profiles }: TabRessourcesProps) {
  const { openEventDrawer }    = useEventDrawerStore()
  const { closeStaffingDrawer } = useStaffingDrawerStore()
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null)

  const isHired = data.status === "retenu" || data.status === "gagne"

  // ── Event detection ──────────────────────────────────────────────────────
  const prequalEvent = useMemo(() => {
    return events.find((e) => {
      const t = normalize(`${e.title} ${e.description ?? ""}`)
      return (
        e.event_type === "entretien_candidat" &&
        matchesAny(t, ["qualif", "prequal", "fit", "culturel", "sourcing", "appel"])
      )
    }) ?? null
  }, [events])

  const cvEvent = useMemo(() => {
    return events.find((e) => {
      // A CV is typically a resource file attached to an event, not a standalone event.
      // Detect if any event metadata contains a cv-named resource.
      const resources = e.metadata?.resources ?? []
      const hasCvFile = resources.some((r) =>
        normalize(r.name).includes("cv") || normalize(r.name).includes("curriculum"),
      )
      const t = normalize(`${e.title} ${e.description ?? ""}`)
      return hasCvFile || matchesAny(t, ["cv ", "curriculum", "resume"])
    }) ?? null
  }, [events])

  const managerEvent = useMemo(() => {
    return events.find((e) => {
      const t = normalize(`${e.title} ${e.description ?? ""}`)
      return (
        (e.event_type === "entretien_candidat" || e.event_type === "entretien_rh") &&
        matchesAny(t, ["tech", "manager", "rh", "pratique", "test", "client"]) &&
        e.id !== prequalEvent?.id
      )
    }) ?? null
  }, [events, prequalEvent])

  const testEvent = useMemo(() => {
    return events.find((e) => {
      const t = normalize(`${e.title} ${e.description ?? ""}`)
      return (
        matchesAny(t, ["test technique", "coding", "algo", "exercice", "assessment"]) ||
        e.event_type === "test_technique"
      )
    }) ?? null
  }, [events])

  const dossierEvent = useMemo(() => {
    return events.find((e) => {
      const t = normalize(`${e.title} ${e.description ?? ""}`)
      return matchesAny(t, ["dossier", "bilan", "synthese competence", "competences"])
    }) ?? null
  }, [events])

  const contratEvent = useMemo(() => {
    if (!isHired) return null
    return events.find((e) => {
      const t = normalize(`${e.title} ${e.description ?? ""}`)
      return matchesAny(t, ["contrat", "signature", "integration", "onboarding", "embauche"])
    }) ?? null
  }, [events, isHired])

  // ── Build resource definitions ────────────────────────────────────────────
  const resources: ResourceDef[] = useMemo(() => {
    const defs: ResourceDef[] = [
      {
        key: "prequalification",
        label: "Fiche de préqualification",
        event: prequalEvent,
        files: prequalEvent?.metadata?.resources ?? [],
      },
      {
        key: "cv",
        label: "CV du candidat",
        event: cvEvent,
        files: cvEvent?.metadata?.resources ?? [],
      },
      {
        key: "cr_manager",
        label: "Compte-rendu entretien Manager",
        event: managerEvent,
        files: managerEvent?.metadata?.resources ?? [],
      },
      {
        key: "tests",
        label: "Résultats tests techniques",
        event: testEvent,
        files: testEvent?.metadata?.resources ?? [],
      },
      {
        key: "dossier",
        label: "Dossier de compétences",
        event: dossierEvent,
        files: dossierEvent?.metadata?.resources ?? [],
      },
    ]

    if (isHired) {
      defs.push({
        key: "contrat",
        label: "Contrat",
        event: contratEvent,
        files: contratEvent?.metadata?.resources ?? [],
      })
    }

    return defs
  }, [prequalEvent, cvEvent, managerEvent, testEvent, dossierEvent, contratEvent, isHired])

  // ── Actions ───────────────────────────────────────────────────────────────
  const navigateToEvent = (eventId: string) => {
    closeStaffingDrawer()
    openEventDrawer(eventId)
  }

  const handleDownload = async (bucket: string, path: string, name: string) => {
    try {
      setDownloadingFile(name)
      const url = await getEventResourceSignedUrl(bucket, path)
      if (url) {
        window.open(url, "_blank")
      } else {
        alert("Impossible de générer le lien de téléchargement.")
      }
    } catch (e) {
      console.error(e)
    } finally {
      setDownloadingFile(null)
    }
  }

  return (
    <div>
      {resources.map((def) => (
        <ResourceRow
          key={def.key}
          def={def}
          profiles={profiles}
          onNavigate={navigateToEvent}
          onDownload={handleDownload}
          downloadingFile={downloadingFile}
        />
      ))}
    </div>
  )
}

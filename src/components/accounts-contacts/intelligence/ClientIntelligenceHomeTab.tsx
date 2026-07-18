"use client"

import { useMemo, useState, useTransition } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { AgendaEventDrawer, type AgendaEventDrawerInitialValues } from "@/components/agenda/AgendaEventDrawer"
import { ContextualCommunicationButton } from "@/components/communication/ContextualCommunicationButton"
import { TaskCreateModal } from "@/components/tasks/TaskCreateModal"
import { AppDialog } from "@/components/ui/AppDialog"
import { Button } from "@/components/ui/Button"
import { AGENDA_EVENT_TYPES } from "@/lib/agenda/agenda-config"
import {
  isCommercialWindowExpired,
  selectPrimaryCommercialWindow,
} from "@/lib/intelligence/client-intelligence-home"
import type {
  AccountRecentDocument,
  ClientIntelligenceData,
  ClientIntelligenceSignal,
} from "@/lib/intelligence/intelligence-data"
import { cn } from "@/lib/utils"
import { getDocumentTypeLabel } from "@/components/reports/document-display"
import { AccountWatchSettingsCard } from "./AccountWatchSettingsCard"
import { CompanyDocumentsModal } from "./CompanyDocumentsModal"
import { SectionBlock } from "./intelligence-parts"
import {
  getProcessStepStatus,
  INTELLIGENCE_PROCESS_STEPS,
  type ProcessStepKey,
} from "./intelligence-process"

interface ClientIntelligenceHomeTabProps {
  data: ClientIntelligenceData
  onOpenTab: (tab: ProcessStepKey) => void
}

const PROCESS_ICON_BY_STEP: Record<ProcessStepKey, string> = {
  connaissance: "/icons_set/cockpit_intelligence/scan_rapide_infos.png",
  secteur: "/icons_set/cockpit_intelligence/analyse_sectorielle.png",
  enjeux: "/icons_set/cockpit_intelligence/definition_priorites.png",
  strategie: "/icons_set/cockpit_intelligence/generation_pitch.png",
  roadmap: "/icons_set/cockpit_intelligence/roadmap_commerciale-removebg-preview.png",
}

const URGENCY_LABELS: Readonly<Record<string, string>> = {
  critical: "Critique",
  high: "Haute",
  medium: "Moyenne",
  low: "Faible",
}

const DOCUMENT_STATUS_LABELS: Readonly<Record<string, string>> = {
  draft: "Brouillon",
  ready: "Prêt",
  used: "Utilisé",
  archived: "Archivé",
}

function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
}

function formatDateTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function humanize(value: string): string {
  const normalized = value.replaceAll("_", " ").trim()
  return normalized ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : value
}

function documentTypeLabel(documentType: string): string {
  const label = getDocumentTypeLabel(documentType as Parameters<typeof getDocumentTypeLabel>[0])
  return label ? humanize(label) : humanize(documentType)
}

function documentIcon(document: AccountRecentDocument): string {
  if (document.documentType === "commercial_pitch" || document.documentType === "prise_de_parole") {
    return "/icons_set/cockpit_intelligence/dossier_pitchs.png"
  }
  if (document.documentType === "communication" || document.documentType === "internal_note") {
    return "/icons_set/cockpit_intelligence/redaction_message_ai.png"
  }
  if (document.documentType.includes("financial") || document.documentType === "commercial_quote") {
    return "/icons_set/cockpit_intelligence/rapport_financier_ai.png"
  }
  return "/icons_set/cockpit_intelligence/generer_rapport.png"
}

function interactionTypeLabel(value: string): string {
  return AGENDA_EVENT_TYPES[value]?.label ?? humanize(value)
}

function ProcessArrow() {
  return (
    <span aria-hidden="true" className="hidden w-5 shrink-0 items-center justify-center min-[1180px]:flex">
      <svg className="size-3.5 text-edito-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
        <path d="m9 18 6-6-6-6" />
      </svg>
    </span>
  )
}

function ProcessRail({ data, onOpenTab }: ClientIntelligenceHomeTabProps) {
  return (
    <div className="flex flex-col gap-2 min-[1180px]:flex-row min-[1180px]:gap-0" aria-label="Processus Cockpit Intelligence">
      {INTELLIGENCE_PROCESS_STEPS.map((step, index) => {
        const status = getProcessStepStatus(step.key, data)
        const toneClass = {
          success: "border-success/30 bg-success/10 text-white",
          warning: "border-warning/45 bg-warning/15 text-white",
          neutral: "border-white/20 bg-white/5 text-white/75",
        }[status.tone]

        return (
          <div key={step.key} className="contents">
            {index > 0 ? <ProcessArrow /> : null}
            <button
              type="button"
              onClick={() => onOpenTab(step.key)}
              aria-label={`${step.label}. Statut : ${status.label}`}
              className={cn(
                "group relative flex h-[120px] min-w-0 flex-1 flex-col overflow-hidden rounded-md border border-primary-deep bg-primary px-3 py-3 text-left",
                "transition-colors duration-200 ease-out hover:border-brand-brass/60 hover:bg-primary-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-brass focus-visible:ring-offset-2 focus-visible:ring-offset-canvas motion-reduce:transition-none",
                status.tone === "neutral" && "opacity-75 hover:opacity-90 focus-visible:opacity-90",
              )}
            >
              <span className="absolute left-0 top-0 h-0.5 w-4 bg-brand-brass transition-[width] duration-200 ease-out group-hover:w-[60%] group-focus-visible:w-[60%] motion-reduce:transition-none" aria-hidden="true" />
              <div className="flex items-start justify-between gap-2">
                <Image src={PROCESS_ICON_BY_STEP[step.key]} alt="" width={24} height={24} className="size-5 object-contain" />
                <span className={cn("inline-flex rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider", toneClass)}>
                  {status.label}
                </span>
              </div>
              <h3 className="mt-2 text-[11px] font-bold uppercase leading-4 tracking-[0.08em] text-white">
                {step.label}
              </h3>
              <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-white/70">
                {step.description}
              </p>
            </button>
          </div>
        )
      })}
    </div>
  )
}

function RecentSignals({ data }: { data: ClientIntelligenceData }) {
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null)
  const [isRefreshing, startRefreshing] = useTransition()
  const recentSignals = [...data.accountSignals]
    .sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime())
    .slice(0, 3)
  const updatedAt = data.accountWatch.lastRunAt
    ?? data.accountSignals[0]?.lastEvidenceAt
    ?? data.accountSignals[0]?.detectedAt
    ?? null

  function handleRefresh() {
    setFeedback(null)
    startRefreshing(async () => {
      try {
        const response = await fetch(`/api/intelligence/accounts/${data.company.id}/watch-refresh`, { method: "POST" })
        const payload = await response.json().catch(() => null) as { runId?: string; error?: string } | null
        if (!response.ok || !payload?.runId) {
          setFeedback({ tone: "error", message: "Impossible de lancer la mise à jour" })
          return
        }
        setFeedback({ tone: "success", message: "Mise à jour lancée" })
      } catch {
        setFeedback({ tone: "error", message: "Impossible de lancer la mise à jour" })
      }
    })
  }

  return (
    <div className="border-t border-edito-border pt-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-[0.08em] text-edito-heading">Signaux récents</h4>
          <p className="mt-1 text-[10px] text-edito-muted">
            {updatedAt ? `Mis à jour le ${formatDateTime(updatedAt)}` : "Aucune mise à jour horodatée"}
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleRefresh}
          loading={isRefreshing}
          loadingLabel="Lancement"
          className="min-h-10 shrink-0"
        >
          Actualiser
        </Button>
      </div>

      {feedback ? (
        <p className={cn("mt-2 text-[11px] font-semibold", feedback.tone === "success" ? "text-success" : "text-danger")}>
          {feedback.message}
        </p>
      ) : null}

      {recentSignals.length > 0 ? (
        <ul className="mt-3 divide-y divide-edito-border border-y border-edito-border">
          {recentSignals.map((signal) => (
            <SignalRow key={signal.id} signal={signal} company={data.company} />
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-xs italic text-edito-muted">Aucun signal récent capté pour l’instant.</p>
      )}
    </div>
  )
}

function SignalRow({
  signal,
  company,
}: {
  signal: ClientIntelligenceSignal
  company: ClientIntelligenceData["company"]
}) {
  return (
    <li className="py-3 first:pt-2 last:pb-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h5 className="text-xs font-bold leading-5 text-edito-heading">{signal.title}</h5>
            <span className="rounded border border-edito-border bg-edito-chip px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-edito-body">
              {humanize(signal.category ?? signal.type ?? "Signal")}
            </span>
          </div>
          {signal.summary ? <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-edito-body">{signal.summary}</p> : null}
          <p className="mt-1 text-[10px] text-edito-muted">
            {formatDate(signal.detectedAt)} · {signal.primarySource?.source_name ?? "Source non renseignée"}
          </p>
        </div>
        <span className="shrink-0 text-[10px] font-bold text-edito-muted">{Math.round(signal.urgencyScore)}/100</span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {signal.primarySource?.source_url ? (
          <a
            href={signal.primarySource.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-9 items-center rounded border border-edito-border px-2.5 text-[10px] font-bold text-edito-heading transition-colors hover:border-edito-navy hover:bg-edito-chip focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edito-navy/30"
          >
            Voir la source
          </a>
        ) : (
          <span aria-disabled="true" className="inline-flex min-h-9 items-center rounded border border-edito-border bg-edito-chip/60 px-2.5 text-[10px] font-bold text-edito-muted">
            Source indisponible
          </span>
        )}
        <ContextualCommunicationButton
          entryPoint="signal_card"
          companyId={company.id}
          companyName={company.name}
          primaryEntity={{ type: "company", id: company.id }}
          label="Créer un mail / pitch"
          refs={{ signalRef: signal.id }}
          className="min-h-9 text-[10px]"
        />
      </div>
    </li>
  )
}

export function ClientIntelligenceHomeTab({ data, onOpenTab }: ClientIntelligenceHomeTabProps) {
  const router = useRouter()
  const [documentsOpen, setDocumentsOpen] = useState(false)
  const [planningChoiceOpen, setPlanningChoiceOpen] = useState(false)
  const [eventDrawerOpen, setEventDrawerOpen] = useState(false)
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const mainWindow = selectPrimaryCommercialWindow(data.sectorSnapshot?.regulatoryItems ?? [])
  const windowExpired = mainWindow ? isCommercialWindowExpired(mainWindow) : false
  const eventInitialValues = useMemo<AgendaEventDrawerInitialValues>(() => ({
    company: { id: data.company.id, name: data.company.name, isNew: false },
  }), [data.company.id, data.company.name])

  const windowBadge = mainWindow
    ? windowExpired ? "Échéance dépassée" : URGENCY_LABELS[mainWindow.urgency.toLowerCase()] ?? humanize(mainWindow.urgency)
    : null

  return (
    <div className="space-y-6 py-6">
      <ProcessRail data={data} onOpenTab={onOpenTab} />

      <div className="grid gap-6 min-[1180px]:grid-cols-12">
        <div className="min-w-0 min-[1180px]:col-span-7">
          <AccountWatchSettingsCard
            companyId={data.company.id}
            initialSettings={data.accountWatch}
            overview={data.accountWatchOverview}
            variant="desktopHome"
            desktopSignals={<RecentSignals data={data} />}
          />
        </div>

        <div className="min-w-0 space-y-6 min-[1180px]:col-span-5">
          <SectionBlock
            title="Contenu lié au compte"
            action={
              <button
                type="button"
                onClick={() => setDocumentsOpen(true)}
                className="min-h-10 rounded border border-white/35 px-3 text-[10px] font-bold text-white transition-colors hover:border-white/70 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-brass"
              >
                Consulter la bibliothèque
              </button>
            }
          >
            <div className="py-3">
              {data.recentDocuments.length > 0 ? (
                <ul className="divide-y divide-edito-border">
                  {data.recentDocuments.map((document) => (
                    <li key={document.id} className="flex items-center gap-3 py-3 first:pt-1 last:pb-1">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded border border-edito-border bg-edito-chip">
                        <Image src={documentIcon(document)} alt="" width={22} height={22} className="size-5 object-contain" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-xs font-bold leading-5 text-edito-heading">{document.title}</p>
                        <p className="mt-0.5 text-[10px] text-edito-muted">
                          {documentTypeLabel(document.documentType)} · {formatDate(document.createdAt)}
                        </p>
                      </div>
                      <span className="shrink-0 rounded border border-edito-border bg-edito-chip px-1.5 py-0.5 text-[9px] font-bold text-edito-body">
                        {DOCUMENT_STATUS_LABELS[document.status] ?? humanize(document.status)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs italic text-edito-muted">Aucun contenu n’a encore été créé pour ce compte.</p>
              )}
            </div>
          </SectionBlock>

          <SectionBlock
            title="Activité commerciale"
            action={
              <button
                type="button"
                onClick={() => setPlanningChoiceOpen(true)}
                aria-haspopup="dialog"
                aria-expanded={planningChoiceOpen}
                className="min-h-10 rounded border border-white/35 px-3 text-[10px] font-bold text-white transition-colors hover:border-white/70 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-brass"
              >
                Planifier
              </button>
            }
          >
            <div className="py-3">
              {data.latestCommercialActivity ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded border border-edito-border bg-edito-chip px-2 py-1 text-[10px] font-bold text-edito-heading">
                      {interactionTypeLabel(data.latestCommercialActivity.type)}
                    </span>
                    <span className="text-[10px] text-edito-muted">{formatDateTime(data.latestCommercialActivity.occurredAt)}</span>
                  </div>
                  <p className="text-xs leading-relaxed text-edito-body">
                    {data.latestCommercialActivity.summary ?? "Aucun résumé disponible."}
                  </p>
                  {data.latestCommercialActivity.contactName ? (
                    <p className="text-[10px] font-semibold text-edito-muted">Contact · {data.latestCommercialActivity.contactName}</p>
                  ) : null}
                  {data.latestCommercialActivity.nextAction ? (
                    <div className="border-l-2 border-edito-brass pl-3 text-[11px] leading-relaxed text-edito-body">
                      <span className="font-bold text-edito-heading">Prochaine action · </span>
                      {data.latestCommercialActivity.nextAction}
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="text-xs italic text-edito-muted">Aucune activité commerciale enregistrée pour ce compte.</p>
              )}
            </div>
          </SectionBlock>

          <SectionBlock
            title="Fenêtre commerciale"
            action={windowBadge ? (
              <span className="rounded border border-white/30 bg-white/10 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-white">
                {windowBadge}
              </span>
            ) : undefined}
          >
            <div className="py-3">
              {!data.sectorSnapshot ? (
                <p className="text-xs italic text-edito-muted">Aucune fenêtre commerciale structurée n’est disponible pour ce compte.</p>
              ) : !mainWindow ? (
                <p className="text-xs italic text-edito-muted">Aucune fenêtre commerciale active n’est identifiée pour ce secteur.</p>
              ) : (
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-bold leading-5 text-edito-heading">{mainWindow.name}</h4>
                    <p className="mt-1 text-[10px] text-edito-muted">
                      {[mainWindow.authority, mainWindow.deadlineDate ? `${windowExpired ? "Échéance dépassée" : "Échéance"} · ${formatDate(mainWindow.deadlineDate)}` : "Sans échéance datée"].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  {mainWindow.description ? <p className="text-xs leading-relaxed text-edito-body">{mainWindow.description}</p> : null}
                  {mainWindow.commercialAngle ? (
                    <div className="border-l-2 border-edito-brass bg-edito-chip/60 px-3 py-2.5">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-edito-heading">Angle commercial KREDO</p>
                      <p className="mt-1 text-[11px] leading-relaxed text-edito-body">{mainWindow.commercialAngle}</p>
                    </div>
                  ) : null}
                  <div className="flex flex-wrap items-center gap-2">
                    {mainWindow.kredoPractice ? (
                      <span className="rounded border border-edito-border bg-edito-chip px-2 py-1 text-[10px] font-semibold text-edito-body">
                        Practice · {mainWindow.kredoPractice}
                      </span>
                    ) : null}
                    {mainWindow.sourceUrl ? (
                      <a
                        href={mainWindow.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-9 items-center text-[10px] font-bold text-edito-navy underline decoration-edito-brass underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edito-navy/30"
                      >
                        Consulter la source
                      </a>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          </SectionBlock>
        </div>
      </div>

      <CompanyDocumentsModal
        open={documentsOpen}
        onClose={() => setDocumentsOpen(false)}
        companyId={data.company.id}
        companyName={data.company.name}
        isMobile={false}
      />

      <AppDialog
        open={planningChoiceOpen}
        onOpenChange={setPlanningChoiceOpen}
        title="Planifier"
        description="Choisissez l’action à créer pour ce compte."
      >
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => {
              setPlanningChoiceOpen(false)
              setEventDrawerOpen(true)
            }}
            className="min-h-12 rounded border border-border bg-canvas/40 px-3 text-left text-xs font-bold text-heading transition-colors hover:border-primary hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            Créer un événement
          </button>
          <button
            type="button"
            onClick={() => {
              setPlanningChoiceOpen(false)
              setTaskModalOpen(true)
            }}
            className="min-h-12 rounded border border-border bg-canvas/40 px-3 text-left text-xs font-bold text-heading transition-colors hover:border-primary hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            Créer une tâche
          </button>
        </div>
      </AppDialog>

      <AgendaEventDrawer
        open={eventDrawerOpen}
        onOpenChange={setEventDrawerOpen}
        event={null}
        initialValues={eventInitialValues}
        onSaved={() => {
          setEventDrawerOpen(false)
          router.refresh()
        }}
      />

      <TaskCreateModal
        open={taskModalOpen}
        onOpenChange={setTaskModalOpen}
        entityType="company"
        entityId={data.company.id}
        onCreated={() => router.refresh()}
      />
    </div>
  )
}

"use client"

import { useState, useTransition, useEffect } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { AccountSignalDetailDrawer } from "./AccountSignalDetailDrawer"
import { AddSignalDrawer } from "./AddSignalDrawer"
import { dismissAccountSignal } from "./dismiss-account-signal"
import { createTask } from "@/lib/tasks/task-actions"
import { ContextualCommunicationButton } from "@/components/communication/ContextualCommunicationButton"
import { Button } from "@/components/ui/Button"
import type {
  ClientIntelligenceContact,
  ClientIntelligenceMission,
  ClientIntelligenceOpportunity,
  ClientIntelligenceSignal,
} from "@/lib/intelligence/intelligence-data"
import type {
  AccountKnowledgeContent,
  AccountKnowledgeFact,
} from "@/lib/intelligence/account-intelligence-contracts"
import { SectionBlock, FactProvenanceBadge } from "./intelligence-parts"
import {
  curateAccountKnowledgeFact,
  type AccountKnowledgeFactSection,
} from "./curate-account-knowledge"

// ADR-0012 Lot 2 — blocs "Connaissance compte" : relationnel KREDO (toujours
// disponible, sans run n8n) + rendu du contrat account_knowledge généré
// (moteur, avec curation D-4). Fichier séparé pour ne pas alourdir davantage
// ClientIntelligenceDesktopView.tsx/ClientIntelligenceMobileView.tsx (déjà
// volumineux) — importé par les deux.

const RELATIONSHIP_ROLE_LABELS: Record<string, string> = {
  decideur: "Décideur",
  prescripteur: "Prescripteur",
  acheteur: "Acheteur",
  operationnel: "Opérationnel",
  sponsor: "Sponsor",
  utilisateur_final: "Utilisateur final",
  rh: "RH",
  manager_technique: "Manager technique",
  dsi: "DSI",
  direction_metier: "Direction métier",
}

function roleLabel(role: string | null): string {
  if (!role) return "Rôle non renseigné"
  return RELATIONSHIP_ROLE_LABELS[role] ?? role
}

const OPPORTUNITY_STAGE_LABELS: Record<string, string> = {
  detection: "Détection",
  qualification: "Qualification",
  besoin_confirme: "Besoin confirmé",
  recherche_profil: "Recherche profil",
  cv_envoyes: "CV envoyés",
  entretien_client: "Entretien client",
  negociation: "Négociation",
  gagne: "Gagné",
  perdu: "Perdu",
  abandonne: "Abandonné",
}

const CLOSED_STAGES = new Set(["gagne", "perdu", "abandonne"])

function formatEuro(value: number | null): string {
  if (value === null) return "—"
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value)
}

function formatDate(value: string | null): string {
  if (!value) return "—"
  try {
    return new Date(value).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
  } catch {
    return value
  }
}

// ─── Contacts clés — groupés par rôle, priorité en tête ─────────────────────

export function ContactsKeyCard({ contacts }: { contacts: ClientIntelligenceContact[] }) {
  if (contacts.length === 0) {
    return (
      <SectionBlock title="Contacts clés">
        <p className="text-xs text-muted">Aucun contact renseigné pour ce compte.</p>
      </SectionBlock>
    )
  }

  const sorted = [...contacts].sort((a, b) => {
    if ((b.isPriority ? 1 : 0) !== (a.isPriority ? 1 : 0)) return (b.isPriority ? 1 : 0) - (a.isPriority ? 1 : 0)
    return a.fullName.localeCompare(b.fullName)
  })

  return (
    <SectionBlock title={`Contacts clés (${contacts.length})`}>
      <div className="space-y-1.5">
        {sorted.slice(0, 12).map((contact) => (
          <div
            key={contact.id}
            className="flex items-center justify-between gap-3 rounded border border-border/60 bg-canvas/40 px-3 py-2"
          >
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-heading">{contact.fullName}</p>
              <p className="truncate text-[11px] text-muted">
                {contact.jobTitle ?? "Fonction non renseignée"}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              {contact.isPriority && (
                <span className="rounded border border-brand-brass/30 bg-brand-brass/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-brand-brass">
                  Prioritaire
                </span>
              )}
              <span className="rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] font-semibold text-body">
                {roleLabel(contact.relationshipRole)}
              </span>
            </div>
          </div>
        ))}
        {contacts.length > 12 && (
          <p className="pt-1 text-[11px] text-muted">+{contacts.length - 12} autres contacts</p>
        )}
      </div>
    </SectionBlock>
  )
}

// ─── Relation commerciale — opportunités + missions ─────────────────────────

export function CommercialRelationCard({
  opportunities,
  missions,
}: {
  opportunities: ClientIntelligenceOpportunity[]
  missions: ClientIntelligenceMission[]
}) {
  const openOpportunities = opportunities.filter((o) => !CLOSED_STAGES.has(o.stage))
  const activeMissions = missions.filter((m) => m.status === "active")

  if (opportunities.length === 0 && missions.length === 0) {
    return (
      <SectionBlock title="Relation commerciale">
        <p className="text-xs text-muted">Aucune opportunité ni mission enregistrée pour ce compte.</p>
      </SectionBlock>
    )
  }

  return (
    <SectionBlock title="Relation commerciale">
      <div className="space-y-4">
        {openOpportunities.length > 0 && (
          <div>
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted">
              Opportunités ouvertes ({openOpportunities.length})
            </p>
            <div className="space-y-1.5">
              {openOpportunities.slice(0, 5).map((opp) => (
                <div key={opp.id} className="flex items-center justify-between gap-3 rounded border border-border/60 bg-canvas/40 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-heading">{opp.title}</p>
                    <p className="truncate text-[11px] text-muted">
                      {OPPORTUNITY_STAGE_LABELS[opp.stage] ?? opp.stage}
                      {opp.nextActionLabel ? ` · ${opp.nextActionLabel}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 font-mono text-xs font-bold text-heading">
                    {formatEuro(opp.weightedGain ?? opp.estimatedGain)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        {activeMissions.length > 0 && (
          <div>
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted">
              Missions actives ({activeMissions.length})
            </p>
            <div className="space-y-1.5">
              {activeMissions.slice(0, 5).map((mission) => (
                <div key={mission.id} className="flex items-center justify-between gap-3 rounded border border-border/60 bg-canvas/40 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-heading">{mission.title}</p>
                    <p className="truncate text-[11px] text-muted">
                      {mission.roleTitle ?? mission.practice ?? "—"} · depuis {formatDate(mission.startDate)}
                    </p>
                  </div>
                  {mission.grossMarginPct !== null && (
                    <span className="shrink-0 font-mono text-xs font-bold text-heading">
                      {mission.grossMarginPct.toFixed(0)}% marge
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        {openOpportunities.length === 0 && activeMissions.length === 0 && (
          <p className="text-xs text-muted">Aucune opportunité ouverte ni mission active actuellement.</p>
        )}
      </div>
    </SectionBlock>
  )
}

// ─── Signaux propres au compte ──────────────────────────────────────────────

function ScorePill({ value, label }: { value: number; label: string }) {
  const pct = Math.round(value * 100)
  const tone =
    value >= 0.8 ? "border-danger/25 bg-danger/10 text-danger" :
    value >= 0.6 ? "border-warning/25 bg-warning/10 text-warning" :
    "border-border bg-surface text-muted"

  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-bold", tone)}
      title={`${label} : ${pct}%`}
    >
      {pct}%
    </span>
  )
}

export function AccountSignalsCard({
  signals: initialSignals,
  isMobile = false,
  companyId,
  companyName,
}: {
  signals: ClientIntelligenceSignal[]
  isMobile?: boolean
  companyId: string
  companyName: string
}) {
  const router = useRouter()
  const [signals, setSignals] = useState<ClientIntelligenceSignal[]>(initialSignals)
  const [selectedSignal, setSelectedSignal] = useState<ClientIntelligenceSignal | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false)
  const [pendingActionId, setPendingActionId] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const [feedbacks, setFeedbacks] = useState<Record<string, { tone: "success" | "error"; message: string }>>({})

  useEffect(() => {
    setSignals(initialSignals)
  }, [initialSignals])

  const addButton = (
    <Button
      variant="secondary"
      size="sm"
      onClick={() => setIsAddDrawerOpen(true)}
    >
      {isMobile ? "+ Ajouter" : "+ Ajouter un signal"}
    </Button>
  )

  if (signals.length === 0) {
    return (
      <SectionBlock title="Signaux du compte" action={addButton}>
        <p className="text-xs text-muted">Aucun signal actif détecté pour ce compte.</p>
        <AddSignalDrawer
          open={isAddDrawerOpen}
          onOpenChange={setIsAddDrawerOpen}
          companyId={companyId}
          companyName={companyName}
          onSignalAdded={() => router.refresh()}
        />
      </SectionBlock>
    )
  }

  function handleDismiss(signalId: string) {
    setPendingActionId(signalId)
    startTransition(async () => {
      const result = await dismissAccountSignal(signalId)
      setPendingActionId(null)
      if (!result.error) {
        setSignals((current) => current.filter((s) => s.id !== signalId))
      } else {
        setFeedbacks((prev) => ({ ...prev, [signalId]: { tone: "error", message: result.error! } }))
      }
    })
  }

  function handleCreateTask(signal: ClientIntelligenceSignal) {
    setPendingActionId(signal.id)
    startTransition(async () => {
      const priority = signal.urgencyScore >= 0.8
        ? "urgent"
        : signal.globalScore >= 0.7
          ? "high"
          : "normal"

      const description = [
        signal.summary,
        signal.primarySource ? `Source : ${signal.primarySource.source_name}` : null,
        `Score global : ${signal.globalScore}`
      ].filter(Boolean).join("\n")

      const result = await createTask({
        title: signal.recommendedAction || signal.title,
        description,
        priority,
        entity_type: "company",
        entity_id: companyId,
      })

      setPendingActionId(null)
      if (result.error) {
        setFeedbacks((prev) => ({ ...prev, [signal.id]: { tone: "error", message: `Erreur : ${result.error}` } }))
      } else {
        setFeedbacks((prev) => ({ ...prev, [signal.id]: { tone: "success", message: "Tâche créée !" } }))
        setTimeout(() => {
          setFeedbacks((prev) => {
            const next = { ...prev }
            delete next[signal.id]
            return next
          })
        }, 3000)
      }
    })
  }

  function handleOpenDetails(signal: ClientIntelligenceSignal) {
    setSelectedSignal(signal)
    setIsDrawerOpen(true)
  }

  if (isMobile) {
    return (
      <SectionBlock title={`Signaux du compte (${signals.length})`} action={addButton}>
        <div className="space-y-3">
          {signals.map((signal) => {
            const feedback = feedbacks[signal.id]
            return (
              <div key={signal.id} className="rounded-lg border border-border bg-surface p-3.5 shadow-sm space-y-3">
                <div className="flex items-start justify-between gap-2" onClick={() => handleOpenDetails(signal)}>
                  <div className="min-w-0 flex-1 cursor-pointer">
                    <p className="text-xs font-bold text-heading hover:underline">{signal.title}</p>
                    <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
                      {signal.type ?? signal.category ?? "signal"}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1 items-center">
                    <span className="text-[10px] text-muted mr-1">{formatDate(signal.detectedAt)}</span>
                    <ScorePill value={signal.globalScore} label="Score Global" />
                  </div>
                </div>

                {signal.summary && (
                  <p className="text-xs text-body leading-relaxed line-clamp-2" onClick={() => handleOpenDetails(signal)}>
                    {signal.summary}
                  </p>
                )}

                {feedback && (
                  <p className={cn("text-[10px] font-semibold", feedback.tone === "success" ? "text-success" : "text-danger")}>
                    {feedback.message}
                  </p>
                )}

                {/* Actions : 3 actions max visibles */}
                <div className="flex items-center gap-2 pt-2 border-t border-border/40">
                  <ContextualCommunicationButton
                    entryPoint="signal_card"
                    companyId={companyId}
                    companyName={companyName}
                    refs={{ signalRef: signal.id }}
                    label="Pitch"
                    className="flex-1 justify-center min-h-[32px] text-[11px] font-bold"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleCreateTask(signal)}
                    loading={pendingActionId === signal.id}
                    disabled={pendingActionId !== null}
                    className="flex-1 justify-center min-h-[32px] text-[11px] font-bold"
                  >
                    Tâche
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDismiss(signal.id)}
                    loading={pendingActionId === signal.id}
                    disabled={pendingActionId !== null}
                    className="flex-1 justify-center min-h-[32px] text-[11px] font-bold text-muted hover:text-danger"
                  >
                    Ignorer
                  </Button>
                </div>
              </div>
            )
          })}
        </div>

        <AccountSignalDetailDrawer
          signal={selectedSignal}
          open={isDrawerOpen}
          onOpenChange={setIsDrawerOpen}
          companyId={companyId}
          companyName={companyName}
          onDismiss={(id) => setSignals((current) => current.filter((s) => s.id !== id))}
        />

        <AddSignalDrawer
          open={isAddDrawerOpen}
          onOpenChange={setIsAddDrawerOpen}
          companyId={companyId}
          companyName={companyName}
          onSignalAdded={() => router.refresh()}
        />
      </SectionBlock>
    )
  }

  // Desktop layout (Compact Table/List)
  return (
    <SectionBlock title={`Signaux du compte (${signals.length})`} action={addButton}>
      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-border bg-canvas/30 text-[10px] font-bold uppercase tracking-wider text-muted">
              <th className="px-4 py-3">Signal</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3 text-center">Score Global</th>
              <th className="px-4 py-3 text-center">Urgence</th>
              <th className="px-4 py-3">Détecté le</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {signals.map((signal) => {
              const feedback = feedbacks[signal.id]
              return (
                <tr
                  key={signal.id}
                  className="transition-colors hover:bg-canvas/20"
                >
                  {/* Title & Summary */}
                  <td className="px-4 py-3.5 max-w-sm">
                    <button
                      type="button"
                      onClick={() => handleOpenDetails(signal)}
                      className="text-left font-bold text-heading hover:underline focus:outline-none"
                    >
                      {signal.title}
                    </button>
                    {signal.summary && (
                      <p className="mt-0.5 text-[11px] text-body line-clamp-1">
                        {signal.summary}
                      </p>
                    )}
                    {feedback && (
                      <p className={cn("mt-1 text-[10px] font-semibold", feedback.tone === "success" ? "text-success" : "text-danger")}>
                        {feedback.message}
                      </p>
                    )}
                  </td>
                  {/* Category/Type */}
                  <td className="px-4 py-3.5 align-middle text-muted whitespace-nowrap">
                    {signal.type ?? signal.category ?? "signal"}
                  </td>
                  {/* Score Global */}
                  <td className="px-4 py-3.5 align-middle text-center">
                    <ScorePill value={signal.globalScore} label="Score Global" />
                  </td>
                  {/* Urgence */}
                  <td className="px-4 py-3.5 align-middle text-center">
                    <ScorePill value={signal.urgencyScore} label="Urgence" />
                  </td>
                  {/* Date */}
                  <td className="px-4 py-3.5 align-middle text-muted whitespace-nowrap">
                    {formatDate(signal.detectedAt)}
                  </td>
                  {/* Actions */}
                  <td className="px-4 py-3.5 align-middle text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <ContextualCommunicationButton
                        entryPoint="signal_card"
                        companyId={companyId}
                        companyName={companyName}
                        refs={{ signalRef: signal.id }}
                        label="Pitch"
                        size="sm"
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleCreateTask(signal)}
                        loading={pendingActionId === signal.id}
                        disabled={pendingActionId !== null}
                      >
                        Tâche
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDismiss(signal.id)}
                        loading={pendingActionId === signal.id}
                        disabled={pendingActionId !== null}
                        className="text-muted hover:text-danger"
                      >
                        Ignorer
                      </Button>
                      <button
                        type="button"
                        onClick={() => handleOpenDetails(signal)}
                        className="rounded border border-border/80 bg-surface px-2 py-1 text-[10px] font-semibold text-body hover:bg-canvas transition-colors"
                      >
                        Détails
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <AccountSignalDetailDrawer
        signal={selectedSignal}
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        companyId={companyId}
        companyName={companyName}
        onDismiss={(id) => setSignals((current) => current.filter((s) => s.id !== id))}
      />

      <AddSignalDrawer
        open={isAddDrawerOpen}
        onOpenChange={setIsAddDrawerOpen}
        companyId={companyId}
        companyName={companyName}
        onSignalAdded={() => router.refresh()}
      />
    </SectionBlock>
  )
}

// ─── Contenu généré account_knowledge — avec curation (D-4) ────────────────

const SECTION_LABELS: Record<AccountKnowledgeFactSection, string> = {
  identity_positioning: "Identité & positionnement",
  commercial_relationship: "Relation commerciale (synthèse IA)",
  organisation_observed: "Organisation & process observés",
  frictions_and_signals: "Frictions & signaux",
  open_questions: "Hypothèses à valider",
}

function FactRow({
  fact,
  resultId,
  section,
  index,
}: {
  fact: AccountKnowledgeFact
  resultId: string
  section: AccountKnowledgeFactSection
  index: number
}) {
  const [current, setCurrent] = useState(fact)
  const [isPending, startTransition] = useTransition()

  function act(action: "confirm" | "dismiss" | "restore" | "pin" | "unpin") {
    startTransition(async () => {
      const { error } = await curateAccountKnowledgeFact(resultId, section, index, action)
      if (!error) {
        setCurrent((prev) => {
          if (action === "confirm") return { ...prev, provenance: "human_verified", dismissed: false }
          if (action === "dismiss") return { ...prev, dismissed: true }
          if (action === "restore") return { ...prev, dismissed: false }
          if (action === "pin") return { ...prev, pinned: true }
          return { ...prev, pinned: false }
        })
      }
    })
  }

  if (current.dismissed) {
    return (
      <div className="flex items-center justify-between gap-3 rounded border border-border/40 bg-canvas/20 px-3 py-2 opacity-60">
        <p className="truncate text-xs text-muted line-through">{current.text}</p>
        <button
          type="button"
          disabled={isPending}
          onClick={() => act("restore")}
          className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-muted hover:text-body"
        >
          Restaurer
        </button>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 rounded border px-3 py-2",
        current.pinned ? "border-brand-brass/30 bg-brand-brass/5" : "border-border/60 bg-canvas/40",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap mb-1">
          <FactProvenanceBadge provenance={current.provenance} />
          {current.pinned && (
            <span className="rounded border border-brand-brass/30 bg-brand-brass/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-brand-brass">
              Épinglé
            </span>
          )}
        </div>
        <p className="text-xs leading-relaxed text-body">{current.text}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {current.provenance !== "human_verified" && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => act("confirm")}
            title="Confirmer ce fait"
            className="rounded p-1 text-success hover:bg-success/10"
          >
            ✓
          </button>
        )}
        <button
          type="button"
          disabled={isPending}
          onClick={() => act(current.pinned ? "unpin" : "pin")}
          title={current.pinned ? "Désépingler" : "Épingler"}
          className="rounded p-1 text-brand-brass hover:bg-brand-brass/10"
        >
          ★
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => act("dismiss")}
          title="Écarter ce fait"
          className="rounded p-1 text-muted hover:bg-danger/10 hover:text-danger"
        >
          ✕
        </button>
      </div>
    </div>
  )
}

function FactSectionBlock({
  section,
  facts,
  resultId,
}: {
  section: AccountKnowledgeFactSection
  facts: AccountKnowledgeFact[]
  resultId: string
}) {
  if (facts.length === 0) return null
  return (
    <SectionBlock title={SECTION_LABELS[section]}>
      <div className="space-y-1.5">
        {facts.map((fact, i) => (
          <FactRow key={i} fact={fact} resultId={resultId} section={section} index={i} />
        ))}
      </div>
    </SectionBlock>
  )
}

export function AccountKnowledgeGeneratedContent({
  data,
  resultId,
}: {
  data: AccountKnowledgeContent
  resultId: string
}) {
  const sections: AccountKnowledgeFactSection[] = [
    "identity_positioning",
    "commercial_relationship",
    "organisation_observed",
    "frictions_and_signals",
    "open_questions",
  ]

  return (
    <div className="space-y-4">
      {sections.map((section) => (
        <FactSectionBlock key={section} section={section} facts={data[section]} resultId={resultId} />
      ))}
      {data.key_contacts.length > 0 && (
        <SectionBlock title="Carte des interlocuteurs (synthèse IA)">
          <div className="space-y-1.5">
            {data.key_contacts.map((kc, i) => (
              <div key={i} className="rounded border border-border/60 bg-canvas/40 px-3 py-2">
                <p className="text-xs leading-relaxed text-body">{kc.role_summary}</p>
              </div>
            ))}
          </div>
        </SectionBlock>
      )}
    </div>
  )
}

"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { createPortal } from "react-dom"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { relationshipRoleLabel } from "@/lib/accounts-contacts/contact-constants"
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
import {
  getInitialAccountSignals,
  hasVisibleOpenQuestions,
} from "@/lib/intelligence/client-intelligence-company"

// ADR-0012 Lot 2 — blocs "Connaissance compte" : relationnel KREDO (toujours
// disponible, sans run n8n) + rendu du contrat account_knowledge généré
// (moteur, avec curation D-4). Fichier séparé pour ne pas alourdir davantage
// ClientIntelligenceDesktopView.tsx/ClientIntelligenceMobileView.tsx (déjà
// volumineux) — importé par les deux.

function roleLabel(role: string | null): string {
  if (!role) return "Rôle non renseigné"
  return relationshipRoleLabel(role)
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

// tone="risk" (défaut) : une valeur haute est alarmante (urgence) → rouge/ambre.
// tone="opportunity" : une valeur haute est une BONNE nouvelle (intérêt
// commercial) → vert/or. Réutiliser le même dégradé rouge pour les deux aurait
// affiché "fort intérêt pour Kredo" comme un signal d'alerte.
function ScorePill({ value, label, tone = "risk" }: { value: number; label: string; tone?: "risk" | "opportunity" }) {
  const pct = Math.round(value * 100)
  const toneClass = tone === "opportunity"
    ? value >= 0.6 ? "border-success/25 bg-success/10 text-success" :
      value >= 0.35 ? "border-brand-brass/30 bg-brand-brass/10 text-brand-brass" :
      "border-border bg-surface text-muted"
    : value >= 0.8 ? "border-danger/25 bg-danger/10 text-danger" :
      value >= 0.6 ? "border-warning/25 bg-warning/10 text-warning" :
      "border-border bg-surface text-muted"

  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-bold", toneClass)}
      title={`${label} : ${pct}%`}
    >
      {pct}%
    </span>
  )
}

// Lien coloré vers la source primaire — élément visuel distinctif volontairement
// distinct des couleurs déjà utilisées par les boutons d'action (navy/brass/rouge)
// pour ne pas laisser croire que le nom de la source est lui-même une action.
function SignalSourceLink({ source }: { source: ClientIntelligenceSignal["primarySource"] }) {
  if (!source) return <span className="text-[11px] font-semibold text-muted">Source inconnue</span>
  if (!source.source_url) {
    return <span className="text-[11px] font-semibold text-info">{source.source_name}</span>
  }
  return (
    <a
      href={source.source_url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="text-[11px] font-semibold text-info hover:underline"
    >
      {source.source_name}
    </a>
  )
}

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="size-3" aria-hidden="true">
      <path d="M6 3.5L10.5 8L6 12.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function DotsVerticalIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className="size-4" aria-hidden="true">
      <circle cx="8" cy="3" r="1.4" />
      <circle cx="8" cy="8" r="1.4" />
      <circle cx="8" cy="13" r="1.4" />
    </svg>
  )
}

function formatUpdatedAtLabel(lastUpdatedAt: string | null): string {
  if (!lastUpdatedAt) return ""
  return ` — dernière mise à jour le ${formatDate(lastUpdatedAt)}`
}

// Menu contextuel "⋮" — remplace les 3 boutons d'action distincts de la
// colonne Actions par un seul déclencheur, pour redonner sa largeur à la
// colonne Signal. Fermeture au clic extérieur reprise de
// CommunicationIntentMenu.tsx ; positionnement en portail repris de
// Select.tsx — le tableau parent a un wrapper `overflow-hidden` (coins
// arrondis, border-collapse empêche de le poser directement sur <table>),
// qui couperait le menu ouvert sur la dernière ligne visible sans portail.
function SignalActionsMenu({
  signal,
  companyId,
  companyName,
  isPending,
  onCreateTask,
  onDismiss,
}: {
  signal: ClientIntelligenceSignal
  companyId: string
  companyName: string
  isPending: boolean
  onCreateTask: () => void
  onDismiss: () => void
}) {
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)

  const updateCoords = () => {
    const rect = triggerRef.current?.getBoundingClientRect()
    if (!rect) return
    // Ancré au coin bas-droit du déclencheur ; le menu (w-40 = 10rem) déborde
    // à gauche du bord droit du bouton pour rester dans le viewport.
    setCoords({ top: rect.bottom + 4, left: rect.right - 160 })
  }

  useEffect(() => {
    if (!open) return
    updateCoords()
    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node
      if (triggerRef.current?.contains(target)) return
      if (menuRef.current?.contains(target)) return
      setOpen(false)
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false)
    }
    document.addEventListener("pointerdown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)
    window.addEventListener("resize", updateCoords)
    window.addEventListener("scroll", updateCoords, { capture: true })
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("resize", updateCoords)
      window.removeEventListener("scroll", updateCoords, { capture: true })
    }
  }, [open])

  const menuItemClassName = "flex w-full items-center rounded px-3 py-2 text-left text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-[var(--opacity-disabled)]"

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Actions sur ce signal"
        onClick={(event) => {
          event.stopPropagation()
          setOpen((current) => !current)
        }}
        className="inline-flex size-9 items-center justify-center rounded border border-border bg-surface text-body transition-colors hover:bg-canvas focus-visible:outline-none focus-visible:ring-[var(--focus-ring-width)] focus-visible:ring-[var(--focus-ring-color)]"
      >
        <DotsVerticalIcon />
      </button>
      {open && coords && typeof document !== "undefined" && createPortal(
        // onClick sur le conteneur : ferme le menu après le clic sur
        // n'importe quel item, par bubbling — sauf ContextualCommunicationButton
        // qui stoppe sa propagation par défaut (stopPropagation={false} ci-dessous).
        <div
          ref={menuRef}
          role="menu"
          onClick={() => setOpen(false)}
          style={{ position: "fixed", top: coords.top, left: coords.left }}
          className="z-50 w-40 rounded-lg border border-border bg-surface p-1 shadow-xl"
        >
          <ContextualCommunicationButton
            entryPoint="signal_card"
            companyId={companyId}
            companyName={companyName}
            refs={{ signalRef: signal.id }}
            label="Pitch"
            variant="ghost"
            size="sm"
            fullWidth
            stopPropagation={false}
            className="justify-start px-3 text-xs font-semibold"
          />
          <button
            role="menuitem"
            type="button"
            onClick={onCreateTask}
            disabled={isPending}
            className={cn(menuItemClassName, "text-body hover:bg-canvas")}
          >
            Tâche
          </button>
          <button
            role="menuitem"
            type="button"
            onClick={onDismiss}
            disabled={isPending}
            className={cn(menuItemClassName, "text-danger hover:bg-danger/10")}
          >
            Ignorer
          </button>
        </div>,
        document.body,
      )}
    </>
  )
}

export function AccountSignalsCard({
  signals: initialSignals,
  isMobile = false,
  variant = "default",
  companyId,
  companyName,
  lastUpdatedAt = null,
}: {
  signals: ClientIntelligenceSignal[]
  isMobile?: boolean
  variant?: "default" | "companyDesktop"
  companyId: string
  companyName: string
  /** account_watch.lastRunAt — dernière exécution de la veille. Repli sur la
   *  détection la plus récente si aucun run n'a encore réussi. */
  lastUpdatedAt?: string | null
}) {
  const router = useRouter()
  const [hiddenSignalIds, setHiddenSignalIds] = useState<Record<string, true>>({})
  const [selectedSignal, setSelectedSignal] = useState<ClientIntelligenceSignal | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false)
  const [pendingActionId, setPendingActionId] = useState<string | null>(null)
  const [showAllSignals, setShowAllSignals] = useState(false)
  const [, startTransition] = useTransition()
  const [feedbacks, setFeedbacks] = useState<Record<string, { tone: "success" | "error"; message: string }>>({})
  const signals = initialSignals.filter((signal) => !hiddenSignalIds[signal.id])
  // Les deux vues répliquent aux 5 plus récents et se déplient à l'identique —
  // "signals" est déjà trié par fraîcheur de parution (intelligence-data.ts),
  // on se contente de découper.
  const visibleSignals = showAllSignals ? signals : getInitialAccountSignals(signals)
  const resolvedUpdatedAt = lastUpdatedAt
    ?? signals.reduce<string | null>((latest, s) => {
      if (!latest) return s.detectedAt
      return new Date(s.detectedAt).getTime() > new Date(latest).getTime() ? s.detectedAt : latest
    }, null)
  const titleSuffix = formatUpdatedAtLabel(resolvedUpdatedAt)

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
      <SectionBlock title={`Signaux du compte${titleSuffix}`} action={addButton}>
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
        setHiddenSignalIds((current) => ({ ...current, [signalId]: true }))
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
      <SectionBlock title={`Signaux du compte (${signals.length})${titleSuffix}`} action={addButton}>
        <div className="space-y-3">
          {visibleSignals.map((signal) => {
            const feedback = feedbacks[signal.id]
            return (
              <div key={signal.id} className="rounded-lg border border-border bg-surface p-3.5 shadow-sm space-y-2">
                <div className="flex items-start justify-between gap-2" onClick={() => handleOpenDetails(signal)}>
                  <div className="min-w-0 flex-1 cursor-pointer">
                    <p className="text-xs font-bold text-heading hover:underline">{signal.title}</p>
                  </div>
                  <div className="flex shrink-0 items-center">
                    <ScorePill value={signal.interestScore} label="Intérêt" tone="opportunity" />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <SignalSourceLink source={signal.primarySource} />
                  <span className="shrink-0 text-[10px] text-muted">{formatDate(signal.publishedAt ?? signal.detectedAt)}</span>
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

        {signals.length > 5 && (
          <div className="mt-3 flex justify-center">
            <Button variant="ghost" size="sm" onClick={() => setShowAllSignals((current) => !current)}>
              {showAllSignals
                ? "Afficher les cinq plus récents"
                : `Afficher ${signals.length - 5} ${signals.length - 5 > 1 ? "signaux supplémentaires" : "signal supplémentaire"}`}
            </Button>
          </div>
        )}

        <AccountSignalDetailDrawer
          signal={selectedSignal}
          open={isDrawerOpen}
          onOpenChange={setIsDrawerOpen}
          companyId={companyId}
          companyName={companyName}
          onDismiss={(id) => setHiddenSignalIds((current) => ({ ...current, [id]: true }))}
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

  // Desktop layout (Compact Table/List) — les deux variants desktop en usage
  // réel (`companyDesktop`, `default`) rendent la même structure ; `variant`
  // ne pilote plus que le libellé du titre.
  return (
    <SectionBlock
      title={`${variant === "companyDesktop" ? "Signaux récents" : "Signaux du compte"} (${signals.length})${titleSuffix}`}
      action={addButton}
    >
      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <table className="w-full border-collapse text-left text-xs table-fixed">
          <thead>
            <tr className="border-b border-border bg-canvas/30 text-[10px] font-bold uppercase tracking-wider text-muted">
              {/* Largeur non contrainte : la colonne Signal absorbe tout l'espace
                  restant une fois les 3 colonnes de droite fixées. */}
              <th className="px-4 py-3">Signal</th>
              <th className="w-24 px-3 py-3 text-center">Intérêt</th>
              <th className="w-24 px-3 py-3 text-center">Urgence</th>
              <th className="w-16 px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {visibleSignals.map((signal) => {
              const feedback = feedbacks[signal.id]
              return (
                <tr
                  key={signal.id}
                  className="transition-colors hover:bg-canvas/20"
                >
                  {/* Title (+ Détails en fin de ligne), source datée & résumé */}
                  <td className="px-4 py-3.5">
                    <p className="font-bold text-heading">
                      {signal.title}{" "}
                      <button
                        type="button"
                        onClick={() => handleOpenDetails(signal)}
                        className="inline-flex items-center gap-0.5 rounded bg-primary px-1.5 py-0.5 align-middle text-[10px] font-bold text-primary-fg transition-colors hover:bg-primary-deep focus-visible:outline-none focus-visible:ring-[var(--focus-ring-width)] focus-visible:ring-[var(--focus-ring-color)]"
                      >
                        Détails
                        <ChevronRightIcon />
                      </button>
                    </p>
                    {signal.summary && (
                      <p className="mt-0.5 text-[11px] text-body line-clamp-1">
                        {signal.summary}
                      </p>
                    )}
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <SignalSourceLink source={signal.primarySource} />
                      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted">
                        {formatDate(signal.publishedAt ?? signal.detectedAt)}
                      </span>
                    </div>
                    {feedback && (
                      <p className={cn("mt-1 text-[10px] font-semibold", feedback.tone === "success" ? "text-success" : "text-danger")}>
                        {feedback.message}
                      </p>
                    )}
                  </td>
                  {/* Intérêt */}
                  <td className="px-3 py-3.5 align-middle text-center">
                    <ScorePill value={signal.interestScore} label="Intérêt" tone="opportunity" />
                  </td>
                  {/* Urgence */}
                  <td className="px-3 py-3.5 align-middle text-center">
                    <ScorePill value={signal.urgencyScore} label="Urgence" />
                  </td>
                  {/* Actions */}
                  <td className="px-4 py-3.5 align-middle text-right whitespace-nowrap">
                    <div className="flex items-center justify-end">
                      <SignalActionsMenu
                        signal={signal}
                        companyId={companyId}
                        companyName={companyName}
                        isPending={pendingActionId !== null}
                        onCreateTask={() => handleCreateTask(signal)}
                        onDismiss={() => handleDismiss(signal.id)}
                      />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {signals.length > 5 && (
        <div className="mt-3 flex justify-center">
          <Button variant="ghost" size="sm" onClick={() => setShowAllSignals((current) => !current)}>
            {showAllSignals
              ? "Afficher les cinq plus récents"
              : `Afficher ${signals.length - 5} ${signals.length - 5 > 1 ? "signaux supplémentaires" : "signal supplémentaire"}`}
          </Button>
        </div>
      )}

      <AccountSignalDetailDrawer
        signal={selectedSignal}
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        companyId={companyId}
        companyName={companyName}
        onDismiss={(id) => setHiddenSignalIds((current) => ({ ...current, [id]: true }))}
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

export function AccountKnowledgeOpenQuestions({
  data,
  resultId,
}: {
  data: AccountKnowledgeContent
  resultId: string
}) {
  if (!hasVisibleOpenQuestions(data.open_questions)) return null
  return (
    <FactSectionBlock
      section="open_questions"
      facts={data.open_questions}
      resultId={resultId}
    />
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

"use client"

import { useEffect, useState, useMemo } from "react"
import dynamic from "next/dynamic"
import { usePathname, useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { CompanyLogo } from "@/components/accounts-contacts/CompanyLogo"
import { cn } from "@/lib/utils"
import {
  resolveEntityActions,
  resolveCockpitDisplayMode,
  resolvePageCockpitConfig,
  ENTITY_TYPE_LABELS,
  type IntelligenceEntityType,
} from "@/lib/intelligence/intelligence-registry"
import { useIntelligenceContext } from "@/hooks/use-intelligence-context"
import { IntelligenceActionCard } from "./IntelligenceActionCard"
import { AppDrawer } from "@/components/ui/AppDrawer"
import { AppDialog } from "@/components/ui/AppDialog"
import { cockpitActionIcons } from "./cockpit-action-icons"
import { openCommunicationComposer } from "@/lib/communication/communication-composer"
import { CockpitReturnButton } from "@/components/intelligence/CockpitReturnButton"
import { COCKPIT_OPEN_EVENT, COCKPIT_RETURN_EVENT, returnToAccountCockpit } from "@/lib/intelligence/cockpit-navigation"
import type { AgendaEventDrawerInitialValues } from "@/components/agenda/AgendaEventDrawer"
import {
  IntelligenceActionResultContent,
  isDeterministicIntelligenceAction,
  type DeterministicIntelligenceActionId,
} from "./action-results/IntelligenceActionResultContent"
import { CockpitIntelligenceMobileContent } from "./cockpit-mobile/CockpitIntelligenceMobileContent"
import { CockpitIntelligenceHeader, CockpitIntelligenceShell } from "./cockpit-mobile/CockpitIntelligenceShell"

const AgendaEventTypePicker = dynamic(
  () => import("@/components/agenda/AgendaEventTypePicker").then((module) => module.AgendaEventTypePicker),
  { ssr: false },
)
const AgendaEventDrawer = dynamic(
  () => import("@/components/agenda/AgendaEventDrawer").then((module) => module.AgendaEventDrawer),
  { ssr: false },
)
const AccountWatchSettingsDialog = dynamic(
  () => import("@/components/accounts-contacts/intelligence/AccountWatchSettingsDialog").then((module) => module.AccountWatchSettingsDialog),
  { ssr: false },
)
const AccountSignalsDialog = dynamic(
  () => import("@/components/accounts-contacts/intelligence/AccountSignalsDialog").then((module) => module.AccountSignalsDialog),
  { ssr: false },
)
const AccountAnalysisHub = dynamic(
  () => import("@/components/intelligence/AccountAnalysisHub").then((module) => module.AccountAnalysisHub),
  { ssr: false },
)
const CompanyDocumentsModal = dynamic(
  () => import("@/components/accounts-contacts/intelligence/CompanyDocumentsModal").then((module) => module.CompanyDocumentsModal),
  { ssr: false },
)
const FinancialModelingMobileFlow = dynamic(
  () => import("@/features/financial-modeling/components/mobile/FinancialModelingMobileFlow").then((module) => module.FinancialModelingMobileFlow),
  { ssr: false },
)
const VeilleSimulatorModal = dynamic(
  () => import("@/components/automations/VeilleSimulatorModal").then((module) => module.VeilleSimulatorModal),
  { ssr: false },
)
const AccountRecruitmentDialog = dynamic(
  () => import("./AccountRecruitmentDialog").then((module) => module.AccountRecruitmentDialog),
  { ssr: false },
)
import { fetchVeilleSimulatorBaseline } from "@/lib/automations/run-journal-actions"
import type { VeilleSimulatorBaseline } from "@/lib/automations/veille-cadence"

type AccountPanelAction = "analysis" | null

function SparkleIcon() {
  return (
    <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z"
      />
    </svg>
  )
}

function MobileSectionHeading({ title, count }: { title: string; count?: number }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className="h-px w-4 bg-white/50" aria-hidden />
      <h3 className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/80">
        {title}
      </h3>
      {count !== undefined && (
        <span className="ml-auto rounded-full bg-white/14 px-1.5 py-px text-[10px] font-bold text-white/80">
          {count}
        </span>
      )}
    </div>
  )
}

const ACCOUNT_EDITORIAL_ACTIONS = [
  { id: "write", label: "Rédiger", iconSrc: cockpitActionIcons.message },
  { id: "plan", label: "Planifier", iconSrc: cockpitActionIcons.tasks },
  { id: "analyze", label: "Analyser", iconSrc: cockpitActionIcons.recommendations },
  { id: "watch", label: "S’informer", iconSrc: cockpitActionIcons.alert },
  { id: "simulate", label: "Simuler", iconSrc: cockpitActionIcons.financeReport },
  { id: "recruit", label: "Recruter", iconSrc: cockpitActionIcons.recruitmentReport },
] as const

function EditorialPanelAction({ action, onClick }: {
  action: (typeof ACCOUNT_EDITORIAL_ACTIONS)[number]
  onClick: () => void
}) {
  const content = (
    <>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-small)] border border-white/10 bg-white/10 transition-colors group-hover:border-brand-brass/30 group-hover:bg-brand-brass/15">
        <Image src={action.iconSrc} alt="" width={40} height={40} className="size-7 object-contain" />
      </span>
      <span className="text-sm font-bold text-white">{action.label}</span>
    </>
  )
  const className = "group flex min-h-[64px] items-center gap-2.5 rounded-[var(--radius-medium)] border border-white/15 bg-white/[0.08] px-3 text-left transition-[background-color,border-color,transform] hover:border-white/30 hover:bg-white/[0.14] active:scale-[0.98] active:bg-white/[0.18] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-brass/60"

  return <button type="button" onClick={onClick} className={className}>{content}</button>
}

function EditorialResourceRow({ label, iconSrc, href, onClick }: {
  label: string
  iconSrc: string
  href?: string
  onClick?: () => void
}) {
  const content = (
    <>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-small)] border border-white/10 bg-white/[0.08]">
        <Image src={iconSrc} alt="" width={32} height={32} className="size-5 object-contain" />
      </span>
      <span className="min-w-0 flex-1 text-sm font-semibold text-white">{label}</span>
      <svg className="size-4 shrink-0 text-brand-brass transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="m9 5 7 7-7 7" />
      </svg>
    </>
  )
  const className = "group flex min-h-12 w-full items-center gap-3 border-b border-white/15 px-1 py-2 text-left transition-colors last:border-b-0 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-brass/60"
  if (href) return <Link href={href} onClick={onClick} className={className}>{content}</Link>
  return <button type="button" onClick={onClick} className={className}>{content}</button>
}

type AccountInformationView = "menu" | "learnings"

function AccountInformationDialog({
  open,
  onOpenChange,
  companyName,
  view,
  onViewChange,
  onSignals,
  onSettings,
  onReturnToCockpit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  companyName: string
  view: AccountInformationView
  onViewChange: (view: AccountInformationView) => void
  onSignals: () => void
  onSettings: () => void
  onReturnToCockpit: () => void
}) {
  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={view === "learnings" ? "Synthèse des enseignements" : `S’informer · ${companyName}`}
      className="w-[min(calc(100vw-1rem),36rem)]"
    >
      <CockpitReturnButton onClick={onReturnToCockpit} className="mb-2" />
      {view === "learnings" ? (
        <div className="space-y-4">
          <button type="button" onClick={() => onViewChange("menu")} className="inline-flex min-h-11 items-center text-xs font-bold text-primary">
            ← Retour
          </button>
          <div className="rounded-[var(--radius-medium)] border border-dashed border-primary/35 bg-primary/5 px-5 py-8 text-center">
            <p className="text-sm font-bold text-heading">Récipient prêt</p>
            <p className="mt-2 text-xs leading-5 text-muted">
              Cette vue accueillera la production, la consultation et l’historique de la synthèse des enseignements issus de la veille du compte et de son segment métier.
            </p>
            <span className="mt-4 inline-flex rounded-full bg-canvas px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
              Fonctionnalité à venir
            </span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={onSignals} className="aspect-square rounded-[var(--radius-medium)] border border-primary/25 bg-primary/5 p-4 text-left transition-colors hover:bg-primary/10">
            <span className="block text-sm font-bold text-heading">Consulter les signaux</span>
            <span className="mt-2 block text-xs leading-5 text-muted">Ouvrir directement la veille de {companyName}.</span>
          </button>
          <button type="button" onClick={onSettings} className="aspect-square rounded-[var(--radius-medium)] border border-brand-brass/35 bg-brand-brass/5 p-4 text-left transition-colors hover:bg-brand-brass/10">
            <span className="block text-sm font-bold text-heading">Paramétrer la veille</span>
            <span className="mt-2 block text-xs leading-5 text-muted">Fréquence, sources, catégories et notes.</span>
          </button>
          <button type="button" onClick={() => onViewChange("learnings")} className="col-span-2 min-h-32 rounded-[var(--radius-medium)] border border-border bg-canvas p-4 text-left transition-colors hover:bg-surface-hover">
            <span className="block text-sm font-bold text-heading">Synthèse des enseignements</span>
            <span className="mt-2 block text-xs leading-5 text-muted">Préparer le futur document d’analyse consolidée.</span>
          </button>
        </div>
      )}
    </AppDialog>
  )
}

function AccountSimulationDialog({
  open,
  onOpenChange,
  companyName,
  onSelectFinancialModeling,
  onSelectAutomationSimulator,
  onReturnToCockpit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  companyName: string
  onSelectFinancialModeling: () => void
  onSelectAutomationSimulator: () => void
  onReturnToCockpit: () => void
}) {
  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Simuler · ${companyName}`}
      className="w-[min(calc(100vw-1rem),36rem)]"
    >
      <CockpitReturnButton onClick={onReturnToCockpit} className="mb-2" />
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={onSelectFinancialModeling}
          className="group flex min-h-[64px] w-full items-center justify-between rounded-[var(--radius-medium)] border border-primary/25 bg-primary/5 p-4 text-left transition-all hover:bg-primary/10 hover:border-primary/40 active:scale-[0.98]"
        >
          <div className="min-w-0 flex-1 pr-2">
            <span className="block text-sm font-bold text-heading">Modélisation financière AT</span>
            <span className="mt-1 block text-xs leading-relaxed text-muted">Simuler la rentabilité d’une assistance technique.</span>
          </div>
          <svg className="size-4 shrink-0 text-primary transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="m9 5 7 7-7 7" />
          </svg>
        </button>

        <button
          type="button"
          onClick={onSelectAutomationSimulator}
          className="group flex min-h-[64px] w-full items-center justify-between rounded-[var(--radius-medium)] border border-brand-brass/35 bg-brand-brass/5 p-4 text-left transition-all hover:bg-brand-brass/10 hover:border-brand-brass/50 active:scale-[0.98]"
        >
          <div className="min-w-0 flex-1 pr-2">
            <span className="block text-sm font-bold text-heading">Coûts des automatisations</span>
            <span className="mt-1 block text-xs leading-relaxed text-muted">Simuler l’impact du volume et de la cadence des automatisations.</span>
          </div>
          <svg className="size-4 shrink-0 text-brand-brass transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="m9 5 7 7-7 7" />
          </svg>
        </button>

        <div
          aria-disabled="true"
          className="flex min-h-[64px] w-full items-center justify-between rounded-[var(--radius-medium)] border border-border bg-canvas/60 p-4 text-left opacity-60 cursor-not-allowed"
        >
          <div className="min-w-0 flex-1 pr-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-heading">Scénarios financiers de revenus</span>
              <span className="rounded-full bg-surface border border-border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted">
                Bientôt disponible
              </span>
            </div>
            <span className="mt-1 block text-xs leading-relaxed text-muted">Simuler l’impact du gain ou de la perte d’opportunités sur les revenus.</span>
          </div>
        </div>
      </div>
    </AppDialog>
  )
}

function AccountMobileContent({ onWriteEmailClick, onPlanClick, onInformClick, onDocumentsClick, onSimulateClick, onRecruitClick, onClose }: {
  onWriteEmailClick: () => void
  onPlanClick: () => void
  onInformClick: () => void
  onDocumentsClick: () => void
  onSimulateClick: () => void
  onRecruitClick: () => void
  onClose: () => void
}) {
  const { panelData } = useIntelligenceContext()
  const [activeAction, setActiveAction] = useState<AccountPanelAction>(null)
  if (!panelData) return null

  const { company, sector } = panelData

  if (activeAction === "analysis") {
    return (
      <AccountAnalysisHub
        company={{ id: company.id, name: company.name, lifecycleStatus: company.lifecycleStatus, sectorId: company.sectorId }}
        onClose={() => setActiveAction(null)}
      />
    )
  }

  return (
    <div className="space-y-6">
      <section>
        <div className="mb-3 flex items-center gap-2">
          <span className="h-0.5 w-5 bg-brand-brass" aria-hidden="true" />
          <h3 className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/75">Actions</h3>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {ACCOUNT_EDITORIAL_ACTIONS.map((action) => (
            <EditorialPanelAction
              key={action.id}
              action={action}
              onClick={() => {
                if ("href" in action) {
                  onClose()
                  return
                }
                if (action.id === "write") onWriteEmailClick()
                if (action.id === "plan") onPlanClick()
                if (action.id === "analyze") setActiveAction("analysis")
                if (action.id === "watch") onInformClick()
                if (action.id === "simulate") onSimulateClick()
                if (action.id === "recruit") onRecruitClick()
              }}
            />
          ))}
        </div>
      </section>

      <section>
        <div className="mb-2 flex items-center gap-2 border-t border-white/15 pt-5">
          <span className="h-0.5 w-5 bg-brand-brass" aria-hidden="true" />
          <h3 className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/75">Ressources</h3>
        </div>
        <div>
          <EditorialResourceRow
            label="Account Intelligence"
            iconSrc={cockpitActionIcons.recommendations}
            onClick={() => {
              onClose()
              window.dispatchEvent(new CustomEvent("kredo:open-account-intelligence", { detail: { companyId: company.id } }))
            }}
          />
          <EditorialResourceRow
            label="Bibliothèque de documents"
            iconSrc="/icons_set/cockpit_intelligence/dossier_pitchs.png"
            onClick={onDocumentsClick}
          />
          <EditorialResourceRow label="Contacts" iconSrc="/icons_set/cockpit_intelligence/compte_contact.png" href={`/prospection/accounts/${company.id}/contacts`} onClick={onClose} />
          <EditorialResourceRow label="Playbook" iconSrc={cockpitActionIcons.sectorAnalysis} href={sector.structuredSectorSlug ? `/ressources/playbook/${sector.structuredSectorSlug}` : "/prospection/approche-sectorielle"} onClick={onClose} />
        </div>
      </section>
    </div>
  )
}

function GenericEntityMobileContent() {
  const { entityContext } = useIntelligenceContext()
  const [activeActionId, setActiveActionId] = useState<DeterministicIntelligenceActionId | null>(null)
  const nonCompanyType: Exclude<IntelligenceEntityType, "company"> | null =
    entityContext && entityContext.entityType !== "company" ? entityContext.entityType : null

  const resolved = useMemo(
    () => (nonCompanyType ? resolveEntityActions(nonCompanyType) : null),
    [nonCompanyType],
  )

  if (!entityContext || !resolved || !nonCompanyType) return null

  if (activeActionId) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setActiveActionId(null)}
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-white/70 transition-colors hover:text-white"
        >
          <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Retour
        </button>
        <div className="rounded-lg border border-border bg-surface p-4 text-body">
          <IntelligenceActionResultContent actionId={activeActionId} />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white/[0.14] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]">
        <p className="truncate text-xs font-bold text-white leading-tight">
          {entityContext.label}
        </p>
        <p className="mt-1 text-[10px] uppercase tracking-wider text-white/60">
          {ENTITY_TYPE_LABELS[nonCompanyType]}
        </p>
      </div>

      {resolved.actions.length > 0 && (
        <section>
          <MobileSectionHeading title="Actions" />
          <div className="grid grid-cols-2 gap-2">
            {resolved.actions.map((action) => (
              <IntelligenceActionCard
                key={action.id}
                action={action}
                tone="light"
                onActionClick={(actionId) => {
                  if (isDeterministicIntelligenceAction(actionId)) setActiveActionId(actionId)
                }}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

export function IntelligenceFAB() {
  const [isOpen, setIsOpen] = useState(false)
  const [cockpitReturnKey, setCockpitReturnKey] = useState(0)
  const router = useRouter()
  const pathname = usePathname()
  const { entityContext, panelData } = useIntelligenceContext()
  const displayMode = resolveCockpitDisplayMode(entityContext?.entityType)
  const isCompanyMode = displayMode === "company"
  const isGenericEntityMode = displayMode === "entity"
  const hasEntityFocus = isCompanyMode || isGenericEntityMode
  const pageCockpit = useMemo(() => resolvePageCockpitConfig(pathname), [pathname])

  const eyebrow = isGenericEntityMode ? entityContext?.label : undefined

  const [activeDeterministicAction, setActiveDeterministicAction] = useState<DeterministicIntelligenceActionId | null>(null)
  const [eventTypePickerOpen, setEventTypePickerOpen] = useState(false)
  const [eventDrawerOpen, setEventDrawerOpen] = useState(false)
  const [selectedEventType, setSelectedEventType] = useState("")
  const [informationOpen, setInformationOpen] = useState(false)
  const [informationView, setInformationView] = useState<AccountInformationView>("menu")
  const [watchSettingsOpen, setWatchSettingsOpen] = useState(false)
  const [signalsOpen, setSignalsOpen] = useState(false)
  const [documentsModalOpen, setDocumentsModalOpen] = useState(false)
  const [simulationPickerOpen, setSimulationPickerOpen] = useState(false)
  const [financialModelingOpen, setFinancialModelingOpen] = useState(false)
  const [automationSimulatorOpen, setAutomationSimulatorOpen] = useState(false)
  const [recruitmentOpen, setRecruitmentOpen] = useState(false)
  const [automationBaseline, setAutomationBaseline] = useState<VeilleSimulatorBaseline | null>(null)

  useEffect(() => {
    function handleReturnToCockpit() {
      setEventTypePickerOpen(false)
      setEventDrawerOpen(false)
      setInformationOpen(false)
      setWatchSettingsOpen(false)
      setSignalsOpen(false)
      setDocumentsModalOpen(false)
      setSimulationPickerOpen(false)
      setFinancialModelingOpen(false)
      setAutomationSimulatorOpen(false)
      setRecruitmentOpen(false)
      setInformationView("menu")
      setCockpitReturnKey((current) => current + 1)
      setIsOpen(true)
    }

    window.addEventListener(COCKPIT_RETURN_EVENT, handleReturnToCockpit)
    const handleOpenCockpit = () => setIsOpen(true)
    window.addEventListener(COCKPIT_OPEN_EVENT, handleOpenCockpit)
    return () => {
      window.removeEventListener(COCKPIT_RETURN_EVENT, handleReturnToCockpit)
      window.removeEventListener(COCKPIT_OPEN_EVENT, handleOpenCockpit)
    }
  }, [])

  const eventInitialValues = useMemo<AgendaEventDrawerInitialValues | undefined>(() => {
    if (!panelData || !selectedEventType) return undefined
    return {
      event_type: selectedEventType,
      company: {
        id: panelData.company.id,
        name: panelData.company.name,
        isNew: false,
      },
    }
  }, [panelData, selectedEventType])

  function openComposerFromCockpit() {
    setIsOpen(false)
    setActiveDeterministicAction(null)
    window.setTimeout(() => {
      openCommunicationComposer({
        origin: "account_panel",
        companyId: panelData?.company.id ?? null,
        companyName: panelData?.company.name ?? null,
        selectedOutputKind: "written_message",
        startWithGeneralPicker: true,
      })
    }, 280)
  }

  function openPlannerFromCockpit() {
    setIsOpen(false)
    setSelectedEventType("")
    window.setTimeout(() => setEventTypePickerOpen(true), 280)
  }

  function openInformationFromCockpit() {
    setIsOpen(false)
    setInformationView("menu")
    window.setTimeout(() => setInformationOpen(true), 280)
  }

  function openDocumentsFromCockpit() {
    setIsOpen(false)
    window.setTimeout(() => setDocumentsModalOpen(true), 280)
  }

  function openSimulationPickerFromCockpit() {
    setIsOpen(false)
    window.setTimeout(() => setSimulationPickerOpen(true), 280)
  }

  function openRecruitmentFromCockpit() {
    setIsOpen(false)
    window.setTimeout(() => setRecruitmentOpen(true), 280)
  }

  function selectEventType(eventType: string) {
    setSelectedEventType(eventType)
    window.setTimeout(() => setEventDrawerOpen(true), 220)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Ouvrir le cockpit intelligence"
        className={cn(
          "fixed z-[var(--z-fab)] right-4 bottom-[calc(var(--layout-bottom-nav-height)+0.75rem)] inline-flex size-14 items-center justify-center rounded-full shadow-[var(--shadow-overlay-sm)] transition-[transform,background-color,border-color] active:scale-90",
          isCompanyMode
            ? "border border-brand-brass/50 bg-cockpit-cobalt text-brand-brass hover:bg-cockpit-cobalt-deep"
            : hasEntityFocus
              ? "kredo-fab-cockpit-active bg-brand-brass text-secondary-fg"
              : "bg-secondary text-secondary-fg",
        )}
      >
        <SparkleIcon />
      </button>

      <AppDrawer
        open={isOpen}
        onOpenChange={(next) => {
          setIsOpen(next)
          if (!next) {
            setActiveDeterministicAction(null)
          }
        }}
        title={isCompanyMode && panelData ? (
          <div className="min-w-0">
            <h2 className="truncate text-xs font-semibold leading-4 text-white/75">Cockpit Intelligence</h2>
            <p className="mt-0.5 truncate text-base font-bold leading-5 text-white">{panelData.company.name}</p>
          </div>
        ) : isCompanyMode ? "Cockpit Intelligence" : isGenericEntityMode ? "Cockpit Intelligence" : (
          <CockpitIntelligenceHeader pageLabel={pageCockpit.label} />
        )}
        side="bottom"
        eyebrow={eyebrow}
        loading={isCompanyMode && panelData === null}
        className={cn(
          "sm:hidden",
          isCompanyMode
            ? "border-t border-cockpit-cobalt bg-cockpit-cobalt-deep text-white"
            : isGenericEntityMode
              ? "border-t border-white/15 bg-primary text-white [--color-heading:white] [--color-muted:rgba(255,255,255,0.72)] [--color-border:rgba(255,255,255,0.18)] [--color-surface:rgba(255,255,255,0.12)]"
              : "kredo-cockpit-intelligence-drawer border border-cockpit-intelligence-border bg-cockpit-cobalt-soft",
        )}
        headerClassName={isCompanyMode
          ? "border-b-2 border-brand-brass bg-cockpit-cobalt text-white [&_button]:border [&_button]:border-white/35 [&_button]:bg-white/15 [&_button]:text-white [&_button]:hover:border-white/55 [&_button]:hover:bg-white/25 [&_[aria-hidden=true]]:bg-white [&_[aria-hidden=true]]:text-white"
          : isGenericEntityMode
            ? "border-b border-white/15 bg-primary text-white [&_button]:text-white/70 [&_button]:hover:text-white [&_[aria-hidden=true]]:bg-white/15 [&_[aria-hidden=true]]:text-white"
            : "relative min-h-[7.25rem] border-b border-white/10 bg-domain-intelligence !px-7 !pb-[0.9375rem] !pt-[1.875rem] text-white before:absolute before:left-1/2 before:top-2.5 before:h-1 before:w-[3.125rem] before:-translate-x-1/2 before:rounded-full before:bg-white/30 [&_button]:mt-0.5 [&_button]:size-[2.375rem] [&_button]:rounded-[0.625rem] [&_button]:border [&_button]:border-white/25 [&_button]:bg-white/10 [&_button]:text-white [&_button]:hover:bg-white/20"}
        contentClassName={isCompanyMode
          ? "bg-cockpit-cobalt-deep text-white [--drawer-header-fade-start:transparent] [--drawer-header-fade-end:transparent]"
          : isGenericEntityMode
            ? "bg-primary text-white"
            : "!p-0 bg-cockpit-cobalt-soft [--drawer-header-fade-start:transparent] [--drawer-header-fade-end:transparent]"}
        showMobileCloseButton={isCompanyMode || !isGenericEntityMode}
        icon={isCompanyMode && panelData ? (
          <CompanyLogo
            name={panelData.company.name}
            logoPath={panelData.company.logoPath}
            website={panelData.company.website}
            size="md"
            className="border-0 bg-white p-0.5"
          />
        ) : isGenericEntityMode ? (
          <span className="inline-flex size-5 items-center justify-center text-white"><SparkleIcon /></span>
        ) : undefined}
      >
        {displayMode === "page" && activeDeterministicAction ? (
          <CockpitIntelligenceShell>
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setActiveDeterministicAction(null)}
                className="inline-flex min-h-11 items-center gap-1.5 text-[11px] font-semibold text-domain-intelligence transition-colors hover:text-primary motion-reduce:transition-none"
              >
                <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Retour
              </button>
              <div className="rounded-lg border border-border bg-surface p-4 text-body">
                <IntelligenceActionResultContent actionId={activeDeterministicAction} />
              </div>
            </div>
          </CockpitIntelligenceShell>
        ) : isCompanyMode ? (
          panelData ? (
            <AccountMobileContent
              key={`${entityContext?.entityId}-${isOpen}-${cockpitReturnKey}`}
              onWriteEmailClick={openComposerFromCockpit}
              onPlanClick={openPlannerFromCockpit}
              onInformClick={openInformationFromCockpit}
              onDocumentsClick={openDocumentsFromCockpit}
              onSimulateClick={openSimulationPickerFromCockpit}
              onRecruitClick={openRecruitmentFromCockpit}
              onClose={() => setIsOpen(false)}
            />
          ) : null
        ) : isGenericEntityMode ? (
          <GenericEntityMobileContent key={`${entityContext?.entityType}:${entityContext?.entityId}-${isOpen}`} />
        ) : (
          <CockpitIntelligenceMobileContent
            pathname={pathname}
            resolved={pageCockpit}
            onActionClick={(actionId) => {
              if (isDeterministicIntelligenceAction(actionId)) setActiveDeterministicAction(actionId)
            }}
          />
        )}
      </AppDrawer>

      <AgendaEventTypePicker
        open={eventTypePickerOpen}
        onOpenChange={setEventTypePickerOpen}
        value={selectedEventType}
        onChange={selectEventType}
        onReturnToCockpit={() => {
          setEventTypePickerOpen(false)
          returnToAccountCockpit()
        }}
      />

      <AgendaEventDrawer
        open={eventDrawerOpen}
        onOpenChange={setEventDrawerOpen}
        event={null}
        initialValues={eventInitialValues}
        onReturnToCockpit={() => {
          setEventDrawerOpen(false)
          returnToAccountCockpit()
        }}
        onSaved={() => {
          setEventDrawerOpen(false)
          router.refresh()
        }}
      />

      {panelData ? (
        <>
          <AccountInformationDialog
            open={informationOpen}
            onOpenChange={setInformationOpen}
            companyName={panelData.company.name}
            view={informationView}
            onViewChange={setInformationView}
            onSignals={() => {
              setInformationOpen(false)
              window.setTimeout(() => setSignalsOpen(true), 180)
            }}
            onSettings={() => {
              setInformationOpen(false)
              window.setTimeout(() => setWatchSettingsOpen(true), 180)
            }}
            onReturnToCockpit={() => {
              setInformationOpen(false)
              returnToAccountCockpit()
            }}
          />
          <AccountWatchSettingsDialog
            key={`watch-settings-${panelData.company.id}-${watchSettingsOpen}`}
            open={watchSettingsOpen}
            onOpenChange={setWatchSettingsOpen}
            companyId={panelData.company.id}
            companyName={panelData.company.name}
            companyLogoPath={panelData.company.logoPath}
            companyWebsite={panelData.company.website}
            onBack={() => {
              setWatchSettingsOpen(false)
              window.setTimeout(() => setInformationOpen(true), 180)
            }}
            onReturnToCockpit={() => {
              setWatchSettingsOpen(false)
              returnToAccountCockpit()
            }}
          />
          <AccountSignalsDialog
            open={signalsOpen}
            onOpenChange={setSignalsOpen}
            companyId={panelData.company.id}
            companyName={panelData.company.name}
            onReturnToCockpit={() => {
              setSignalsOpen(false)
              returnToAccountCockpit()
            }}
          />
          <CompanyDocumentsModal
            key={`company-documents-${panelData.company.id}-${documentsModalOpen}`}
            open={documentsModalOpen}
            onClose={() => setDocumentsModalOpen(false)}
            companyId={panelData.company.id}
            companyName={panelData.company.name}
            isMobile
            onReturnToCockpit={() => {
              setDocumentsModalOpen(false)
              returnToAccountCockpit()
            }}
          />
          <AccountSimulationDialog
            open={simulationPickerOpen}
            onOpenChange={setSimulationPickerOpen}
            companyName={panelData.company.name}
            onSelectFinancialModeling={() => {
              setSimulationPickerOpen(false)
              window.setTimeout(() => setFinancialModelingOpen(true), 200)
            }}
            onSelectAutomationSimulator={() => {
              setSimulationPickerOpen(false)
              if (!automationBaseline) {
                void fetchVeilleSimulatorBaseline().then((res) => {
                  if (res) setAutomationBaseline(res)
                })
              }
              window.setTimeout(() => setAutomationSimulatorOpen(true), 200)
            }}
            onReturnToCockpit={() => {
              setSimulationPickerOpen(false)
              returnToAccountCockpit()
            }}
          />
          <FinancialModelingMobileFlow
            open={financialModelingOpen}
            onOpenChange={setFinancialModelingOpen}
            initialPreset={{
              companyId: panelData.company.id,
              companyName: panelData.company.name,
            }}
          />
          <VeilleSimulatorModal
            open={automationSimulatorOpen}
            onClose={() => setAutomationSimulatorOpen(false)}
            baseline={automationBaseline ?? {
              avgCostPerRun: null,
              watchedAccountsCount: 0,
              cadenceBreakdown: [],
              currentMonthlyCostEstimate: null,
            }}
          />
          <AccountRecruitmentDialog
            open={recruitmentOpen}
            onOpenChange={setRecruitmentOpen}
            companyId={panelData.company.id}
            companyName={panelData.company.name}
            onReturnToCockpit={() => {
              setRecruitmentOpen(false)
              returnToAccountCockpit()
            }}
          />
        </>
      ) : null}

    </>
  )
}

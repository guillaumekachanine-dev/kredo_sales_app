"use client"

import { useEffect, useState, useMemo, type CSSProperties } from "react"
import dynamic from "next/dynamic"
import { usePathname, useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { CompanyLogo } from "@/components/accounts-contacts/CompanyLogo"
import { cn } from "@/lib/utils"
import {
  resolveEntityActions,
  resolveIntelligenceActions,
  ENTITY_TYPE_LABELS,
  type IntelligenceEntityType,
} from "@/lib/intelligence/intelligence-registry"
import { useIntelligenceContext } from "@/hooks/use-intelligence-context"
import { IntelligenceActionCard } from "./IntelligenceActionCard"
import { AppDrawer } from "@/components/ui/AppDrawer"
import { AppDialog } from "@/components/ui/AppDialog"
import { COCKPIT_PANEL_INDIGO, cockpitActionIcons } from "./cockpit-action-icons"
import {
  PitchMailDrawerContent,
  type PitchMailAccountContext,
} from "@/components/accounts-contacts/intelligence/IntelligenceActionDrawers"
import { AccountCombobox, type AccountValue } from "@/components/missions/AccountCombobox"
import { openMobileAccountQuickSearch } from "@/hooks/use-mobile-account-quick-search"
import { getPlaybookSectors, type PlaybookSector } from "@/lib/prospection/get-playbook-sectors"
import { openCommunicationComposer } from "@/lib/communication/communication-composer"
import { CockpitReturnButton } from "@/components/intelligence/CockpitReturnButton"
import { COCKPIT_OPEN_EVENT, COCKPIT_RETURN_EVENT, returnToAccountCockpit } from "@/lib/intelligence/cockpit-navigation"
import type { AgendaEventDrawerInitialValues } from "@/components/agenda/AgendaEventDrawer"
import {
  IntelligenceActionResultContent,
  isDeterministicIntelligenceAction,
  type DeterministicIntelligenceActionId,
} from "./action-results/IntelligenceActionResultContent"
import { MissionComposerMobile } from "@/features/intelligence-missions/components/MissionComposerMobile"
import { MISSION_COMPOSER_ACTION_CONFIGS } from "@/features/intelligence-missions/components/mission-composer-model"

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

type AccountPanelAction = "analysis" | null
type RegistryActionId = "pitch" | "analyse" | "playbook" | "brief" | "rdv"
type RegistryButtonAction = {
  id: RegistryActionId
  label: string
  iconSrc: string
}
type RegistryAction =
  | RegistryButtonAction
  | {
      id: "base_doc"
      label: string
      iconSrc: string
      href: string
    }

const COCKPIT_PANEL_STYLE: CSSProperties = { backgroundColor: COCKPIT_PANEL_INDIGO }

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

function CockpitActionButton({
  label,
  iconSrc,
  onClick,
}: {
  label: string
  iconSrc: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex min-h-[84px] flex-col justify-between overflow-hidden rounded-2xl bg-white/[0.14] px-3 py-3 text-left text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] transition-all hover:bg-white/[0.20] active:scale-[0.97]"
    >
      <span className="pointer-events-none absolute -right-7 -top-8 size-24 rounded-full bg-white/10 blur-2xl" />
      <Image
        src={iconSrc}
        alt=""
        width={72}
        height={72}
        className="relative z-10 size-12 object-contain drop-shadow-[0_12px_20px_rgba(18,24,61,0.25)] transition-transform duration-200 group-hover:scale-105"
      />
      <span className="relative z-10 text-[11px] font-bold leading-tight">{label}</span>
    </button>
  )
}

function CockpitActionLink({
  label,
  iconSrc,
  href,
}: {
  label: string
  iconSrc: string
  href: string
}) {
  return (
    <Link
      href={href}
      className="group relative flex min-h-[84px] flex-col justify-between overflow-hidden rounded-2xl bg-white/[0.14] px-3 py-3 text-left text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] transition-all hover:bg-white/[0.20] active:scale-[0.97]"
    >
      <span className="pointer-events-none absolute -right-7 -top-8 size-24 rounded-full bg-white/10 blur-2xl" />
      <Image
        src={iconSrc}
        alt=""
        width={72}
        height={72}
        className="relative z-10 size-12 object-contain drop-shadow-[0_12px_20px_rgba(18,24,61,0.25)] transition-transform duration-200 group-hover:scale-105"
      />
      <span className="relative z-10 text-[11px] font-bold leading-tight">{label}</span>
    </Link>
  )
}

function QuickAccessLink({
  label,
  iconSrc,
  href,
  onClick,
}: {
  label: string
  iconSrc: string
  href?: string
  onClick?: () => void
}) {
  const className = "group flex items-center gap-3 rounded-2xl bg-white/[0.18] px-3 py-2.5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] transition-all hover:bg-white/[0.24] active:scale-[0.98]"
  const content = (
    <>
      <Image
        src={iconSrc}
        alt=""
        width={48}
        height={48}
        className="size-8 shrink-0 object-contain drop-shadow-[0_8px_14px_rgba(18,24,61,0.24)]"
      />
      <span className="min-w-0 flex-1 truncate text-[12px] font-bold">{label}</span>
      <svg className="size-3.5 shrink-0 text-white/70 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </>
  )

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {content}
      </button>
    )
  }

  return (
    <Link href={href ?? "/cockpit"} className={className}>
      {content}
    </Link>
  )
}

const ACCOUNT_EDITORIAL_ACTIONS = [
  { id: "write", label: "Rédiger", iconSrc: cockpitActionIcons.message },
  { id: "plan", label: "Planifier", iconSrc: cockpitActionIcons.tasks },
  { id: "analyze", label: "Analyser", iconSrc: cockpitActionIcons.recommendations },
  { id: "watch", label: "S’informer", iconSrc: cockpitActionIcons.alert },
  { id: "simulate", label: "Simuler", iconSrc: cockpitActionIcons.financeReport, href: "/finance" },
  { id: "recruit", label: "Recruter", iconSrc: cockpitActionIcons.recruitmentReport, href: "/recruitment" },
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

  if ("href" in action) return <Link href={action.href} onClick={onClick} className={className}>{content}</Link>
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

function AccountMobileContent({ onWriteEmailClick, onPlanClick, onInformClick, onDocumentsClick, onClose }: {
  onWriteEmailClick: () => void
  onPlanClick: () => void
  onInformClick: () => void
  onDocumentsClick: () => void
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

      {resolved.contextualActions.length > 0 && (
        <section>
          <MobileSectionHeading title="Actions" />
          <div className="grid grid-cols-2 gap-2">
            {resolved.contextualActions.map((action) => (
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

      {resolved.commonActions.length > 0 && (
        <section className="space-y-2.5">
          <MobileSectionHeading title="Plus d'actions" />
          <div className="grid grid-cols-2 gap-2">
            {resolved.commonActions.map((action) => (
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

interface RegistryMobileContentProps {
  onActionClick: (actionId: RegistryActionId) => void
}

function RegistryMobileContent({ onActionClick }: RegistryMobileContentProps) {
  const pathname = usePathname()
  const [missionComposerOpen, setMissionComposerOpen] = useState(false)
  const resolved = useMemo(() => resolveIntelligenceActions(pathname), [pathname])
  const missionAction = resolved.contextualActions.find(
    (action) => action.id in MISSION_COMPOSER_ACTION_CONFIGS,
  )

  if (missionComposerOpen && missionAction) {
    return (
      <MissionComposerMobile
        config={MISSION_COMPOSER_ACTION_CONFIGS[missionAction.id]}
        onBack={() => setMissionComposerOpen(false)}
      />
    )
  }

  const primaryActions: RegistryButtonAction[] = [
    { id: "brief", label: "Brief hebdomadaire", iconSrc: cockpitActionIcons.brief },
    { id: "pitch", label: "Rédiger un mail", iconSrc: cockpitActionIcons.message },
  ]
  const moreActions: RegistryAction[] = [
    { id: "analyse", label: "Lancer une analyse", iconSrc: cockpitActionIcons.recommendations },
    { id: "rdv", label: "Préparer un RDV", iconSrc: cockpitActionIcons.tasks },
    { id: "playbook", label: "Playbooks commerciaux", iconSrc: cockpitActionIcons.sectorAnalysis },
    { id: "base_doc", label: "Base documentaire", iconSrc: cockpitActionIcons.generatedReport, href: "/reports" },
  ]

  return (
    <div className="space-y-7">
      {missionAction ? (
        <section>
          <MobileSectionHeading title={resolved.label} />
          <IntelligenceActionCard
            action={missionAction}
            tone="light"
            onActionClick={() => setMissionComposerOpen(true)}
          />
        </section>
      ) : null}

      <section>
        <MobileSectionHeading title="Actions prioritaires" />
        <div className="grid grid-cols-2 gap-2.5">
          {primaryActions.map((action) => (
            <CockpitActionButton
              key={action.id}
              label={action.label}
              iconSrc={action.iconSrc}
              onClick={() => onActionClick(action.id)}
            />
          ))}
        </div>
      </section>

      <section>
        <MobileSectionHeading title="Plus d'actions" />
        <div className="grid grid-cols-2 gap-2.5">
          {moreActions.map((action) => {
            if ("href" in action) {
              return (
                <CockpitActionLink
                  key={action.id}
                  href={action.href}
                  label={action.label}
                  iconSrc={action.iconSrc}
                />
              )
            }
            return (
              <CockpitActionButton
                key={action.id}
                label={action.label}
                iconSrc={action.iconSrc}
                onClick={() => onActionClick(action.id)}
              />
            )
          })}
        </div>
      </section>

      <section>
        <MobileSectionHeading title="Accès rapides" />
        <div className="grid grid-cols-1 gap-2">
          <QuickAccessLink
            label="Accéder aux comptes"
            iconSrc={cockpitActionIcons.prioritizeAccounts}
            onClick={() => openMobileAccountQuickSearch()}
          />

          <QuickAccessLink
            href="/missions/actives"
            label="Accéder aux missions"
            iconSrc={cockpitActionIcons.valid}
          />
          <QuickAccessLink
            href="/staffing"
            label="Accéder aux staffings"
            iconSrc={cockpitActionIcons.recruitmentReport}
          />
        </div>
      </section>
    </div>
  )
}

export function IntelligenceFAB() {
  const [isOpen, setIsOpen] = useState(false)
  const [cockpitReturnKey, setCockpitReturnKey] = useState(0)
  const router = useRouter()
  const { entityContext, panelData } = useIntelligenceContext()
  const isAccountMode = entityContext?.entityType === "company" && panelData !== null
  const isGenericEntityMode = !!entityContext && entityContext.entityType !== "company"
  const hasEntityFocus = isAccountMode || isGenericEntityMode

  const eyebrow = isGenericEntityMode ? entityContext.label : undefined

  // Selector states
  const [isCompanySelectorOpen, setIsCompanySelectorOpen] = useState(false)
  const [isSectorSelectorOpen, setIsSectorSelectorOpen] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<AccountValue | null>(null)
  const [selectorSource, setSelectorSource] = useState<"pitch" | "analyse" | null>(null)
  const [pitchContext, setPitchContext] = useState<PitchMailAccountContext | null>(null)
  const [activeAction, setActiveAction] = useState<"pitch" | null>(null)
  const [activeDeterministicAction, setActiveDeterministicAction] = useState<DeterministicIntelligenceActionId | null>(null)
  const [eventTypePickerOpen, setEventTypePickerOpen] = useState(false)
  const [eventDrawerOpen, setEventDrawerOpen] = useState(false)
  const [selectedEventType, setSelectedEventType] = useState("")
  const [informationOpen, setInformationOpen] = useState(false)
  const [informationView, setInformationView] = useState<AccountInformationView>("menu")
  const [watchSettingsOpen, setWatchSettingsOpen] = useState(false)
  const [signalsOpen, setSignalsOpen] = useState(false)
  const [documentsModalOpen, setDocumentsModalOpen] = useState(false)

  useEffect(() => {
    function handleReturnToCockpit() {
      setEventTypePickerOpen(false)
      setEventDrawerOpen(false)
      setInformationOpen(false)
      setWatchSettingsOpen(false)
      setSignalsOpen(false)
      setDocumentsModalOpen(false)
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

  // Secteurs proposés au sélecteur de playbook — chargés depuis la base à l'ouverture,
  // plus depuis une liste codée en dur qui pointait vers trois slugs inexistants.
  // Chargement déclenché par l'événement d'ouverture (pas un effet) : le sélecteur ne
  // sert qu'au clic, inutile de payer la requête à chaque montage du FAB.
  const [playbookSectors, setPlaybookSectors] = useState<PlaybookSector[]>([])
  const [playbookSectorsStatus, setPlaybookSectorsStatus] = useState<"idle" | "loading" | "error">("idle")

  const openSectorSelector = async () => {
    setIsSectorSelectorOpen(true)
    if (playbookSectors.length > 0) return

    setPlaybookSectorsStatus("loading")
    const result = await getPlaybookSectors()

    if (result.error) {
      setPlaybookSectorsStatus("error")
      return
    }

    setPlaybookSectors(result.sectors)
    setPlaybookSectorsStatus("idle")
  }

  const handleCompanyActionSelected = (val: AccountValue) => {
    setIsCompanySelectorOpen(false)
    if (selectorSource === "pitch") {
      setPitchContext({
        company: {
          id: val.id || "new-temp-id",
          name: val.name,
          lifecycleStatus: "cible",
        },
        contacts: [],
      })
      setActiveAction("pitch")
    } else if (selectorSource === "analyse") {
      alert(`Analyse de compte lancée pour "${val.name}" (Étape 1 : Analyse de compte à configurer)`)
    }
    setSelectedAccount(null)
  }

  function openComposerFromCockpit() {
    setIsOpen(false)
    setActiveAction(null)
    setActiveDeterministicAction(null)
    setPitchContext(null)
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
          isAccountMode
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
            setActiveAction(null)
            setActiveDeterministicAction(null)
            setPitchContext(null)
          }
        }}
        title={isAccountMode ? (
          <div className="min-w-0">
            <h2 className="truncate text-xs font-semibold leading-4 text-white/75">Cockpit Intelligence</h2>
            <p className="mt-0.5 truncate text-base font-bold leading-5 text-white">{panelData.company.name}</p>
          </div>
        ) : "Cockpit Intelligence"}
        side="bottom"
        eyebrow={eyebrow}
        className={cn(
          "sm:hidden",
          isAccountMode
            ? "border-t border-cockpit-cobalt bg-cockpit-cobalt-deep text-white"
            : "border-t border-white/15 bg-primary text-white [--color-heading:white] [--color-muted:rgba(255,255,255,0.72)] [--color-border:rgba(255,255,255,0.18)] [--color-surface:rgba(255,255,255,0.12)]",
        )}
        headerClassName={isAccountMode
          ? "border-b-2 border-brand-brass bg-cockpit-cobalt text-white [&_button]:border [&_button]:border-white/35 [&_button]:bg-white/15 [&_button]:text-white [&_button]:hover:border-white/55 [&_button]:hover:bg-white/25 [&_[aria-hidden=true]]:bg-white [&_[aria-hidden=true]]:text-white"
          : "border-b border-white/15 text-white [&_button]:text-white/70 [&_button]:hover:text-white [&_[aria-hidden=true]]:bg-white/15 [&_[aria-hidden=true]]:text-white"}
        headerStyle={isAccountMode ? undefined : COCKPIT_PANEL_STYLE}
        contentClassName={isAccountMode
          ? "bg-cockpit-cobalt-deep text-white [--drawer-header-fade-start:transparent] [--drawer-header-fade-end:transparent]"
          : "bg-primary text-white"}
        showMobileCloseButton={isAccountMode}
        icon={isAccountMode ? (
          <CompanyLogo
            name={panelData.company.name}
            logoPath={panelData.company.logoPath}
            website={panelData.company.website}
            size="md"
            className="border-0 bg-white p-0.5"
          />
        ) : (
          <span className="inline-flex size-5 items-center justify-center text-white"><SparkleIcon /></span>
        )}
      >
        {activeDeterministicAction ? (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setActiveDeterministicAction(null)}
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-white/70 transition-colors hover:text-white"
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
        ) : activeAction === "pitch" && pitchContext ? (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setActiveAction(null)}
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-white/70 transition-colors hover:text-white"
            >
              <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Retour
            </button>
            <div data-theme="cockpit" className="rounded-lg border border-white/10 bg-slate-800/60 p-4">
              <PitchMailDrawerContent
                data={pitchContext}
                variant="mobile"
              />
            </div>
          </div>
        ) : isAccountMode ? (
          <AccountMobileContent
            key={`${entityContext?.entityId}-${isOpen}-${cockpitReturnKey}`}
            onWriteEmailClick={openComposerFromCockpit}
            onPlanClick={openPlannerFromCockpit}
            onInformClick={openInformationFromCockpit}
            onDocumentsClick={openDocumentsFromCockpit}
            onClose={() => setIsOpen(false)}
          />
        ) : isGenericEntityMode ? (
          <GenericEntityMobileContent key={`${entityContext.entityType}:${entityContext.entityId}-${isOpen}`} />
        ) : (
          <RegistryMobileContent
            onActionClick={(actionId) => {
              if (actionId === "pitch") {
                openComposerFromCockpit()
              } else if (actionId === "analyse") {
                setSelectorSource("analyse")
                setIsCompanySelectorOpen(true)
              } else if (actionId === "playbook") {
                void openSectorSelector()
              } else if (actionId === "brief") {
                alert("Brief hebdomadaire : cette action sera configurée plus tard.")
              } else if (actionId === "rdv") {
                setActiveDeterministicAction("prepare_day")
              }
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
        </>
      ) : null}

      {/* Select Company Popup */}
      {isCompanySelectorOpen && (
        <dialog
          open
          className="fixed inset-0 m-auto w-[90%] max-w-sm rounded-2xl border border-white/20 bg-slate-800 p-5 shadow-2xl backdrop:bg-black/60 outline-none z-[100] flex flex-col gap-4 text-white"
        >
          <div className="flex items-start justify-between">
            <h3 className="font-heading text-sm font-bold text-brand-brass">
              Sélectionner un compte
            </h3>
            <button
              type="button"
              onClick={() => setIsCompanySelectorOpen(false)}
              className="text-white/60 hover:text-white"
            >
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-white/50 mb-2">
                Rechercher une entreprise
              </label>
              <AccountCombobox
                value={selectedAccount}
                onChange={(val) => {
                  setSelectedAccount(val)
                  if (val) {
                    handleCompanyActionSelected(val)
                  }
                }}
              />
            </div>
          </div>
        </dialog>
      )}

      {/* Select Sector Popup */}
      {isSectorSelectorOpen && (
        <dialog
          open
          className="fixed inset-0 m-auto w-[90%] max-w-sm rounded-2xl border border-white/20 bg-slate-800 p-5 shadow-2xl backdrop:bg-black/60 outline-none z-[100] flex flex-col gap-4 text-white"
        >
          <div className="flex items-start justify-between">
            <h3 className="font-heading text-sm font-bold text-brand-brass">
              Consulter un playbook
            </h3>
            <button
              type="button"
              onClick={() => setIsSectorSelectorOpen(false)}
              className="text-white/60 hover:text-white"
            >
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex flex-col gap-2 max-h-[50vh] overflow-y-auto pr-1">
            {playbookSectorsStatus === "loading" ? (
              <p className="px-3 py-2.5 text-xs text-white/60">Chargement des playbooks…</p>
            ) : playbookSectorsStatus === "error" ? (
              <p className="px-3 py-2.5 text-xs text-white/60">
                Chargement des playbooks indisponible.
              </p>
            ) : playbookSectors.length === 0 ? (
              <p className="px-3 py-2.5 text-xs text-white/60">
                Aucune étude sectorielle disponible pour l&apos;instant.
              </p>
            ) : (
              playbookSectors.map((sector) => (
                <button
                  key={sector.slug}
                  type="button"
                  onClick={() => {
                    setIsSectorSelectorOpen(false)
                    setIsOpen(false)
                    router.push(`/ressources/playbook/${sector.slug}`)
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 active:scale-98 transition-all text-xs font-semibold text-white/90"
                >
                  {sector.name}
                </button>
              ))
            )}
          </div>
        </dialog>
      )}
    </>
  )
}

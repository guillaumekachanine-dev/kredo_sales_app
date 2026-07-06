"use client"

import { useState, useMemo, type CSSProperties } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { cn } from "@/lib/utils"
import {
  resolveEntityActions,
  ENTITY_TYPE_LABELS,
  type IntelligenceEntityType,
} from "@/lib/intelligence/intelligence-registry"
import { useIntelligenceContext } from "@/hooks/use-intelligence-context"
import { IntelligenceActionCard } from "./IntelligenceActionCard"
import { PanelActionsGrid } from "./PanelActionsGrid"
import { PanelResources } from "./PanelResources"
import { PanelActivity } from "./PanelActivity"
import { PanelKeyContacts } from "./PanelKeyContacts"
import { AppDrawer } from "@/components/ui/AppDrawer"
import { COCKPIT_PANEL_INDIGO, cockpitActionIcons } from "./cockpit-action-icons"
import {
  PitchMailDrawerContent,
  SummaryDrawerContent,
  type PitchMailAccountContext,
} from "@/components/accounts-contacts/intelligence/IntelligenceActionDrawers"
import { AccountCombobox, type AccountValue } from "@/components/missions/AccountCombobox"
import { STRATEGIC_SECTOR_CONFIG } from "@/lib/prospection/sector-strategy-config"

type AccountPanelAction = "pitch" | "summary" | null
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
}: {
  label: string
  iconSrc: string
  href: string
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-2xl bg-white/[0.18] px-3 py-2.5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] transition-all hover:bg-white/[0.24] active:scale-[0.98]"
    >
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
    </Link>
  )
}

function AccountMobileContent() {
  const { panelData } = useIntelligenceContext()
  const [activeAction, setActiveAction] = useState<AccountPanelAction>(null)
  if (!panelData) return null

  const { company, resources, sector, activity, contacts } = panelData

  if (activeAction === "pitch" || activeAction === "summary") {
    return (
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
          {activeAction === "pitch" ? (
            <PitchMailDrawerContent
              data={{ company: { id: company.id, name: company.name, lifecycleStatus: company.lifecycleStatus }, contacts }}
              variant="mobile"
            />
          ) : (
            <SummaryDrawerContent
              data={{ company: { id: company.id, name: company.name, lifecycleStatus: company.lifecycleStatus } }}
              variant="mobile"
            />
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section>
        <MobileSectionHeading title="Actions" />
        <PanelActionsGrid
          sectorSlug={sector.hasStructuredSector ? sector.structuredSectorSlug : null}
          onActionClick={(actionId) => {
            if (actionId === "generate_pitch") setActiveAction("pitch")
            if (actionId === "generate_report") setActiveAction("summary")
          }}
          tone="light"
        />
      </section>

      <section>
        <MobileSectionHeading title="Ressources" />
        <PanelResources resources={resources} hasStructuredSector={sector.hasStructuredSector} tone="light" />
      </section>

      {activity.length > 0 && (
        <section>
          <MobileSectionHeading title="Activité" count={activity.length} />
          <PanelActivity activity={activity} tone="light" />
        </section>
      )}

      {contacts.length > 0 && (
        <section>
          <MobileSectionHeading title="Contacts clés" count={contacts.length} />
          <PanelKeyContacts contacts={contacts} tone="light" />
        </section>
      )}
    </div>
  )
}

function GenericEntityMobileContent() {
  const { entityContext } = useIntelligenceContext()
  const nonCompanyType: Exclude<IntelligenceEntityType, "company"> | null =
    entityContext && entityContext.entityType !== "company" ? entityContext.entityType : null

  const resolved = useMemo(
    () => (nonCompanyType ? resolveEntityActions(nonCompanyType) : null),
    [nonCompanyType],
  )

  if (!entityContext || !resolved || !nonCompanyType) return null

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
              <IntelligenceActionCard key={action.id} action={action} tone="light" />
            ))}
          </div>
        </section>
      )}

      {resolved.commonActions.length > 0 && (
        <section className="space-y-2.5">
          <MobileSectionHeading title="Plus d'actions" />
          <div className="grid grid-cols-2 gap-2">
            {resolved.commonActions.map((action) => (
              <IntelligenceActionCard key={action.id} action={action} tone="light" />
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
            href="/prospection/accounts"
            label="Accéder aux comptes"
            iconSrc={cockpitActionIcons.prioritizeAccounts}
          />
          <QuickAccessLink
            href="/prospection/suivi"
            label="Priorités du jour"
            iconSrc={cockpitActionIcons.priorities}
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
  const router = useRouter()
  const { entityContext, panelData } = useIntelligenceContext()
  const isAccountMode = entityContext?.entityType === "company" && panelData !== null
  const isGenericEntityMode = !!entityContext && entityContext.entityType !== "company"
  const hasEntityFocus = isAccountMode || isGenericEntityMode

  const eyebrow = isAccountMode
    ? panelData.company.name
    : isGenericEntityMode
      ? entityContext.label
      : undefined

  // Selector states
  const [isCompanySelectorOpen, setIsCompanySelectorOpen] = useState(false)
  const [isSectorSelectorOpen, setIsSectorSelectorOpen] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<AccountValue | null>(null)
  const [selectorSource, setSelectorSource] = useState<"pitch" | "analyse" | null>(null)
  const [pitchContext, setPitchContext] = useState<PitchMailAccountContext | null>(null)
  const [activeAction, setActiveAction] = useState<"pitch" | null>(null)

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

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Ouvrir le cockpit intelligence"
        className={cn(
          "fixed z-[var(--z-fab)] right-4 bottom-[calc(var(--layout-bottom-nav-height)+0.75rem)] inline-flex size-14 items-center justify-center rounded-full shadow-[0_2px_12px_rgba(37,84,184,0.35)] transition-transform active:scale-90",
          hasEntityFocus
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
            setPitchContext(null)
          }
        }}
        title="Cockpit Intelligence"
        side="bottom"
        eyebrow={eyebrow}
        className="sm:hidden border-t border-white/15 bg-[#484DF5] text-white [--color-heading:#FFFFFF] [--color-muted:rgba(255,255,255,0.72)] [--color-border:rgba(255,255,255,0.18)] [--color-surface:rgba(255,255,255,0.12)]"
        headerClassName="border-b border-white/15 text-white [&_button]:text-white/70 [&_button]:hover:text-white [&_[aria-hidden=true]]:bg-white/15 [&_[aria-hidden=true]]:text-white"
        headerStyle={COCKPIT_PANEL_STYLE}
        contentClassName="bg-[#484DF5] text-white [--drawer-header-fade-start:rgba(72,77,245,0.96)] [--drawer-header-fade-end:rgba(72,77,245,0)]"
        icon={
          <span className="inline-flex size-5 items-center justify-center text-white">
            <SparkleIcon />
          </span>
        }
      >
        {activeAction === "pitch" && pitchContext ? (
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
          <AccountMobileContent key={`${entityContext?.entityId}-${isOpen}`} />
        ) : isGenericEntityMode ? (
          <GenericEntityMobileContent key={`${entityContext.entityType}:${entityContext.entityId}-${isOpen}`} />
        ) : (
          <RegistryMobileContent
            onActionClick={(actionId) => {
              if (actionId === "pitch") {
                setSelectorSource("pitch")
                setIsCompanySelectorOpen(true)
              } else if (actionId === "analyse") {
                setSelectorSource("analyse")
                setIsCompanySelectorOpen(true)
              } else if (actionId === "playbook") {
                setIsSectorSelectorOpen(true)
              } else if (actionId === "brief") {
                alert("Brief hebdomadaire : cette action sera configurée plus tard.")
              } else if (actionId === "rdv") {
                alert("Préparer un RDV : cette action sera configurée plus tard.")
              }
            }}
          />
        )}
      </AppDrawer>

      {/* Select Company Popup */}
      {isCompanySelectorOpen && (
        <dialog
          open
          className="fixed inset-0 m-auto w-[90%] max-w-sm rounded-2xl border border-white/20 bg-slate-800 p-5 shadow-2xl backdrop:bg-black/60 outline-none z-[100] flex flex-col gap-4 text-white"
        >
          <div className="flex items-start justify-between">
            <h3 className="font-heading text-sm font-bold text-[#FFC107]">
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
            <h3 className="font-heading text-sm font-bold text-[#FFC107]">
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
            {STRATEGIC_SECTOR_CONFIG.map((sector) => (
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
            ))}
          </div>
        </dialog>
      )}
    </>
  )
}

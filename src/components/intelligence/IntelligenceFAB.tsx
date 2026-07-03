"use client"

import { useState, useMemo, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"
import {
  resolveIntelligenceActions,
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
import { PitchMailDrawerContent, SummaryDrawerContent } from "@/components/accounts-contacts/intelligence/IntelligenceActionDrawers"
import { AccountCombobox, type AccountValue } from "@/components/missions/AccountCombobox"
import { STRATEGIC_SECTOR_CONFIG } from "@/lib/prospection/sector-strategy-config"

type AccountPanelAction = "pitch" | "summary" | null

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
    <div className="flex items-center gap-2 mb-2.5">
      <span className="h-px w-3 bg-[#FFC107]" aria-hidden />
      <h3 className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#FFC107]">
        {title}
      </h3>
      {count !== undefined && (
        <span className="ml-auto rounded-full bg-white/10 px-1.5 py-px text-[10px] font-bold text-slate-200">
          {count}
        </span>
      )}
    </div>
  )
}

// Icons for the cockpit actions grid
function IconBrief() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-4 shrink-0">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
    </svg>
  )
}

function IconRdv() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-4 shrink-0">
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
    </svg>
  )
}

function IconMail() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-4 shrink-0">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
    </svg>
  )
}

function IconAnalyse() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-4 shrink-0">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  )
}

function IconPlaybook() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-4 shrink-0">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )
}

function IconDocBase() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-4 shrink-0">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
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
      <div className="rounded-lg border border-white/10 bg-slate-800/40 p-3">
        <p className="truncate text-xs font-bold text-slate-100 leading-tight">
          {entityContext.label}
        </p>
        <p className="mt-1 text-[10px] uppercase tracking-wider text-slate-300">
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
  onActionClick: (actionId: "pitch" | "analyse" | "playbook" | "brief" | "rdv") => void
}

function RegistryMobileContent({ onActionClick }: RegistryMobileContentProps) {
  const actions = [
    { id: "brief", label: "Brief hebdomadaire", icon: IconBrief },
    { id: "rdv", label: "Préparer un RDV", icon: IconRdv },
    { id: "pitch", label: "Rédiger un mail/pitch", icon: IconMail },
    { id: "analyse", label: "Lancer une analyse", icon: IconAnalyse },
    { id: "playbook", label: "Playbooks commerciaux", icon: IconPlaybook },
    { id: "base_doc", label: "Base documentaire", icon: IconDocBase, href: "/reports" },
  ]

  return (
    <div className="space-y-6">
      <section>
        <MobileSectionHeading title="Actions" />
        <div className="grid grid-cols-2 gap-2.5">
          {actions.map((action) => {
            const Icon = action.icon
            if (action.href) {
              return (
                <Link
                  key={action.id}
                  href={action.href}
                  className="h-11 px-3 py-2 flex items-center gap-2.5 rounded-xl bg-slate-800/45 border border-slate-600/35 text-slate-100 hover:bg-slate-700/60 active:scale-98 transition-all select-none"
                >
                  <Icon />
                  <span className="text-[11px] font-bold leading-tight truncate">{action.label}</span>
                </Link>
              )
            }
            return (
              <button
                key={action.id}
                type="button"
                onClick={() => onActionClick(action.id as any)}
                className="h-11 px-3 py-2 flex items-center gap-2.5 rounded-xl bg-slate-800/45 border border-slate-600/35 text-slate-100 hover:bg-slate-700/60 active:scale-98 transition-all text-left select-none"
              >
                <Icon />
                <span className="text-[11px] font-bold leading-tight truncate">{action.label}</span>
              </button>
            )
          })}
        </div>
      </section>

      {/* Liens rapides in replacement of "Plus d'actions" */}
      <section className="space-y-2.5 border-t border-white/10 pt-5">
        <MobileSectionHeading title="Liens rapides" />
        <div className="grid grid-cols-2 gap-2.5">
          <Link
            href="/prospection/accounts"
            className="flex items-center justify-between p-3 rounded-xl border border-white/10 bg-slate-800/40 text-[11px] font-semibold text-white/90 hover:bg-slate-800/60 transition-colors"
          >
            <span>Accéder aux comptes</span>
            <svg className="size-3.5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
          <Link
            href="/prospection/suivi"
            className="flex items-center justify-between p-3 rounded-xl border border-white/10 bg-slate-800/40 text-[11px] font-semibold text-white/90 hover:bg-slate-800/60 transition-colors"
          >
            <span>Priorités du jour</span>
            <svg className="size-3.5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
          <Link
            href="/missions/actives"
            className="flex items-center justify-between p-3 rounded-xl border border-white/10 bg-slate-800/40 text-[11px] font-semibold text-white/90 hover:bg-slate-800/60 transition-colors"
          >
            <span>Accéder aux missions</span>
            <svg className="size-3.5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
          <Link
            href="/staffing"
            className="flex items-center justify-between p-3 rounded-xl border border-white/10 bg-slate-800/40 text-[11px] font-semibold text-white/90 hover:bg-slate-800/60 transition-colors"
          >
            <span>Accéder aux staffings</span>
            <svg className="size-3.5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
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
  const [pitchContext, setPitchContext] = useState<any>(null)
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
          "fixed z-[var(--z-fab)] right-4 bottom-[calc(var(--layout-bottom-nav-height)+var(--safe-area-bottom)+0.75rem)] inline-flex size-14 items-center justify-center rounded-full shadow-[0_2px_12px_rgba(37,84,184,0.35)] transition-transform active:scale-90",
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
        className="sm:hidden bg-[#3688AA] text-slate-100 border-t border-white/10 [--color-heading:#FFC107] [--color-muted:rgba(255,255,255,0.6)] [--color-border:rgba(255,255,255,0.15)] [--color-surface:rgba(255,255,255,0.08)]"
        headerClassName="bg-[#3688AA] text-slate-100 border-b border-white/10 [&_button]:text-white/70 [&_button]:hover:text-white"
        contentClassName="bg-[#3688AA] text-slate-100"
        icon={
          <span className="inline-flex size-5 items-center justify-center text-[#FFC107]">
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

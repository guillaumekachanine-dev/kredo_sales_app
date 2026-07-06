"use client"

import { useMemo, useState } from "react"
import { getNavigationIcon } from "@/components/layout/navigation-icons"
import { cn } from "@/lib/utils"
import styles from "./MobileNavigationPrototype.module.css"

type ModuleId =
  | "cockpit"
  | "agenda"
  | "crm"
  | "staffing"
  | "contracts"
  | "intelligence"
  | "finance"
  | "team"

type NavModule = {
  id: ModuleId
  label: string
  shortLabel: string
  icon: string
  tone: string
  metric: string
  description: string
  tabs?: Array<{
    label: string
    icon: string
    meta: string
    disabled?: boolean
  }>
}

const modules: NavModule[] = [
  {
    id: "cockpit",
    label: "Cockpit",
    shortLabel: "Cockpit",
    icon: "cockpit",
    tone: "cobalt",
    metric: "12 signaux",
    description: "Priorites et arbitrages",
  },
  {
    id: "agenda",
    label: "Agenda",
    shortLabel: "Agenda",
    icon: "calendar",
    tone: "brass",
    metric: "5 temps forts",
    description: "Reunions, relances, jalons",
  },
  {
    id: "crm",
    label: "CRM & Prospection",
    shortLabel: "CRM",
    icon: "crm",
    tone: "teal",
    metric: "42 comptes",
    description: "Pipeline et comptes actifs",
    tabs: [
      { label: "Synthese", icon: "cockpit", meta: "Vue prioritaire" },
      { label: "Comptes", icon: "equipe", meta: "Contacts & comptes" },
      { label: "Secteurs", icon: "veille", meta: "Angles marche" },
      { label: "Activite", icon: "calendar", meta: "Relances du jour" },
    ],
  },
  {
    id: "staffing",
    label: "Besoins & Staffing",
    shortLabel: "Staffing",
    icon: "sales",
    tone: "amber",
    metric: "8 urgents",
    description: "Besoins ouverts et matching",
    tabs: [
      { label: "Besoins", icon: "sales", meta: "A staffer" },
      { label: "Recrutement", icon: "recrutement", meta: "Pipeline talents" },
    ],
  },
  {
    id: "contracts",
    label: "Contrats actifs",
    shortLabel: "Contrats",
    icon: "engagements",
    tone: "indigo",
    metric: "18 actifs",
    description: "Missions, projets, suivi",
    tabs: [
      { label: "Synthese", icon: "cockpit", meta: "Portefeuille" },
      { label: "Missions", icon: "sales", meta: "Assistance tech" },
      { label: "Projets", icon: "automations", meta: "Forfaits" },
    ],
  },
  {
    id: "intelligence",
    label: "Intelligence",
    shortLabel: "Intel.",
    icon: "bi",
    tone: "navy",
    metric: "IA prete",
    description: "Rapports, veille, analyses",
    tabs: [
      { label: "BI", icon: "bi", meta: "Bientot", disabled: true },
      { label: "Rapports", icon: "reports", meta: "Redaction" },
      { label: "Veille", icon: "veille", meta: "Bientot", disabled: true },
    ],
  },
  {
    id: "finance",
    label: "Finance",
    shortLabel: "Finance",
    icon: "finance",
    tone: "olive",
    metric: "32% marge",
    description: "Marge, TJM, previsions",
  },
  {
    id: "team",
    label: "Equipe",
    shortLabel: "Equipe",
    icon: "equipe",
    tone: "sage",
    metric: "31 profils",
    description: "Competences et disponibilites",
    tabs: [
      { label: "Synthese", icon: "equipe", meta: "Equipe" },
      { label: "Competences", icon: "knowledge", meta: "Pool" },
      { label: "Activite", icon: "calendar", meta: "Conges" },
    ],
  },
]

const quickActions = [
  { label: "Favoris", icon: "cockpit", meta: "4 epingles" },
  { label: "Parametres", icon: "settings", meta: "Systeme" },
  { label: "Knowledge Hub", icon: "knowledge", meta: "Sources" },
  { label: "Automatisations", icon: "automations", meta: "n8n" },
]

const bottomActions = [
  { id: "cockpit", label: "Cockpit", icon: "cockpit" },
  { id: "crm", label: "CRM", icon: "crm" },
  { id: "menu", label: "Menu", icon: "navigation" },
  { id: "staffing", label: "Staffing", icon: "staffing" },
  { id: "intelligence", label: "Intel.", icon: "bi" },
]

function ChevronIcon() {
  return (
    <svg className={styles.stateIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg className={styles.stateIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

function chunkRows(items: NavModule[]) {
  const rows: NavModule[][] = []
  for (let index = 0; index < items.length; index += 2) {
    rows.push(items.slice(index, index + 2))
  }
  return rows
}

function ModuleCard({
  item,
  expanded,
  onToggle,
}: {
  item: NavModule
  expanded: boolean
  onToggle: (id: ModuleId) => void
}) {
  const hasTabs = Boolean(item.tabs?.length)

  return (
    <button
      type="button"
      aria-expanded={hasTabs ? expanded : undefined}
      className={cn(
        styles.moduleCard,
        styles[`tone_${item.tone}`],
        expanded && styles.expandedCard
      )}
      onClick={() => onToggle(item.id)}
    >
      <span className={styles.moduleIcon}>{getNavigationIcon(item.icon)}</span>
      <span className={styles.moduleText}>
        <span className={styles.moduleLabel}>{item.label}</span>
      </span>
      {hasTabs ? (
        <span className={cn(styles.chevron, expanded && styles.chevronOpen)} aria-hidden="true">
          <ChevronIcon />
        </span>
      ) : null}
    </button>
  )
}

function ExpandedTabs({ item }: { item: NavModule }) {
  if (!item.tabs?.length) return null

  return (
    <div className={styles.expandedTabs} aria-label={`Onglets ${item.label}`}>
      <div className={styles.expandedConnector} aria-hidden="true" />
      <div className={styles.tabGrid}>
        {item.tabs.map((tab) => (
          <button
            key={tab.label}
            type="button"
            disabled={tab.disabled}
            className={cn(styles.tabCard, tab.disabled && styles.disabledTab)}
          >
            <span className={styles.tabIcon}>{getNavigationIcon(tab.icon)}</span>
            <span className={styles.tabLabel}>{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export function MobileNavigationPrototype() {
  const [expandedId, setExpandedId] = useState<ModuleId | null>("crm")
  const rows = useMemo(() => chunkRows(modules), [])

  function handleToggle(id: ModuleId) {
    const item = modules.find((moduleItem) => moduleItem.id === id)
    if (!item?.tabs?.length) return
    setExpandedId((current) => (current === id ? null : id))
  }

  return (
    <main className={styles.prototypeShell}>
      <section className={styles.briefPanel} aria-label="Direction validee">
        <p className={styles.kicker}>KREDO mobile nav</p>
        <h1>Direction 1 - Cobalt Stratifie</h1>
        <p>
          Prototype interactif de la navigation mobile: cartes principales, expansion
          contextuelle sous la ligne, acces rapide et barre mobile avec menu central.
        </p>
      </section>

      <section className={styles.phoneStage} aria-label="Prototype mobile">
        <div className={styles.phoneFrame}>
          <div className={styles.statusBar}>
            <span>9:41</span>
            <span>KREDO</span>
          </div>

          <div className={styles.appSurface}>
            <header className={styles.menuHeader}>
              <h2>Navigation</h2>
              <button type="button" className={styles.closeButton} aria-label="Fermer">
                <CloseIcon />
              </button>
            </header>

            <div className={styles.moduleGrid}>
              {rows.map((row) => {
                const rowExpandedItem = row.find((item) => item.id === expandedId && item.tabs?.length)

                return (
                  <div key={row.map((item) => item.id).join("-")} className={styles.moduleRow}>
                    <div className={styles.modulePair}>
                      {row.map((item) => (
                        <ModuleCard
                          key={item.id}
                          item={item}
                          expanded={item.id === expandedId}
                          onToggle={handleToggle}
                        />
                      ))}
                    </div>
                    {rowExpandedItem ? <ExpandedTabs item={rowExpandedItem} /> : null}
                  </div>
                )
              })}
            </div>

            <section className={styles.quickSection} aria-label="Acces rapide">
              <div className={styles.quickHeader}>
                <h3>Acces rapide</h3>
                <span>Actions frequentes</span>
              </div>
              <div className={styles.quickList}>
                {quickActions.map((action) => (
                  <button key={action.label} type="button" className={styles.quickAction}>
                    <span className={styles.quickIcon}>{getNavigationIcon(action.icon)}</span>
                    <span>{action.label}</span>
                    <strong>{action.meta}</strong>
                  </button>
                ))}
              </div>
            </section>
          </div>

          <nav className={styles.bottomNav} aria-label="Navigation mobile prototype">
            {bottomActions.map((action) => {
              const isMenu = action.id === "menu"
              const isActive = action.id === "menu" || action.id === "crm"
              return (
                <button
                  key={action.id}
                  type="button"
                  aria-current={isActive ? "page" : undefined}
                  className={cn(styles.navAction, isMenu && styles.menuAction, isActive && styles.activeNavAction)}
                >
                  <span className={styles.navIcon}>{getNavigationIcon(action.icon)}</span>
                  <span>{action.label}</span>
                </button>
              )
            })}
          </nav>
        </div>
      </section>
    </main>
  )
}

"use client"

import { useState, type ReactNode } from "react"
import Link from "next/link"
import { AgendaEventDrawer, type AgendaEventDrawerInitialValues } from "@/components/agenda/AgendaEventDrawer"
import { AppDialog } from "@/components/ui/AppDialog"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { SearchToolbar } from "@/components/search/SearchToolbar"
import { cn } from "@/lib/utils"
import {
  type ProspectionPeriod,
  type ProspectionPortfolioAccount,
} from "@/lib/prospection/portfolio-account-metrics"
import {
  getCommercialRecommendation,
  getPriorityLabel,
} from "./synthese-view-model"

type SortKey = "name" | "recommendation" | "priority" | "lastActivity"
type SortDirection = "asc" | "desc"
type SettingsDialogKind = "scan-contacts" | "news" | "pitch-mail" | "campaign"

const ACTION_BUTTON_CLASS = [
  "inline-flex min-h-9 items-center justify-center rounded-md border border-primary",
  "bg-primary px-3 py-2 text-xs font-semibold text-brand-brass transition-colors",
  "hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
  "whitespace-nowrap",
].join(" ")

const PRIORITY_SORT_ORDER: Record<string, number> = {
  haute: 0,
  normale: 1,
  basse: 2,
}

const DIALOG_COPY: Record<SettingsDialogKind, { title: string; description: string }> = {
  "scan-contacts": {
    title: "Paramétrer Scan contacts",
    description: "Définissez le périmètre et les critères de détection à lancer sur le compte sélectionné.",
  },
  news: {
    title: "Paramétrer Recherche actualités",
    description: "Cadrez les thèmes, la profondeur et l'horizon de veille avant de lancer la recherche.",
  },
  "pitch-mail": {
    title: "Paramétrer pitch/mail",
    description: "Sélectionnez le canal, l'objectif et le ton de préparation du message commercial.",
  },
  campaign: {
    title: "Paramétrer la campagne",
    description: "Préparez le nom, les canaux et la cadence de la campagne avant exécution.",
  },
}

function ChevronDownIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      className={`size-5 shrink-0 text-muted transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  )
}

export function AccountsToActivateTable({
  accounts,
  period,
  selectedAccountId,
  onSelectAccount,
}: {
  accounts: ProspectionPortfolioAccount[]
  period: ProspectionPeriod
  selectedAccountId: string | null
  onSelectAccount: (accountId: string) => void
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>("priority")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [tableQuery, setTableQuery] = useState("")
  const [eventAccount, setEventAccount] = useState<ProspectionPortfolioAccount | null>(null)
  const [dialogState, setDialogState] = useState<{ kind: SettingsDialogKind; account: ProspectionPortfolioAccount } | null>(null)

  const queryLower = tableQuery.trim().toLowerCase()
  const filteredAccounts = queryLower
    ? accounts.filter(
        (account) =>
          account.name.toLowerCase().includes(queryLower)
          || account.sector.toLowerCase().includes(queryLower),
      )
    : accounts

  const sortedAccounts = [...filteredAccounts].sort((left, right) => {
    const compare = compareAccounts(left, right, period, sortKey)
    return sortDirection === "asc" ? compare : compare * -1
  })

  const countLabel = filteredAccounts.length !== accounts.length
    ? `${filteredAccounts.length} / ${accounts.length} comptes`
    : `${accounts.length} comptes`

  return (
    <>
      <section>
        <SurfaceCard className="overflow-hidden">
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-[var(--focus-ring-width)] focus-visible:ring-[var(--focus-ring-color)]"
            aria-expanded={isExpanded}
          >
            <div className="flex items-baseline gap-3">
              <h2 className="font-heading text-xl font-bold text-heading">Portefeuille à activer</h2>
              <span className="text-sm text-muted">{countLabel}</span>
            </div>
            <ChevronDownIcon isOpen={isExpanded} />
          </button>

          {isExpanded && (
            <>
              <div className="border-t border-border px-5 py-3">
                <SearchToolbar
                  device="desktop"
                  query={tableQuery}
                  totalFiltered={filteredAccounts.length}
                  totalAll={accounts.length}
                  resultLabel="comptes"
                  placeholder="Rechercher un compte ou un secteur…"
                  onQueryChange={setTableQuery}
                  onReset={() => setTableQuery("")}
                />
              </div>

              <div className="border-t border-border">
                {sortedAccounts.length === 0 ? (
                  <div className="px-5 py-8 text-center text-sm text-muted">
                    {tableQuery.trim()
                      ? `Aucun compte ne correspond à « ${tableQuery.trim()} ».`
                      : "Aucun compte ne correspond à ce jeu de filtres."}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-[1720px] w-full border-collapse text-sm">
                      <thead className="sticky top-0 z-10 bg-surface">
                        <tr className="border-b border-border text-left text-[11px] uppercase tracking-[0.08em] text-muted">
                          <SortableHeader label="Nom du compte" active={sortKey === "name"} direction={sortDirection} onClick={() => toggleSort("name", sortKey, sortDirection, setSortKey, setSortDirection)} />
                          <SortableHeader label="Action recommandée" active={sortKey === "recommendation"} direction={sortDirection} onClick={() => toggleSort("recommendation", sortKey, sortDirection, setSortKey, setSortDirection)} />
                          <SortableHeader label="Priorité" active={sortKey === "priority"} direction={sortDirection} onClick={() => toggleSort("priority", sortKey, sortDirection, setSortKey, setSortDirection)} />
                          <SortableHeader label="Dernière activité" active={sortKey === "lastActivity"} direction={sortDirection} onClick={() => toggleSort("lastActivity", sortKey, sortDirection, setSortKey, setSortDirection)} />
                          <th className="px-4 py-3 text-center">Cockpit Intel</th>
                          <th className="px-4 py-3 text-center">Planifier un événement</th>
                          <th className="px-4 py-3 text-center">Scan contacts</th>
                          <th className="px-4 py-3 text-center">Recherche actualités</th>
                          <th className="px-4 py-3 text-center">Playbook</th>
                          <th className="px-4 py-3 text-center">Pitch/mail</th>
                          <th className="px-4 py-3 text-center">Créer une campagne</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedAccounts.map((account) => {
                          const recommendation = getCommercialRecommendation(account, period)
                          const isSelected = account.id === selectedAccountId

                          return (
                            <tr
                              key={account.id}
                              className={cn(
                                "border-b border-border align-top",
                                isSelected ? "bg-primary/[0.05]" : "hover:bg-surface-hover",
                              )}
                            >
                              <td className="px-4 py-3">
                                <button
                                  type="button"
                                  onClick={() => onSelectAccount(account.id)}
                                  className="text-left focus-visible:outline-none"
                                >
                                  <div className="min-w-0">
                                    <p className="font-semibold text-heading">{account.name}</p>
                                    <p className="text-xs text-muted">{account.sector}</p>
                                    {isSelected ? (
                                      <span className="mt-1 inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-primary">
                                        Compte sélectionné
                                      </span>
                                    ) : null}
                                  </div>
                                </button>
                              </td>
                              <td className="px-4 py-3 text-body">{recommendation.actionLabel}</td>
                              <td className="px-4 py-3">
                                <span className={cn(
                                  "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                                  priorityToneClass(account.priority),
                                )}>
                                  {getPriorityLabel(account.priority)}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-body">{formatDateLabel(account.latestCommercialActivityAt)}</td>
                              <td className="px-4 py-3 text-center">
                                <Link href={`/prospection/accounts/${account.id}`} className={ACTION_BUTTON_CLASS}>
                                  Ouvrir
                                </Link>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    onSelectAccount(account.id)
                                    setEventAccount(account)
                                  }}
                                  className={ACTION_BUTTON_CLASS}
                                >
                                  Planifier
                                </button>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    onSelectAccount(account.id)
                                    setDialogState({ kind: "scan-contacts", account })
                                  }}
                                  className={ACTION_BUTTON_CLASS}
                                >
                                  Scan contacts
                                </button>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    onSelectAccount(account.id)
                                    setDialogState({ kind: "news", account })
                                  }}
                                  className={ACTION_BUTTON_CLASS}
                                >
                                  Recherche actualités
                                </button>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <Link href={`/ressources/playbook/${toSectorSlug(account.sector)}`} className={ACTION_BUTTON_CLASS}>
                                  Playbook
                                </Link>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    onSelectAccount(account.id)
                                    setDialogState({ kind: "pitch-mail", account })
                                  }}
                                  className={ACTION_BUTTON_CLASS}
                                >
                                  Pitch/mail
                                </button>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    onSelectAccount(account.id)
                                    setDialogState({ kind: "campaign", account })
                                  }}
                                  className={ACTION_BUTTON_CLASS}
                                >
                                  Créer une campagne
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </SurfaceCard>
      </section>

      <AgendaEventDrawer
        open={eventAccount !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEventAccount(null)
          }
        }}
        event={null}
        onSaved={() => setEventAccount(null)}
        initialValues={eventAccount ? buildEventInitialValues(eventAccount, period) : undefined}
      />

      <ActionSettingsDialog
        open={dialogState !== null}
        state={dialogState}
        onOpenChange={(open) => {
          if (!open) {
            setDialogState(null)
          }
        }}
      />
    </>
  )
}

function SortableHeader({
  label,
  active,
  direction,
  onClick,
}: {
  label: string
  active: boolean
  direction: SortDirection
  onClick: () => void
}) {
  return (
    <th className="px-4 py-3">
      <button type="button" onClick={onClick} className="inline-flex items-center gap-1 font-semibold">
        {label}
        {active ? <span>{direction === "asc" ? "↑" : "↓"}</span> : null}
      </button>
    </th>
  )
}

function ActionSettingsDialog({
  open,
  state,
  onOpenChange,
}: {
  open: boolean
  state: { kind: SettingsDialogKind; account: ProspectionPortfolioAccount } | null
  onOpenChange: (open: boolean) => void
}) {
  if (!state) {
    return null
  }

  const copy = DIALOG_COPY[state.kind]

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={copy.title}
      description={`${state.account.name} · ${copy.description}`}
      footer={(
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="rounded-md border border-border px-3 py-2 text-xs font-semibold text-heading transition-colors hover:bg-surface-hover"
        >
          Fermer
        </button>
      )}
    >
      {state.kind === "scan-contacts" && <ScanContactsSettings account={state.account} />}
      {state.kind === "news" && <NewsSettings account={state.account} />}
      {state.kind === "pitch-mail" && <PitchMailSettings account={state.account} />}
      {state.kind === "campaign" && <CampaignSettings account={state.account} />}
    </AppDialog>
  )
}

function ScanContactsSettings({ account }: { account: ProspectionPortfolioAccount }) {
  return (
    <div className="space-y-4">
      <DialogIntro account={account} detail="Concentrez le scan sur les décideurs et relais à forte valeur commerciale." />
      <FormSection label="Périmètre du scan">
        <select className={DIALOG_FIELD_CLASS} defaultValue="committee">
          <option value="committee">Buying committee existant</option>
          <option value="extended">Comité élargi et influenceurs</option>
          <option value="all">Tous les contacts connus</option>
        </select>
      </FormSection>
      <FormSection label="Rôles prioritaires">
        <div className="flex flex-wrap gap-2">
          {["Décideurs", "Sponsors", "DSI", "Achats"].map((label) => (
            <label key={label} className={CHECK_CHIP_CLASS}>
              <input type="checkbox" defaultChecked={label !== "Achats"} className="accent-primary" />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </FormSection>
      <FormSection label="Consignes complémentaires">
        <textarea
          className={DIALOG_TEXTAREA_CLASS}
          defaultValue={`Identifier les points d'entrée les plus activables pour ${account.name}.`}
        />
      </FormSection>
    </div>
  )
}

function NewsSettings({ account }: { account: ProspectionPortfolioAccount }) {
  return (
    <div className="space-y-4">
      <DialogIntro account={account} detail="Préparez une veille courte et exploitable pour nourrir l'approche commerciale." />
      <div className="grid gap-4 sm:grid-cols-2">
        <FormSection label="Fenêtre temporelle">
          <select className={DIALOG_FIELD_CLASS} defaultValue="30d">
            <option value="7d">7 derniers jours</option>
            <option value="30d">30 derniers jours</option>
            <option value="90d">90 derniers jours</option>
          </select>
        </FormSection>
        <FormSection label="Angle de veille">
          <select className={DIALOG_FIELD_CLASS} defaultValue="business">
            <option value="business">Business & croissance</option>
            <option value="tech">Tech & transformation</option>
            <option value="hr">RH & organisation</option>
            <option value="risk">Risques & conformité</option>
          </select>
        </FormSection>
      </div>
      <FormSection label="Sources à privilégier">
        <div className="flex flex-wrap gap-2">
          {["Presse économique", "LinkedIn", "Communiqués", "Site corporate"].map((label) => (
            <label key={label} className={CHECK_CHIP_CLASS}>
              <input type="checkbox" defaultChecked className="accent-primary" />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </FormSection>
      <FormSection label="Question de recherche">
        <textarea
          className={DIALOG_TEXTAREA_CLASS}
          defaultValue={`Quels signaux récents sur ${account.name} peuvent justifier une relance commerciale ciblée ?`}
        />
      </FormSection>
    </div>
  )
}

function PitchMailSettings({ account }: { account: ProspectionPortfolioAccount }) {
  return (
    <div className="space-y-4">
      <DialogIntro account={account} detail="Cadrez le message avant génération ou reprise dans le Cockpit Intel." />
      <div className="grid gap-4 sm:grid-cols-2">
        <FormSection label="Canal">
          <select className={DIALOG_FIELD_CLASS} defaultValue="email">
            <option value="email">Email</option>
            <option value="linkedin">LinkedIn</option>
            <option value="phone">Pitch téléphonique</option>
          </select>
        </FormSection>
        <FormSection label="Objectif">
          <select className={DIALOG_FIELD_CLASS} defaultValue="first-contact">
            <option value="first-contact">Prise de contact</option>
            <option value="follow-up">Relance</option>
            <option value="meeting">Demande de rendez-vous</option>
            <option value="invitation">Invitation événement</option>
          </select>
        </FormSection>
      </div>
      <FormSection label="Ton du message">
        <div className="flex flex-wrap gap-2">
          {["Direct", "Expert", "Exécutif", "Pédagogique"].map((label, index) => (
            <label key={label} className={CHECK_CHIP_CLASS}>
              <input type="radio" name={`pitch-tone-${account.id}`} defaultChecked={index === 0} className="accent-primary" />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </FormSection>
      <FormSection label="Contexte à injecter">
        <textarea
          className={DIALOG_TEXTAREA_CLASS}
          defaultValue={`Mettre en avant le secteur ${account.sector}, la priorité ${getPriorityLabel(account.priority).toLowerCase()} et la recommandation du moment.`}
        />
      </FormSection>
    </div>
  )
}

function CampaignSettings({ account }: { account: ProspectionPortfolioAccount }) {
  return (
    <div className="space-y-4">
      <DialogIntro account={account} detail="Préparez une campagne courte, orchestrée et alignée avec le niveau de priorité du compte." />
      <FormSection label="Nom de la campagne">
        <input type="text" className={DIALOG_FIELD_CLASS} defaultValue={`Campagne prospection · ${account.name}`} />
      </FormSection>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormSection label="Canal principal">
          <select className={DIALOG_FIELD_CLASS} defaultValue="email">
            <option value="email">Email</option>
            <option value="linkedin">LinkedIn</option>
            <option value="phone">Téléphone</option>
          </select>
        </FormSection>
        <FormSection label="Cadence">
          <select className={DIALOG_FIELD_CLASS} defaultValue="2-weeks">
            <option value="1-week">1 semaine</option>
            <option value="2-weeks">2 semaines</option>
            <option value="1-month">1 mois</option>
          </select>
        </FormSection>
      </div>
      <FormSection label="Canaux secondaires">
        <div className="flex flex-wrap gap-2">
          {["Email", "LinkedIn", "Téléphone", "Événement"].map((label, index) => (
            <label key={label} className={CHECK_CHIP_CLASS}>
              <input type="checkbox" defaultChecked={index < 2} className="accent-primary" />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </FormSection>
      <FormSection label="Instructions de campagne">
        <textarea
          className={DIALOG_TEXTAREA_CLASS}
          defaultValue={`Construire une campagne courte pour ${account.name} avec un angle centré sur ${account.sector}.`}
        />
      </FormSection>
    </div>
  )
}

function DialogIntro({
  account,
  detail,
}: {
  account: ProspectionPortfolioAccount
  detail: string
}) {
  return (
    <div className="rounded-lg border border-border bg-canvas/40 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Compte ciblé</p>
      <p className="mt-1 text-sm font-semibold text-heading">{account.name}</p>
      <p className="text-xs text-body">{account.sector} · priorité {getPriorityLabel(account.priority).toLowerCase()}</p>
      <p className="mt-2 text-xs text-body">{detail}</p>
    </div>
  )
}

function FormSection({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{label}</span>
      {children}
    </label>
  )
}

function toggleSort(
  nextKey: SortKey,
  currentKey: SortKey,
  currentDirection: SortDirection,
  setSortKey: (value: SortKey) => void,
  setSortDirection: (value: SortDirection) => void,
) {
  if (currentKey === nextKey) {
    setSortDirection(currentDirection === "asc" ? "desc" : "asc")
    return
  }

  setSortKey(nextKey)
  setSortDirection(nextKey === "name" ? "asc" : "desc")
}

function compareAccounts(
  left: ProspectionPortfolioAccount,
  right: ProspectionPortfolioAccount,
  period: ProspectionPeriod,
  sortKey: SortKey,
) {
  if (sortKey === "name") return left.name.localeCompare(right.name)

  if (sortKey === "recommendation") {
    return getCommercialRecommendation(left, period).actionLabel.localeCompare(
      getCommercialRecommendation(right, period).actionLabel,
    )
  }

  if (sortKey === "priority") {
    return (PRIORITY_SORT_ORDER[left.priority] ?? 99) - (PRIORITY_SORT_ORDER[right.priority] ?? 99)
  }

  const leftDate = left.latestCommercialActivityAt ? new Date(left.latestCommercialActivityAt).getTime() : 0
  const rightDate = right.latestCommercialActivityAt ? new Date(right.latestCommercialActivityAt).getTime() : 0
  return leftDate - rightDate
}

function buildEventInitialValues(
  account: ProspectionPortfolioAccount,
  period: ProspectionPeriod,
): AgendaEventDrawerInitialValues {
  return {
    title: `Échange prospection · ${account.name}`,
    event_type: "rdv_prospection",
    company: {
      id: account.id,
      name: account.name,
      isNew: false,
    },
    description: `Préparation de l'action recommandée : ${getCommercialRecommendation(account, period).actionLabel}.`,
  }
}

function priorityToneClass(priority: string) {
  if (priority === "haute") {
    return "bg-danger/10 text-danger"
  }
  if (priority === "normale") {
    return "bg-warning/10 text-warning"
  }
  return "bg-success/10 text-success"
}

function formatDateLabel(value: string | null) {
  if (!value) {
    return "Aucune"
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
  }).format(new Date(value))
}

function toSectorSlug(sector: string): string {
  return sector
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

const DIALOG_FIELD_CLASS = "w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-body focus:border-primary/40 focus:outline-none"
const DIALOG_TEXTAREA_CLASS = `${DIALOG_FIELD_CLASS} min-h-28 resize-y`
const CHECK_CHIP_CLASS = "inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-body"

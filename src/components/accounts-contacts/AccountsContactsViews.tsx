import Link from "next/link"
import { DashboardDevice } from "@/lib/dashboard/dashboard-types"
import {
  AccountRow,
  AccountsContactsData,
  ContactRow,
  SectorStudyRow,
  StudyRow,
} from "@/lib/accounts-contacts/accounts-contacts-data"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { cn } from "@/lib/utils"

type ActiveTab = "accounts" | "contacts" | "studies"

type AccountsContactsViewProps = {
  data: AccountsContactsData
  device: DashboardDevice
  activeTab: ActiveTab
}

const tabCopy: Record<ActiveTab, { title: string; description: string; action: string }> = {
  accounts: {
    title: "Comptes & Contacts",
    description: "Vue consolidée des entreprises, contacts clés et signaux issus des imports prospection.",
    action: "Nouveau compte",
  },
  contacts: {
    title: "Contacts",
    description: "Répertoire opérationnel des interlocuteurs rattachés aux comptes.",
    action: "Nouveau contact",
  },
  studies: {
    title: "Etudes sectorielles",
    description: "Synthèse des analyses réalisées sur les comptes listés et regroupement par secteur.",
    action: "Lancer une étude",
  },
}

function formatScore(score: number | null) {
  return score === null ? "—" : `${score}/5`
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <SurfaceCard className="p-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-2 text-2xl font-bold font-heading text-heading tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-body">{hint}</p>}
    </SurfaceCard>
  )
}

function PageHeader({ activeTab, device }: { activeTab: ActiveTab; device: DashboardDevice }) {
  const copy = tabCopy[activeTab]
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border pb-5">
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Business</p>
        <h1 className={cn("font-heading font-bold tracking-tight text-heading", device === "mobile" ? "text-2xl" : "text-3xl")}>
          {copy.title}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-body">{copy.description}</p>
      </div>
      {device === "desktop" && (
        <button className="rounded bg-primary px-4 py-2 text-xs font-semibold text-primary-fg transition-colors hover:bg-primary/95">
          {copy.action}
        </button>
      )}
    </div>
  )
}

function StatsStrip({ data, device }: { data: AccountsContactsData; device: DashboardDevice }) {
  return (
    <div className={cn("grid gap-3", device === "mobile" ? "grid-cols-2" : "grid-cols-5")}>
      <StatCard label="Comptes" value={String(data.stats.companies)} hint="Base active" />
      <StatCard label="Contacts" value={String(data.stats.contacts)} hint="Liens qualifiés" />
      <StatCard label="Emails" value={String(data.stats.emails)} hint="Exploitables" />
      <StatCard label="Etudes" value={String(data.stats.studies)} hint="Analyses disponibles" />
      {device === "desktop" && <StatCard label="Priorité haute" value={String(data.stats.highPriority)} hint="À travailler" />}
    </div>
  )
}

function PriorityBadge({ priority }: { priority: string }) {
  const label = priority === "haute" ? "Haute" : priority === "basse" ? "Basse" : "Normale"
  return (
    <span className={cn(
      "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold",
      priority === "haute" ? "border-warning/30 bg-warning/10 text-warning" : "border-border bg-canvas text-body"
    )}>
      {label}
    </span>
  )
}

function AccountsDesktop({ accounts }: { accounts: AccountRow[] }) {
  return (
    <SurfaceCard className="overflow-hidden">
      <div className="border-b border-border px-5 py-4">
        <h2 className="text-sm font-semibold text-heading">Comptes prioritaires</h2>
        <p className="mt-1 text-xs text-muted">Tri par score IA, nombre de contacts et nom d'entreprise.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-border bg-canvas/50 text-[10px] font-bold uppercase tracking-wider text-muted">
              <th className="px-5 py-3">Compte</th>
              <th className="px-3 py-3">Secteur</th>
              <th className="px-3 py-3">Segment</th>
              <th className="px-3 py-3">Localisation</th>
              <th className="px-3 py-3 text-right">Contacts</th>
              <th className="px-3 py-3 text-right">Score</th>
              <th className="px-5 py-3 text-right">Priorité</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {accounts.map((account) => (
              <tr key={account.id} className="transition-colors hover:bg-canvas/40">
                <td className="max-w-[260px] px-5 py-3">
                  <div className="font-semibold text-heading">{account.name}</div>
                  <div className="truncate text-[11px] text-muted">{account.website ?? "Site non renseigné"}</div>
                </td>
                <td className="px-3 py-3 text-body">{account.sector}</td>
                <td className="px-3 py-3 text-body">{account.segment}</td>
                <td className="px-3 py-3 text-body">{account.location}</td>
                <td className="px-3 py-3 text-right font-semibold tabular-nums text-heading">{account.contactCount}</td>
                <td className="px-3 py-3 text-right font-semibold tabular-nums text-heading">{formatScore(account.score)}</td>
                <td className="px-5 py-3 text-right"><PriorityBadge priority={account.priority} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SurfaceCard>
  )
}

function AccountsMobile({ accounts }: { accounts: AccountRow[] }) {
  return (
    <div className="flex flex-col gap-3">
      {accounts.map((account) => (
        <SurfaceCard key={account.id} className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate text-sm font-bold text-heading">{account.name}</h2>
              <p className="mt-1 text-xs text-body">{account.sector} · {account.location}</p>
            </div>
            <PriorityBadge priority={account.priority} />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded border border-border bg-canvas px-2 py-2">
              <p className="text-[10px] text-muted">Score</p>
              <p className="text-sm font-bold text-heading">{formatScore(account.score)}</p>
            </div>
            <div className="rounded border border-border bg-canvas px-2 py-2">
              <p className="text-[10px] text-muted">Contacts</p>
              <p className="text-sm font-bold text-heading">{account.contactCount}</p>
            </div>
            <div className="rounded border border-border bg-canvas px-2 py-2">
              <p className="text-[10px] text-muted">Emails</p>
              <p className="text-sm font-bold text-heading">{account.emailCount}</p>
            </div>
          </div>
        </SurfaceCard>
      ))}
    </div>
  )
}

function ContactsDesktop({ contacts }: { contacts: ContactRow[] }) {
  return (
    <SurfaceCard className="overflow-hidden">
      <div className="border-b border-border px-5 py-4">
        <h2 className="text-sm font-semibold text-heading">Répertoire contacts</h2>
        <p className="mt-1 text-xs text-muted">Contacts rattachés aux entreprises importées.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-border bg-canvas/50 text-[10px] font-bold uppercase tracking-wider text-muted">
              <th className="px-5 py-3">Contact</th>
              <th className="px-3 py-3">Entreprise</th>
              <th className="px-3 py-3">Secteur</th>
              <th className="px-3 py-3">Fonction</th>
              <th className="px-5 py-3">Email</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {contacts.map((contact) => (
              <tr key={contact.id} className="transition-colors hover:bg-canvas/40">
                <td className="px-5 py-3 font-semibold text-heading">{contact.fullName}</td>
                <td className="px-3 py-3 text-body">{contact.companyName}</td>
                <td className="px-3 py-3 text-body">{contact.companySector}</td>
                <td className="max-w-[320px] truncate px-3 py-3 text-body">{contact.jobTitle}</td>
                <td className="px-5 py-3 text-body">{contact.email ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SurfaceCard>
  )
}

function ContactsMobile({ contacts }: { contacts: ContactRow[] }) {
  return (
    <div className="flex flex-col gap-3">
      {contacts.map((contact) => (
        <SurfaceCard key={contact.id} className="p-4">
          <h2 className="text-sm font-bold text-heading">{contact.fullName}</h2>
          <p className="mt-1 text-xs text-body">{contact.jobTitle}</p>
          <p className="mt-2 text-xs font-semibold text-primary">{contact.companyName}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted">
            <span className="rounded border border-border bg-canvas px-2 py-1">{contact.companySector}</span>
            {contact.email && <span className="rounded border border-border bg-canvas px-2 py-1">Email OK</span>}
            {contact.phone && <span className="rounded border border-border bg-canvas px-2 py-1">Téléphone OK</span>}
          </div>
        </SurfaceCard>
      ))}
    </div>
  )
}

function SectorDesktop({ sectors }: { sectors: SectorStudyRow[] }) {
  return (
    <SurfaceCard className="p-5">
      <h2 className="text-sm font-semibold text-heading">Lecture sectorielle</h2>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {sectors.map((sector) => (
          <div key={sector.sector} className="rounded border border-border bg-canvas/40 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-heading">{sector.sector}</h3>
                <p className="mt-1 text-xs text-muted">{sector.companies} comptes · {sector.contacts} contacts</p>
              </div>
              <span className="text-sm font-bold tabular-nums text-primary">{formatScore(sector.avgScore)}</span>
            </div>
            <p className="mt-3 text-xs text-body">Top comptes : {sector.topCompanies.join(", ")}</p>
          </div>
        ))}
      </div>
    </SurfaceCard>
  )
}

function StudiesList({ studies, device }: { studies: StudyRow[]; device: DashboardDevice }) {
  return (
    <div className={cn("grid gap-3", device === "desktop" ? "grid-cols-2" : "grid-cols-1")}>
      {studies.map((study) => (
        <SurfaceCard key={study.id} className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate text-sm font-bold text-heading">{study.companyName}</h2>
              <p className="mt-1 text-xs text-muted">{study.sector} · {study.segment}</p>
            </div>
            <span className="rounded bg-primary/10 px-2 py-1 text-xs font-bold text-primary">{formatScore(study.score)}</span>
          </div>
          <p className="mt-4 line-clamp-3 text-sm leading-6 text-body">{study.summary}</p>
          <div className="mt-4 border-t border-border pt-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Maturité digitale</p>
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-body">{study.digitalMaturity}</p>
          </div>
        </SurfaceCard>
      ))}
    </div>
  )
}

function MobileQuickActions({ activeTab }: { activeTab: ActiveTab }) {
  const action = tabCopy[activeTab].action
  return (
    <div className="grid grid-cols-2 gap-3">
      <button className="min-h-[44px] rounded bg-primary px-4 py-3 text-xs font-semibold text-primary-fg">{action}</button>
      <button className="min-h-[44px] rounded border border-border bg-surface px-4 py-3 text-xs font-semibold text-heading">Filtrer</button>
    </div>
  )
}

export function AccountsContactsView({ data, device, activeTab }: AccountsContactsViewProps) {
  return (
    <div className={cn("mx-auto flex w-full max-w-7xl flex-col bg-canvas", device === "mobile" ? "gap-4 px-4 py-5" : "gap-6 px-6 py-8")}>
      <PageHeader activeTab={activeTab} device={device} />
      {device === "mobile" && <MobileQuickActions activeTab={activeTab} />}
      <StatsStrip data={data} device={device} />

      {activeTab === "accounts" && (
        device === "mobile" ? <AccountsMobile accounts={data.accounts} /> : <AccountsDesktop accounts={data.accounts} />
      )}

      {activeTab === "contacts" && (
        device === "mobile" ? <ContactsMobile contacts={data.contacts} /> : <ContactsDesktop contacts={data.contacts} />
      )}

      {activeTab === "studies" && (
        <div className="flex flex-col gap-5">
          {device === "desktop" && <SectorDesktop sectors={data.sectors} />}
          {device === "mobile" && (
            <div className="grid grid-cols-1 gap-3">
              {data.sectors.map((sector) => (
                <SurfaceCard key={sector.sector} className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-bold text-heading">{sector.sector}</h2>
                      <p className="mt-1 text-xs text-muted">{sector.companies} comptes · {sector.contacts} contacts</p>
                    </div>
                    <span className="text-sm font-bold text-primary">{formatScore(sector.avgScore)}</span>
                  </div>
                </SurfaceCard>
              ))}
            </div>
          )}
          <StudiesList studies={data.studies} device={device} />
        </div>
      )}

      {device === "desktop" && (
        <div className="flex items-center justify-between rounded border border-border bg-surface px-5 py-4 text-xs text-muted">
          <span>Données issues de Supabase · normalisation companies / persons / contacts.</span>
          <Link href="/prospection" className="font-semibold text-primary hover:text-primary/80">
            Ouvrir Prospection Intelligence
          </Link>
        </div>
      )}
    </div>
  )
}

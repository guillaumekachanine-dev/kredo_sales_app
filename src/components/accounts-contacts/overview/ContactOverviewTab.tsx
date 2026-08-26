"use client"

import { useMemo } from "react"
import { normalizeContactRelationshipRole, departmentLabel } from "@/lib/accounts-contacts/contact-constants"
import type { AccountRow, ContactRow } from "@/lib/accounts-contacts/accounts-contacts-data"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { cn } from "@/lib/utils"

interface ContactOverviewTabProps {
  accounts: AccountRow[]
  contacts: ContactRow[]
  device?: "desktop" | "mobile"
  darkTheme?: boolean
  onOpenCompany?: (companyId: string) => void
  onOpenContact?: (contactId: string) => void
}

export function ContactOverviewTab({
  accounts,
  contacts,
  device = "desktop",
  darkTheme = false,
}: ContactOverviewTabProps) {
  const isMobile = device === "mobile"

  // ─────────────────────────────────────────────────────────────────────────────
  //  1. KPI Metrics Calculation
  // ─────────────────────────────────────────────────────────────────────────────
  const totalContacts = contacts.length
  const totalAccounts = accounts.length

  const decideurs = useMemo(() => {
    return contacts.filter(
      (c) => normalizeContactRelationshipRole(c.relationshipRole) === "decideur" || c.relationshipRole === "decideur"
    )
  }, [contacts])
  const decideursCount = decideurs.length
  const decideursPct = totalContacts > 0 ? Math.round((decideursCount / totalContacts) * 100) : 0

  const reachableContacts = useMemo(() => {
    return contacts.filter((c) => Boolean(c.email) || Boolean(c.phone))
  }, [contacts])
  const reachableCount = reachableContacts.length
  const reachablePct = totalContacts > 0 ? Math.round((reachableCount / totalContacts) * 100) : 0

  const coveredAccounts = useMemo(() => {
    return accounts.filter((a) => a.contactCount > 0)
  }, [accounts])
  const coveredCount = coveredAccounts.length
  const coveredPct = totalAccounts > 0 ? Math.round((coveredCount / totalAccounts) * 100) : 0

  // ─────────────────────────────────────────────────────────────────────────────
  //  2. Visualisation A: Répartition par fonction
  // ─────────────────────────────────────────────────────────────────────────────
  const departmentBreakdown = useMemo(() => {
    const counts = new Map<string, number>()
    for (const c of contacts) {
      const label = departmentLabel(c.department)
      counts.set(label, (counts.get(label) ?? 0) + 1)
    }

    const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])
    if (sorted.length <= 7) {
      return sorted.map(([name, count]) => ({
        name,
        count,
        pct: totalContacts > 0 ? Math.round((count / totalContacts) * 100) : 0,
      }))
    }

    const top7 = sorted.slice(0, 6)
    const remaining = sorted.slice(6)
    const remainingCount = remaining.reduce((acc, [, val]) => acc + val, 0)

    const result = top7.map(([name, count]) => ({
      name,
      count,
      pct: totalContacts > 0 ? Math.round((count / totalContacts) * 100) : 0,
    }))

    if (remainingCount > 0) {
      result.push({
        name: "Autres",
        count: remainingCount,
        pct: totalContacts > 0 ? Math.round((remainingCount / totalContacts) * 100) : 0,
      })
    }

    return result
  }, [contacts, totalContacts])

  // ─────────────────────────────────────────────────────────────────────────────
  //  3. Visualisation B: Qualité des coordonnées
  // ─────────────────────────────────────────────────────────────────────────────
  const contactQuality = useMemo(() => {
    let both = 0
    let emailOnly = 0
    let phoneOnly = 0
    let neither = 0

    for (const c of contacts) {
      const hasE = Boolean(c.email)
      const hasP = Boolean(c.phone)
      if (hasE && hasP) both++
      else if (hasE) emailOnly++
      else if (hasP) phoneOnly++
      else neither++
    }

    const calcPct = (cnt: number) => (totalContacts > 0 ? Math.round((cnt / totalContacts) * 100) : 0)

    return [
      { label: "Email + Téléphone", count: both, pct: calcPct(both), color: "bg-success" },
      { label: "Email uniquement", count: emailOnly, pct: calcPct(emailOnly), color: "bg-primary" },
      { label: "Téléphone uniquement", count: phoneOnly, pct: calcPct(phoneOnly), color: "bg-brand-brass" },
      { label: "Sans coordonnée", count: neither, pct: calcPct(neither), color: darkTheme ? "bg-white/20 text-white/60" : "bg-muted/40 text-muted-fg" },
    ]
  }, [contacts, totalContacts, darkTheme])

  // ─────────────────────────────────────────────────────────────────────────────
  //  4. Visualisation C: Couverture des comptes (0, 1, 2-3, 4-5, 6+)
  // ─────────────────────────────────────────────────────────────────────────────
  const accountCoverageDistribution = useMemo(() => {
    let c0 = 0
    let c1 = 0
    let c2_3 = 0
    let c4_5 = 0
    let c6Plus = 0

    for (const a of accounts) {
      const cnt = a.contactCount
      if (cnt === 0) c0++
      else if (cnt === 1) c1++
      else if (cnt >= 2 && cnt <= 3) c2_3++
      else if (cnt >= 4 && cnt <= 5) c4_5++
      else c6Plus++
    }

    const calcPct = (cnt: number) => (totalAccounts > 0 ? Math.round((cnt / totalAccounts) * 100) : 0)

    return [
      { range: "0 contact", count: c0, pct: calcPct(c0), variant: "danger" },
      { range: "1 contact", count: c1, pct: calcPct(c1), variant: "warning" },
      { range: "2–3 contacts", count: c2_3, pct: calcPct(c2_3), variant: "info" },
      { range: "4–5 contacts", count: c4_5, pct: calcPct(c4_5), variant: "primary" },
      { range: "6+ contacts", count: c6Plus, pct: calcPct(c6Plus), variant: "success" },
    ]
  }, [accounts, totalAccounts])

  // ─────────────────────────────────────────────────────────────────────────────
  //  5. Visualisation D: Décideurs par fonction
  // ─────────────────────────────────────────────────────────────────────────────
  const decideursByDepartment = useMemo(() => {
    const counts = new Map<string, number>()
    for (const c of decideurs) {
      const label = departmentLabel(c.department)
      counts.set(label, (counts.get(label) ?? 0) + 1)
    }

    const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])
    return sorted.map(([name, count]) => ({
      name,
      count,
      pct: decideursCount > 0 ? Math.round((count / decideursCount) * 100) : 0,
    }))
  }, [decideurs, decideursCount])

  const maxDeptCount = useMemo(() => {
    return Math.max(...departmentBreakdown.map((d) => d.count), 1)
  }, [departmentBreakdown])

  const maxDecideurDeptCount = useMemo(() => {
    return Math.max(...decideursByDepartment.map((d) => d.count), 1)
  }, [decideursByDepartment])

  const maxCoverageCount = useMemo(() => {
    return Math.max(...accountCoverageDistribution.map((d) => d.count), 1)
  }, [accountCoverageDistribution])

  const cardBgClass = darkTheme
    ? "bg-white/[0.04] border-white/10 text-white"
    : "border border-border"

  const headingTextClass = darkTheme ? "text-white" : "text-heading"
  const bodyTextClass = darkTheme ? "text-white/70" : "text-body"
  const mutedTextClass = darkTheme ? "text-white/50" : "text-muted"
  const trackBgClass = darkTheme ? "bg-white/10" : "bg-canvas"
  const subCardBgClass = darkTheme ? "bg-white/5 border-white/10" : "bg-canvas border-border/40"

  return (
    <div className={cn("space-y-6 p-1", darkTheme ? "text-white" : "")}>
      {/* ── Bandeau KPI principaux (4 KPI max) ─────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* KPI 1: Total Contacts */}
        <SurfaceCard className={cn("p-4 flex flex-col justify-between min-h-[96px]", cardBgClass)}>
          <span className={cn("text-[11px] font-semibold uppercase tracking-wider", mutedTextClass)}>
            Total Contacts
          </span>
          <div className="mt-1 flex items-baseline justify-between gap-2">
            <span className={cn("font-heading text-2xl font-bold", headingTextClass)}>
              {totalContacts}
            </span>
            <span className={cn("text-[10px] font-bold uppercase tracking-wider", mutedTextClass)}>
              Patrimoine
            </span>
          </div>
          <p className={cn("mt-1 text-[11px]", bodyTextClass)}>
            Fiches contacts enregistrées
          </p>
        </SurfaceCard>

        {/* KPI 2: Décideurs */}
        <SurfaceCard className={cn("p-4 flex flex-col justify-between min-h-[96px]", cardBgClass)}>
          <span className={cn("text-[11px] font-semibold uppercase tracking-wider", mutedTextClass)}>
            Décideurs
          </span>
          <div className="mt-1 flex items-baseline justify-between gap-2">
            <span className="font-heading text-2xl font-bold text-brand-brass">
              {decideursCount}
            </span>
            <span className="rounded-full bg-brand-brass/10 px-2 py-0.5 text-[10px] font-bold text-brand-brass">
              {decideursPct}%
            </span>
          </div>
          <p className={cn("mt-1 text-[11px]", bodyTextClass)}>
            Part dans le répertoire
          </p>
        </SurfaceCard>

        {/* KPI 3: Contacts joignables */}
        <SurfaceCard className={cn("p-4 flex flex-col justify-between min-h-[96px]", cardBgClass)}>
          <span className={cn("text-[11px] font-semibold uppercase tracking-wider", mutedTextClass)}>
            Contacts joignables
          </span>
          <div className="mt-1 flex items-baseline justify-between gap-2">
            <span className="font-heading text-2xl font-bold text-success">
              {reachableCount}
            </span>
            <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-bold text-success">
              {reachablePct}%
            </span>
          </div>
          <p className={cn("mt-1 text-[11px]", bodyTextClass)}>
            Email ou téléphone renseigné
          </p>
        </SurfaceCard>

        {/* KPI 4: Comptes couverts */}
        <SurfaceCard className={cn("p-4 flex flex-col justify-between min-h-[96px]", cardBgClass)}>
          <span className={cn("text-[11px] font-semibold uppercase tracking-wider", mutedTextClass)}>
            Comptes couverts
          </span>
          <div className="mt-1 flex items-baseline justify-between gap-2">
            <span className="font-heading text-2xl font-bold text-primary">
              {coveredCount}
            </span>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
              {coveredPct}%
            </span>
          </div>
          <p className={cn("mt-1 text-[11px]", bodyTextClass)}>
            {coveredCount} / {totalAccounts} comptes avec contact
          </p>
        </SurfaceCard>
      </div>

      {/* ── Visualisations Grille 2x2 (Desktop) ou Empilée (Mobile) ───────────── */}
      <div className={cn("grid gap-4", isMobile ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2")}>
        {/* Visualisation A : Répartition des contacts par fonction */}
        <SurfaceCard className={cn("p-5 flex flex-col space-y-4", cardBgClass)}>
          <div className={cn("flex items-center justify-between border-b pb-3", darkTheme ? "border-white/10" : "border-border")}>
            <div>
              <h3 className={cn("text-xs font-bold uppercase tracking-wider", headingTextClass)}>
                Répartition des contacts par fonction
              </h3>
              <p className={cn("text-[11px]", mutedTextClass)}>
                Domaines fonctionnels et métiers des interlocuteurs
              </p>
            </div>
            <span className={cn("text-xs font-bold", mutedTextClass)}>{totalContacts} contacts</span>
          </div>

          <div className="space-y-2.5 flex-1">
            {departmentBreakdown.map((item) => {
              const barWidthPct = Math.max(Math.round((item.count / maxDeptCount) * 100), 4)

              return (
                <div key={item.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className={cn("font-medium truncate max-w-[220px]", headingTextClass)}>
                      {item.name}
                    </span>
                    <div className="flex items-center gap-2 font-semibold">
                      <span className={bodyTextClass}>{item.count}</span>
                      <span className={cn("text-[11px] w-9 text-right", mutedTextClass)}>{item.pct}%</span>
                    </div>
                  </div>
                  <div className={cn("h-2 w-full rounded-full overflow-hidden", trackBgClass)}>
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-300"
                      style={{ width: `${barWidthPct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </SurfaceCard>

        {/* Visualisation B : Qualité des coordonnées */}
        <SurfaceCard className={cn("p-5 flex flex-col space-y-4", cardBgClass)}>
          <div className={cn("flex items-center justify-between border-b pb-3", darkTheme ? "border-white/10" : "border-border")}>
            <div>
              <h3 className={cn("text-xs font-bold uppercase tracking-wider", headingTextClass)}>
                Qualité des coordonnées
              </h3>
              <p className={cn("text-[11px]", mutedTextClass)}>
                Exhaustivité des moyens de contact disponibles
              </p>
            </div>
            <span className={cn("text-xs font-bold", mutedTextClass)}>{reachablePct}% joignables</span>
          </div>

          {/* Combined stacked progress bar */}
          <div className="space-y-2">
            <div className={cn("h-3 w-full rounded-full flex overflow-hidden p-0.5 gap-0.5 border border-white/10", trackBgClass)}>
              {contactQuality.map((q) =>
                q.pct > 0 ? (
                  <div
                    key={q.label}
                    className={cn("h-full rounded-sm transition-all duration-300", q.color)}
                    style={{ width: `${q.pct}%` }}
                    title={`${q.label}: ${q.count} (${q.pct}%)`}
                  />
                ) : null
              )}
            </div>
          </div>

          {/* Detail lines for each category */}
          <div className="space-y-3 flex-1 pt-1">
            {contactQuality.map((q) => (
              <div key={q.label} className={cn("flex items-center justify-between p-2.5 rounded-lg border", subCardBgClass)}>
                <div className="flex items-center gap-2.5">
                  <span className={cn("size-2.5 rounded-full shrink-0", q.color)} />
                  <span className={cn("text-xs font-medium", headingTextClass)}>{q.label}</span>
                </div>
                <div className="flex items-center gap-3 text-xs font-bold">
                  <span className={headingTextClass}>{q.count}</span>
                  <span className={cn("rounded-full px-2 py-0.5 text-[10px] border", darkTheme ? "bg-white/10 border-white/10 text-white" : "bg-surface border-border text-body")}>
                    {q.pct}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </SurfaceCard>

        {/* Visualisation C : Couverture des comptes */}
        <SurfaceCard className={cn("p-5 flex flex-col space-y-4", cardBgClass)}>
          <div className={cn("flex items-center justify-between border-b pb-3", darkTheme ? "border-white/10" : "border-border")}>
            <div>
              <h3 className={cn("text-xs font-bold uppercase tracking-wider", headingTextClass)}>
                Couverture des comptes
              </h3>
              <p className={cn("text-[11px]", mutedTextClass)}>
                Distribution des comptes selon leur volume d&apos;interlocuteurs
              </p>
            </div>
            <span className={cn("text-xs font-bold", mutedTextClass)}>{totalAccounts} comptes</span>
          </div>

          <div className="space-y-3 flex-1">
            {accountCoverageDistribution.map((item) => {
              const barWidthPct = Math.max(Math.round((item.count / maxCoverageCount) * 100), 4)

              const barColor =
                item.variant === "danger"
                  ? "bg-danger"
                  : item.variant === "warning"
                  ? "bg-warning"
                  : item.variant === "info"
                  ? "bg-info"
                  : item.variant === "primary"
                  ? "bg-primary"
                  : "bg-success"

              return (
                <div key={item.range} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className={cn("font-semibold", headingTextClass)}>{item.range}</span>
                      {item.range === "0 contact" || item.range === "1 contact" ? (
                        <span className="text-[10px] font-bold text-danger uppercase tracking-wider">
                          À cartographier
                        </span>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2 font-semibold">
                      <span className={bodyTextClass}>{item.count} comptes</span>
                      <span className={cn("text-[11px] w-9 text-right", mutedTextClass)}>{item.pct}%</span>
                    </div>
                  </div>
                  <div className={cn("h-2 w-full rounded-full overflow-hidden", trackBgClass)}>
                    <div
                      className={cn("h-full rounded-full transition-all duration-300", barColor)}
                      style={{ width: `${barWidthPct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </SurfaceCard>

        {/* Visualisation D : Décideurs par fonction */}
        <SurfaceCard className={cn("p-5 flex flex-col space-y-4", cardBgClass)}>
          <div className={cn("flex items-center justify-between border-b pb-3", darkTheme ? "border-white/10" : "border-border")}>
            <div>
              <h3 className={cn("text-xs font-bold uppercase tracking-wider", headingTextClass)}>
                Décideurs par fonction
              </h3>
              <p className={cn("text-[11px]", mutedTextClass)}>
                Répartition des {decideursCount} contacts décideurs par domaine
              </p>
            </div>
            <span className="text-xs font-bold text-brand-brass">{decideursCount} décideurs</span>
          </div>

          <div className="space-y-2.5 flex-1">
            {decideursByDepartment.length > 0 ? (
              decideursByDepartment.map((item) => {
                const barWidthPct = Math.max(Math.round((item.count / maxDecideurDeptCount) * 100), 4)

                return (
                  <div key={item.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className={cn("font-medium truncate max-w-[220px]", headingTextClass)}>
                        {item.name}
                      </span>
                      <div className="flex items-center gap-2 font-semibold">
                        <span className={bodyTextClass}>{item.count}</span>
                        <span className={cn("text-[11px] w-9 text-right", mutedTextClass)}>{item.pct}%</span>
                      </div>
                    </div>
                    <div className={cn("h-2 w-full rounded-full overflow-hidden", trackBgClass)}>
                      <div
                        className="h-full rounded-full bg-brand-brass transition-all duration-300"
                        style={{ width: `${barWidthPct}%` }}
                      />
                    </div>
                  </div>
                )
              })
            ) : (
              <div className={cn("flex h-32 items-center justify-center text-xs", mutedTextClass)}>
                Aucun décideur qualifié dans le répertoire.
              </div>
            )}
          </div>
        </SurfaceCard>
      </div>
    </div>
  )
}


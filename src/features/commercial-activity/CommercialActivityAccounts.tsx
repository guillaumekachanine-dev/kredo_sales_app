"use client"

import { useRouter } from "next/navigation"
import type { CommercialActivitySnapshot } from "./commercial-activity-types"

function format(value: number) { return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(value) }
function date(value: string | null) { return value ? new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(new Date(value)) : "—" }

export function CommercialActivityAccounts({ snapshot }: { snapshot: CommercialActivitySnapshot }) {
  const router = useRouter()
  const max = Math.max(1, ...snapshot.accounts.map((account) => account.completedActivities))
  return <div className="space-y-6 p-5 sm:p-6 animate-in fade-in slide-in-from-right-2 duration-200"><div><h3 className="text-sm font-semibold text-white">Comptes activés</h3><p className="mt-1 text-[11px] text-white/45">Les dix comptes ayant concentré le plus d’activité réalisée.</p></div>{snapshot.accounts.length === 0 ? <p className="rounded-xl border border-dashed border-white/10 px-4 py-10 text-center text-xs text-white/45">Aucun compte activé dans cette période.</p> : <div className="space-y-3">{snapshot.accounts.map((account) => <button key={account.companyId} type="button" onClick={() => router.push(`/prospection/accounts/${account.companyId}`)} className="grid w-full grid-cols-[minmax(120px,1fr)_minmax(80px,2fr)_auto] items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-white/[.04]"><span className="min-w-0"><strong className="block truncate text-[11px] text-white">{account.companyName}</strong><span className="mt-1 block text-[10px] text-white/40">{account.contactsReached} contact{account.contactsReached > 1 ? "s" : ""} · {account.outcomesCount} résultat{account.outcomesCount > 1 ? "s" : ""}</span></span><span className="h-2 overflow-hidden rounded-full bg-white/[.08]"><i className="block h-full rounded-full bg-brand-brass" style={{ width: `${(account.completedActivities / max) * 100}%` }} /></span><span className="text-right text-[10px] tabular-nums text-white/55"><strong className="block text-[11px] text-white">{account.completedActivities} act.</strong>{format(account.completedHours)} h · {date(account.lastActivityAt)}</span></button>)}</div>}</div>
}

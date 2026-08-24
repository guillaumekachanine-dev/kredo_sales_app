"use client"

import { useRouter } from "next/navigation"
import { openCommunicationComposer } from "@/lib/communication/communication-composer"
import type { BusinessIntelligenceMobileAccount } from "../presenters/build-business-intelligence-mobile-model"
import { EmptyPanel } from "./MobileDecisionBrief"

export function MobileAccountActionCard({ account }: { account: BusinessIntelligenceMobileAccount | null }) {
  const router = useRouter()
  if (!account) return <EmptyPanel title="Aucune action disponible" description="Sélectionnez un compte pour voir les éléments d'action." />
  const attack = account.attack

  return (
    <section className="border-t border-white/10 bg-[#09162d] px-4 py-5" aria-labelledby="mobile-action-title">
      <div className="flex items-baseline justify-between gap-2"><h2 id="mobile-action-title" className="text-sm font-bold text-white">Action sur {account.name}</h2></div>
      <p className="mt-2 text-xs leading-relaxed text-white/65">{attack?.topSignal?.summary ?? "Aucun résumé complémentaire disponible."}</p>
      <div className="mt-4 space-y-3 text-xs">
        <ActionDetail title="Drivers positifs" values={attack?.positiveDrivers ?? []} empty="Non déterminés" />
        <ActionDetail title="Vigilance" values={attack?.vigilancePoints ?? []} empty="Aucun point signalé" />
        <ActionDetail title="Practice recommandée" values={attack?.recommendedPractice ? [attack.recommendedPractice] : []} empty="Non déterminée" />
        <ActionDetail title="Angle d'approche" values={attack?.approachAngle ? [attack.approachAngle] : []} empty="Non déterminé" />
        <ActionDetail title="Prochaine action" values={account.nextAction ?? attack?.nextAction ? [account.nextAction ?? attack?.nextAction ?? ""] : []} empty="Action non déterminée" />
      </div>
      <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <button type="button" onClick={() => router.push(`/prospection/accounts/${account.accountId}`)} className="min-h-11 rounded-lg bg-brand-brass px-3 text-xs font-bold text-[#11172a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">Ouvrir le compte</button>
        <button type="button" onClick={() => openCommunicationComposer({ origin: "account", companyId: account.accountId, companyName: account.name, preset: { outputKind: "written_message" } })} className="min-h-11 rounded-lg border border-white/15 px-3 text-xs font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-brass">Rédiger un message</button>
        <button type="button" onClick={() => router.push("/agenda")} className="min-h-11 rounded-lg border border-white/15 px-3 text-xs font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-brass">Planifier une action</button>
      </div>
    </section>
  )
}

function ActionDetail({ title, values, empty }: { title: string; values: string[]; empty: string }) {
  return <div><p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-white/40">{title}</p>{values.length > 0 ? <ul className="mt-1 space-y-1 text-white/80">{values.slice(0, 3).map((value) => <li key={value} className="leading-relaxed">{value}</li>)}</ul> : <p className="mt-1 italic text-white/40">{empty}</p>}</div>
}

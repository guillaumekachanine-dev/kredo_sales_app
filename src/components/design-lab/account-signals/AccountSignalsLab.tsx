"use client"

import Image from "next/image"
import { useState } from "react"
import { Button } from "@/components/ui/Button"
import { cn } from "@/lib/utils"

type Signal = {
  id: string
  category: string
  publishedDate: string
  publishedShort: string
  detectedDate: string
  title: string
  fact: string
  interpretation: string
  implication: string
  source: string
}

const signals: Signal[] = [
  {
    id: "cloud",
    category: "Cloud & infrastructure",
    publishedDate: "12/08/2026",
    publishedShort: "12 AOÛT",
    detectedDate: "13/08/2026",
    title: "Schneider Electric étend EcoStruxure Cloud avec de nouvelles capacités d’IA et d’edge computing.",
    fact: "Le groupe annonce l’enrichissement de sa plateforme de gestion de l’énergie et des opérations industrielles. Les nouveaux modules rapprochent traitement local, données d’équipement et modèles d’IA pour améliorer la disponibilité des sites.",
    interpretation: "Le sujet dépasse l’évolution produit : Schneider accélère l’industrialisation de cas d’usage data et IA au plus près des opérations. Le déploiement à l’échelle crée un besoin durable d’intégration entre les environnements OT, IT et cloud.",
    implication: "Positionner une approche d’architecture cloud hybride et de data engineering industriel. Une entrée crédible : cadrage des flux OT/IT, observabilité, sécurité et mise à l’échelle de cas d’usage IA sur les sites pilotes.",
    source: "Communiqué Schneider Electric",
  },
  {
    id: "talents",
    category: "Ressources humaines",
    publishedDate: "06/08/2026",
    publishedShort: "06 AOÛT",
    detectedDate: "07/08/2026",
    title: "Un plan de recrutement mondial cible 7 000 talents dans le digital et l’IA d’ici à 2027.",
    fact: "Schneider Electric renforce ses équipes en ingénierie logicielle, cybersécurité, data science et IA générative pour soutenir ses offres industrielles et énergétiques.",
    interpretation: "Le volume et la variété des profils recherchés suggèrent une tension de capacité sur des expertises déjà rares. La priorité est autant d’absorber la croissance que de sécuriser les compétences clés des programmes de transformation.",
    implication: "Ouvrir une conversation sur des renforts ciblés et des dispositifs de montée en compétence. Les expertises cloud, data, cyber et IA appliquée à l’industrie sont les points d’entrée les plus naturels.",
    source: "Annonce carrière Schneider Electric",
  },
  {
    id: "investment",
    category: "Investissement & partenariats",
    publishedDate: "29/07/2026",
    publishedShort: "29 JUIL.",
    detectedDate: "30/07/2026",
    title: "Un nouveau centre d’innovation IA à Grenoble consolide les ambitions industrielles du groupe.",
    fact: "Le programme réunit équipes R&D, partenaires technologiques et cas d’usage autour de l’optimisation énergétique, des jumeaux numériques et de l’automatisation avancée.",
    interpretation: "Grenoble devient un point d’ancrage visible pour des expérimentations susceptibles d’être répliquées dans les unités opérationnelles. Les projets de co-innovation peuvent précéder des besoins de déploiement plus larges.",
    implication: "Proposer une contribution à des pilotes data industrielle : cadrage de jumeaux numériques, industrialisation MLOps et sécurisation des environnements de test avant passage à l’échelle.",
    source: "La Tribune — Innovation",
  },
]

const categoryClasses: Record<string, string> = {
  "Cloud & infrastructure": "border-primary/25 bg-primary/[0.06] text-primary",
  "Ressources humaines": "border-brand-brass/35 bg-brand-brass/[0.08] text-edito-ink",
  "Investissement & partenariats": "border-success/30 bg-success/[0.06] text-success",
}

function SignalCategory({ signal }: { signal: Signal }) {
  return (
    <span className={cn("inline-flex border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em]", categoryClasses[signal.category])}>
      {signal.category}
    </span>
  )
}

function AccountHeader({ onRefresh, refreshed }: { onRefresh: () => void; refreshed: boolean }) {
  return (
    <header className="flex items-center justify-between gap-8 border-b border-edito-border bg-edito-surface px-8 py-5">
      <div className="flex min-w-0 items-center gap-4">
        <div className="flex size-12 shrink-0 items-center justify-center border border-edito-border bg-edito-surface p-1.5">
          <Image src="/optimized/logos_prospects/Schneider_Electric.png" alt="Logo Schneider Electric" width={40} height={40} className="h-full w-full object-contain" priority />
        </div>
        <div className="min-w-0">
          <h1 className="font-heading text-[27px] font-bold tracking-[-0.03em] text-edito-navy">Schneider Electric</h1>
          <div className="mt-1.5 flex items-center gap-3 text-xs">
            <span className="font-bold text-primary">7 signaux détectés</span>
            <span className="h-3.5 w-px bg-edito-border" aria-hidden="true" />
            <span className="text-edito-muted">Veille hebdomadaire</span>
            <Button variant="secondary" size="sm" className="ml-1 !h-8 !min-w-0 !border-primary/40 !px-3 !text-primary">Paramétrer la veille</Button>
          </div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-4">
        <span aria-live="polite" className="text-xs text-edito-muted">{refreshed ? "Mis à jour à l’instant" : "Mis à jour le 14/08/2026"}</span>
        <Button variant="primary" size="sm" className="!h-9" onClick={onRefresh}>Actualiser</Button>
      </div>
    </header>
  )
}

function SignalBody({ signal, compact = false }: { signal: Signal; compact?: boolean }) {
  return (
    <div className={cn("min-w-0", compact ? "space-y-5" : "space-y-6")}>
      <section>
        <h3 className="text-[10px] font-bold uppercase tracking-[0.1em] text-edito-muted">Fait détecté</h3>
        <p className="mt-2 text-sm leading-6 text-edito-body">{signal.fact}</p>
      </section>
      <section className="border-t border-edito-border pt-5">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.1em] text-primary">Interprétation</h3>
        <p className="mt-2 text-sm leading-6 text-edito-body">{signal.interpretation}</p>
      </section>
      <section className="border-t border-edito-border pt-5">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.1em] text-edito-navy">Implication ESN</h3>
        <p className="mt-2 text-sm leading-6 text-edito-body">{signal.implication}</p>
      </section>
    </div>
  )
}

function EditorialSignal({ signal, index }: { signal: Signal; index: number }) {
  return (
    <article className="grid grid-cols-[112px_minmax(0,1fr)] gap-8 pb-10 last:pb-0">
      <div className="relative border-r border-edito-brass/70 pr-6 text-right">
        <span className="absolute -right-[5px] top-1 size-2.5 rounded-full border-2 border-edito-surface bg-edito-brass" aria-hidden="true" />
        <p className="font-heading text-2xl font-bold leading-none text-edito-brass">{signal.publishedDate.slice(0, 2)}</p>
        <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-edito-muted">{signal.publishedShort.slice(3)}</p>
        <p className="mt-1 text-[10px] text-edito-muted">2026</p>
        {index === 0 ? <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.08em] text-edito-navy">Le plus récent</p> : null}
      </div>
      <div className="max-w-[830px]">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <SignalCategory signal={signal} />
          <p className="text-[11px] font-bold text-edito-ink">DATE DE PARUTION · {signal.publishedDate}</p>
          <p className="text-[11px] text-edito-muted">Détecté le {signal.detectedDate}</p>
        </div>
        <h2 className="mt-4 font-heading text-[25px] font-bold leading-[1.16] tracking-[-0.025em] text-edito-navy">{signal.title}</h2>
        <div className="mt-6"><SignalBody signal={signal} /></div>
        <p className="mt-5 border-t border-edito-border pt-3 text-[11px] text-edito-muted">Source · <span className="font-semibold text-primary">{signal.source}</span></p>
      </div>
    </article>
  )
}

function EditorialDirection({ refreshed, onRefresh }: { refreshed: boolean; onRefresh: () => void }) {
  return (
    <div className="min-h-full bg-edito-canvas">
      <AccountHeader refreshed={refreshed} onRefresh={onRefresh} />
      <main className="mx-auto max-w-[1216px] px-8 py-9">
        <div className="mb-8 flex items-end justify-between border-b border-edito-border pb-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-edito-brass">Brief de veille</p>
            <h2 className="mt-1 font-heading text-xl font-bold text-edito-navy">Les signaux à lire cette semaine</h2>
          </div>
          <p className="text-xs text-edito-muted">Lecture par date de parution</p>
        </div>
        <div className="space-y-10">
          {signals.map((signal, index) => <EditorialSignal key={signal.id} signal={signal} index={index} />)}
        </div>
      </main>
    </div>
  )
}

function ConsoleDirection({ refreshed, onRefresh }: { refreshed: boolean; onRefresh: () => void }) {
  const [selectedId, setSelectedId] = useState(signals[0].id)
  const selected = signals.find((signal) => signal.id === selectedId) ?? signals[0]
  return (
    <div className="min-h-full bg-edito-canvas">
      <AccountHeader refreshed={refreshed} onRefresh={onRefresh} />
      <main className="grid min-h-[790px] grid-cols-[230px_minmax(0,1fr)_290px] border-b border-edito-border">
        <nav aria-label="Chronologie des signaux" className="border-r border-edito-border bg-edito-surface px-5 py-7">
          <h2 className="font-heading text-sm font-bold text-edito-navy">Chronologie des signaux</h2>
          <p className="mt-1 text-[11px] text-edito-muted">Plus récent en haut</p>
          <ol className="mt-7 space-y-4 border-l border-edito-border pl-4">
            {signals.map((signal) => {
              const active = selected.id === signal.id
              return (
                <li key={signal.id} className="relative">
                  <span className={cn("absolute -left-[22px] top-4 size-2.5 rounded-full", active ? "bg-primary" : "bg-edito-muted")} aria-hidden="true" />
                  <button type="button" onClick={() => setSelectedId(signal.id)} aria-pressed={active} className={cn("w-full border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary", active ? "border-primary bg-primary/[0.05]" : "border-transparent hover:border-edito-border hover:bg-edito-canvas")}>
                    <p className={cn("text-[9px] font-bold uppercase tracking-[0.08em]", active ? "text-primary" : "text-edito-muted")}>{signal.category}</p>
                    <p className="mt-2 text-[11px] font-semibold text-edito-body">{signal.publishedDate}</p>
                    <p className="mt-2 line-clamp-3 text-xs font-bold leading-5 text-edito-navy">{signal.title}</p>
                  </button>
                </li>
              )
            })}
          </ol>
          <button type="button" className="mt-7 text-xs font-bold text-primary">Voir tous les signaux (7)</button>
        </nav>
        <article className="bg-edito-surface px-9 py-8">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-edito-border pb-5">
            <SignalCategory signal={selected} />
            <p className="text-[12px] font-bold text-edito-ink">DATE DE PARUTION · {selected.publishedDate}</p>
            <p className="text-[11px] text-edito-muted">Détecté le {selected.detectedDate}</p>
          </div>
          <h2 className="mt-6 max-w-[760px] font-heading text-[31px] font-bold leading-[1.12] tracking-[-0.035em] text-edito-navy">{selected.title}</h2>
          <div className="mt-8 max-w-[760px]"><SignalBody signal={selected} compact /></div>
          <p className="mt-7 text-[11px] text-edito-muted">Source · <span className="font-semibold text-primary">{selected.source}</span></p>
        </article>
        <aside className="border-l border-edito-border bg-primary/[0.025] px-6 py-8">
          <h2 className="font-heading text-sm font-bold text-primary">Lecture analytique</h2>
          <section className="mt-8">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.1em] text-edito-navy">Pourquoi c’est important</h3>
            <ul className="mt-3 space-y-3 border-l border-edito-border pl-4 text-xs leading-5 text-edito-body">
              <li>Une transformation visible à l’intersection cloud, data et opérations industrielles.</li>
              <li>Un potentiel de réplication au-delà du programme initial.</li>
              <li>Un espace de différenciation sur l’intégration OT/IT et la mise à l’échelle.</li>
            </ul>
          </section>
          <section className="mt-8 border-t border-edito-border pt-6">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.1em] text-edito-navy">Signaux associés</h3>
            <div className="mt-3 space-y-3 text-xs leading-5 text-edito-body">
              {signals.filter((signal) => signal.id !== selected.id).map((signal) => <button type="button" key={signal.id} onClick={() => setSelectedId(signal.id)} className="block text-left hover:text-primary"><span className="font-semibold">{signal.publishedDate}</span> · {signal.title}</button>)}
            </div>
          </section>
          <section className="mt-8 border-t border-edito-border pt-6">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.1em] text-edito-navy">Point d’attention</h3>
            <p className="mt-3 text-xs leading-5 text-edito-body">Prioriser un échange de qualification sur le périmètre pilote, les équipes déjà engagées et l’horizon de déploiement.</p>
          </section>
        </aside>
      </main>
    </div>
  )
}

export function AccountSignalsLab() {
  const [direction, setDirection] = useState<"editorial" | "console">("editorial")
  const [refreshed, setRefreshed] = useState(false)
  const refresh = () => setRefreshed(true)
  return (
    <div className="min-h-screen bg-edito-canvas px-6 py-8 text-edito-body">
      <div className="mx-auto max-w-[1440px]">
        <div className="mb-5 flex items-end justify-between gap-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-edito-brass">Design Lab · desktop</p>
            <h1 className="mt-1 font-heading text-2xl font-bold tracking-[-0.03em] text-edito-navy">Signaux d’un compte</h1>
          </div>
          <div role="tablist" aria-label="Directions graphiques" className="flex border border-edito-border bg-edito-surface p-1">
            <button role="tab" aria-selected={direction === "editorial"} type="button" onClick={() => setDirection("editorial")} className={cn("px-4 py-2 text-xs font-bold transition-colors", direction === "editorial" ? "bg-edito-navy text-edito-surface" : "text-edito-muted hover:text-edito-navy")}>Proposition A · Brief éditorial</button>
            <button role="tab" aria-selected={direction === "console"} type="button" onClick={() => setDirection("console")} className={cn("px-4 py-2 text-xs font-bold transition-colors", direction === "console" ? "bg-edito-navy text-edito-surface" : "text-edito-muted hover:text-edito-navy")}>Proposition B · Console</button>
          </div>
        </div>
        <section className="overflow-hidden border border-edito-border bg-edito-surface">
          {direction === "editorial" ? <EditorialDirection refreshed={refreshed} onRefresh={refresh} /> : <ConsoleDirection refreshed={refreshed} onRefresh={refresh} />}
        </section>
      </div>
    </div>
  )
}

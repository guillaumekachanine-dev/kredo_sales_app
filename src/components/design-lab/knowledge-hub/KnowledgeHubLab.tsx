"use client"

import { useState } from "react"
import {
  domains,
  items,
  useCases,
  getItemsByDomain,
  getFavorites,
  getStaleItems,
  searchItems,
  type KnowledgeItem,
  type KnowledgeDomain,
} from "./knowledge-hub-data"

// ──────────────────────────────────────────────────────────────────────
//  Design Lab — Knowledge Hub prototypes
//  3 propositions with Desktop + Mobile toggle
// ──────────────────────────────────────────────────────────────────────

type ProposalId = "a" | "b" | "c"
type DeviceMode = "desktop" | "mobile"

const PROPOSALS: { id: ProposalId; name: string; subtitle: string }[] = [
  { id: "a", name: "A — Bibliothèque éditoriale", subtitle: "Navigation structurée par domaine, layout 3 colonnes" },
  { id: "b", name: "B — Workspace métier", subtitle: "Navigation par cas d'usage, centré sur les tâches" },
  { id: "c", name: "C — Atlas relationnel", subtitle: "Navigation exploratoire, connexions entre entités" },
]

// ── Shared UI primitives ────────────────────────────────────────────

function FreshnessIndicator({ freshness }: { freshness: string }) {
  const colors: Record<string, string> = {
    fresh: "bg-emerald-500",
    aging: "bg-amber-400",
    stale: "bg-red-400",
  }
  return <span className={`inline-block size-1.5 rounded-full ${colors[freshness] ?? colors.fresh}`} />
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return null
  return (
    <span className="inline-flex items-center gap-1 rounded border border-[var(--color-edito-brass)]/30 bg-[var(--color-edito-brass)]/10 px-1.5 py-0.5 text-[9px] font-bold text-[var(--color-edito-brass)]">
      ★ {score.toFixed(1)}
    </span>
  )
}

function TypeLabel({ type }: { type: string }) {
  const labels: Record<string, string> = {
    sector_study: "Étude sectorielle",
    playbook: "Playbook",
    offer: "Offre",
    account_synthesis: "Synthèse compte",
    strategy: "Stratégie",
    reference: "Référence projet",
    methodology: "Méthodologie",
  }
  return (
    <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--color-edito-muted)]">
      {labels[type] ?? type}
    </span>
  )
}

function ConnectionCount({ item }: { item: KnowledgeItem }) {
  const total = item.connections.accounts.length + item.connections.offers.length + item.connections.reports.length
  if (total === 0) return null
  return (
    <span className="text-[9px] text-[var(--color-edito-muted)]">
      {item.connections.accounts.length > 0 && `${item.connections.accounts.length} comptes`}
      {item.connections.accounts.length > 0 && item.connections.offers.length > 0 && " · "}
      {item.connections.offers.length > 0 && `${item.connections.offers.length} offres`}
    </span>
  )
}

// ── PROPOSAL A — Editorial Library ────────────────────────────────

function ProposalADesktop() {
  const [activeDomain, setActiveDomain] = useState<string>("sectors")
  const [selectedId, setSelectedId] = useState<string | null>("s1")
  const [search, setSearch] = useState("")

  const domainItems = search ? searchItems(search) : getItemsByDomain(activeDomain)
  const selected = items.find((i) => i.id === selectedId) ?? null

  return (
    <div className="flex h-[640px] flex-col overflow-hidden rounded-xl border border-[var(--color-edito-border)] bg-[var(--color-edito-canvas)]">
      {/* Header */}
      <header className="flex min-h-[56px] shrink-0 items-center justify-between border-b border-[var(--color-edito-border)] bg-white px-5">
        <h1 className="text-lg font-bold tracking-tight text-[var(--color-edito-navy)]">Knowledge Hub</h1>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher dans le corpus…"
            className="h-8 w-56 rounded border border-[var(--color-edito-border)] bg-[var(--color-edito-canvas)] px-3 text-xs text-[var(--color-edito-body)] placeholder:text-[var(--color-edito-muted)] outline-none focus:border-[var(--color-edito-brass)]"
          />
        </div>
      </header>

      {/* Domain tabs */}
      <nav className="flex shrink-0 gap-0 border-b border-[var(--color-edito-border)] bg-white">
        {domains.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => { setActiveDomain(d.id); setSelectedId(null); setSearch("") }}
            className={`relative min-h-10 px-4 text-[10px] font-bold uppercase tracking-[0.1em] transition-colors ${activeDomain === d.id ? "text-[var(--color-edito-navy)] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-[var(--color-edito-brass)]" : "text-[var(--color-edito-muted)] hover:text-[var(--color-edito-body)]"}`}
          >
            {d.shortLabel} ({d.count})
          </button>
        ))}
      </nav>

      {/* 3-column grid */}
      <div className="flex min-h-0 flex-1">
        {/* List */}
        <section className="flex w-[260px] shrink-0 flex-col border-r border-[var(--color-edito-border)] bg-white">
          <div className="shrink-0 border-b border-[var(--color-edito-border)] px-4 py-3">
            <p className="text-[10px] font-bold text-[var(--color-edito-navy)]">{domainItems.length} résultats</p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {domainItems.length === 0 ? (
              <p className="px-4 py-10 text-center text-xs text-[var(--color-edito-muted)]">Aucun contenu dans ce domaine.</p>
            ) : (
              domainItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className={`relative w-full border-b border-[var(--color-edito-border)] px-4 py-3 text-left transition-colors ${selectedId === item.id ? "bg-[var(--color-edito-navy)]/[0.06] before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-[var(--color-edito-brass)]" : "hover:bg-[var(--color-edito-chip)]"}`}
                >
                  <span className="flex items-center gap-2">
                    <FreshnessIndicator freshness={item.freshness} />
                    <span className="truncate text-[11px] font-bold leading-4 text-[var(--color-edito-navy)]">{item.title}</span>
                  </span>
                  <span className="mt-1 flex items-center gap-2">
                    <TypeLabel type={item.type} />
                    <ScoreBadge score={item.score} />
                  </span>
                  <span className="mt-0.5 block truncate text-[9px] text-[var(--color-edito-muted)]">
                    MAJ {item.updatedAt}
                  </span>
                </button>
              ))
            )}
          </div>
        </section>

        {/* Preview */}
        <section className="flex min-w-0 flex-1 flex-col bg-[var(--color-edito-canvas)] px-5 py-4">
          {selected ? (
            <article className="mx-auto w-full max-w-[640px] rounded-lg border border-[var(--color-edito-border)] bg-white px-6 py-5">
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--color-edito-brass)]">KREDO Knowledge</p>
              <h2 className="mt-2 text-base font-bold leading-6 text-[var(--color-edito-navy)]">{selected.title}</h2>
              <p className="mt-1 text-[10px] text-[var(--color-edito-muted)]">
                <TypeLabel type={selected.type} /> · {selected.updatedAt} · {selected.source}
              </p>
              <div className="mt-4 border-l-2 border-[var(--color-edito-muted)]/30 pl-4">
                <p className="text-xs leading-5 text-[var(--color-edito-body)]">{selected.summary}</p>
              </div>
              {selected.painPoints && selected.painPoints.length > 0 && (
                <div className="mt-5">
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--color-edito-navy)]">Pain points ({selected.painPoints.length})</h3>
                  <ul className="mt-2 space-y-1.5">
                    {selected.painPoints.slice(0, 4).map((pp) => (
                      <li key={pp.title} className="flex items-center justify-between text-xs text-[var(--color-edito-body)]">
                        <span>• {pp.title}</span>
                        <span className="rounded bg-[var(--color-edito-chip)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--color-edito-muted)]">
                          freq. {pp.frequency}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {selected.regulations && selected.regulations.length > 0 && (
                <div className="mt-5">
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--color-edito-navy)]">Réglementation ({selected.regulations.length})</h3>
                  <ul className="mt-2 space-y-1.5">
                    {selected.regulations.slice(0, 3).map((reg) => (
                      <li key={reg.name} className="flex items-center justify-between text-xs text-[var(--color-edito-body)]">
                        <span>{reg.name}</span>
                        <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${reg.urgency === "high" ? "bg-red-50 text-red-600" : reg.urgency === "medium" ? "bg-amber-50 text-amber-700" : "bg-[var(--color-edito-chip)] text-[var(--color-edito-muted)]"}`}>
                          {reg.deadline ?? "—"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </article>
          ) : (
            <div className="flex flex-1 items-center justify-center text-center">
              <div>
                <p className="text-sm font-bold text-[var(--color-edito-navy)]">Sélectionnez un contenu</p>
                <p className="mt-1 text-xs text-[var(--color-edito-muted)]">L'aperçu et les connexions s'afficheront ici.</p>
              </div>
            </div>
          )}
        </section>

        {/* Detail panel */}
        <aside className="w-[240px] shrink-0 overflow-y-auto border-l border-[var(--color-edito-border)] bg-white">
          <div className="border-b border-[var(--color-edito-border)] px-4 py-3">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--color-edito-navy)]">Fiche</h2>
          </div>
          {selected ? (
            <div className="divide-y divide-[var(--color-edito-border)] px-4">
              <section className="py-3">
                <dl className="space-y-2 text-[10px]">
                  {[
                    ["Type", selected.type.replace(/_/g, " ")],
                    ["Domaine", domains.find((d) => d.id === selected.domain)?.label ?? "—"],
                    ["Mis à jour", selected.updatedAt],
                    ["Source", selected.source],
                    ["Fraîcheur", selected.freshness],
                  ].map(([label, value]) => (
                    <div key={label} className="grid grid-cols-[72px_1fr] gap-2">
                      <dt className="text-[var(--color-edito-muted)]">{label}</dt>
                      <dd className="font-semibold text-[var(--color-edito-navy)]">{value}</dd>
                    </div>
                  ))}
                </dl>
              </section>
              <section className="py-3">
                <h3 className="mb-2 text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--color-edito-navy)]">Actions</h3>
                <div className="space-y-1.5">
                  <button type="button" className="w-full rounded border border-[var(--color-edito-border)] bg-[var(--color-edito-chip)] px-3 py-1.5 text-[10px] font-semibold text-[var(--color-edito-navy)] hover:bg-[var(--color-edito-border)]/40">
                    {selected.isFavorite ? "★ Retirer des favoris" : "☆ Ajouter aux favoris"}
                  </button>
                  <button type="button" className="w-full rounded border border-[var(--color-edito-border)] bg-[var(--color-edito-chip)] px-3 py-1.5 text-[10px] font-semibold text-[var(--color-edito-navy)] hover:bg-[var(--color-edito-border)]/40">
                    ↗ Ouvrir dans le module source
                  </button>
                  <button type="button" className="w-full rounded border border-[var(--color-edito-border)] bg-[var(--color-edito-chip)] px-3 py-1.5 text-[10px] font-semibold text-[var(--color-edito-navy)] hover:bg-[var(--color-edito-border)]/40">
                    📋 Copier le résumé
                  </button>
                </div>
              </section>
              {/* Connections (from Proposal C enrichment) */}
              {selected.connections.accounts.length > 0 && (
                <section className="py-3">
                  <h3 className="mb-2 text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--color-edito-navy)]">
                    Comptes liés ({selected.connections.accounts.length})
                  </h3>
                  <ul className="space-y-1">
                    {selected.connections.accounts.slice(0, 5).map((acc) => (
                      <li key={acc.id} className="flex items-center justify-between text-[10px]">
                        <span className="font-semibold text-[var(--color-edito-navy)]">{acc.name}</span>
                        <span className="rounded bg-[var(--color-edito-chip)] px-1.5 py-0.5 text-[9px] text-[var(--color-edito-muted)]">{acc.status}</span>
                      </li>
                    ))}
                    {selected.connections.accounts.length > 5 && (
                      <li className="text-[9px] text-[var(--color-edito-brass)]">+ {selected.connections.accounts.length - 5} autres</li>
                    )}
                  </ul>
                </section>
              )}
              {selected.connections.offers.length > 0 && (
                <section className="py-3">
                  <h3 className="mb-2 text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--color-edito-navy)]">
                    Offres associées ({selected.connections.offers.length})
                  </h3>
                  <ul className="space-y-1">
                    {selected.connections.offers.map((off) => (
                      <li key={off.id} className="text-[10px]">
                        <span className="font-semibold text-[var(--color-edito-navy)]">{off.name}</span>
                        <span className="ml-1 text-[9px] text-[var(--color-edito-muted)]">({off.practice})</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {selected.connections.signals.length > 0 && (
                <section className="py-3">
                  <h3 className="mb-2 text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--color-edito-navy)]">
                    Signaux récents ({selected.connections.signals.length})
                  </h3>
                  <ul className="space-y-1">
                    {selected.connections.signals.map((sig) => (
                      <li key={sig.id} className="text-[10px] text-[var(--color-edito-body)]">
                        <span>{sig.title}</span>
                        <span className="ml-1 text-[9px] text-[var(--color-edito-muted)]">({sig.date})</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          ) : (
            <p className="px-4 py-10 text-center text-xs text-[var(--color-edito-muted)]">Aucune fiche sélectionnée.</p>
          )}
        </aside>
      </div>
    </div>
  )
}

function ProposalAMobile() {
  const [activeDomain, setActiveDomain] = useState<string>("sectors")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const domainItems = getItemsByDomain(activeDomain)
  const selected = items.find((i) => i.id === selectedId) ?? null

  if (selected) {
    return (
      <div className="mx-auto flex h-[740px] w-[370px] flex-col overflow-hidden rounded-2xl border border-[var(--color-edito-border)] bg-white">
        <header className="flex min-h-[52px] shrink-0 items-center gap-3 border-b border-[var(--color-edito-border)] px-4">
          <button type="button" onClick={() => setSelectedId(null)} className="text-[var(--color-edito-brass)] text-xs font-bold">← Retour</button>
          <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--color-edito-muted)]">Détail</span>
        </header>
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--color-edito-brass)]">KREDO Knowledge</p>
          <h2 className="mt-1 text-sm font-bold text-[var(--color-edito-navy)]">{selected.title}</h2>
          <div className="mt-1 flex items-center gap-2">
            <TypeLabel type={selected.type} />
            <ScoreBadge score={selected.score} />
            <FreshnessIndicator freshness={selected.freshness} />
          </div>
          <p className="mt-3 text-xs leading-5 text-[var(--color-edito-body)]">{selected.summary}</p>

          {/* Actions - 48px touch targets */}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button type="button" className="flex min-h-[48px] items-center justify-center rounded border border-[var(--color-edito-border)] text-[10px] font-bold text-[var(--color-edito-navy)]">
              {selected.isFavorite ? "★ Favori" : "☆ Favori"}
            </button>
            <button type="button" className="flex min-h-[48px] items-center justify-center rounded border border-[var(--color-edito-border)] text-[10px] font-bold text-[var(--color-edito-navy)]">
              ↗ Ouvrir source
            </button>
          </div>

          {/* Connections */}
          {selected.connections.accounts.length > 0 && (
            <section className="mt-5 border-t border-[var(--color-edito-border)] pt-3">
              <h3 className="text-[10px] font-bold uppercase text-[var(--color-edito-navy)]">Comptes liés ({selected.connections.accounts.length})</h3>
              <ul className="mt-2 space-y-2">
                {selected.connections.accounts.slice(0, 4).map((acc) => (
                  <li key={acc.id} className="flex min-h-[44px] items-center justify-between rounded border border-[var(--color-edito-border)] px-3">
                    <span className="text-xs font-semibold text-[var(--color-edito-navy)]">{acc.name}</span>
                    <span className="text-[9px] text-[var(--color-edito-muted)]">{acc.status}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {selected.connections.offers.length > 0 && (
            <section className="mt-4 border-t border-[var(--color-edito-border)] pt-3">
              <h3 className="text-[10px] font-bold uppercase text-[var(--color-edito-navy)]">Offres associées ({selected.connections.offers.length})</h3>
              <ul className="mt-2 space-y-2">
                {selected.connections.offers.map((off) => (
                  <li key={off.id} className="flex min-h-[44px] items-center rounded border border-[var(--color-edito-border)] px-3 text-xs font-semibold text-[var(--color-edito-navy)]">
                    {off.name}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex h-[740px] w-[370px] flex-col overflow-hidden rounded-2xl border border-[var(--color-edito-border)] bg-[var(--color-edito-canvas)]">
      <header className="flex min-h-[52px] shrink-0 items-center justify-between border-b border-[var(--color-edito-border)] bg-white px-4">
        <h1 className="text-sm font-bold text-[var(--color-edito-navy)]">Knowledge Hub</h1>
        <button type="button" className="flex size-9 items-center justify-center rounded border border-[var(--color-edito-border)] text-[var(--color-edito-muted)]">🔍</button>
      </header>
      <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-[var(--color-edito-border)] bg-white px-3 py-2">
        {domains.filter((d) => d.count > 0).map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => setActiveDomain(d.id)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-bold ${activeDomain === d.id ? "border-[var(--color-edito-navy)] bg-[var(--color-edito-navy)] text-white" : "border-[var(--color-edito-border)] text-[var(--color-edito-navy)]"}`}
          >
            {d.shortLabel}
          </button>
        ))}
      </nav>
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {domainItems.map((item) => (
          <button key={item.id} type="button" onClick={() => setSelectedId(item.id)} className="mb-2 w-full rounded-lg border border-[var(--color-edito-border)] bg-white p-3 text-left active:bg-[var(--color-edito-chip)]">
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-bold text-[var(--color-edito-navy)]">{item.title}</span>
              <ScoreBadge score={item.score} />
            </div>
            <div className="mt-1 flex items-center gap-2">
              <FreshnessIndicator freshness={item.freshness} />
              <TypeLabel type={item.type} />
              <ConnectionCount item={item} />
            </div>
            <p className="mt-1.5 line-clamp-2 text-[10px] leading-4 text-[var(--color-edito-body)]">{item.summary}</p>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── PROPOSAL B — Business Workspace ───────────────────────────────

function ProposalBDesktop() {
  const favorites = getFavorites()
  const stale = getStaleItems()

  return (
    <div className="flex h-[640px] flex-col overflow-hidden rounded-xl border border-[var(--color-edito-border)] bg-[var(--color-edito-canvas)]">
      <header className="flex min-h-[56px] shrink-0 items-center justify-between border-b border-[var(--color-edito-border)] bg-white px-5">
        <h1 className="text-lg font-bold tracking-tight text-[var(--color-edito-navy)]">Knowledge Hub</h1>
        <input
          type="text"
          placeholder="Rechercher dans le corpus…"
          className="h-8 w-56 rounded border border-[var(--color-edito-border)] bg-[var(--color-edito-canvas)] px-3 text-xs text-[var(--color-edito-body)] placeholder:text-[var(--color-edito-muted)] outline-none focus:border-[var(--color-edito-brass)]"
        />
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        <div className="mx-auto max-w-4xl">
          {/* Favorites */}
          {favorites.length > 0 && (
            <section className="mb-6">
              <h2 className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--color-edito-navy)]">Accès rapide</h2>
              <div className="mt-3 flex gap-3 overflow-x-auto">
                {favorites.map((item) => (
                  <div key={item.id} className="flex w-[160px] shrink-0 flex-col rounded-lg border border-[var(--color-edito-border)] bg-white p-3">
                    <span className="text-[9px] font-bold text-[var(--color-edito-brass)]">★</span>
                    <span className="mt-1 line-clamp-2 text-[11px] font-bold text-[var(--color-edito-navy)]">{item.title}</span>
                    <span className="mt-auto pt-2"><TypeLabel type={item.type} /></span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Use Cases */}
          <section className="mb-6">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--color-edito-navy)]">De quoi avez-vous besoin ?</h2>
            <div className="mt-3 grid grid-cols-3 gap-3">
              {useCases.map((uc) => (
                <button key={uc.id} type="button" className="group flex flex-col rounded-lg border border-[var(--color-edito-border)] bg-white p-4 text-left transition-colors hover:border-[var(--color-edito-brass)]/40">
                  <span className="text-xl">{uc.icon}</span>
                  <span className="mt-2 text-xs font-bold text-[var(--color-edito-navy)] group-hover:text-[var(--color-edito-brass)]">{uc.title}</span>
                  <span className="mt-1 text-[10px] leading-4 text-[var(--color-edito-muted)]">{uc.description}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Stale content */}
          {stale.length > 0 && (
            <section>
              <h2 className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--color-edito-navy)]">
                À réviser
                <span className="ml-2 inline-flex size-4 items-center justify-center rounded-full bg-amber-100 text-[8px] font-bold text-amber-700">{stale.length}</span>
              </h2>
              <div className="mt-3 space-y-2">
                {stale.slice(0, 3).map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded border border-amber-200 bg-amber-50/50 px-4 py-3">
                    <div>
                      <span className="text-xs font-bold text-[var(--color-edito-navy)]">{item.title}</span>
                      <span className="ml-2 text-[10px] text-[var(--color-edito-muted)]">MAJ {item.updatedAt}</span>
                    </div>
                    <FreshnessIndicator freshness={item.freshness} />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}

function ProposalBMobile() {
  const favorites = getFavorites()

  return (
    <div className="mx-auto flex h-[740px] w-[370px] flex-col overflow-hidden rounded-2xl border border-[var(--color-edito-border)] bg-[var(--color-edito-canvas)]">
      <header className="flex min-h-[52px] shrink-0 items-center justify-between border-b border-[var(--color-edito-border)] bg-white px-4">
        <h1 className="text-sm font-bold text-[var(--color-edito-navy)]">Knowledge Hub</h1>
        <button type="button" className="flex size-9 items-center justify-center rounded border border-[var(--color-edito-border)] text-[var(--color-edito-muted)]">🔍</button>
      </header>
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {/* Favorites strip */}
        <section className="mb-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[10px] font-bold uppercase text-[var(--color-edito-navy)]">★ Favoris ({favorites.length})</h2>
            <span className="text-[9px] text-[var(--color-edito-brass)]">→</span>
          </div>
          <div className="mt-2 flex gap-2 overflow-x-auto">
            {favorites.map((item) => (
              <div key={item.id} className="flex min-h-[56px] w-[100px] shrink-0 flex-col justify-center rounded border border-[var(--color-edito-border)] bg-white px-2 py-1.5">
                <span className="line-clamp-2 text-[10px] font-bold text-[var(--color-edito-navy)]">{item.title.split(" ").slice(0, 3).join(" ")}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Use cases */}
        <section>
          <h2 className="mb-2 text-[10px] font-bold uppercase text-[var(--color-edito-navy)]">Accès rapide</h2>
          <div className="space-y-2">
            {useCases.slice(0, 4).map((uc) => (
              <button key={uc.id} type="button" className="flex min-h-[56px] w-full items-center gap-3 rounded-lg border border-[var(--color-edito-border)] bg-white px-4 py-3 text-left active:bg-[var(--color-edito-chip)]">
                <span className="text-lg">{uc.icon}</span>
                <div>
                  <span className="text-xs font-bold text-[var(--color-edito-navy)]">{uc.title}</span>
                  <span className="mt-0.5 block text-[10px] text-[var(--color-edito-muted)]">{uc.description}</span>
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

// ── PROPOSAL C — Relational Atlas ─────────────────────────────────

function ProposalCDesktop() {
  const [activeDomain, setActiveDomain] = useState<string>("sectors")
  const [selectedId, setSelectedId] = useState<string | null>("s1")

  const domainItems = getItemsByDomain(activeDomain)
  const selected = items.find((i) => i.id === selectedId) ?? null

  return (
    <div className="flex h-[640px] flex-col overflow-hidden rounded-xl border border-[var(--color-edito-border)] bg-[var(--color-edito-canvas)]">
      <header className="flex min-h-[56px] shrink-0 items-center justify-between border-b border-[var(--color-edito-border)] bg-white px-5">
        <h1 className="text-lg font-bold tracking-tight text-[var(--color-edito-navy)]">Knowledge Hub</h1>
        <input
          type="text"
          placeholder="Rechercher contenus et entités…"
          className="h-8 w-64 rounded border border-[var(--color-edito-border)] bg-[var(--color-edito-canvas)] px-3 text-xs text-[var(--color-edito-body)] placeholder:text-[var(--color-edito-muted)] outline-none focus:border-[var(--color-edito-brass)]"
        />
      </header>

      {/* Domain cards */}
      <div className="flex shrink-0 gap-3 border-b border-[var(--color-edito-border)] bg-white px-5 py-3">
        {domains.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => { setActiveDomain(d.id); setSelectedId(null) }}
            className={`flex min-h-[60px] w-[140px] shrink-0 flex-col justify-center rounded-lg border p-3 transition-colors ${activeDomain === d.id ? "border-[var(--color-edito-brass)] bg-[var(--color-edito-brass)]/[0.06]" : "border-[var(--color-edito-border)] bg-[var(--color-edito-canvas)] hover:border-[var(--color-edito-muted)]"}`}
          >
            <span className="text-lg">{d.icon}</span>
            <span className="mt-0.5 text-[10px] font-bold text-[var(--color-edito-navy)]">{d.shortLabel}</span>
            <span className={`text-[18px] font-bold ${d.count > 0 ? "text-[var(--color-edito-navy)]" : "text-[var(--color-edito-muted)]"}`}>{d.count}</span>
          </button>
        ))}
      </div>

      {/* 3-column: list + content + connections */}
      <div className="flex min-h-0 flex-1">
        <section className="flex w-[220px] shrink-0 flex-col border-r border-[var(--color-edito-border)] bg-white">
          <div className="shrink-0 border-b border-[var(--color-edito-border)] px-3 py-2">
            <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--color-edito-navy)]">
              {domains.find((d) => d.id === activeDomain)?.label} ({domainItems.length})
            </p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {domainItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedId(item.id)}
                className={`relative w-full border-b border-[var(--color-edito-border)] px-3 py-2.5 text-left transition-colors ${selectedId === item.id ? "bg-[var(--color-edito-navy)]/[0.06] before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-[var(--color-edito-brass)]" : "hover:bg-[var(--color-edito-chip)]"}`}
              >
                <span className="flex items-center gap-1.5">
                  <FreshnessIndicator freshness={item.freshness} />
                  <span className="truncate text-[11px] font-bold text-[var(--color-edito-navy)]">{item.title}</span>
                </span>
                <ConnectionCount item={item} />
              </button>
            ))}
          </div>
        </section>

        <section className="flex min-w-0 flex-1 flex-col bg-[var(--color-edito-canvas)] px-4 py-4">
          {selected ? (
            <article className="mx-auto w-full max-w-[560px] rounded-lg border border-[var(--color-edito-border)] bg-white px-5 py-4">
              <div className="flex items-start justify-between">
                <div>
                  <TypeLabel type={selected.type} />
                  <h2 className="mt-1 text-base font-bold text-[var(--color-edito-navy)]">{selected.title}</h2>
                </div>
                <ScoreBadge score={selected.score} />
              </div>
              <p className="mt-3 border-l-2 border-[var(--color-edito-muted)]/30 pl-3 text-xs leading-5 text-[var(--color-edito-body)]">{selected.summary}</p>
              <div className="mt-3 flex items-center gap-3 text-[9px] text-[var(--color-edito-muted)]">
                <span>MAJ {selected.updatedAt}</span>
                <FreshnessIndicator freshness={selected.freshness} />
                <span>{selected.source}</span>
              </div>
            </article>
          ) : (
            <div className="flex flex-1 items-center justify-center text-xs text-[var(--color-edito-muted)]">Sélectionnez un contenu</div>
          )}
        </section>

        {/* Connections panel — the C differentiator */}
        <aside className="w-[260px] shrink-0 overflow-y-auto border-l border-[var(--color-edito-border)] bg-white">
          <div className="border-b border-[var(--color-edito-navy)] bg-[var(--color-edito-navy)] px-4 py-3">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--color-edito-gold)]">Connexions</h2>
          </div>
          {selected ? (
            <div className="divide-y divide-[var(--color-edito-border)]">
              {selected.connections.accounts.length > 0 && (
                <section className="px-4 py-3">
                  <h3 className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-wider text-[var(--color-edito-navy)]">
                    <span className="inline-flex size-5 items-center justify-center rounded bg-[var(--color-edito-navy)]/10 text-[10px]">🏢</span>
                    Comptes ({selected.connections.accounts.length})
                  </h3>
                  <ul className="mt-2 space-y-1.5">
                    {selected.connections.accounts.map((acc) => (
                      <li key={acc.id} className="flex items-center justify-between rounded border border-[var(--color-edito-border)] px-2.5 py-1.5 text-[10px] transition-colors hover:bg-[var(--color-edito-chip)]">
                        <span className="font-semibold text-[var(--color-edito-navy)]">{acc.name}</span>
                        <span className={`rounded px-1.5 py-0.5 text-[8px] font-bold uppercase ${acc.status === "client" ? "bg-emerald-50 text-emerald-700" : acc.status === "prospect" ? "bg-blue-50 text-blue-700" : "bg-[var(--color-edito-chip)] text-[var(--color-edito-muted)]"}`}>
                          {acc.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {selected.connections.offers.length > 0 && (
                <section className="px-4 py-3">
                  <h3 className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-wider text-[var(--color-edito-navy)]">
                    <span className="inline-flex size-5 items-center justify-center rounded bg-[var(--color-edito-navy)]/10 text-[10px]">📦</span>
                    Offres ({selected.connections.offers.length})
                  </h3>
                  <ul className="mt-2 space-y-1.5">
                    {selected.connections.offers.map((off) => (
                      <li key={off.id} className="rounded border border-[var(--color-edito-border)] px-2.5 py-1.5 text-[10px] transition-colors hover:bg-[var(--color-edito-chip)]">
                        <span className="font-semibold text-[var(--color-edito-navy)]">{off.name}</span>
                        <span className="ml-1 text-[9px] text-[var(--color-edito-muted)]">{off.practice}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {selected.connections.reports.length > 0 && (
                <section className="px-4 py-3">
                  <h3 className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-wider text-[var(--color-edito-navy)]">
                    <span className="inline-flex size-5 items-center justify-center rounded bg-[var(--color-edito-navy)]/10 text-[10px]">📄</span>
                    Rapports ({selected.connections.reports.length})
                  </h3>
                  <ul className="mt-2 space-y-1.5">
                    {selected.connections.reports.map((rep) => (
                      <li key={rep.id} className="rounded border border-[var(--color-edito-border)] px-2.5 py-1.5 text-[10px] text-[var(--color-edito-navy)] transition-colors hover:bg-[var(--color-edito-chip)]">
                        {rep.title}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {selected.connections.signals.length > 0 && (
                <section className="px-4 py-3">
                  <h3 className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-wider text-[var(--color-edito-navy)]">
                    <span className="inline-flex size-5 items-center justify-center rounded bg-[var(--color-edito-navy)]/10 text-[10px]">📡</span>
                    Signaux ({selected.connections.signals.length})
                  </h3>
                  <ul className="mt-2 space-y-1.5">
                    {selected.connections.signals.map((sig) => (
                      <li key={sig.id} className="rounded border border-[var(--color-edito-border)] px-2.5 py-1.5 text-[10px] text-[var(--color-edito-body)] transition-colors hover:bg-[var(--color-edito-chip)]">
                        <span>{sig.title}</span>
                        <span className="mt-0.5 block text-[9px] text-[var(--color-edito-muted)]">{sig.date}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          ) : (
            <p className="px-4 py-10 text-center text-xs text-[var(--color-edito-muted)]">Sélectionnez un contenu pour voir ses connexions.</p>
          )}
        </aside>
      </div>
    </div>
  )
}

function ProposalCMobile() {
  const [activeDomain, setActiveDomain] = useState<string>("sectors")
  const domainItems = getItemsByDomain(activeDomain)

  return (
    <div className="mx-auto flex h-[740px] w-[370px] flex-col overflow-hidden rounded-2xl border border-[var(--color-edito-border)] bg-[var(--color-edito-canvas)]">
      <header className="flex min-h-[52px] shrink-0 items-center justify-between border-b border-[var(--color-edito-border)] bg-white px-4">
        <h1 className="text-sm font-bold text-[var(--color-edito-navy)]">Knowledge Hub</h1>
        <button type="button" className="flex size-9 items-center justify-center rounded border border-[var(--color-edito-border)] text-[var(--color-edito-muted)]">🔍</button>
      </header>
      {/* Domain cards */}
      <div className="flex shrink-0 gap-2 overflow-x-auto border-b border-[var(--color-edito-border)] bg-white px-3 py-2">
        {domains.filter((d) => d.count > 0).map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => setActiveDomain(d.id)}
            className={`flex min-h-[48px] w-[72px] shrink-0 flex-col items-center justify-center rounded-lg border p-1.5 ${activeDomain === d.id ? "border-[var(--color-edito-brass)] bg-[var(--color-edito-brass)]/[0.06]" : "border-[var(--color-edito-border)]"}`}
          >
            <span className="text-sm">{d.icon}</span>
            <span className="mt-0.5 text-[8px] font-bold text-[var(--color-edito-navy)]">{d.shortLabel}</span>
            <span className="text-[11px] font-bold text-[var(--color-edito-navy)]">{d.count}</span>
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {domainItems.map((item) => (
          <div key={item.id} className="mb-2 rounded-lg border border-[var(--color-edito-border)] bg-white p-3">
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-bold text-[var(--color-edito-navy)]">{item.title}</span>
              <ScoreBadge score={item.score} />
            </div>
            <div className="mt-1 flex items-center gap-2">
              <FreshnessIndicator freshness={item.freshness} />
              <TypeLabel type={item.type} />
            </div>
            {/* Inline connections preview */}
            <div className="mt-2 flex flex-wrap gap-1">
              {item.connections.accounts.length > 0 && (
                <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[8px] font-bold text-emerald-700">
                  🏢 {item.connections.accounts.length}
                </span>
              )}
              {item.connections.offers.length > 0 && (
                <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[8px] font-bold text-blue-700">
                  📦 {item.connections.offers.length}
                </span>
              )}
              {item.connections.reports.length > 0 && (
                <span className="rounded bg-purple-50 px-1.5 py-0.5 text-[8px] font-bold text-purple-700">
                  📄 {item.connections.reports.length}
                </span>
              )}
              {item.connections.signals.length > 0 && (
                <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[8px] font-bold text-amber-700">
                  📡 {item.connections.signals.length}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main Lab Component ────────────────────────────────────────────

export function KnowledgeHubLab() {
  const [proposal, setProposal] = useState<ProposalId>("a")
  const [device, setDevice] = useState<DeviceMode>("desktop")

  return (
    <div className="min-h-screen bg-[#0B1221] text-white">
      {/* Lab header */}
      <header className="border-b border-white/10 px-6 py-4">
        <div className="mx-auto max-w-7xl">
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--color-edito-brass)]">Design Lab</p>
          <h1 className="mt-1 text-xl font-bold">Knowledge Hub — Comparaison des 3 propositions</h1>
          <p className="mt-1 text-xs text-white/60">Prototypes interactifs avec données statiques du corpus KREDO réel. Aucune connexion Supabase.</p>
        </div>
      </header>

      {/* Controls */}
      <div className="sticky top-0 z-10 border-b border-white/10 bg-[#0B1221]/95 px-6 py-3 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex gap-2">
            {PROPOSALS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setProposal(p.id)}
                className={`rounded-lg border px-4 py-2 text-left transition-colors ${proposal === p.id ? "border-[var(--color-edito-brass)] bg-[var(--color-edito-brass)]/10" : "border-white/10 hover:border-white/30"}`}
              >
                <span className="block text-xs font-bold">{p.name}</span>
                <span className="block text-[10px] text-white/50">{p.subtitle}</span>
              </button>
            ))}
          </div>
          <div className="flex gap-1 rounded border border-white/10 p-0.5">
            <button
              type="button"
              onClick={() => setDevice("desktop")}
              className={`rounded px-3 py-1.5 text-[10px] font-bold ${device === "desktop" ? "bg-white text-[#0B1221]" : "text-white/60 hover:text-white"}`}
            >
              Desktop 1440
            </button>
            <button
              type="button"
              onClick={() => setDevice("mobile")}
              className={`rounded px-3 py-1.5 text-[10px] font-bold ${device === "mobile" ? "bg-white text-[#0B1221]" : "text-white/60 hover:text-white"}`}
            >
              Mobile 390
            </button>
          </div>
        </div>
      </div>

      {/* Viewport */}
      <main className="px-6 py-8">
        <div className="mx-auto max-w-7xl">
          {proposal === "a" && device === "desktop" && <ProposalADesktop />}
          {proposal === "a" && device === "mobile" && <div className="flex justify-center"><ProposalAMobile /></div>}
          {proposal === "b" && device === "desktop" && <ProposalBDesktop />}
          {proposal === "b" && device === "mobile" && <div className="flex justify-center"><ProposalBMobile /></div>}
          {proposal === "c" && device === "desktop" && <ProposalCDesktop />}
          {proposal === "c" && device === "mobile" && <div className="flex justify-center"><ProposalCMobile /></div>}
        </div>
      </main>
    </div>
  )
}

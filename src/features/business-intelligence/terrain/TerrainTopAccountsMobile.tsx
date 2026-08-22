"use client"

import type { TerrainTopAccount, TerrainTopAccountsModel } from "./terrain-top-accounts-model"

function BackIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.4" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H6m5-5-5 5 5 5" />
    </svg>
  )
}

const CATEGORY_LABELS: Record<string, string> = {
  leader: "Leader",
  challenger: "Challenger",
  mid_market: "Mid-market",
  outsider_emergent: "Outsider émergent",
  outsider_niche: "Outsider niche",
}

function formatCategory(account: TerrainTopAccount): string {
  if (account.categoryLabel) return account.categoryLabel
  if (account.category && CATEGORY_LABELS[account.category]) return CATEGORY_LABELS[account.category]
  if (account.category) {
    const formatted = account.category.replaceAll("_", " ")
    return `${formatted.charAt(0).toUpperCase()}${formatted.slice(1)}`
  }
  return "Catégorie non spécifiée"
}

export function TerrainTopAccountsMobile({
  model,
  onBack,
}: {
  model: TerrainTopAccountsModel
  onBack: () => void
}) {
  const { ranked, excludedBenchmark, mode } = model

  return (
    <div
      className="flex min-h-full flex-col bg-edito-canvas"
      data-terrain-surface="top-accounts"
    >
      {/* Surface Header */}
      <header className="relative flex min-h-[76px] items-center justify-between bg-edito-navy px-5 pt-[max(16px,env(safe-area-inset-top))] pb-3.5 text-white shadow-sm">
        <button
          type="button"
          onClick={onBack}
          aria-label="Retour au Mode Terrain"
          className="inline-flex min-h-11 min-w-[116px] cursor-pointer items-center gap-1.5 text-xs font-extrabold text-white transition-opacity hover:opacity-90 active:opacity-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <BackIcon />
          <span>Terrain</span>
        </button>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-white/80">
          Top 3
        </p>
      </header>

      {/* Main Content */}
      <main className="flex-1 space-y-4 px-5 pt-5 pb-[calc(76px+env(safe-area-inset-bottom))]">
        <section aria-label="Classement des comptes prioritaires" className="space-y-1">
          <h1 className="font-heading text-2xl font-extrabold tracking-tight text-edito-heading">
            Comptes à regarder
          </h1>
          <p className="text-xs text-edito-muted">
            {mode === "strict_fallback"
              ? "Classement par appétence"
              : "Comptes prospectables prioritaires par appétence"}
          </p>
        </section>

        {/* Top 3 List */}
        {ranked.length > 0 ? (
          <ol className="m-0 divide-y divide-edito-border border-y border-edito-border p-0 list-none">
            {ranked.map((account, index) => {
              const rank = index + 1
              const categoryText = formatCategory(account)

              return (
                <li
                  key={account.id}
                  className="grid min-h-[128px] max-h-[144px] grid-cols-[44px_minmax(0,1fr)_66px] items-start gap-3 py-4 select-none"
                >
                  {/* Rank */}
                  <b className="font-heading text-2xl font-extrabold leading-none text-edito-brass">
                    #{rank}
                  </b>

                  {/* Details */}
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h2 className="line-clamp-2 text-sm font-extrabold leading-snug text-edito-heading">
                        {account.name}
                      </h2>
                      {account.isBenchmarkAccount ? (
                        <span className="inline-block flex-shrink-0 rounded border border-edito-brass/40 bg-edito-amber-soft px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-edito-navy">
                          Benchmark
                        </span>
                      ) : null}
                    </div>

                    <p className="line-clamp-1 text-xs font-semibold text-edito-body">
                      {categoryText}
                    </p>

                    {account.entryAngle ? (
                      <p className="line-clamp-2 text-[11px] leading-tight text-edito-muted">
                        {account.entryAngle}
                      </p>
                    ) : null}

                    {account.confidence ? (
                      <small className="line-clamp-1 block text-[10px] font-medium text-edito-muted">
                        Confiance : {account.confidence}
                      </small>
                    ) : null}
                  </div>

                  {/* Score */}
                  <div className="flex-shrink-0 text-right">
                    <strong className="block text-[8px] font-extrabold uppercase tracking-wider text-edito-heading">
                      <span className="block font-heading text-base font-extrabold normal-case tracking-tight text-edito-heading">
                        {account.appetenceScore !== null ? `${account.appetenceScore} / 35` : "N/A"}
                      </span>
                      appétence
                    </strong>
                  </div>
                </li>
              )
            })}
          </ol>
        ) : (
          <p className="py-6 text-center text-xs text-edito-muted">
            Aucun compte classé disponible dans ce segment.
          </p>
        )}

        {/* Excluded Benchmark Block (§15, §32) */}
        {excludedBenchmark ? (
          <section
            aria-label="Benchmark hors classement"
            className="rounded-xl border border-edito-border bg-edito-surface p-3.5 space-y-1 shadow-sm"
          >
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-edito-brass">
              BENCHMARK — HORS CLASSEMENT
            </p>
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-heading text-base font-bold text-edito-heading line-clamp-1">
                {excludedBenchmark.name}
              </h3>
              <strong className="flex-shrink-0 font-heading text-sm font-extrabold text-edito-heading">
                {excludedBenchmark.appetenceScore !== null ? `${excludedBenchmark.appetenceScore} / 35` : "N/A"}
              </strong>
            </div>
            {excludedBenchmark.relationType === "client" || excludedBenchmark.lifecycleStatus === "client" ? (
              <p className="text-[11px] font-semibold text-edito-muted">
                Client actuel
              </p>
            ) : null}
          </section>
        ) : null}

        {/* Desktop renvoi note (§35) */}
        <p className="pt-4 text-center text-xs text-edito-muted underline underline-offset-4">
          Analyse complète disponible sur desktop
        </p>
      </main>
    </div>
  )
}

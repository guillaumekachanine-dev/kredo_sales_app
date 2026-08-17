import type { ManagerSummaryContent } from "@/app/(app)/reports/_data/reports-types"

function formatCurrency(amount: number | null | undefined): string {
  if (amount == null || Number.isNaN(amount)) return "—"
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount)
}

function getWeekNumber(dateStr: string): number | null {
  if (!dateStr) return null
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return null
  const target = new Date(date.valueOf())
  const dayNr = (date.getDay() + 6) % 7
  target.setDate(target.getDate() - dayNr + 3)
  const firstThursday = target.valueOf()
  target.setMonth(0, 1)
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7))
  }
  return 1 + Math.round((firstThursday - target.valueOf()) / 604800000)
}

function formatDateShort(dateStr: string): string {
  if (!dateStr) return ""
  const [year, month, day] = dateStr.split("-")
  if (!year || !month || !day) return dateStr
  return `${day}/${month}`
}

export function ManagerSummaryReportView({ content }: { content: ManagerSummaryContent }) {
  const { facts, narrative } = content
  const period = facts.period ?? {}
  const weekNum = getWeekNumber(period.startDate)
  const periodLabel = weekNum
    ? `Semaine ${String(weekNum).padStart(2, "0")} · ${formatDateShort(period.startDate)} → ${formatDateShort(period.endDate)}`
    : `Semaine du ${formatDateShort(period.startDate)} au ${formatDateShort(period.endDate)}`

  const executiveSummaryText = narrative.executiveSummary || narrative.summary || ""
  const commercial = facts.commercial
  const recruitment = facts.recruitment
  const nextWeek = facts.nextWeek
  const declared = facts.declared
  const strategy = facts.strategy
  const conviction = commercial.signatureConviction

  const priorities = Array.isArray(nextWeek?.priorities) ? nextWeek.priorities : []
  const hasDeclared = Boolean(declared?.difficulties?.trim() || declared?.specificRequests?.trim())

  return (
    <div className="flex flex-col gap-4 text-xs text-body sm:gap-5">
      {/* ── Header Note Exécutive ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 rounded-lg border border-border/80 bg-canvas/60 px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <span className="inline-block size-2 rounded-full bg-primary" />
          <h2 className="font-heading text-sm font-bold text-heading tracking-tight">
            Compte-rendu Manager
          </h2>
          <span className="text-[11px] text-muted font-medium">({facts.owner?.name || "Manager"})</span>
        </div>
        <div className="text-[11px] font-semibold text-muted tracking-wide">
          {periodLabel}
        </div>
      </div>

      {/* ── 1. Synthèse dans un bandeau compact ────────────────────────────── */}
      {executiveSummaryText ? (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 sm:p-3.5">
          <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-primary">
            1. Synthèse exécutive
          </div>
          <p className="text-xs leading-relaxed text-heading font-medium whitespace-pre-wrap">
            {executiveSummaryText}
          </p>
        </div>
      ) : null}

      {/* ── 4 KPI Grille 2x2 très compacte ───────────────────────────────── */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <div className="rounded-lg border border-border/70 bg-surface px-3 py-2 text-center">
          <div className="text-lg font-bold leading-tight text-primary">
            {commercial.meetingsCompletedCount ?? 0}
          </div>
          <div className="text-[10px] font-medium text-muted">RDV commerciaux</div>
        </div>

        <div className="rounded-lg border border-border/70 bg-surface px-3 py-2 text-center">
          <div className="text-lg font-bold leading-tight text-primary">
            {commercial.staffingNeedsOpenedCount ?? 0}
          </div>
          <div className="text-[10px] font-medium text-muted">Besoins AT ouverts</div>
        </div>

        <div className="rounded-lg border border-border/70 bg-surface px-3 py-2 text-center">
          <div className="text-lg font-bold leading-tight text-primary">
            {recruitment.interviewsCompletedCount ?? 0}
          </div>
          <div className="text-[10px] font-medium text-muted">Entretiens candidats</div>
        </div>

        <div className="rounded-lg border border-border/70 bg-surface px-3 py-2 text-center">
          <div className="text-lg font-bold leading-tight text-primary">
            {recruitment.jobOffersMadeCount ?? 0}
          </div>
          <div className="text-[10px] font-medium text-muted">Offres / Propositions</div>
        </div>
      </div>

      {/* ── 2. Activité Commerciale ───────────────────────────────────────── */}
      <section className="rounded-lg border border-border bg-surface p-3.5 sm:p-4">
        <div className="mb-2.5 flex items-center justify-between">
          <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-heading">
            2. Activité Commerciale
          </h3>
          <div className="flex gap-2 text-[10px] text-muted font-medium">
            <span>Traités : <b className="text-heading">{commercial.treatedNeedsCount ?? 0}</b></span>
            <span>·</span>
            <span>Proposés : <b className="text-heading">{commercial.candidatesProposedCount ?? 0}</b></span>
            <span>·</span>
            <span>Nouveaux : <b className="text-heading">{commercial.newOpportunitiesCount ?? 0}</b></span>
          </div>
        </div>

        {/* Clients actifs */}
        {commercial.topActiveClients && commercial.topActiveClients.length > 0 ? (
          <div className="mb-2.5 flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="text-muted font-medium">Comptes actifs :</span>
            {commercial.topActiveClients.map((client) => (
              <span
                key={client.companyId || client.name}
                className="inline-flex items-center gap-1 rounded border border-border bg-canvas/60 px-2 py-0.5 font-medium text-heading"
              >
                {client.name}
                <span className="text-[10px] font-bold text-muted">({client.activityCount})</span>
              </span>
            ))}
          </div>
        ) : null}

        {/* Top Compétences */}
        {commercial.topRequestedSkills && commercial.topRequestedSkills.length > 0 ? (
          <div className="mb-2.5 flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="text-muted font-medium">Compétences demandées :</span>
            {commercial.topRequestedSkills.map((sk) => (
              <span
                key={sk.skill}
                className="inline-flex items-center gap-1 rounded bg-canvas-subtle border border-border px-2 py-0.5 text-[11px] text-heading font-medium"
              >
                {sk.skill}
                <span className="text-[10px] font-bold text-muted">({sk.count})</span>
              </span>
            ))}
          </div>
        ) : null}

        {narrative.commercialCommentary ? (
          <p className="text-xs leading-relaxed text-body whitespace-pre-wrap">
            {narrative.commercialCommentary}
          </p>
        ) : (
          <p className="text-xs text-muted italic">Aucune activité enregistrée</p>
        )}
      </section>

      {/* ── 3. Carte Mise en Avant : Conviction Signature ─────────────────── */}
      <section className="rounded-lg border border-primary/30 bg-canvas p-3.5 sm:p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-primary">
            3. Conviction Signature
          </h3>
          {conviction ? (
            <span className="inline-flex items-center rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary">
              {conviction.probability}% probabilité
            </span>
          ) : null}
        </div>

        {conviction ? (
          <div className="mb-2.5 rounded-md border border-border/80 bg-surface p-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
              <div>
                <span className="font-semibold text-heading text-xs">{conviction.title}</span>
                <span className="ml-2 text-[11px] text-muted">({conviction.companyName})</span>
              </div>
              {conviction.weightedGain ? (
                <span className="text-xs font-bold text-primary whitespace-nowrap">
                  Pondéré : {formatCurrency(conviction.weightedGain)}
                </span>
              ) : null}
            </div>
            {conviction.nextAction ? (
              <div className="mt-1.5 text-[11px] text-muted">
                <span className="font-semibold text-heading">Prochaine action : </span>
                {conviction.nextAction}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="mb-2 text-xs text-muted italic">Aucune opportunité qualifiée en cours</div>
        )}

        {narrative.signatureConvictionCommentary ? (
          <p className="text-xs leading-relaxed text-body whitespace-pre-wrap">
            {narrative.signatureConvictionCommentary}
          </p>
        ) : null}
      </section>

      {/* ── 4. Recrutement ─────────────────────────────────────────────────── */}
      <section className="rounded-lg border border-border bg-surface p-3.5 sm:p-4">
        <h3 className="mb-2.5 font-heading text-xs font-bold uppercase tracking-wider text-heading">
          4. Recrutement
        </h3>

        {recruitment.topCandidatesToKeep && recruitment.topCandidatesToKeep.length > 0 ? (
          <div className="mb-2.5 flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="text-muted font-medium">Candidats clés :</span>
            {recruitment.topCandidatesToKeep.map((c) => (
              <span
                key={c.candidateId || c.name}
                className="inline-flex items-center gap-1 rounded border border-border bg-canvas/60 px-2 py-0.5 font-medium text-heading"
              >
                {c.name}
                {c.practice ? <span className="text-[10px] text-muted">({c.practice})</span> : null}
              </span>
            ))}
          </div>
        ) : null}

        {narrative.recruitmentCommentary ? (
          <p className="text-xs leading-relaxed text-body whitespace-pre-wrap">
            {narrative.recruitmentCommentary}
          </p>
        ) : (
          <p className="text-xs text-muted italic">Aucune activité enregistrée</p>
        )}
      </section>

      {/* ── 5. Priorités S+1 (0 à 3 numérotées) ────────────────────────────── */}
      <section className="rounded-lg border border-border bg-surface p-3.5 sm:p-4">
        <h3 className="mb-2.5 font-heading text-xs font-bold uppercase tracking-wider text-heading">
          5. Sujets prioritaires & next steps (Semaine S+1)
        </h3>

        {priorities.length > 0 ? (
          <div className="flex flex-col gap-2">
            {priorities.slice(0, 3).map((p, idx) => (
              <div
                key={p.title + idx}
                className="flex items-start gap-2.5 rounded-md border border-border/70 bg-canvas/40 p-2.5"
              >
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-heading text-xs">{p.title}</div>
                  {p.description ? (
                    <p className="mt-0.5 text-[11px] text-body leading-snug">{p.description}</p>
                  ) : null}
                  {p.nextAction ? (
                    <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-medium text-primary bg-primary/5 border border-primary/15 rounded px-1.5 py-0.5">
                      <span>Prochaine action :</span> {p.nextAction}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted italic">Aucune activité enregistrée</p>
        )}
      </section>

      {/* ── 6. Difficultés / Demandes spécifiques ─────────────────────────── */}
      {hasDeclared ? (
        <section className="rounded-lg border border-warning/30 bg-warning/5 p-3.5 sm:p-4">
          <h3 className="mb-2 font-heading text-xs font-bold uppercase tracking-wider text-warning">
            6. Difficultés & Demandes Spécifiques
          </h3>
          <div className="flex flex-col gap-2 text-xs">
            {declared.difficulties?.trim() ? (
              <div>
                <span className="font-semibold text-heading">Difficultés rencontrées : </span>
                <span className="text-body">{declared.difficulties}</span>
              </div>
            ) : null}
            {declared.specificRequests?.trim() ? (
              <div>
                <span className="font-semibold text-heading">Demandes spécifiques : </span>
                <span className="text-body">{declared.specificRequests}</span>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* ── 7. Stratégie en cours ──────────────────────────────────────────── */}
      <section className="rounded-lg border border-border bg-surface p-3.5 sm:p-4">
        <h3 className="mb-2 font-heading text-xs font-bold uppercase tracking-wider text-heading">
          7. Stratégie en cours
        </h3>

        {strategy?.strategicFocus ? (
          <div className="mb-2.5 rounded-md border border-primary/20 bg-primary/5 px-3 py-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
              Objectif stratégique actif :
            </span>
            <div className="mt-0.5 font-medium text-heading text-xs">
              {strategy.strategicFocus}
            </div>
          </div>
        ) : null}

        {narrative.strategyProgression ? (
          <p className="text-xs leading-relaxed text-body whitespace-pre-wrap">
            {narrative.strategyProgression}
          </p>
        ) : !strategy?.strategicFocus ? (
          <p className="text-xs text-muted italic">Aucune activité enregistrée</p>
        ) : null}
      </section>
    </div>
  )
}

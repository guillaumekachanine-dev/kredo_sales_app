import type { ManagerSummaryContent } from "@/app/(app)/reports/_data/reports-types"

export function ManagerSummaryReportView({ content }: { content: ManagerSummaryContent }) {
  const { facts, narrative } = content

  return (
    <div className="flex flex-col gap-6 text-sm">
      <section>
        <h3 className="mb-2 text-base font-bold text-heading">1. Synthèse de la semaine</h3>
        <p className="whitespace-pre-wrap text-body">{narrative.summary}</p>
      </section>

      <section>
        <h3 className="mb-2 text-base font-bold text-heading">2. Activité Commerciale</h3>
        <div className="mb-4 grid grid-cols-2 gap-4 rounded-lg border border-border bg-canvas p-4 text-center">
          <div>
            <div className="text-2xl font-bold text-primary">{facts.commercial.meetingsCompletedCount}</div>
            <div className="text-xs text-muted">RDV Réalisés</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-primary">{facts.commercial.staffingNeedsOpenedCount}</div>
            <div className="text-xs text-muted">Besoins Ouverts</div>
          </div>
        </div>
        {facts.commercial.topRequestedSkills.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            <span className="text-xs text-muted self-center font-medium">Top compétences :</span>
            {facts.commercial.topRequestedSkills.map((item) => (
              <span key={item.skill} className="inline-flex items-center gap-1 rounded bg-canvas-subtle border border-border px-2 py-0.5 text-xs text-heading">
                <span>{item.skill}</span>
                <span className="text-[10px] font-bold text-muted">({item.count})</span>
              </span>
            ))}
          </div>
        )}
        <p className="whitespace-pre-wrap text-body">{narrative.commercialCommentary}</p>
      </section>

      <section>
        <h3 className="mb-2 text-base font-bold text-heading">3. Recrutement</h3>
        <div className="mb-4 grid grid-cols-2 gap-4 rounded-lg border border-border bg-canvas p-4 text-center">
          <div>
            <div className="text-2xl font-bold text-primary">{facts.recruitment.interviewsCompletedCount}</div>
            <div className="text-xs text-muted">Entretiens Réalisés</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-primary">{facts.recruitment.jobOffersMadeCount}</div>
            <div className="text-xs text-muted">Propositions Faites</div>
          </div>
        </div>
        <p className="whitespace-pre-wrap text-body">{narrative.recruitmentCommentary}</p>
      </section>

      <section>
        <h3 className="mb-2 text-base font-bold text-heading">4. Conviction Signature</h3>
        {facts.commercial.signatureConviction ? (
          <div className="mb-4 rounded-lg border border-border bg-canvas p-4">
            <div className="font-medium text-heading">{facts.commercial.signatureConviction.title}</div>
            <div className="text-xs text-muted">
              {facts.commercial.signatureConviction.companyName} • Probabilité: {facts.commercial.signatureConviction.probability}%
            </div>
          </div>
        ) : (
          <div className="mb-4 text-sm text-muted">Aucune opportunité qualifiée.</div>
        )}
        <p className="whitespace-pre-wrap text-body">{narrative.signatureConvictionCommentary}</p>
      </section>

      <section>
        <h3 className="mb-2 text-base font-bold text-heading">5. Avancement Stratégique</h3>
        {facts.strategy.strategicFocus && (
          <div className="mb-4 rounded-lg border border-border bg-canvas p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted">Focus actuel</div>
            <div className="mt-1 text-sm text-heading">{facts.strategy.strategicFocus}</div>
          </div>
        )}
        <p className="whitespace-pre-wrap text-body">{narrative.strategyProgression}</p>
      </section>
    </div>
  )
}

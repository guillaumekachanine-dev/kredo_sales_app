import type { SkillsVsNeedsResult as SkillsVsNeedsResultData } from "@/lib/intelligence/actions/skills-vs-needs"
import type { SkillTension } from "@/lib/intelligence/actions/skills-vs-needs-rules"

const TENSION_LABELS: Record<SkillTension, string> = {
  no_supply: "Aucune offre",
  tight: "Sous tension",
  balanced: "Couvert",
  idle: "Sans demande",
}

function Rail({ title, entries }: { title: string; entries: SkillsVsNeedsResultData["topSkills"] }) {
  if (entries.length === 0) return null
  return (
    <section className="space-y-1.5">
      <h4 className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary-fg/45">{title}</h4>
      {entries.map((entry) => (
        <div
          key={entry.label}
          className="flex items-baseline justify-between gap-3 rounded-lg border border-primary-fg/10 bg-primary-fg/[0.04] px-3 py-2"
        >
          <span className="truncate text-xs font-semibold text-primary-fg">{entry.label}</span>
          <span className="shrink-0 text-[11px] text-primary-fg/55">
            {entry.total} · {entry.collaborators} collab. / {entry.candidates} cand.
          </span>
        </div>
      ))}
    </section>
  )
}

export function SkillsVsNeedsResult({ result }: { result: SkillsVsNeedsResultData }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <Metric label={`Besoins ${result.window.months} mois`} value={result.summary.demandedNeeds12m} />
        <Metric label="Effectif portant" value={result.summary.supplyHeadcount} />
        <Metric label="Sous tension" value={result.summary.skillsInTension} />
      </div>

      <p className="rounded-lg border border-primary-fg/10 bg-primary-fg/[0.04] p-3 text-[11px] leading-snug text-primary-fg/65">
        {result.summary.collaboratorsCount} collaborateur(s) et {result.summary.candidatesCount} candidat(s) du vivier
        face à {result.summary.demandedNeeds12m} besoin(s) reçus sur {result.window.months} mois, dont{" "}
        {result.summary.demandedNeeds90d} sur les {result.window.trendDays} derniers jours.
        {result.summary.skillsWithoutSupply > 0 && (
          <> {result.summary.skillsWithoutSupply} compétence(s) demandée(s) sans aucun profil qui la porte.</>
        )}
      </p>

      {result.skills.length === 0 ? (
        <p className="rounded-lg border border-primary-fg/10 bg-primary-fg/[0.04] p-3 text-xs text-primary-fg/65">
          Aucune compétence demandée ni portée sur la période.
        </p>
      ) : (
        <section className="space-y-2.5">
          <h4 className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary-fg/45">
            Offre, demande et tension
          </h4>
          {result.skills.map((skill) => (
            <div key={skill.skillId} className="rounded-lg border border-primary-fg/10 bg-primary-fg/[0.04] p-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded-full border border-primary-fg/10 bg-primary-fg/[0.06] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-primary-fg/70">
                  {TENSION_LABELS[skill.tension]}
                </span>
                {skill.category && <span className="text-[10px] text-primary-fg/45">{skill.category}</span>}
                {skill.isAccelerating && (
                  <span className="text-[10px] font-semibold text-brand-brass">en accélération</span>
                )}
              </div>
              <p className="mt-2 text-sm font-semibold leading-snug text-primary-fg">{skill.skillName}</p>
              <p className="mt-1 text-xs leading-snug text-primary-fg/60">
                {skill.demand12m} besoin(s) · {skill.supplyHeadcount} profil(s) ({skill.supplyCollaborators} collab. /{" "}
                {skill.supplyCandidates} cand.)
                {skill.tensionRatio !== null ? ` · ${skill.tensionRatio} besoin(s) par profil` : ""}
              </p>
              {skill.recentSharePct !== null && (
                <p className="mt-2 text-[11px] leading-snug text-primary-fg/45">
                  {skill.recentSharePct} % de la demande sur les {result.window.trendDays} derniers jours
                </p>
              )}
            </div>
          ))}
        </section>
      )}

      <Rail title="Compétences les plus portées" entries={result.topSkills} />
      <Rail title="Profils les plus représentés" entries={result.topProfiles} />
      <Rail title="Répartition par practice" entries={result.practices} />

      {result.sourceIssues.length > 0 && (
        <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-[11px] leading-snug text-primary-fg/70">
          Données partielles : {result.sourceIssues.join(" ")}
        </div>
      )}
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-primary-fg/10 bg-primary-fg/[0.04] p-2.5">
      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-primary-fg/45">{label}</p>
      <p className="mt-1 text-base font-bold leading-none text-primary-fg">{value}</p>
    </div>
  )
}

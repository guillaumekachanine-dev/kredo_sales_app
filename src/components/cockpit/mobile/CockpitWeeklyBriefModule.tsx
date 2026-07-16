"use client"

import type { CockpitMobileSnapshot } from "@/lib/cockpit/mobile/cockpit-mobile-snapshot-types"
import { getCockpitWeeklyBriefSections } from "./cockpit-mobile-module-presenters"

interface CockpitWeeklyBriefModuleProps {
  snapshot: CockpitMobileSnapshot
  onOpenPriorities: () => void
}

export function CockpitWeeklyBriefModule({
  snapshot,
  onOpenPriorities,
}: CockpitWeeklyBriefModuleProps) {
  const content = snapshot.weeklyBrief
  if (!content) {
    return (
      <p className="cockpit-sheet-empty">
        Aucun brief hebdomadaire enregistré. Le Cockpit ne lance pas de génération automatiquement.
      </p>
    )
  }

  const sections = getCockpitWeeklyBriefSections(content)

  return (
    <div className="cockpit-brief-module">
      {sections.map((section) => (
        <section key={section.id} className="cockpit-module-section" aria-labelledby={`brief-${section.id}`}>
          <h3 id={`brief-${section.id}`}>{section.title}</h3>

          {section.summary ? <p className="cockpit-sheet-summary">{section.summary}</p> : null}

          <dl className="cockpit-module-metrics">
            {section.metrics.map((metric) => (
              <div key={metric.label}>
                <dt>{metric.label}</dt>
                <dd>{metric.value}</dd>
              </div>
            ))}
          </dl>

          {section.items.length > 0 ? (
            <ul className="cockpit-module-bullets">
              {section.items.map((item, index) => <li key={`${section.id}-${index}`}>{item}</li>)}
            </ul>
          ) : null}

          {section.qaFlags.length > 0 ? (
            <div className="cockpit-qa-flags" aria-label="Contrôles qualité du brief">
              <h4>Alertes QA</h4>
              <ul>
                {section.qaFlags.map((flag) => (
                  <li key={`${flag.check}-${flag.detail ?? ""}`} data-passed={flag.passed}>
                    <span>{flag.passed ? "Validé" : "À vérifier"}</span>
                    <strong>{flag.check}</strong>
                    {flag.detail ? <p>{flag.detail}</p> : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ))}

      <button type="button" className="cockpit-sheet-primary-link" onClick={onOpenPriorities}>
        Voir les priorités
      </button>
    </div>
  )
}

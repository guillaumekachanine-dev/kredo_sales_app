"use client"

import type { CockpitMobileSnapshot } from "@/lib/cockpit/mobile/cockpit-mobile-snapshot-types"
import { getNavigationIcon } from "@/components/layout/navigation-icons"
import { getCockpitWeeklyBriefSections } from "./cockpit-mobile-module-presenters"

interface CockpitWeeklyBriefModuleProps {
  snapshot: CockpitMobileSnapshot
  onOpenPriorities: () => void
}

const SECTION_ICONS = {
  essential: "reports",
  business: "sales",
  delivery: "engagements",
  vigilances: "settings",
} as const

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
          <div className="cockpit-week-modal__section-heading">
            <span className="cockpit-week-modal__section-icon" aria-hidden="true">
              {getNavigationIcon(SECTION_ICONS[section.id], "size-3.5", 1.8)}
            </span>
            <h3 id={`brief-${section.id}`}>{section.title}</h3>
          </div>

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
            <details className="cockpit-qa-flags">
              <summary>
                <span>Alertes QA</span>
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m7.5 5 5 5-5 5" />
                </svg>
              </summary>
              <ul>
                {section.qaFlags.map((flag) => (
                  <li key={`${flag.check}-${flag.detail ?? ""}`} data-passed={flag.passed}>
                    <span>{flag.passed ? "Validé" : "À vérifier"}</span>
                    <strong>{flag.check}</strong>
                    {flag.detail ? <p>{flag.detail}</p> : null}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </section>
      ))}

      <button type="button" className="cockpit-sheet-primary-link" onClick={onOpenPriorities}>
        Voir les priorités
      </button>
    </div>
  )
}

"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import {
  cockpitSignals,
  crmRows,
  directions,
  domains,
  financeBars,
  getDirectionById,
  talentItems,
  type Direction,
  type DirectionId,
  type DomainId,
  type InteractionState,
  interactionStates,
  type ViewportMode,
} from "./identity-data"

type KredoIdentityLabProps = {
  initialDirection?: DirectionId
}

function normalizeDirection(id?: DirectionId): DirectionId {
  return id && directions.some((direction) => direction.id === id) ? id : "a"
}

function DomainPill({ domainId }: { domainId: DomainId }) {
  const domain = domains.find((item) => item.id === domainId) ?? domains[0]
  return <span className="kredo-lab-pill">{domain.shortLabel}</span>
}

function DirectionTabs({
  selected,
  onSelect,
}: {
  selected: DirectionId
  onSelect: (id: DirectionId) => void
}) {
  return (
    <div className="kredo-lab-direction-tabs" aria-label="Directions artistiques">
      {directions.map((direction) => (
        <button
          key={direction.id}
          type="button"
          aria-current={selected === direction.id}
          className="kredo-lab-direction-button"
          onClick={() => onSelect(direction.id)}
        >
          <strong>{direction.shortName}. {direction.name}</strong>
          <span>{direction.intention}</span>
        </button>
      ))}
    </div>
  )
}

function LabControls({
  directionId,
  viewport,
  domain,
  interaction,
  motionEnabled,
  onDirectionChange,
  onViewportChange,
  onDomainChange,
  onInteractionChange,
  onMotionChange,
}: {
  directionId: DirectionId
  viewport: ViewportMode
  domain: DomainId
  interaction: InteractionState
  motionEnabled: boolean
  onDirectionChange: (id: DirectionId) => void
  onViewportChange: (mode: ViewportMode) => void
  onDomainChange: (id: DomainId) => void
  onInteractionChange: (state: InteractionState) => void
  onMotionChange: (enabled: boolean) => void
}) {
  return (
    <aside className="kredo-lab-control-panel" aria-label="Parametres du laboratoire">
      <DirectionTabs selected={directionId} onSelect={onDirectionChange} />

      <div className="kredo-lab-control-grid">
        <label className="kredo-lab-field">
          <span className="kredo-lab-label">Viewport</span>
          <select
            className="kredo-lab-select"
            value={viewport}
            onChange={(event) => onViewportChange(event.target.value as ViewportMode)}
          >
            <option value="desktop">Desktop analyse</option>
            <option value="mobile">Mobile action</option>
          </select>
        </label>

        <label className="kredo-lab-field">
          <span className="kredo-lab-label">Domaine</span>
          <select
            className="kredo-lab-select"
            value={domain}
            onChange={(event) => onDomainChange(event.target.value as DomainId)}
          >
            {domains.map((item) => (
              <option key={item.id} value={item.id}>{item.label}</option>
            ))}
          </select>
        </label>

        <label className="kredo-lab-field">
          <span className="kredo-lab-label">Etat</span>
          <select
            className="kredo-lab-select"
            value={interaction}
            onChange={(event) => onInteractionChange(event.target.value as InteractionState)}
          >
            {interactionStates.map((item) => (
              <option key={item.id} value={item.id}>{item.label}</option>
            ))}
          </select>
        </label>

        <div className="kredo-lab-field">
          <span className="kredo-lab-label">Motion</span>
          <button
            type="button"
            className="kredo-lab-button"
            aria-pressed={motionEnabled}
            onClick={() => onMotionChange(!motionEnabled)}
          >
            {motionEnabled ? "Animations actives" : "Animations coupees"}
          </button>
        </div>
      </div>
    </aside>
  )
}

function LabRail() {
  return (
    <aside className="kredo-lab-rail" aria-label="Navigation prototype">
      <div className="kredo-lab-logo">K</div>
      <div className="kredo-lab-rail-dot is-active" />
      <div className="kredo-lab-rail-dot" />
      <div className="kredo-lab-rail-dot" />
      <div className="kredo-lab-rail-dot" />
    </aside>
  )
}

function CockpitScreen({ selectedDomain }: { selectedDomain: DomainId }) {
  return (
    <section className="kredo-lab-section">
      <header className="kredo-lab-section-header">
        <div>
          <DomainPill domainId={selectedDomain} />
          <h2 className="kredo-lab-section-title">Cockpit Intelligence</h2>
          <p className="kredo-lab-section-note">Synthese IA, alertes et action immediate.</p>
        </div>
        <div className="kredo-lab-ai-orbit" aria-label="Confiance IA 91 pour cent">91%</div>
      </header>

      <div className="kredo-lab-kpi-grid">
        {cockpitSignals.map((item) => (
          <article key={item.label} className="kredo-lab-kpi">
            <p className="kredo-lab-kpi-label">{item.label}</p>
            <p className="kredo-lab-kpi-value">{item.value}</p>
            <p className="kredo-lab-kpi-delta" data-tone={item.tone}>{item.delta}</p>
          </article>
        ))}
      </div>

      <div className="kredo-lab-card-stack">
        <article className="kredo-lab-card lab-interactive is-selected" tabIndex={0}>
          <h3>Alerte marge sur forfait Portail RH IA</h3>
          <p>Le reste a faire augmente plus vite que la facturation prevue. Impact simule: -4.8 pts.</p>
        </article>
        <article className="kredo-lab-card lab-interactive" tabIndex={0}>
          <h3>Recommandation IA</h3>
          <p>Lancer une revue staffing et proposer deux profils Data disponibles sous 30 jours.</p>
        </article>
        <article className="kredo-lab-card lab-interactive" tabIndex={0}>
          <h3>Generation en cours</h3>
          <p>Preparation d&apos;un brief client, sources CRM, CRA et opportunites consolidees.</p>
        </article>
      </div>
    </section>
  )
}

function CrmScreen({ viewport }: { viewport: ViewportMode }) {
  return (
    <section className="kredo-lab-section">
      <header className="kredo-lab-section-header">
        <div>
          <DomainPill domainId="account" />
          <h2 className="kredo-lab-section-title">Comptes & Contacts</h2>
          <p className="kredo-lab-section-note">Vue dense Desktop, cartes decisionnelles Mobile.</p>
        </div>
        <span className="kredo-lab-pill">4 signaux</span>
      </header>

      <div className="kredo-lab-table-wrap">
        <table className="kredo-lab-table" aria-label="Comptes prioritaires">
          <thead>
            <tr>
              <th>Compte</th>
              <th>Owner</th>
              <th>Score</th>
              <th>Signal</th>
              <th>Potentiel</th>
            </tr>
          </thead>
          <tbody>
            {crmRows.map((row, index) => (
              <tr key={row.account} aria-selected={index === 0}>
                <td><strong>{row.account}</strong></td>
                <td>{row.owner}</td>
                <td>{row.score}</td>
                <td>{row.signal}</td>
                <td>{row.amount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="kredo-lab-mobile-cards" aria-label="Comptes mobiles">
        {crmRows.slice(0, viewport === "mobile" ? 4 : 2).map((row) => (
          <article key={row.account} className="kredo-lab-card lab-interactive" tabIndex={0}>
            <h3>{row.account}</h3>
            <p>{row.signal} - {row.amount} - score {row.score}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

function TalentScreen() {
  return (
    <section className="kredo-lab-section">
      <header className="kredo-lab-section-header">
        <div>
          <DomainPill domainId="candidate" />
          <h2 className="kredo-lab-section-title">Talent & Delivery</h2>
          <p className="kredo-lab-section-note">Besoins, candidats, collaborateurs, missions et projets.</p>
        </div>
      </header>

      <div className="kredo-lab-domain-grid">
        {talentItems.map((item) => (
          <article
            key={item.title}
            className="kredo-lab-domain-chip lab-interactive"
            style={{ "--chip-color": `var(--color-domain-${item.domain === "missionAt" ? "mission-at" : item.domain === "fixedProject" ? "fixed-project" : item.domain})` } as React.CSSProperties}
            tabIndex={0}
          >
            <strong>{item.title}</strong>
            <span>{item.status}</span>
          </article>
        ))}
      </div>
    </section>
  )
}

function FinanceScreen() {
  return (
    <section className="kredo-lab-section">
      <header className="kredo-lab-section-header">
        <div>
          <DomainPill domainId="finance" />
          <h2 className="kredo-lab-section-title">Finance</h2>
          <p className="kredo-lab-section-note">Marge, alerte financiere, mini-visualisation et projection.</p>
        </div>
        <span className="kredo-lab-pill">+6.2%</span>
      </header>

      <div className="kredo-lab-mini-bars" aria-label="Projection de marge">
        {financeBars.map((bar) => (
          <div className="kredo-lab-mini-bar" key={bar.month}>
            <span style={{ height: `${bar.value}%` }} />
            <span>{bar.month}</span>
          </div>
        ))}
      </div>

      <div className="kredo-lab-card-stack">
        <article className="kredo-lab-card lab-interactive" tabIndex={0}>
          <h3>Simulation TJM +40 EUR</h3>
          <p>Impact projete: +128 kEUR de CA et +2.1 pts de marge sur le semestre.</p>
        </article>
      </div>
    </section>
  )
}

function PrototypeWorkspace({
  direction,
  viewport,
  selectedDomain,
}: {
  direction: Direction
  viewport: ViewportMode
  selectedDomain: DomainId
}) {
  return (
    <div className="kredo-lab-device" data-viewport={viewport}>
      <div className="kredo-lab-app" data-viewport={viewport}>
        <LabRail />
        <main className="kredo-lab-workspace">
          <header className="kredo-lab-mobile-head">
            <div className="kredo-lab-logo">K</div>
            <DomainPill domainId={selectedDomain} />
          </header>

          <div className="kredo-lab-section-header kredo-lab-desktop-only">
            <div>
              <p className="kredo-lab-kicker">{direction.name}</p>
              <h1 className="kredo-lab-section-title">Vue comparative KREDO</h1>
              <p className="kredo-lab-section-note">{direction.surfaceLanguage}</p>
            </div>
            <DomainPill domainId={selectedDomain} />
          </div>

          <div className="kredo-lab-screen-grid">
            <CockpitScreen selectedDomain={selectedDomain} />
            <div className="kredo-lab-card-stack" style={{ padding: 0 }}>
              <CrmScreen viewport={viewport} />
              <TalentScreen />
              <FinanceScreen />
            </div>
          </div>

          <div className="kredo-lab-bottom-actions">
            <button type="button" className="kredo-lab-button">Action IA</button>
            <button type="button" className="kredo-lab-button">Ouvrir detail</button>
          </div>
        </main>
      </div>
    </div>
  )
}

function TokenPanel({ direction }: { direction: Direction }) {
  const visibleTokens = direction.tokens.slice(0, 20)
  return (
    <section className="kredo-lab-section">
      <header className="kredo-lab-section-header">
        <div>
          <h2 className="kredo-lab-section-title">Palette & tokens</h2>
          <p className="kredo-lab-section-note">{direction.tokens.length} couleurs nommees, hors noir et blanc.</p>
        </div>
      </header>
      <div className="kredo-lab-token-list">
        {visibleTokens.map((token) => (
          <div key={`${direction.id}-${token.cssVar}`} className="kredo-lab-token-row">
            <span
              className="kredo-lab-token-swatch"
              style={{ "--swatch": `var(${token.cssVar})` } as React.CSSProperties}
              aria-hidden="true"
            />
            <div>
              <strong>{token.name}</strong>
              <span>{token.cssVar} - {token.family}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function DirectionNotes({ direction }: { direction: Direction }) {
  return (
    <section className="kredo-lab-section">
      <header className="kredo-lab-section-header">
        <div>
          <h2 className="kredo-lab-section-title">Principes</h2>
          <p className="kredo-lab-section-note">{direction.integrationCost}</p>
        </div>
      </header>
      <div className="kredo-lab-card-stack">
        {direction.principles.map((principle) => (
          <article className="kredo-lab-card" key={principle}>
            <h3>{principle}</h3>
            <p>{direction.motionLanguage}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

export function KredoIdentityLab({ initialDirection = "a" }: KredoIdentityLabProps) {
  const [directionId, setDirectionId] = useState<DirectionId>(normalizeDirection(initialDirection))
  const [viewport, setViewport] = useState<ViewportMode>("desktop")
  const [domain, setDomain] = useState<DomainId>("intelligence")
  const [interaction, setInteraction] = useState<InteractionState>("rest")
  const [motionEnabled, setMotionEnabled] = useState(true)
  const direction = useMemo(() => getDirectionById(directionId), [directionId])

  return (
    <div
      className="kredo-identity-lab"
      data-kredo-concept={direction.concept}
      data-domain={domain}
      data-interaction={interaction}
      data-motion={motionEnabled ? "on" : "off"}
    >
      <div className="kredo-lab-shell">
        <header className="kredo-lab-topbar">
          <div>
            <p className="kredo-lab-kicker">Design Lab isole - KREDO</p>
            <h1 className="kredo-lab-title">{direction.name}</h1>
            <p className="kredo-lab-summary">
              {direction.thesis} Le laboratoire compare les memes ecrans representatifs sans modifier les composants de production.
            </p>
            <p className="kredo-lab-summary">
              Liens directs:{" "}
              {directions.map((item, index) => (
                <span key={item.id}>
                  <Link href={`/design-lab/kredo-identity/${item.slug}`}>{item.name}</Link>
                  {index < directions.length - 1 ? " · " : ""}
                </span>
              ))}
            </p>
          </div>

          <LabControls
            directionId={directionId}
            viewport={viewport}
            domain={domain}
            interaction={interaction}
            motionEnabled={motionEnabled}
            onDirectionChange={setDirectionId}
            onViewportChange={setViewport}
            onDomainChange={setDomain}
            onInteractionChange={setInteraction}
            onMotionChange={setMotionEnabled}
          />
        </header>

        <div className="kredo-lab-main">
          <div className="kredo-lab-stage">
            <PrototypeWorkspace direction={direction} viewport={viewport} selectedDomain={domain} />
          </div>

          <aside className="kredo-lab-sidebar">
            <TokenPanel direction={direction} />
            <DirectionNotes direction={direction} />
          </aside>
        </div>
      </div>
    </div>
  )
}

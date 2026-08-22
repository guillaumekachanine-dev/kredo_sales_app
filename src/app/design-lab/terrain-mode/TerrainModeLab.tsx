"use client"

import { useMemo, useRef, useState } from "react"
import { AppDrawer } from "@/components/ui/AppDrawer"
import { cn } from "@/lib/utils"
import {
  terrainDependencies,
  terrainMarketTheses,
  terrainMessage,
  terrainObjections,
  terrainRegulatoryExact,
  terrainRegulatoryUnavailable,
  terrainRegulatoryWindow,
  terrainSources,
  terrainTopAccounts,
  terrainTopAccountsStress,
  terrainValueChain,
  terrainRiskOpportunities,
} from "./terrain-fixtures"
import {
  getTerrainDailyAngle,
  rankTerrainAccounts,
  resolveRegulatoryTiming,
  selectTerrainDependencies,
  selectTerrainEndpoints,
  type TerrainDailyAngle,
  type TerrainRegulatoryItem,
  type TerrainSurface,
} from "./terrain-model"
import styles from "./TerrainModeLab.module.css"

function ArrowIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h13M14 7l5 5-5 5" />
    </svg>
  )
}

function BackIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H6m5-5-5 5 5 5" />
    </svg>
  )
}

function TerrainHeader({ surface, onBack }: { surface: TerrainSurface; onBack?: () => void }) {
  const label = surface === "home" ? "Business intelligence" : surface === "top-accounts" ? "Top 3" : surface === "essentials" ? "Essentiel" : surface === "stories" ? "Stories" : "Révision"
  return (
    <header className={styles.header}>
      {surface === "home" ? (
        <>
          <p className={styles.contextLabel}>Business intelligence</p>
          <h1 className={styles.terrainTitle}>Terrain</h1>
          <span className={styles.headerControl} aria-hidden="true">
            <ArrowIcon />
          </span>
        </>
      ) : (
        <>
          <button className={styles.backButton} type="button" onClick={onBack}>
            <BackIcon />
            Terrain
          </button>
          <p className={styles.surfaceName}>{label}</p>
        </>
      )}
    </header>
  )
}

function TerrainBottomNavigation() {
  return (
    <nav className={styles.bottomNavigation} aria-label="Navigation principale de démonstration">
      {["Accueil", "Comptes", "Intelligence", "Plus"].map((label) => (
        <span key={label} className={cn(styles.bottomItem, label === "Intelligence" && styles.bottomItemActive)}>
          <i aria-hidden="true" />
          {label}
        </span>
      ))}
    </nav>
  )
}

function TerrainConfidence() {
  return (
    <section className={styles.confidence} aria-label="Confiance du corpus">
      <span aria-hidden="true" />
      <strong>Corpus fiable</strong>
      <small>· mis à jour aujourd’hui</small>
    </section>
  )
}

function TerrainRegulatoryCard({ item }: { item: TerrainRegulatoryItem }) {
  const timing = resolveRegulatoryTiming(item)
  return (
    <section className={cn(styles.regulatoryCard, item.timing.kind === "window" && styles.regulatoryWindow)}>
      <p>Prochaine échéance</p>
      <h2>{item.name}</h2>
      {item.timing.kind === "exact" ? (
        <>
          <span>Échéance vérifiée</span>
          <div className={styles.regulatoryDateRow}>
            <strong>{timing.dateLabel}</strong>
            {timing.countdown ? <b>{timing.countdown}</b> : null}
          </div>
        </>
      ) : item.timing.kind === "window" ? (
        <>
          <span>Notification attendue</span>
          <strong className={styles.windowDate}>{timing.windowLabel}</strong>
        </>
      ) : (
        <span className={styles.unavailableText}>Échéance non disponible dans le corpus courant.</span>
      )}
    </section>
  )
}

function TerrainAngleCard({ angle, copied, onCopy, onSource }: { angle: TerrainDailyAngle; copied: boolean; onCopy: () => void; onSource: () => void }) {
  return (
    <section className={styles.angleCard}>
      <p>Angle du jour</p>
      <h2>{angle.title}</h2>
      {angle.kind === "risk" ? (
        <div className={styles.riskPair}>
          <span>Risque</span>
          <p>{angle.text}</p>
          <span>Opportunité</span>
          <p>{angle.copyText.split("OPPORTUNITÉ\n")[1]}</p>
        </div>
      ) : angle.kind === "unavailable" ? null : <p className={styles.angleText}>{angle.text}</p>}
      {angle.kind !== "unavailable" ? (
        <div className={styles.angleActions}>
          <button type="button" onClick={onCopy} className={styles.copyButton}>{copied ? "Copié ✓" : "Copier l’accroche"}</button>
          <button type="button" onClick={onSource} className={styles.sourceButton}>Sources</button>
        </div>
      ) : null}
    </section>
  )
}

function TerrainModeGrid({ activeSurface, onOpen }: { activeSurface: TerrainSurface; onOpen: (surface: TerrainSurface) => void }) {
  const entries: Array<{ surface: TerrainSurface; label: string }> = [
    { surface: "stories", label: "Stories" },
    { surface: "revision", label: "Révision" },
    { surface: "top-accounts", label: "Top 3" },
    { surface: "essentials", label: "Essentiel" },
  ]
  return (
    <section className={styles.modeGrid} aria-label="Accès aux modes Terrain">
      {entries.map((entry) => (
        <button key={entry.surface} type="button" onClick={() => onOpen(entry.surface)} aria-current={activeSurface === entry.surface ? "page" : undefined}>
          {entry.label}
          <ArrowIcon />
        </button>
      ))}
    </section>
  )
}

function TerrainStories({ index, onPrevious, onNext, onBack, onSource }: { index: number; onPrevious: () => void; onNext: () => void; onBack: () => void; onSource: (id: number) => void }) {
  const touchStartY = useRef<number | null>(null)
  const stories = [{ title: "Message sectoriel", text: terrainMessage, sourceIds: [12] }, ...terrainMarketTheses.map((thesis, thesisIndex) => ({ title: `Thèse ${thesisIndex + 1}`, text: thesis.text, sourceIds: thesis.sourceIds }))]
  const story = stories[index]
  const last = index === stories.length - 1
  return (
    <section
      className={styles.storySurface}
      data-story-index={index}
      onTouchStart={(event) => { touchStartY.current = event.touches[0]?.clientY ?? null }}
      onTouchEnd={(event) => {
        const start = touchStartY.current
        const end = event.changedTouches[0]?.clientY
        touchStartY.current = null
        if (start === null || end === undefined || Math.abs(start - end) < 44) return
        if (end < start && !last) onNext()
        if (end > start && index > 0) onPrevious()
      }}
    >
      <p className={styles.storyProgress}>{index + 1} / {stories.length}</p>
      <div className={styles.storyBody}>
        <p>{story.title}</p>
        <h2>{story.text}</h2>
        <button type="button" className={styles.storySource} onClick={() => onSource(story.sourceIds.at(-1) ?? 12)}>Voir la source</button>
      </div>
      <div className={styles.sequentialControls}>
        <button type="button" disabled={index === 0} onClick={onPrevious}>Précédent</button>
        {last ? <button type="button" className={styles.primarySequence} onClick={onBack}>Retour Terrain</button> : <button type="button" className={styles.primarySequence} onClick={onNext}>Suivant</button>}
      </div>
    </section>
  )
}

function TerrainRevision({ index, answerVisible, onToggleAnswer, onNext }: { index: number; answerVisible: boolean; onToggleAnswer: () => void; onNext: () => void }) {
  const card = terrainObjections[index]
  return (
    <section className={styles.revisionSurface} data-revision-side={answerVisible ? "answer" : "objection"}>
      <div className={styles.flashcard}>
        <p>{answerVisible ? "Réponse" : "Objection"}</p>
        <h2>{answerVisible ? card.response : card.objection}</h2>
        <span>{index + 1} / {terrainObjections.length}</span>
      </div>
      <div className={styles.sequentialControls}>
        {answerVisible ? <button type="button" className={styles.primarySequence} onClick={onNext}>Suivante</button> : <button type="button" className={styles.primarySequence} onClick={onToggleAnswer}>Voir la réponse</button>}
      </div>
    </section>
  )
}

function TerrainTopAccounts({ sourceAccounts }: { sourceAccounts: typeof terrainTopAccounts }) {
  const accounts = rankTerrainAccounts(sourceAccounts)
  const benchmarks = sourceAccounts.filter((account) => account.commercialEligibility === "non_prospectable" && account.isBenchmarkAccount)
  return (
    <section className={styles.topAccountsSurface}>
      <h2>Comptes à regarder</h2>
      <p>Classement strict par appétence.</p>
      <ol className={styles.rankList}>
        {accounts.map((account, index) => (
          <li key={account.name}>
            <b>#{index + 1}</b>
            <div>
              <h3>{account.name}</h3>
              <p>{account.category}</p>
              <p>{account.commercialAngle}</p>
              <small>{account.confidence}</small>
            </div>
            <strong><span>{account.appetenceScore}/35</span>appétence</strong>
          </li>
        ))}
      </ol>
      {benchmarks.map((account) => <p className={styles.benchmark} key={account.name}>Benchmark — hors classement : {account.name}</p>)}
      <a href="#desktop-detail">Voir l’analyse complète sur desktop</a>
    </section>
  )
}

function TerrainEssentials() {
  const endpoints = selectTerrainEndpoints(terrainValueChain)
  const dependencies = selectTerrainDependencies(terrainDependencies)
  return (
    <section className={styles.essentialsSurface}>
      <h2>L’essentiel du terrain</h2>
      <section className={styles.endpoints}>
        <p>Deux repères de la chaîne</p>
        {endpoints.map((step, index) => (
          <div key={step.id} className={index === 1 ? styles.lastEndpoint : undefined}>
            <h3>{index === 0 ? "Premier maillon" : "Dernier maillon"}</h3>
            <strong>{step.activityLabel}</strong>
            <span>{step.description}</span>
          </div>
        ))}
      </section>
      <section className={styles.dependencies}>
        <p>À surveiller — dépendances critiques</p>
        {dependencies.map((dependency) => (
          <div key={dependency.name}>
            <h3>{dependency.name}</h3>
            <b>{dependency.criticality ?? "non précisée"}</b>
            <span>{dependency.risk ?? "Risque non disponible"} · {dependency.openService ?? "Prestation non disponible"}</span>
          </div>
        ))}
      </section>
      <a href="#desktop-detail">Voir l’analyse complète sur desktop</a>
    </section>
  )
}

function TerrainSourceSheet({ sourceId, onClose }: { sourceId: number | null; onClose: () => void }) {
  const source = terrainSources.find((item) => item.id === sourceId) ?? null
  return (
    <AppDrawer
      open={source !== null}
      onOpenChange={(open) => { if (!open) onClose() }}
      side="bottom"
      title="Source"
      eyebrow={source ? `S${source.id}` : undefined}
      closeLabel="Fermer la source"
      showMobileCloseButton
      className={styles.sourceDrawer}
      headerClassName={styles.sourceDrawerHeader}
      contentClassName={styles.sourceDrawerContent}
      footer={source?.url ? <a className={styles.publisherCta} href={source.url} target="_blank" rel="noreferrer">Ouvrir le site de l’éditeur <ArrowIcon /></a> : undefined}
    >
      {source ? (
        <div className={styles.sourceContent}>
          <p className={styles.sourcePublisher}>{source.publisher}</p>
          <p className={styles.sourceTier}>Tier {source.tier ?? "non disponible"}</p>
          <section>
            <p>Ce que la source atteste</p>
            <span>{source.attests}</span>
          </section>
          <section>
            <p>Date de consultation</p>
            <span>{source.consultedAt ? new Date(`${source.consultedAt}T00:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "Date de consultation non disponible"}</span>
          </section>
        </div>
      ) : null}
    </AppDrawer>
  )
}

type TerrainModeLabProps = {
  regulatoryVariant?: "exact" | "window" | "unavailable"
  angleVariant?: "market" | "risk" | "unavailable"
  initialSourceId?: number | null
  topVariant?: "default" | "stress"
}

async function writeClipboardText(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value)
    return
  }

  const textarea = document.createElement("textarea")
  textarea.value = value
  textarea.setAttribute("readonly", "")
  textarea.style.position = "fixed"
  textarea.style.opacity = "0"
  document.body.append(textarea)
  textarea.select()
  const copied = document.execCommand("copy")
  textarea.remove()
  if (!copied) throw new Error("Clipboard write failed")
}

export function TerrainModeLab({
  regulatoryVariant = "exact",
  angleVariant = "market",
  initialSourceId = null,
  topVariant = "default",
}: TerrainModeLabProps) {
  const [surface, setSurface] = useState<TerrainSurface>("home")
  const [storyIndex, setStoryIndex] = useState(0)
  const [revisionIndex, setRevisionIndex] = useState(0)
  const [answerVisible, setAnswerVisible] = useState(false)
  const [copied, setCopied] = useState(false)
  const [sourceId, setSourceId] = useState<number | null>(initialSourceId)
  const regulatoryItem = regulatoryVariant === "window"
    ? terrainRegulatoryWindow
    : regulatoryVariant === "unavailable"
      ? terrainRegulatoryUnavailable
      : terrainRegulatoryExact
  const angle = useMemo(() => {
    if (angleVariant === "unavailable") return getTerrainDailyAngle([], [], new Date("2026-08-22T12:00:00Z"))
    const now = angleVariant === "risk" ? new Date("2026-08-23T12:00:00Z") : new Date("2026-08-22T12:00:00Z")
    return getTerrainDailyAngle(terrainMarketTheses, terrainRiskOpportunities, now)
  }, [angleVariant])

  async function copyAngle() {
    if (!angle.copyText) return
    try {
      await writeClipboardText(angle.copyText)
    } catch {
      // Clipboard access is not available in every local prototype context.
      return
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  function openSurface(next: TerrainSurface) {
    setSurface(next)
    if (next === "stories") setStoryIndex(0)
    if (next === "revision") {
      setRevisionIndex(0)
      setAnswerVisible(false)
    }
  }

  function showHome() {
    setSurface("home")
  }

  function nextRevision() {
    setRevisionIndex((value) => (value + 1) % terrainObjections.length)
    setAnswerVisible(false)
  }

  return (
    <main className={styles.page} data-terrain-mode="true">
      <div className={styles.phone}>
        <TerrainHeader surface={surface} onBack={showHome} />
        <div className={styles.content}>
          {surface === "home" ? (
            <div className={styles.homeSurface} data-terrain-surface="home">
              <TerrainConfidence />
              <TerrainRegulatoryCard item={regulatoryItem} />
              <TerrainAngleCard angle={angle} copied={copied} onCopy={copyAngle} onSource={() => setSourceId(angle.sourceIds[0] ?? 12)} />
              <TerrainModeGrid activeSurface={surface} onOpen={openSurface} />
            </div>
          ) : null}
          {surface === "stories" ? <TerrainStories index={storyIndex} onPrevious={() => setStoryIndex((value) => Math.max(0, value - 1))} onNext={() => setStoryIndex((value) => Math.min(terrainMarketTheses.length, value + 1))} onBack={showHome} onSource={setSourceId} /> : null}
          {surface === "revision" ? <TerrainRevision index={revisionIndex} answerVisible={answerVisible} onToggleAnswer={() => setAnswerVisible(true)} onNext={nextRevision} /> : null}
          {surface === "top-accounts" ? <TerrainTopAccounts sourceAccounts={topVariant === "stress" ? terrainTopAccountsStress : terrainTopAccounts} /> : null}
          {surface === "essentials" ? <TerrainEssentials /> : null}
        </div>
        <TerrainBottomNavigation />
      </div>
      <TerrainSourceSheet sourceId={sourceId} onClose={() => setSourceId(null)} />
    </main>
  )
}

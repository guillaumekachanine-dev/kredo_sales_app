"use client"

import { useState } from "react"
import Link from "next/link"
import { CompanyLogo } from "@/components/accounts-contacts/CompanyLogo"
import { cn } from "@/lib/utils"
import type { ClientIntelligenceData, IntelligenceSource } from "@/lib/intelligence/intelligence-data"
import {
  ComingSoon,
  Field,
  FreshnessLine,
  KpiCard,
  lifecycleLabel,
  ProvenanceBadge,
  ScorePill,
  SectionBlock,
  SignalList,
  TagList,
} from "./intelligence-parts"
import { IntelligenceRightRail } from "./IntelligenceRightRail"

type TabKey = "accueil" | "analyse" | "opportunites" | "scoring" | "roadmap" | "pitch"

const TABS: { key: TabKey; label: string; lot?: string }[] = [
  { key: "accueil", label: "Accueil" },
  { key: "analyse", label: "Analyse" },
  { key: "opportunites", label: "Opportunités", lot: "lot F" },
  { key: "scoring", label: "Scoring", lot: "lot E" },
  { key: "roadmap", label: "Roadmap", lot: "lot G" },
  { key: "pitch", label: "Pitch", lot: "lot H" },
]

export function ClientIntelligenceDesktopView({ data }: { data: ClientIntelligenceData }) {
  const [activeTab, setActiveTab] = useState<TabKey>("accueil")
  const { company, client, freshness, presence, contacts, pitches } = data
  const analysisSource: IntelligenceSource = client?.source ?? "none"
  // L'onglet Pitch perd son badge « à venir » dès que des pitchs FOLIO existent.
  const tabs = pitches.length > 0
    ? TABS.map((tab) => (tab.key === "pitch" ? { ...tab, lot: undefined } : tab))
    : TABS

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Colonne gauche : header + onglets + contenu ──────────────────────────
          Le rail droit est pleine hauteur : le header ne fait donc que la largeur
          de cette colonne (= la section principale juste en dessous). ─────────── */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* ── Header (compact) ─────────────────────────────────────────────── */}
        <header className="shrink-0 border-b border-border bg-surface px-6 py-3">
          <Link
            href="/prospection/accounts"
            className="mb-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-muted transition-colors hover:text-primary"
          >
            ← Comptes &amp; contacts
          </Link>
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <CompanyLogo name={company.name} logoPath={company.logoPath} website={company.website} size="lg" />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-heading text-xl font-bold text-heading">{company.name}</h1>
                  <span className="rounded border border-border bg-canvas/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-body">
                    {lifecycleLabel(company.lifecycleStatus)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-body">
                  {company.sector} · {company.segment} · {company.hqLocation}
                </p>
                <div className="mt-1.5 flex items-center gap-2">
                  <ProvenanceBadge source={analysisSource} />
                  <FreshnessLine
                    latestRunAt={freshness.latestRunAt}
                    latestRunStatus={freshness.latestRunStatus}
                    fallbackSource={analysisSource}
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ScorePill score={company.aiScore} />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled
                  title="Run lifecycle — lot C"
                  className="cursor-not-allowed rounded border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-muted opacity-60"
                >
                  Rafraîchir l&apos;analyse
                </button>
                <button
                  type="button"
                  disabled
                  title="Atelier pitch — lot H"
                  className="cursor-not-allowed rounded border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-muted opacity-60"
                >
                  Générer un pitch
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* ── Onglets ───────────────────────────────────────────────────────── */}
        <nav className="flex shrink-0 items-center gap-1 border-b border-border bg-surface px-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "relative -mb-px border-b-2 px-3 py-3 text-xs font-semibold transition-colors",
                activeTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted hover:text-body",
              )}
            >
              {tab.label}
              {tab.lot && (
                <span className="ml-1.5 rounded bg-surface-hover px-1 py-0.5 text-[8px] font-bold uppercase tracking-wider text-muted">
                  à venir
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* ── Contenu de l'onglet actif ─────────────────────────────────────── */}
        <main className="min-w-0 flex-1 overflow-y-auto p-6">
          {activeTab === "accueil" && (
            <AccueilTab data={data} onOpenAnalyse={() => setActiveTab("analyse")} />
          )}
          {activeTab === "analyse" && <AnalyseTab data={data} />}
          {activeTab === "opportunites" && <ComingSoon lot="lot F">Matrice enjeux × offres</ComingSoon>}
          {activeTab === "scoring" && <ComingSoon lot="lot E">Breakdown du score (déterministe, expliqué)</ComingSoon>}
          {activeTab === "roadmap" && <ComingSoon lot="lot G">Roadmap commerciale → opportunités &amp; tâches</ComingSoon>}
          {activeTab === "pitch" && <PitchTab data={data} />}
        </main>
      </div>

      {/* ── Tour de contrôle : rail droit pleine hauteur (tranche sur le cockpit clair) ── */}
      <IntelligenceRightRail
        freshness={freshness}
        presence={presence}
        contacts={contacts}
        analysisSource={analysisSource}
      />
    </div>
  )
}

// ─── Onglet Accueil — synthèse exécutive ──────────────────────────────────────

function AccueilTab({ data, onOpenAnalyse }: { data: ClientIntelligenceData; onOpenAnalyse: () => void }) {
  const { company, client, signals } = data
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label="Score IA" value={company.aiScore === null ? "—" : company.aiScore.toLocaleString("fr-FR")} hint="Échelle tranchée au lot E" />
        <KpiCard label="Signaux récents" value={String(signals.length)} status={signals.length > 0 ? "warning" : "neutral"} />
        <KpiCard label="Priorité" value={company.priority} />
        <KpiCard label="Contacts" value={String(data.contacts.length)} />
      </div>

      <SectionBlock
        title="Synthèse IA"
        action={client ? <ProvenanceBadge source={client.source} /> : undefined}
      >
        <p className="whitespace-pre-line text-sm leading-relaxed text-body">
          {client?.data.synthese || "Aucune synthèse disponible. Lance une analyse depuis le moteur (lot C)."}
        </p>
        <button
          type="button"
          onClick={onOpenAnalyse}
          className="mt-3 text-xs font-semibold text-primary transition-colors hover:underline"
        >
          Voir l&apos;analyse détaillée →
        </button>
      </SectionBlock>

      <SectionBlock title="Veille & signaux">
        <SignalList signals={signals} />
      </SectionBlock>

      <div className="grid gap-4 md:grid-cols-2">
        <ComingSoon lot="lot F">Enjeux × offres ESN</ComingSoon>
        <ComingSoon lot="lot E">Recommandation IA &amp; next best action</ComingSoon>
      </div>
    </div>
  )
}

// ─── Onglet Analyse — fond documentaire ───────────────────────────────────────

function AnalyseTab({ data }: { data: ClientIntelligenceData }) {
  const { client, sector } = data

  if (!client && !sector) {
    return <ComingSoon lot="lot A+">Aucune analyse client ni sectorielle pour ce compte</ComingSoon>
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      {client && (
        <SectionBlock title="Analyse client" action={<ProvenanceBadge source={client.source} />}>
          {client.data.synthese && (
            <p className="mb-4 whitespace-pre-line text-sm leading-relaxed text-body">{client.data.synthese}</p>
          )}

          {Object.keys(client.data.identite).length > 0 && (
            <div className="mb-4">
              <span className="mb-1.5 block text-[9px] font-bold uppercase tracking-wider text-muted">
                Identité &amp; chiffres clés
              </span>
              <div className="grid gap-2 sm:grid-cols-2">
                {Object.entries(client.data.identite).map(([key, value]) => (
                  <Field key={key} label={key.replace(/_/g, " ")} value={value} />
                ))}
              </div>
            </div>
          )}

          {Object.keys(client.data.positionnement).length > 0 && (
            <div className="mb-4 grid gap-2 sm:grid-cols-2">
              {Object.entries(client.data.positionnement).map(([key, value]) => (
                <Field key={key} label={key.replace(/_/g, " ")} value={value} />
              ))}
            </div>
          )}

          <div className="grid gap-2 sm:grid-cols-2">
            {client.data.signaux.tendanceCroissance && (
              <Field label="Tendance de croissance" value={client.data.signaux.tendanceCroissance} />
            )}
            {client.data.signaux.maturiteDigitale && (
              <Field label="Maturité digitale" value={client.data.signaux.maturiteDigitale} />
            )}
            {client.data.signaux.recrutementsRecents && (
              <Field label="Recrutements récents" value={client.data.signaux.recrutementsRecents} />
            )}
            {client.data.contexteSectoriel.tendances && (
              <Field label="Tendances sectorielles" value={client.data.contexteSectoriel.tendances} />
            )}
          </div>

          {client.data.contexteSectoriel.concurrents.length > 0 && (
            <div className="mt-4">
              <span className="mb-1.5 block text-[9px] font-bold uppercase tracking-wider text-muted">
                Concurrents identifiés
              </span>
              <TagList items={client.data.contexteSectoriel.concurrents} />
            </div>
          )}
        </SectionBlock>
      )}

      {sector ? (
        <SectionBlock title="Étude sectorielle" action={<ProvenanceBadge source={sector.source} />}>
          <p className="whitespace-pre-line text-sm leading-relaxed text-body">{sector.data.synthese}</p>
        </SectionBlock>
      ) : (
        <ComingSoon lot="lot D">Étude sectorielle (mutualisée par secteur)</ComingSoon>
      )}

      <ComingSoon lot="lot I">Veille & signaux (feeders n8n) · Scan contacts</ComingSoon>
    </div>
  )
}

// ─── Onglet Pitch — pitchs FOLIO importés (lecture seule, atelier au lot H) ────

function PitchTab({ data }: { data: ClientIntelligenceData }) {
  const { pitches } = data

  if (pitches.length === 0) {
    return <ComingSoon lot="lot H">Atelier de rédaction contextualisée</ComingSoon>
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex items-center gap-2">
        <ProvenanceBadge source="folio" />
        <p className="text-xs text-muted">
          {pitches.length} pitch{pitches.length > 1 ? "s" : ""} importé{pitches.length > 1 ? "s" : ""} · lecture seule — l&apos;atelier de génération arrive au lot H.
        </p>
      </div>

      {pitches.map((pitch) => (
        <SectionBlock key={pitch.id} title={pitch.objet || pitch.destinataire || "Pitch"}>
          {(pitch.destinataire || pitch.ton || pitch.format) && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {pitch.destinataire && (
                <span className="rounded border border-border bg-canvas/50 px-2 py-0.5 text-[11px] text-body">
                  Pour : {pitch.destinataire}
                </span>
              )}
              {pitch.ton && (
                <span className="rounded border border-border bg-canvas/50 px-2 py-0.5 text-[11px] text-body">
                  Ton : {pitch.ton}
                </span>
              )}
              {pitch.format && (
                <span className="rounded border border-border bg-canvas/50 px-2 py-0.5 text-[11px] text-body">
                  {pitch.format}
                </span>
              )}
            </div>
          )}
          {pitch.corps && (
            <p className="whitespace-pre-line text-sm leading-relaxed text-body">{pitch.corps}</p>
          )}
          {pitch.pointsCles.length > 0 && (
            <div className="mt-3">
              <span className="mb-1.5 block text-[9px] font-bold uppercase tracking-wider text-muted">Points clés</span>
              <TagList items={pitch.pointsCles} />
            </div>
          )}
        </SectionBlock>
      ))}
    </div>
  )
}

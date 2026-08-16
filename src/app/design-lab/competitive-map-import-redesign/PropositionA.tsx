"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import {
  MOCK_ACCOUNTS,
  MOCK_HISTORY,
  MOCK_RAW_JSON,
  MOCK_SEGMENTS,
  type AccountFixture,
} from "./mock-data"

type StepId = "upload" | "arbitrate" | "confirm"

const TIMELINE_STEPS: { id: StepId; num: string; label: string }[] = [
  { id: "upload", num: "01", label: "Préparer" },
  { id: "arbitrate", num: "02", label: "Arbitrer" },
  { id: "confirm", num: "03", label: "Finaliser" },
]

type PropositionAProps = {
  forcedStep?: StepId
  forcedParsed?: boolean
  forcedExpandedIndex?: number | null
  showEmptyHistory?: boolean
}

export function PropositionA({
  forcedStep,
  forcedParsed,
  forcedExpandedIndex,
  showEmptyHistory = false,
}: PropositionAProps) {
  const [step, setStep] = useState<StepId>(forcedStep ?? "upload")
  const [rawJson, setRawJson] = useState(forcedParsed || forcedStep === "arbitrate" || forcedStep === "confirm" ? MOCK_RAW_JSON : "")
  const [parsed, setParsed] = useState<boolean>(forcedParsed || forcedStep === "arbitrate" || forcedStep === "confirm" ? true : false)
  const [selectedSegment, setSelectedSegment] = useState("btp-infrastructures")
  const [studyDate, setStudyDate] = useState("2026-08-14")
  const [accounts, setAccounts] = useState<AccountFixture[]>(MOCK_ACCOUNTS)
  const [expandedIndex, setExpandedIndex] = useState<number | null>(forcedExpandedIndex !== undefined ? forcedExpandedIndex : null)
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null)

  const currentStep = forcedStep ?? step
  const isParsed = forcedParsed ?? parsed
  const activeStepIdx = TIMELINE_STEPS.findIndex((s) => s.id === currentStep)

  function handleParse() {
    if (rawJson.trim()) {
      setParsed(true)
    }
  }

  function handleAccountPatch(index: number, patch: Partial<AccountFixture>) {
    setAccounts((prev) =>
      prev.map((acc) => (acc.index === index ? { ...acc, ...patch } : acc)),
    )
  }

  const selectedHistory = MOCK_HISTORY.find((h) => h.id === selectedHistoryId)

  return (
    <div className="mx-auto flex h-[640px] w-full max-w-[1220px] overflow-hidden rounded-xl border border-edito-border bg-edito-canvas font-sans shadow-xl">
      {/* ── RAIL GAUCHE : EDITORIAL NAVY ───────────────────────────── */}
      <aside className="flex w-[230px] shrink-0 flex-col justify-between border-r border-white/10 bg-edito-navy p-5 text-white">
        {/* Timeline centrée horizontalement */}
        <div className="flex flex-col items-center pt-2 text-center">
          <p className="mb-6 font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-edito-brass">
            Espace Import
          </p>

          <ol className="relative flex w-full flex-col items-center gap-6">
            {TIMELINE_STEPS.map((s, idx) => {
              const active = s.id === currentStep
              const complete = idx < activeStepIdx
              return (
                <li key={s.id} className="relative flex w-full flex-col items-center">
                  {idx < TIMELINE_STEPS.length - 1 && (
                    <div
                      className={cn(
                        "absolute left-1/2 top-7 h-6 w-px -translate-x-1/2 transition-colors",
                        complete ? "bg-edito-brass/70" : "bg-white/15",
                      )}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => setStep(s.id)}
                    className="group flex flex-col items-center focus:outline-none"
                  >
                    <span
                      className={cn(
                        "relative z-10 flex size-7 items-center justify-center rounded-full text-[10px] font-black transition-all duration-200",
                        active &&
                          "border-2 border-edito-brass bg-edito-brass text-edito-navy shadow-[0_0_12px_rgba(216,155,22,0.35)]",
                        complete && "border border-edito-brass/60 bg-edito-brass/20 text-edito-brass",
                        !active &&
                          !complete &&
                          "border border-white/20 bg-white/5 text-white/40 group-hover:border-white/40",
                      )}
                    >
                      {complete ? "✓" : s.num}
                    </span>
                    <span
                      className={cn(
                        "mt-1.5 text-[11px] font-bold tracking-tight transition-colors",
                        active ? "text-white" : complete ? "text-white/80" : "text-white/45",
                      )}
                    >
                      {s.label}
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>
        </div>

        {/* Historique en bas du rail */}
        <div className="border-t border-white/10 pt-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-[9px] font-black uppercase tracking-[0.15em] text-white/50">
              Historique
            </span>
            <span className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-semibold text-edito-brass">
              {showEmptyHistory ? "0" : MOCK_HISTORY.length}
            </span>
          </div>

          {showEmptyHistory ? (
            <p className="mt-3 px-1 text-[10px] leading-relaxed text-white/40 italic">
              Aucun import historisé pour le moment.
            </p>
          ) : (
            <ul className="mt-2.5 space-y-1">
              {MOCK_HISTORY.map((item) => {
                const isSelected = selectedHistoryId === item.id
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedHistoryId(isSelected ? null : item.id)}
                      className={cn(
                        "group flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-[10px] transition-all",
                        isSelected
                          ? "bg-edito-brass/20 text-white font-semibold"
                          : "text-white/70 hover:bg-white/10 hover:text-white",
                      )}
                    >
                      <span className="font-mono text-[9px] opacity-60 group-hover:opacity-100">
                        {item.dateLabel}
                      </span>
                      <span className="truncate pl-2 font-medium">{item.sectorName}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </aside>

      {/* ── ZONE PRINCIPALE : EDITORIAL BRIGHT ─────────────────────── */}
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-edito-canvas">
        {/* Header Compact */}
        <header className="flex shrink-0 items-center justify-between border-b border-edito-border bg-white px-6 py-3.5">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[9px] font-black uppercase tracking-widest text-edito-brass">
                Proposition A — Éditorial / Intelligence
              </span>
              <span className="text-edito-border">•</span>
              <span className="text-[10px] font-semibold text-edito-muted">
                {currentStep === "upload"
                  ? "Étape 1 sur 3 — Préparation"
                  : currentStep === "arbitrate"
                    ? "Étape 2 sur 3 — Rapprochement & Arbitrage"
                    : "Étape 3 sur 3 — Finalisation"}
              </span>
            </div>
            <h1 className="font-heading text-lg font-black tracking-tight text-edito-navy">
              Importer une cartographie concurrentielle
            </h1>
          </div>
          {selectedHistoryId && (
            <button
              type="button"
              onClick={() => setSelectedHistoryId(null)}
              className="rounded border border-edito-brass/40 bg-edito-brass/10 px-2.5 py-1 text-[10px] font-bold text-edito-heading hover:bg-edito-brass/20"
            >
              Fermer détail historique ({selectedHistory?.sectorName})
            </button>
          )}
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Historical Detail View Overlay if selected */}
          {selectedHistory ? (
            <div className="space-y-4 rounded-lg border border-edito-border bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-edito-border pb-3">
                <div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-edito-brass">
                    Rapport d&apos;archive historique
                  </span>
                  <h3 className="font-heading text-base font-bold text-edito-navy">
                    {selectedHistory.sectorName} — {selectedHistory.rawDate}
                  </h3>
                </div>
                <span className="rounded bg-edito-chip px-2 py-1 text-[10px] font-bold text-edito-body">
                  {selectedHistory.accountCount} comptes analysés
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-[11px]">
                <div className="rounded border border-edito-border bg-edito-canvas p-3">
                  <span className="block text-[9px] uppercase font-bold text-edito-muted">Secteur</span>
                  <span className="font-bold text-edito-heading">{selectedHistory.sectorName}</span>
                </div>
                <div className="rounded border border-edito-border bg-edito-canvas p-3">
                  <span className="block text-[9px] uppercase font-bold text-edito-muted">Date d&apos;import</span>
                  <span className="font-bold text-edito-heading">{selectedHistory.rawDate}</span>
                </div>
                <div className="rounded border border-edito-border bg-edito-canvas p-3">
                  <span className="block text-[9px] uppercase font-bold text-edito-muted">Statut archive</span>
                  <span className="font-bold text-emerald-700">Enregistré dans intelligence_documents</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedHistoryId(null)}
                className="mt-2 text-xs font-bold text-edito-brass hover:underline"
              >
                ← Retour au wizard d&apos;import
              </button>
            </div>
          ) : (
            <>
              {/* ÉTAPE 1 : PRÉPARER LE FICHIER */}
              {currentStep === "upload" && (
                <div className="flex h-full flex-col justify-between space-y-4">
                  {/* Inputs Côte à côte compacts */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Input Fichier Dropzone */}
                    <div className="flex flex-col justify-center rounded-lg border border-dashed border-edito-border bg-white p-4 text-center transition-all hover:border-edito-brass hover:bg-edito-chip/40">
                      <div className="mx-auto mb-2 flex size-9 items-center justify-center rounded-full bg-edito-navy/5 text-edito-navy">
                        <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </div>
                      <span className="text-xs font-bold text-edito-navy">
                        Déposer un export JSON
                      </span>
                      <span className="mt-0.5 text-[10px] text-edito-muted">
                        ou parcourir les fichiers de cet appareil
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setRawJson(MOCK_RAW_JSON)
                          setParsed(true)
                        }}
                        className="mx-auto mt-3 rounded border border-edito-border bg-edito-chip px-3 py-1 text-[10px] font-bold text-edito-body transition-colors hover:border-edito-brass hover:text-edito-navy"
                      >
                        Charger l&apos;exemple BTP &amp; Infrastructures
                      </button>
                    </div>

                    {/* Input Textarea Paste */}
                    <div className="flex flex-col rounded-lg border border-edito-border bg-white p-3">
                      <label htmlFor="propA-json" className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-edito-muted">
                        Coller le contenu JSON
                      </label>
                      <textarea
                        id="propA-json"
                        value={rawJson}
                        onChange={(e) => setRawJson(e.target.value)}
                        rows={5}
                        placeholder='{"secteur": "BTP & Infrastructures", "comptes": [...]}'
                        className="w-full flex-1 resize-none rounded border border-edito-border bg-edito-canvas p-2.5 font-mono text-[10px] leading-relaxed text-edito-ink outline-none focus:border-edito-navy focus:ring-1 focus:ring-edito-navy"
                      />
                    </div>
                  </div>

                  {/* Signature Action Bar: « Analyser le fichier » */}
                  <div className="flex items-center justify-between rounded-lg border border-edito-brass/40 bg-gradient-to-r from-edito-navy via-[#243B63] to-edito-navy p-3.5 text-white shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded border border-edito-brass/50 bg-edito-brass/20 text-edito-brass">
                        <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">Analyseur de cartographie sectorielle</p>
                        <p className="text-[10px] text-white/60">Contrôle la validité de l&apos;export JSON et extrait les métadonnées de l&apos;étude.</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleParse}
                      disabled={!rawJson.trim()}
                      className="group relative flex items-center gap-2 overflow-hidden rounded border border-edito-brass bg-edito-brass px-5 py-2 text-xs font-black text-edito-navy transition-all duration-200 hover:bg-white hover:text-edito-navy disabled:opacity-40 disabled:hover:bg-edito-brass"
                    >
                      <span>Analyser le fichier</span>
                      <span className="transition-transform group-hover:translate-x-0.5">→</span>
                    </button>
                  </div>

                  {/* Étape 1 — APRÈS ANALYSE : Synthèse analytique compacte sans scroll */}
                  {isParsed && (
                    <div className="animate-in fade-in-50 space-y-3 rounded-lg border border-edito-border bg-white p-4 shadow-sm">
                      <div className="flex items-center justify-between border-b border-edito-border pb-2.5">
                        <span className="text-[10px] font-black uppercase tracking-wider text-edito-brass">
                          Synthèse de l&apos;analyse JSON
                        </span>
                        <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                          ✓ Structure valide
                        </span>
                      </div>

                      {/* Micro-KPIs en grille horizontal compacte */}
                      <div className="grid grid-cols-4 gap-2 text-[11px]">
                        <div className="rounded border border-edito-border/60 bg-edito-canvas p-2">
                          <span className="block text-[9px] uppercase font-bold text-edito-muted">Secteur détecté</span>
                          <span className="font-bold text-edito-navy">BTP &amp; Infrastructures</span>
                        </div>
                        <div className="rounded border border-edito-border/60 bg-edito-canvas p-2">
                          <span className="block text-[9px] uppercase font-bold text-edito-muted">Comptes cités</span>
                          <span className="font-bold text-edito-navy">4 entreprises</span>
                        </div>
                        <div className="rounded border border-edito-border/60 bg-edito-canvas p-2">
                          <span className="block text-[9px] uppercase font-bold text-edito-muted">Compte étalon</span>
                          <span className="font-bold text-edito-brass">VINCI</span>
                        </div>
                        <div className="rounded border border-edito-border/60 bg-edito-canvas p-2">
                          <span className="block text-[9px] uppercase font-bold text-edito-muted">Avertissements</span>
                          <span className="font-bold text-edito-body">0 anomalie</span>
                        </div>
                      </div>

                      {/* Rattachement Segment & Date */}
                      <div className="grid grid-cols-2 gap-4 pt-1">
                        <div>
                          <label htmlFor="propA-segment" className="block text-[10px] font-bold uppercase tracking-wider text-edito-muted">
                            Segment cible dans le référentiel <span className="text-red-500">*</span>
                          </label>
                          <select
                            id="propA-segment"
                            value={selectedSegment}
                            onChange={(e) => setSelectedSegment(e.target.value)}
                            className="mt-1 w-full rounded border border-edito-border bg-white px-3 py-1.5 text-xs text-edito-navy outline-none focus:border-edito-navy"
                          >
                            {MOCK_SEGMENTS.map((s) => (
                              <option key={s.slug} value={s.slug}>
                                {s.macroName} › {s.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label htmlFor="propA-date" className="block text-[10px] font-bold uppercase tracking-wider text-edito-muted">
                            Date de référence de l&apos;étude <span className="text-red-500">*</span>
                          </label>
                          <input
                            id="propA-date"
                            type="date"
                            value={studyDate}
                            onChange={(e) => setStudyDate(e.target.value)}
                            className="mt-1 w-full rounded border border-edito-border bg-white px-3 py-1.5 text-xs text-edito-navy outline-none focus:border-edito-navy"
                          />
                        </div>
                      </div>

                      {/* Launch resolution button */}
                      <div className="flex justify-end pt-2">
                        <button
                          type="button"
                          onClick={() => setStep("arbitrate")}
                          className="flex items-center gap-2 rounded border border-edito-navy bg-edito-navy px-5 py-2 text-xs font-bold text-white transition-colors hover:bg-edito-heading"
                        >
                          <span>Lancer la résolution des comptes</span>
                          <span>→</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ÉTAPE 2 : RÉSOUDRE LES COMPTES */}
              {currentStep === "arbitrate" && (
                <div className="space-y-3">
                  {/* Sub-header status bar */}
                  <div className="flex items-center justify-between border-b border-edito-border pb-2 text-[11px]">
                    <span className="font-bold text-edito-navy">
                      4 comptes à arbitrer (2 résolus, 1 ambigu, 1 introuvable)
                    </span>
                    <span className="rounded bg-edito-chip px-2 py-0.5 font-mono text-[10px] font-bold text-edito-brass">
                      Segment : BTP &amp; Infrastructures
                    </span>
                  </div>

                  {/* Accordion list of collapsed/expanded accounts */}
                  <div className="space-y-2.5">
                    {accounts.map((acc) => {
                      const isExpanded = expandedIndex === acc.index

                      return (
                        <div
                          key={acc.index}
                          className={cn(
                            "rounded-lg border bg-white transition-all duration-200",
                            isExpanded
                              ? "border-edito-brass/60 shadow-md ring-1 ring-edito-brass/30"
                              : "border-edito-border hover:border-edito-navy/40",
                            acc.skip && "opacity-50 bg-slate-50",
                          )}
                        >
                          {/* Header Accordion Clickable */}
                          <div
                            onClick={() => setExpandedIndex(isExpanded ? null : acc.index)}
                            className="cursor-pointer p-3"
                          >
                            {/* LIGNE 1 : Nom + Statut (Rectangulaire angles modérés) */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2.5">
                                <span className="font-heading text-sm font-black text-edito-navy">
                                  {acc.nom}
                                </span>
                                {acc.estCompteEtalon && (
                                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-black uppercase text-amber-900 border border-amber-300">
                                    Étalon
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-3">
                                <span
                                  className={cn(
                                    "rounded-sm px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider",
                                    acc.status === "resolved" && "bg-emerald-100 text-emerald-900 border border-emerald-300",
                                    acc.status === "ambiguous" && "bg-amber-100 text-amber-900 border border-amber-300",
                                    acc.status === "not_found" && "bg-slate-100 text-slate-800 border border-slate-300",
                                  )}
                                >
                                  {acc.status === "resolved"
                                    ? "RÉSOLU"
                                    : acc.status === "ambiguous"
                                      ? "AMBIGU"
                                      : "INTROUVABLE"}
                                </span>

                                <span className="text-edito-muted transition-transform duration-200">
                                  {isExpanded ? "▲" : "▼"}
                                </span>
                              </div>
                            </div>

                            {/* LIGNE 2 : Données analytiques (Dense 1 ligne desktop, Labels/Valeurs distincts) */}
                            <div className="mt-2 flex flex-wrap items-center gap-x-3 text-[10px] text-edito-body">
                              <span className="font-bold uppercase tracking-wide text-edito-navy">
                                {acc.categorie}
                              </span>
                              <span className="text-edito-border">|</span>
                              <span>
                                <strong className="text-edito-muted font-normal">CA</strong>{" "}
                                <span className="font-semibold text-edito-ink">
                                  {acc.caMeur ? `${acc.caMeur.toLocaleString("fr-FR")} M€` : "—"}
                                </span>
                              </span>
                              <span className="text-edito-border">|</span>
                              <span>
                                <strong className="text-edito-muted font-normal">APPÉTENCE</strong>{" "}
                                <span className="font-semibold text-edito-ink">{acc.appetenceScore}/35</span>
                              </span>
                              <span className="text-edito-border">|</span>
                              <span>
                                <strong className="text-edito-muted font-normal">ACCESSIBILITÉ</strong>{" "}
                                <span className="font-semibold text-edito-ink">
                                  {acc.accessibiliteScore !== null ? `${acc.accessibiliteScore}/5` : "Non renseignée"}
                                </span>
                              </span>
                              <span className="text-edito-border">|</span>
                              <span>
                                <strong className="text-edito-muted font-normal">CONFIANCE</strong>{" "}
                                <span className="font-semibold text-edito-ink">{acc.confiance}</span>
                              </span>
                            </div>

                            {/* LIGNE 3 : Rattachement sur la même ligne */}
                            <div className="mt-2 flex items-center justify-between border-t border-edito-border/50 pt-2 text-[10px]">
                              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                <span className="font-bold text-edito-navy">Rattachement :</span>
                                <select
                                  value={acc.mode === "create" ? "__create__" : acc.selectedCandidateId ?? ""}
                                  onChange={(e) => {
                                    const val = e.target.value
                                    if (val === "__create__") {
                                      handleAccountPatch(acc.index, { mode: "create", selectedCandidateId: null })
                                    } else {
                                      handleAccountPatch(acc.index, { mode: "attach", selectedCandidateId: val })
                                    }
                                  }}
                                  className="rounded border border-edito-border bg-edito-chip px-2 py-0.5 font-semibold text-edito-heading outline-none focus:border-edito-navy"
                                >
                                  <option value="__create__">
                                    Créer un nouveau compte « mapped » — {acc.nom}
                                  </option>
                                  {acc.candidates.map((c) => (
                                    <option key={c.companyId} value={c.companyId}>
                                      {c.name} ({Math.round(c.matchScore * 100)}% match{c.siren ? `, SIREN ${c.siren}` : ""})
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <label
                                className="flex items-center gap-1.5 text-[10px] font-medium text-edito-muted hover:text-edito-navy"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <input
                                  type="checkbox"
                                  checked={acc.skip}
                                  onChange={(e) => handleAccountPatch(acc.index, { skip: e.target.checked })}
                                  className="size-3 accent-edito-navy"
                                />
                                Exclure de l&apos;import
                              </label>
                            </div>
                          </div>

                          {/* ZONE DÉPLIÉE — 4 RUBRIQUES DENSE HAUT CONTRASTE */}
                          {isExpanded && (
                            <div className="border-t border-edito-border bg-edito-canvas/70 p-4">
                              <div className="mb-3 flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase tracking-wider text-edito-brass">
                                  Détail analytique du compte
                                </span>
                                <span className="text-[10px] text-edito-muted">
                                  Édition directe des métadonnées
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-3 text-[11px]">
                                {/* 1. Activités */}
                                <div className="rounded border border-edito-border bg-white p-3">
                                  <div className="mb-1 text-[9px] font-black uppercase tracking-wider text-edito-navy">
                                    Activités
                                  </div>
                                  <p className="leading-snug text-edito-body font-medium">
                                    {acc.activites || "Non renseigné"}
                                  </p>
                                </div>

                                {/* 2. Angle d'approche */}
                                <div className="rounded border border-edito-border bg-white p-3">
                                  <div className="mb-1 text-[9px] font-black uppercase tracking-wider text-edito-navy">
                                    Angle d&apos;approche
                                  </div>
                                  <textarea
                                    value={acc.angleEntree}
                                    onChange={(e) => handleAccountPatch(acc.index, { angleEntree: e.target.value })}
                                    rows={2}
                                    className="w-full resize-none rounded border border-edito-border bg-edito-canvas p-1.5 text-[10px] leading-snug text-edito-ink outline-none focus:border-edito-navy"
                                  />
                                </div>

                                {/* 3. Forces (Accent Positif) */}
                                <div className="rounded border border-emerald-200 bg-emerald-50/50 p-3">
                                  <div className="mb-1 text-[9px] font-black uppercase tracking-wider text-emerald-900">
                                    Forces
                                  </div>
                                  <textarea
                                    value={acc.forces}
                                    onChange={(e) => handleAccountPatch(acc.index, { forces: e.target.value })}
                                    rows={2}
                                    className="w-full resize-none rounded border border-emerald-300 bg-white p-1.5 text-[10px] leading-snug text-emerald-950 outline-none focus:border-emerald-700"
                                  />
                                </div>

                                {/* 4. Faiblesses (Accent Vigilance) */}
                                <div className="rounded border border-amber-200 bg-amber-50/50 p-3">
                                  <div className="mb-1 text-[9px] font-black uppercase tracking-wider text-amber-900">
                                    Faiblesses
                                  </div>
                                  <textarea
                                    value={acc.vulnerabilite}
                                    onChange={(e) => handleAccountPatch(acc.index, { vulnerabilite: e.target.value })}
                                    rows={2}
                                    className="w-full resize-none rounded border border-amber-300 bg-white p-1.5 text-[10px] leading-snug text-amber-950 outline-none focus:border-amber-700"
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Actions bas de page */}
                  <div className="flex items-center justify-between border-t border-edito-border pt-3">
                    <button
                      type="button"
                      onClick={() => setStep("upload")}
                      className="text-xs font-bold text-edito-muted hover:text-edito-navy"
                    >
                      ← Retour à la préparation
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep("confirm")}
                      className="rounded border border-edito-brass bg-edito-brass px-5 py-2 text-xs font-black text-edito-navy transition-colors hover:bg-white"
                    >
                      Confirmer et ingérer les comptes (4)
                    </button>
                  </div>
                </div>
              )}

              {/* ÉTAPE 3 : FINALISER */}
              {currentStep === "confirm" && (
                <div className="space-y-4 rounded-lg border border-edito-border bg-white p-5 shadow-sm">
                  <div className="border-b border-edito-border pb-3">
                    <span className="text-[9px] font-black uppercase tracking-widest text-edito-brass">
                      Fiche de clôture d&apos;import
                    </span>
                    <h2 className="font-heading text-lg font-black text-edito-navy">
                      Import exécuté avec succès
                    </h2>
                  </div>

                  <div className="grid grid-cols-4 gap-3 text-[11px]">
                    <div className="rounded border border-edito-border bg-edito-canvas p-3">
                      <span className="block text-[9px] uppercase font-bold text-edito-muted">Secteur</span>
                      <span className="font-bold text-edito-navy">BTP &amp; Infrastructures</span>
                    </div>
                    <div className="rounded border border-edito-border bg-edito-canvas p-3">
                      <span className="block text-[9px] uppercase font-bold text-edito-muted">Date étude</span>
                      <span className="font-bold text-edito-navy">{studyDate}</span>
                    </div>
                    <div className="rounded border border-edito-border bg-edito-canvas p-3">
                      <span className="block text-[9px] uppercase font-bold text-edito-muted">Rattachés</span>
                      <span className="font-bold text-emerald-700">3 comptes CRM</span>
                    </div>
                    <div className="rounded border border-edito-border bg-edito-canvas p-3">
                      <span className="block text-[9px] uppercase font-bold text-edito-muted">Créés (mapped)</span>
                      <span className="font-bold text-edito-brass">1 compte</span>
                    </div>
                  </div>

                  <div className="rounded border border-edito-border bg-edito-canvas p-3 text-[11px]">
                    <span className="block font-bold text-edito-navy mb-1.5">Comptes traités :</span>
                    <ul className="space-y-1 text-edito-body">
                      <li>• <strong>VINCI SA</strong> — Rattaché (Match 98%, SIREN 552037808)</li>
                      <li>• <strong>EIFFAGE SA</strong> — Rattaché (Match 96%, SIREN 709802094)</li>
                      <li>• <strong>BOUYGUES SA</strong> — Rattaché (Match 74%, SIREN 572015246)</li>
                      <li>• <strong>NGE</strong> — Créé en compte citation <code className="rounded bg-white px-1 text-[10px]">mapped</code></li>
                    </ul>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setStep("upload")}
                      className="rounded border border-edito-border bg-white px-4 py-2 text-xs font-bold text-edito-navy hover:bg-edito-chip"
                    >
                      Nouvel import
                    </button>
                    <button
                      type="button"
                      onClick={() => alert("Simulation retour comptes")}
                      className="rounded border border-edito-navy bg-edito-navy px-4 py-2 text-xs font-bold text-white hover:bg-edito-heading"
                    >
                      Fermer et consulter les comptes
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}

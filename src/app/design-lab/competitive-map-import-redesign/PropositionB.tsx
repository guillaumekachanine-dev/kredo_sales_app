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

type PropositionBProps = {
  forcedStep?: StepId
  forcedParsed?: boolean
  forcedExpandedIndex?: number | null
  showEmptyHistory?: boolean
}

export function PropositionB({
  forcedStep,
  forcedParsed,
  forcedExpandedIndex,
  showEmptyHistory = false,
}: PropositionBProps) {
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
    <div className="mx-auto flex h-[640px] w-full max-w-[1020px] overflow-hidden rounded-xl border border-slate-300 bg-slate-100 font-sans shadow-xl">
      {/* ── RAIL GAUCHE : COBALT WORKSPACE CONTROL TOWER ─────────────── */}
      <aside className="flex w-[195px] shrink-0 flex-col justify-between border-r border-slate-700 bg-[#162650] p-5 text-white">
        {/* Timeline centrée horizontalement */}
        <div className="flex flex-col items-center pt-2 text-center">
          <p className="mb-6 font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-[#63A6E8]">
            Workspace Control
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
                        complete ? "bg-[#2554B8]" : "bg-white/20",
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
                        "relative z-10 flex size-7 items-center justify-center rounded text-[10px] font-black transition-all duration-200",
                        active &&
                          "bg-[#2554B8] text-white shadow-[0_0_10px_rgba(37,84,184,0.6)] border border-cyan-400",
                        complete && "bg-emerald-600 text-white font-bold",
                        !active &&
                          !complete &&
                          "border border-white/25 bg-white/5 text-white/40 group-hover:border-white/50",
                      )}
                    >
                      {complete ? "✓" : s.num}
                    </span>
                    <span
                      className={cn(
                        "mt-1.5 text-[11px] font-bold tracking-tight transition-colors",
                        active ? "text-cyan-300 font-extrabold" : complete ? "text-white" : "text-white/45",
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
            <span className="rounded bg-[#2554B8] px-1.5 py-0.5 text-[9px] font-bold text-white">
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
                          ? "bg-[#2554B8] text-white font-bold border-l-2 border-cyan-400"
                          : "text-white/70 hover:bg-white/10 hover:text-white",
                      )}
                    >
                      <span className="font-mono text-[9px] opacity-70 group-hover:opacity-100">
                        {item.dateLabel}
                      </span>
                      <span className="truncate pl-2 font-semibold">{item.sectorName}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </aside>

      {/* ── ZONE PRINCIPALE : CONTROL WORKSPACE ───────────────────────── */}
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-slate-50">
        {/* Header Control Workspace */}
        <header className="flex shrink-0 items-center justify-between border-b border-slate-300 bg-white px-6 py-3.5 shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[9px] font-black uppercase tracking-widest text-[#2554B8]">
                Proposition B — Control Workspace
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-[10px] font-bold text-slate-500">
                {currentStep === "upload"
                  ? "Phase 1 : Injection & Contrôle JSON"
                  : currentStep === "arbitrate"
                    ? "Phase 2 : Rapprochement CRM & Statuts"
                    : "Phase 3 : Clôture & Ingestion"}
              </span>
            </div>
            <h1 className="font-heading text-lg font-black tracking-tight text-slate-900">
              Importer une cartographie concurrentielle
            </h1>
          </div>
          {selectedHistoryId && (
            <button
              type="button"
              onClick={() => setSelectedHistoryId(null)}
              className="rounded border border-[#2554B8] bg-[#2554B8]/10 px-2.5 py-1 text-[10px] font-bold text-[#2554B8] hover:bg-[#2554B8]/20"
            >
              Fermer détail historique ({selectedHistory?.sectorName})
            </button>
          )}
        </header>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Detail View for selected History Item */}
          {selectedHistory ? (
            <div className="space-y-4 rounded-lg border border-slate-300 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-[#2554B8]">
                    Archive d&apos;import sectoriel
                  </span>
                  <h3 className="font-heading text-base font-bold text-slate-900">
                    {selectedHistory.sectorName} — {selectedHistory.rawDate}
                  </h3>
                </div>
                <span className="rounded bg-[#2554B8]/10 px-2 py-1 text-[10px] font-bold text-[#2554B8]">
                  {selectedHistory.accountCount} comptes dans l&apos;archive
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-[11px]">
                <div className="rounded border border-slate-200 bg-slate-50 p-3">
                  <span className="block text-[9px] uppercase font-bold text-slate-400">Secteur</span>
                  <span className="font-bold text-slate-900">{selectedHistory.sectorName}</span>
                </div>
                <div className="rounded border border-slate-200 bg-slate-50 p-3">
                  <span className="block text-[9px] uppercase font-bold text-slate-400">Date d&apos;import</span>
                  <span className="font-bold text-slate-900">{selectedHistory.rawDate}</span>
                </div>
                <div className="rounded border border-slate-200 bg-slate-50 p-3">
                  <span className="block text-[9px] uppercase font-bold text-slate-400">Document ID</span>
                  <span className="font-mono text-[10px] font-bold text-slate-700">{selectedHistory.id}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedHistoryId(null)}
                className="mt-2 text-xs font-bold text-[#2554B8] hover:underline"
              >
                ← Retour à l&apos;assistant d&apos;import
              </button>
            </div>
          ) : (
            <>
              {/* ÉTAPE 1 : PRÉPARER LE FICHIER */}
              {currentStep === "upload" && (
                <div className="flex h-full flex-col justify-between space-y-4">
                  {/* Inputs Côte à côte compacts */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Input Dropzone */}
                    <div className="flex flex-col justify-center rounded-lg border-2 border-dashed border-slate-300 bg-white p-4 text-center transition-all hover:border-[#2554B8] hover:bg-blue-50/50">
                      <div className="mx-auto mb-2 flex size-9 items-center justify-center rounded bg-[#2554B8]/10 text-[#2554B8]">
                        <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                      </div>
                      <span className="text-xs font-bold text-slate-900">
                        Déposer un export JSON
                      </span>
                      <span className="mt-0.5 text-[10px] text-slate-500">
                        ou charger depuis votre poste
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setRawJson(MOCK_RAW_JSON)
                          setParsed(true)
                        }}
                        className="mx-auto mt-3 rounded border border-slate-300 bg-slate-100 px-3 py-1 text-[10px] font-bold text-slate-700 transition-colors hover:border-[#2554B8] hover:text-[#2554B8]"
                      >
                        Charger l&apos;exemple BTP &amp; Infrastructures
                      </button>
                    </div>

                    {/* Input Textarea Paste */}
                    <div className="flex flex-col rounded-lg border border-slate-300 bg-white p-3">
                      <label htmlFor="propB-json" className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Coller le contenu JSON
                      </label>
                      <textarea
                        id="propB-json"
                        value={rawJson}
                        onChange={(e) => setRawJson(e.target.value)}
                        rows={5}
                        placeholder='{"secteur": "BTP & Infrastructures", "comptes": [...]}'
                        className="w-full flex-1 resize-none rounded border border-slate-300 bg-slate-900 p-2.5 font-mono text-[10px] leading-relaxed text-emerald-400 outline-none focus:border-[#2554B8] focus:ring-1 focus:ring-[#2554B8]"
                      />
                    </div>
                  </div>

                  {/* Signature Action Bar: « Analyser le fichier » */}
                  <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-white p-3.5 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded bg-[#2554B8] text-white">
                        <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">Moteur de validation &amp; Ingestion JSON</p>
                        <p className="text-[10px] text-slate-500">Analyse le schéma d&apos;entrée, vérifie les doublons et prépare la résolution CRM.</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleParse}
                      disabled={!rawJson.trim()}
                      className="flex items-center gap-2 rounded bg-[#2554B8] px-5 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-blue-700 disabled:opacity-40"
                    >
                      <span>Analyser le fichier</span>
                      <span>⚡</span>
                    </button>
                  </div>

                  {/* Étape 1 — APRÈS ANALYSE : Synthèse analytique compacte sans scroll */}
                  {isParsed && (
                    <div className="animate-in fade-in-50 space-y-3 rounded-lg border border-slate-300 bg-white p-4 shadow-sm">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-[#2554B8]">
                          Bilan d&apos;Analyse JSON
                        </span>
                        <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-[#2554B8] border border-blue-200">
                          JSON 100% Conforme
                        </span>
                      </div>

                      {/* Micro-KPIs en grille horizontal compacte */}
                      <div className="grid grid-cols-4 gap-2 text-[11px]">
                        <div className="rounded border border-slate-200 bg-slate-50 p-2">
                          <span className="block text-[9px] uppercase font-bold text-slate-400">Secteur</span>
                          <span className="font-bold text-slate-900">BTP &amp; Infrastructures</span>
                        </div>
                        <div className="rounded border border-slate-200 bg-slate-50 p-2">
                          <span className="block text-[9px] uppercase font-bold text-slate-400">Volume</span>
                          <span className="font-bold text-[#2554B8]">4 comptes</span>
                        </div>
                        <div className="rounded border border-slate-200 bg-slate-50 p-2">
                          <span className="block text-[9px] uppercase font-bold text-slate-400">Compte étalon</span>
                          <span className="font-bold text-amber-600">VINCI</span>
                        </div>
                        <div className="rounded border border-slate-200 bg-slate-50 p-2">
                          <span className="block text-[9px] uppercase font-bold text-slate-400">Conflits</span>
                          <span className="font-bold text-emerald-700">Aucun</span>
                        </div>
                      </div>

                      {/* Rattachement Segment & Date */}
                      <div className="grid grid-cols-2 gap-4 pt-1">
                        <div>
                          <label htmlFor="propB-segment" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            Segment Cible <span className="text-red-500">*</span>
                          </label>
                          <select
                            id="propB-segment"
                            value={selectedSegment}
                            onChange={(e) => setSelectedSegment(e.target.value)}
                            className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-[#2554B8]"
                          >
                            {MOCK_SEGMENTS.map((s) => (
                              <option key={s.slug} value={s.slug}>
                                {s.macroName} › {s.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label htmlFor="propB-date" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            Date de Référence <span className="text-red-500">*</span>
                          </label>
                          <input
                            id="propB-date"
                            type="date"
                            value={studyDate}
                            onChange={(e) => setStudyDate(e.target.value)}
                            className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-[#2554B8]"
                          />
                        </div>
                      </div>

                      {/* Launch resolution button */}
                      <div className="flex justify-end pt-2">
                        <button
                          type="button"
                          onClick={() => setStep("arbitrate")}
                          className="flex items-center gap-2 rounded bg-[#2554B8] px-5 py-2 text-xs font-bold text-white transition-colors hover:bg-blue-700"
                        >
                          <span>Procéder à la résolution des comptes</span>
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
                  {/* Status Bar Header */}
                  <div className="flex items-center justify-between rounded bg-white p-2.5 border border-slate-300 text-[11px]">
                    <span className="font-bold text-slate-900">
                      File d&apos;Arbitrage CRM (4 Lignes)
                    </span>
                    <div className="flex gap-2">
                      <span className="rounded bg-emerald-100 px-2 py-0.5 text-[9px] font-bold text-emerald-800">
                        2 Résolus
                      </span>
                      <span className="rounded bg-amber-100 px-2 py-0.5 text-[9px] font-bold text-amber-800">
                        1 Ambigu
                      </span>
                      <span className="rounded bg-slate-200 px-2 py-0.5 text-[9px] font-bold text-slate-800">
                        1 Introuvable
                      </span>
                    </div>
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
                              ? "border-[#2554B8] ring-2 ring-[#2554B8]/20 shadow-md"
                              : "border-slate-300 hover:border-slate-400",
                            acc.skip && "opacity-50 bg-slate-50",
                          )}
                        >
                          {/* Header Accordion Clickable */}
                          <div
                            onClick={() => setExpandedIndex(isExpanded ? null : acc.index)}
                            className="cursor-pointer p-3"
                          >
                            {/* LIGNE 1 : Nom + Statut (Rectangulaire angles très légèrement arrondis) */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2.5">
                                <span className="font-heading text-sm font-black text-slate-900">
                                  {acc.nom}
                                </span>
                                {acc.estCompteEtalon && (
                                  <span className="rounded-sm bg-blue-100 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase text-[#2554B8] border border-blue-200">
                                    Étalon
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-3">
                                <span
                                  className={cn(
                                    "rounded-xs px-2.5 py-0.5 font-mono text-[9px] font-black uppercase tracking-wider",
                                    acc.status === "resolved" && "bg-emerald-600 text-white",
                                    acc.status === "ambiguous" && "bg-amber-500 text-white",
                                    acc.status === "not_found" && "bg-slate-600 text-white",
                                  )}
                                >
                                  {acc.status === "resolved"
                                    ? "RÉSOLU"
                                    : acc.status === "ambiguous"
                                      ? "AMBIGU"
                                      : "INTROUVABLE"}
                                </span>

                                <span className="text-slate-400 text-xs font-bold">
                                  {isExpanded ? "▲" : "▼"}
                                </span>
                              </div>
                            </div>

                            {/* LIGNE 2 : Données analytiques (Dense 1 ligne desktop, Labels/Valeurs distincts) */}
                            <div className="mt-2 flex flex-wrap items-center gap-x-3 text-[10px] text-slate-700">
                              <span className="font-black uppercase text-[#2554B8]">
                                {acc.categorie}
                              </span>
                              <span className="text-slate-300">•</span>
                              <span>
                                <span className="text-slate-400 uppercase font-bold text-[9px]">CA</span>{" "}
                                <strong className="text-slate-900">
                                  {acc.caMeur ? `${acc.caMeur.toLocaleString("fr-FR")} M€` : "—"}
                                </strong>
                              </span>
                              <span className="text-slate-300">•</span>
                              <span>
                                <span className="text-slate-400 uppercase font-bold text-[9px]">Appétence</span>{" "}
                                <strong className="text-slate-900">{acc.appetenceScore}/35</strong>
                              </span>
                              <span className="text-slate-300">•</span>
                              <span>
                                <span className="text-slate-400 uppercase font-bold text-[9px]">Accessibilité</span>{" "}
                                <strong className="text-slate-900">
                                  {acc.accessibiliteScore !== null ? `${acc.accessibiliteScore}/5` : "Non renseignée"}
                                </strong>
                              </span>
                              <span className="text-slate-300">•</span>
                              <span>
                                <span className="text-slate-400 uppercase font-bold text-[9px]">Confiance</span>{" "}
                                <strong className="text-slate-900">{acc.confiance}</strong>
                              </span>
                            </div>

                            {/* LIGNE 3 : Rattachement sur la même ligne */}
                            <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2 text-[10px]">
                              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                <span className="font-black text-slate-900">Rattachement :</span>
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
                                  className="rounded border border-slate-300 bg-slate-50 px-2 py-0.5 font-bold text-slate-800 outline-none focus:border-[#2554B8]"
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
                                className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 hover:text-slate-900"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <input
                                  type="checkbox"
                                  checked={acc.skip}
                                  onChange={(e) => handleAccountPatch(acc.index, { skip: e.target.checked })}
                                  className="size-3.5 accent-[#2554B8]"
                                />
                                Exclure
                              </label>
                            </div>
                          </div>

                          {/* ZONE DÉPLIÉE — 4 RUBRIQUES CONTROL WORKSPACE */}
                          {isExpanded && (
                            <div className="border-t border-slate-200 bg-slate-100 p-4">
                              <div className="mb-3 flex items-center justify-between border-b border-slate-300 pb-2">
                                <span className="text-[10px] font-black uppercase tracking-wider text-[#2554B8]">
                                  Fiche de Détail Profil &amp; Grilles
                                </span>
                                <span className="text-[10px] font-bold text-slate-500">
                                  Contrôle de Cohérence Métier
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-3 text-[11px]">
                                {/* 1. Activités */}
                                <div className="rounded border border-slate-300 bg-white p-3 shadow-2xs">
                                  <div className="mb-1 text-[9px] font-black uppercase text-slate-900">
                                    Activités &amp; Chaine de valeur
                                  </div>
                                  <p className="leading-snug text-slate-700 font-medium">
                                    {acc.activites || "Non renseigné"}
                                  </p>
                                </div>

                                {/* 2. Angle d'approche */}
                                <div className="rounded border border-slate-300 bg-white p-3 shadow-2xs">
                                  <div className="mb-1 text-[9px] font-black uppercase text-slate-900">
                                    Angle d&apos;approche
                                  </div>
                                  <textarea
                                    value={acc.angleEntree}
                                    onChange={(e) => handleAccountPatch(acc.index, { angleEntree: e.target.value })}
                                    rows={2}
                                    className="w-full resize-none rounded border border-slate-300 bg-slate-50 p-1.5 text-[10px] leading-snug text-slate-900 outline-none focus:border-[#2554B8]"
                                  />
                                </div>

                                {/* 3. Forces */}
                                <div className="rounded border border-emerald-300 bg-white p-3 shadow-2xs">
                                  <div className="mb-1 text-[9px] font-black uppercase text-emerald-800">
                                    Forces &amp; Avantages
                                  </div>
                                  <textarea
                                    value={acc.forces}
                                    onChange={(e) => handleAccountPatch(acc.index, { forces: e.target.value })}
                                    rows={2}
                                    className="w-full resize-none rounded border border-emerald-300 bg-emerald-50/40 p-1.5 text-[10px] leading-snug text-slate-900 outline-none focus:border-emerald-700"
                                  />
                                </div>

                                {/* 4. Faiblesses */}
                                <div className="rounded border border-amber-300 bg-white p-3 shadow-2xs">
                                  <div className="mb-1 text-[9px] font-black uppercase text-amber-800">
                                    Faiblesses &amp; Vulnerabilité
                                  </div>
                                  <textarea
                                    value={acc.vulnerabilite}
                                    onChange={(e) => handleAccountPatch(acc.index, { vulnerabilite: e.target.value })}
                                    rows={2}
                                    className="w-full resize-none rounded border border-amber-300 bg-amber-50/40 p-1.5 text-[10px] leading-snug text-slate-900 outline-none focus:border-amber-700"
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
                  <div className="flex items-center justify-between border-t border-slate-300 pt-3">
                    <button
                      type="button"
                      onClick={() => setStep("upload")}
                      className="text-xs font-bold text-slate-500 hover:text-slate-900"
                    >
                      ← Préparation
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep("confirm")}
                      className="rounded bg-[#2554B8] px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700"
                    >
                      Valider et Exécuter l&apos;Ingestion (4)
                    </button>
                  </div>
                </div>
              )}

              {/* ÉTAPE 3 : FINALISER */}
              {currentStep === "confirm" && (
                <div className="space-y-4 rounded-lg border border-slate-300 bg-white p-5 shadow-sm">
                  <div className="border-b border-slate-200 pb-3">
                    <span className="text-[9px] font-black uppercase tracking-widest text-[#2554B8]">
                      Rapport d&apos;Exécution Ingestion
                    </span>
                    <h2 className="font-heading text-lg font-black text-slate-900">
                      Import Réussi &amp; Comptes Rapprochés
                    </h2>
                  </div>

                  <div className="grid grid-cols-4 gap-3 text-[11px]">
                    <div className="rounded border border-slate-200 bg-slate-50 p-3">
                      <span className="block text-[9px] uppercase font-bold text-slate-400">Secteur</span>
                      <span className="font-bold text-slate-900">BTP &amp; Infrastructures</span>
                    </div>
                    <div className="rounded border border-slate-200 bg-slate-50 p-3">
                      <span className="block text-[9px] uppercase font-bold text-slate-400">Date étude</span>
                      <span className="font-bold text-slate-900">{studyDate}</span>
                    </div>
                    <div className="rounded border border-slate-200 bg-slate-50 p-3">
                      <span className="block text-[9px] uppercase font-bold text-slate-400">Rattachés</span>
                      <span className="font-bold text-emerald-700">3 comptes</span>
                    </div>
                    <div className="rounded border border-slate-200 bg-slate-50 p-3">
                      <span className="block text-[9px] uppercase font-bold text-slate-400">Créations</span>
                      <span className="font-bold text-[#2554B8]">1 compte mapped</span>
                    </div>
                  </div>

                  <div className="rounded border border-slate-200 bg-slate-50 p-3 text-[11px]">
                    <span className="block font-bold text-slate-900 mb-1.5">Bilan des opérations CRM :</span>
                    <ul className="space-y-1 text-slate-700">
                      <li>• <strong>VINCI SA</strong> — Rattaché au compte CRM (SIREN 552037808)</li>
                      <li>• <strong>EIFFAGE SA</strong> — Rattaché au compte CRM (SIREN 709802094)</li>
                      <li>• <strong>BOUYGUES SA</strong> — Rattaché au compte CRM (SIREN 572015246)</li>
                      <li>• <strong>NGE</strong> — Nouveau compte créé avec le statut <code className="rounded bg-white px-1 text-[10px]">mapped</code></li>
                    </ul>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setStep("upload")}
                      className="rounded border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                    >
                      Nouvel import
                    </button>
                    <button
                      type="button"
                      onClick={() => alert("Simulation retour comptes")}
                      className="rounded bg-[#2554B8] px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
                    >
                      Consulter le pipe des comptes
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

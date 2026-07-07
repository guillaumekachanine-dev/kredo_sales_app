"use client"

import { useState } from "react"
import { formatDateFr } from "@/lib/formatters"
import { CompanyLogo } from "@/components/accounts-contacts/CompanyLogo"
import { openCommunicationComposer } from "@/lib/communication/communication-composer"
import { SignalListCard } from "./SignalListCard"
import {
  QualifySignalDialog,
  CreateAccountNoteDialog,
  CreateOpportunityDialog,
} from "./SignalDialogs"
import { getRelativeTimeFr, extractMatchedCompany } from "./veille-utils"
import type {
  VeilleDigest,
  VeilleArticle,
  SectorNews,
  SectorEvent,
  CompanyContextStats,
} from "@/app/(app)/veille/_data/veille-data"

interface VeilleActualitesDesktopProps {
  digest: VeilleDigest | null
  articles: VeilleArticle[]
  pastDigests: VeilleDigest[]
  sectorNews: SectorNews[]
  sectorEvents: SectorEvent[]
  companies: CompanyContextStats[]
}

export function VeilleActualitesDesktop({
  digest,
  articles: initialArticles,
  pastDigests,
  sectorNews,
  sectorEvents,
  companies,
}: VeilleActualitesDesktopProps) {
  const [articles, setArticles] = useState<VeilleArticle[]>(initialArticles)
  const [selectedArticle, setSelectedArticle] = useState<VeilleArticle | null>(() => {
    return initialArticles.length > 0 ? initialArticles[0] : null
  })
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("Tous")

  // Dialog States
  const [isNoteOpen, setIsNoteOpen] = useState(false)
  const [isOpportunityOpen, setIsOpportunityOpen] = useState(false)
  const [isQualifyOpen, setIsQualifyOpen] = useState(false)

  // Toast State
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Toast trigger helper
  const showToast = (message: string) => {
    setToastMessage(message)
    setTimeout(() => {
      setToastMessage(null)
    }, 4000)
  }

  // Email outreach helper
  const handleGeneratePitch = (article: VeilleArticle, matchedCompany: CompanyContextStats | null) => {
    const parts = [
      `Signal : ${article.titre_fr}`,
      article.source_name ? `Source : ${article.source_name}` : null,
      `Résumé : ${article.resume}`,
      article.analyse_kredo ? `Analyse KREDO : ${article.analyse_kredo}` : null,
      article.action_commerciale ? `Action commerciale proposée : ${article.action_commerciale}` : null,
      article.secteur_principal || article.categorie
        ? `Contexte : ${[article.secteur_principal, article.categorie].filter(Boolean).join(" / ")}`
        : null,
    ]
    const mustInclude = parts.filter(Boolean).join("\n")

    openCommunicationComposer({
      origin: "veille_signal",
      companyId: matchedCompany?.id || null,
      companyName: matchedCompany?.name || null,
      preset: {
        scenario: "signal_outreach",
        channel: "email",
        objective: "get_meeting",
        tone: "direct",
        length: "standard",
        mustInclude,
      },
    })
  }

  // Filter articles based on search & category chip
  const filteredArticles = articles.filter((article) => {
    const matchesSearch =
      article.titre_fr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.resume.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (article.secteur_principal || "").toLowerCase().includes(searchQuery.toLowerCase())

    if (!matchesSearch) return false

    if (selectedCategory === "Tous") return true
    if (selectedCategory === "Comptes") {
      const matched = extractMatchedCompany(article.titre_fr, article.resume, companies)
      return matched !== null
    }
    if (selectedCategory === "Réglementaire") {
      return article.categorie?.toLowerCase().includes("réglement")
    }
    if (selectedCategory === "Nominations") {
      return article.categorie?.toLowerCase().includes("nominat")
    }
    if (selectedCategory === "Marché") {
      return (
        article.categorie?.toLowerCase().includes("marché") ||
        article.categorie?.toLowerCase().includes("invest")
      )
    }
    return true
  })

  // Compute matched company details for selected article
  const matchedCompany = selectedArticle
    ? extractMatchedCompany(selectedArticle.titre_fr, selectedArticle.resume, companies)
    : null

  // Compute dynamic weekly digest counts
  const nominationsCount = articles.filter((a) => a.categorie?.toLowerCase().includes("nominat")).length
  const regulatoryCount = articles.filter((a) => a.categorie?.toLowerCase().includes("réglement")).length
  const marketCount = articles.filter(
    (a) => a.categorie?.toLowerCase().includes("marché") || a.categorie?.toLowerCase().includes("invest")
  ).length

  // Explore other signals (up to 3) excluding the currently selected one
  const exploreSignals = articles
    .filter((a) => a.id !== selectedArticle?.id)
    .slice(0, 3)

  const handleArticleQualifySuccess = (updated: VeilleArticle) => {
    setArticles((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))
    setSelectedArticle(updated)
    showToast("Signal qualifié et mis à jour avec succès.")
  }

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-6 py-8 space-y-6">
      {/* Toast Alert overlay */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[var(--z-modal)] flex items-center gap-2 bg-[#E2931D] text-[#0A0D1A] font-bold text-xs px-4 py-3 rounded-lg shadow-lg animate-fade-in">
          <svg className="size-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-bold tracking-tight text-heading">
            Veille & actualités
          </h1>
          <p className="text-xs text-muted">
            Signaux stratégiques, analyses brèves et actions commerciales
          </p>
        </div>

        {/* Actions header à droite */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => showToast("Mise à jour de la veille lancée...")}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border/40 bg-surface/30 px-4 text-xs font-semibold text-body hover:text-heading hover:bg-surface-hover/30 transition-colors cursor-pointer"
          >
            <svg className="size-3.5 text-muted animate-spin-hover" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            <span>Mettre à jour</span>
          </button>

          <button
            onClick={() => showToast("Configuration de la veille (redirection vers automations)...")}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border/40 bg-surface/30 px-4 text-xs font-semibold text-body hover:text-heading hover:bg-surface-hover/30 transition-colors cursor-pointer"
          >
            <svg className="size-3.5 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.43l-1.003.828c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.99l1.005.831a1.125 1.125 0 01.26 1.43l-1.297 2.247a1.125 1.125 0 01-1.37.491l-1.216-.456c-.356-.133-.751-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.43l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.831a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.645-.869l.214-1.28z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Configurer la veille</span>
          </button>

          {selectedArticle && (
            <button
              onClick={() => handleGeneratePitch(selectedArticle, matchedCompany)}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-xs font-bold text-primary-fg hover:bg-primary-deep shadow-[0_2px_10px_rgba(255,191,0,0.15)] transition-all cursor-pointer hover:scale-[1.02]"
            >
              <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
              <span>Générer un pitch depuis ce signal</span>
            </button>
          )}
        </div>
      </header>

      {digest ? (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
          {/* ──────────────────────────────────────────────────────────────
             COLONNE GAUCHE — Recherche & signaux
             ────────────────────────────────────────────────────────────── */}
          <section className="xl:col-span-1 space-y-6">
            {/* Recherche & Filtres */}
            <div className="bg-surface/30 border border-border/40 rounded-xl p-4 space-y-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Rechercher un signal..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-9 rounded-lg border border-border/40 bg-surface/50 pl-9 pr-3 text-xs text-heading placeholder-muted outline-none focus:border-primary transition-colors"
                />
                <svg className="absolute left-3 top-2.5 size-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              {/* Chips filtres */}
              <div className="flex flex-wrap gap-1.5">
                {["Tous", "Comptes", "Réglementaire", "Nominations", "Marché"].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`rounded px-2.5 py-1 text-[10px] font-bold border transition-all cursor-pointer ${selectedCategory === cat
                        ? "bg-primary/10 border-primary text-primary"
                        : "bg-surface/10 border-border/20 text-muted hover:text-heading hover:bg-surface/30"
                      }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Liste de signaux à la une */}
            <div className="space-y-3">
              <h2 className="font-heading text-xs font-bold uppercase tracking-wider text-heading flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-primary" />
                À la une
              </h2>

              {filteredArticles.length === 0 ? (
                <div className="rounded-lg border border-border/20 bg-surface/10 p-6 text-center text-xxs text-muted italic">
                  Aucun signal trouvé.
                </div>
              ) : (
                <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1 custom-scrollbar">
                  {filteredArticles.map((article) => {
                    const matched = extractMatchedCompany(article.titre_fr, article.resume, companies)
                    return (
                      <SignalListCard
                        key={article.id}
                        article={article}
                        isActive={selectedArticle?.id === article.id}
                        onClick={() => setSelectedArticle(article)}
                        companyName={matched?.name}
                      />
                    )
                  })}
                </div>
              )}
            </div>

            {/* Digest Hebdo */}
            <div className="bg-surface/30 border border-border/40 rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-heading text-xs font-bold text-heading">Digest hebdo</h3>
                <span className="text-[10px] text-primary hover:underline cursor-pointer">
                  Voir le digest complet →
                </span>
              </div>
              <ul className="space-y-3 text-xxs text-body">
                <li className="flex items-center justify-between border-b border-border/20 pb-1.5">
                  <span className="flex items-center gap-2">
                    <span className="font-semibold text-primary">1</span> Nominations clés
                  </span>
                  <span className="rounded bg-surface/50 px-1.5 py-0.5 font-bold text-heading">
                    {nominationsCount}
                  </span>
                </li>
                <li className="flex items-center justify-between border-b border-border/20 pb-1.5">
                  <span className="flex items-center gap-2">
                    <span className="font-semibold text-primary">2</span> Réglementations
                  </span>
                  <span className="rounded bg-surface/50 px-1.5 py-0.5 font-bold text-heading">
                    {regulatoryCount}
                  </span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="font-semibold text-primary">3</span> Investissements
                  </span>
                  <span className="rounded bg-surface/50 px-1.5 py-0.5 font-bold text-heading">
                    {marketCount}
                  </span>
                </li>
              </ul>
            </div>
          </section>

          {/* ──────────────────────────────────────────────────────────────
             ZONE CENTRALE — Signal prioritaire & Exploration
             ────────────────────────────────────────────────────────────── */}
          <section className="xl:col-span-2 space-y-6">
            {selectedArticle ? (
              <>
                {/* Paper sheet strategic view */}
                <div className="paper-sheet rounded-xl border border-[var(--color-border)] p-6 space-y-6 shadow-md transition-all duration-300">
                  {/* Top categorization */}
                  <div className="flex items-center justify-between gap-4 border-b border-border/40 pb-4">
                    <div className="space-y-1">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-primary">
                        {selectedArticle.categorie || "Signal stratégique"}
                      </span>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xxs text-muted">
                        <span>{getRelativeTimeFr(selectedArticle.published_at)}</span>
                        <span>•</span>
                        <span className="font-medium text-heading">
                          Confiance {selectedArticle.selection_rank <= 2 ? "élevée" : selectedArticle.selection_rank <= 4 ? "moyenne" : "faible"}
                        </span>
                        {selectedArticle.source_name && (
                          <>
                            <span>•</span>
                            <span>via {selectedArticle.source_name}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Matched account logo & name */}
                    {matchedCompany && (
                      <div className="flex items-center gap-2.5 bg-surface-hover/30 border border-border/30 rounded-lg p-1.5 px-3">
                        <CompanyLogo
                          name={matchedCompany.name}
                          logoPath={matchedCompany.logoPath}
                          website={matchedCompany.website}
                          size="md"
                        />
                        <span className="text-xs font-bold text-heading truncate max-w-[100px]">
                          {matchedCompany.name}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Big title */}
                  <h2 className="font-heading text-xl md:text-2xl font-bold tracking-tight text-heading leading-tight">
                    {selectedArticle.titre_fr}
                  </h2>

                  {/* Summary paragraph */}
                  <p className="text-xs text-body leading-relaxed whitespace-pre-wrap">
                    {selectedArticle.resume}
                  </p>

                  {/* "Pourquoi c'est important" */}
                  {selectedArticle.analyse_kredo && (
                    <div className="rounded-lg border border-primary/20 bg-primary/[0.03] p-4 space-y-2">
                      <h3 className="font-heading text-xs font-bold text-primary flex items-center gap-2">
                        <svg className="size-4 shrink-0 text-[#E2931D]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Pourquoi c&apos;est important
                      </h3>
                      <p className="text-xs leading-relaxed text-heading font-medium">
                        {selectedArticle.analyse_kredo}
                      </p>
                    </div>
                  )}

                  {/* "Lecture commerciale" */}
                  {selectedArticle.action_commerciale && (
                    <div className="rounded-lg border border-border/60 bg-surface-hover/10 p-4 space-y-2">
                      <h3 className="font-heading text-xs font-bold text-heading flex items-center gap-2">
                        <svg className="size-4 shrink-0 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        Lecture commerciale
                      </h3>
                      <p className="text-xs leading-relaxed text-body">
                        {selectedArticle.action_commerciale}
                      </p>
                    </div>
                  )}

                  {/* Tags */}
                  {selectedArticle.tags && selectedArticle.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border/20">
                      {selectedArticle.tags.map((tag) => (
                        <span key={tag} className="rounded-md border border-border/40 bg-surface/50 px-2 py-0.5 text-[10px] text-muted">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Autres signaux à explorer */}
                <div className="space-y-3">
                  <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-heading">
                    Autres signaux à explorer
                  </h3>

                  {exploreSignals.length === 0 ? (
                    <p className="text-xxs text-muted italic">Aucun autre signal disponible dans ce digest.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {exploreSignals.map((signal) => (
                        <div
                          key={signal.id}
                          className="bg-surface/30 border border-border/40 rounded-xl p-4 flex flex-col justify-between space-y-3 hover:border-primary/50 transition-colors"
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between gap-2 text-[9px] text-muted">
                              <span className="uppercase font-bold tracking-wider text-primary">
                                {signal.categorie || "Signal"}
                              </span>
                              <span>{getRelativeTimeFr(signal.published_at)}</span>
                            </div>
                            <h4 className="font-heading text-xxs font-bold text-heading line-clamp-2 leading-snug">
                              {signal.titre_fr}
                            </h4>
                            <p className="text-[10px] text-body line-clamp-2 leading-relaxed">
                              {signal.resume}
                            </p>
                          </div>
                          <button
                            onClick={() => setSelectedArticle(signal)}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-primary hover:underline cursor-pointer mt-1"
                          >
                            <span>Consulter</span>
                            <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-border/20 bg-surface/10 p-12 text-center text-xs text-muted italic">
                Sélectionnez un signal sur la gauche pour l&apos;étudier.
              </div>
            )}
          </section>

          {/* ──────────────────────────────────────────────────────────────
             RAIL DROIT — Actions & contexte
             ────────────────────────────────────────────────────────────── */}
          <section className="xl:col-span-1 space-y-6">
            {/* Actions recommandées */}
            <div className="bg-surface/30 border border-border/40 rounded-xl p-4 space-y-4">
              <h3 className="font-heading text-xs font-bold text-heading flex items-center gap-2">
                <svg className="size-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 21l8.982-11.861H13.62l.812-5.043L5.457 15.904h4.356z" />
                </svg>
                Actions recommandées
              </h3>

              <div className="space-y-2">
                {/* 1. Générer un pitch */}
                <button
                  onClick={() => selectedArticle && handleGeneratePitch(selectedArticle, matchedCompany)}
                  disabled={!selectedArticle}
                  className="w-full flex items-center justify-between rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-fg hover:bg-primary-deep shadow transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                >
                  <span className="flex items-center gap-2">
                    <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                    </svg>
                    Générer un pitch
                  </span>
                  <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                {/* 2. Créer une note compte */}
                <button
                  onClick={() => {
                    if (matchedCompany) {
                      setIsNoteOpen(true)
                    } else {
                      showToast("Veuillez d'abord associer un compte à ce signal (qualification).")
                    }
                  }}
                  disabled={!selectedArticle}
                  className="w-full flex items-center justify-between rounded-lg border border-border/40 bg-surface/30 px-3 py-2 text-xs font-semibold text-heading hover:bg-surface-hover/30 hover:text-heading transition-colors cursor-pointer disabled:opacity-50"
                >
                  <span className="flex items-center gap-2">
                    <svg className="size-3.5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Créer une note compte
                  </span>
                  <svg className="size-3 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                {/* 3. Qualifier le signal */}
                <button
                  onClick={() => setIsQualifyOpen(true)}
                  disabled={!selectedArticle}
                  className="w-full flex items-center justify-between rounded-lg border border-border/40 bg-surface/30 px-3 py-2 text-xs font-semibold text-heading hover:bg-surface-hover/30 hover:text-heading transition-colors cursor-pointer disabled:opacity-50"
                >
                  <span className="flex items-center gap-2">
                    <svg className="size-3.5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    Qualifier le signal
                  </span>
                  <svg className="size-3 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                {/* 4. Transformer en opportunité */}
                <button
                  onClick={() => {
                    if (matchedCompany) {
                      setIsOpportunityOpen(true)
                    } else {
                      showToast("Veuillez d'abord associer un compte à ce signal (qualification).")
                    }
                  }}
                  disabled={!selectedArticle}
                  className="w-full flex items-center justify-between rounded-lg border border-border/40 bg-surface/30 px-3 py-2 text-xs font-semibold text-heading hover:bg-surface-hover/30 hover:text-heading transition-colors cursor-pointer disabled:opacity-50"
                >
                  <span className="flex items-center gap-2">
                    <svg className="size-3.5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Transformer en opportunité
                  </span>
                  <svg className="size-3 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                {/* 5. Ajouter au digest */}
                <button
                  onClick={() => showToast("Le signal a été ajouté au digest hebdomadaire.")}
                  disabled={!selectedArticle}
                  className="w-full flex items-center justify-between rounded-lg border border-border/40 bg-surface/30 px-3 py-2 text-xs font-semibold text-heading hover:bg-surface-hover/30 hover:text-heading transition-colors cursor-pointer disabled:opacity-50"
                >
                  <span className="flex items-center gap-2">
                    <svg className="size-3.5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Ajouter au digest
                  </span>
                  <svg className="size-3 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Contexte mobilisable */}
            <div className="bg-surface/30 border border-border/40 rounded-xl p-4 space-y-4">
              <h3 className="font-heading text-xs font-bold text-heading">Contexte mobilisable</h3>

              <div className="space-y-2.5 text-xxs">
                <div className="flex items-center justify-between border-b border-border/10 pb-1.5">
                  <span className="text-muted">Fiche compte</span>
                  {matchedCompany ? (
                    <span className="rounded bg-success/15 px-1.5 py-0.5 text-success font-bold">Disponible</span>
                  ) : (
                    <span className="rounded bg-danger/15 px-1.5 py-0.5 text-danger font-bold">Non détecté</span>
                  )}
                </div>

                <div className="flex items-center justify-between border-b border-border/10 pb-1.5">
                  <span className="text-muted">Interactions</span>
                  <span className="font-bold text-heading">
                    {matchedCompany?.interactionsCount ?? "—"}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-border/10 pb-1.5">
                  <span className="text-muted">Contacts clés</span>
                  <span className="font-bold text-heading">
                    {matchedCompany?.contactsCount ?? "—"}
                  </span>
                </div>

                <div className="flex items-center justify-between pb-1.5">
                  <span className="text-muted">Analyses liées</span>
                  <span className="font-bold text-heading">
                    {matchedCompany?.docsCount ?? "—"}
                  </span>
                </div>

                {matchedCompany && (
                  <a
                    href={`/prospection/accounts?drawer=${matchedCompany.id}`}
                    className="block text-center rounded bg-surface-hover/20 border border-border/30 py-1.5 text-primary hover:underline font-bold transition-all cursor-pointer"
                  >
                    Voir tout le contexte →
                  </a>
                )}
              </div>
            </div>

            {/* Statut de veille */}
            <div className="bg-surface/30 border border-border/40 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-heading text-xs font-bold text-heading">Statut de veille</h3>
                <span className="rounded-full bg-success/10 border border-success/30 px-2 py-0.5 text-[9px] font-bold text-success uppercase">
                  À jour
                </span>
              </div>
              <p className="text-xxs text-body leading-relaxed">
                Votre veille est opérationnelle. Aucune action requise.
              </p>
              <div className="border-t border-border/10 pt-2 flex items-center justify-between">
                {pastDigests.length > 1 && (
                  <a href="#historique" className="text-[10px] text-primary hover:underline cursor-pointer">
                    Voir l&apos;historique →
                  </a>
                )}
              </div>
            </div>
          </section>
        </div>
      ) : (
        /* Empty State with Fallbacks */
        <div className="space-y-6">
          <div className="rounded-[var(--radius-medium)] border border-border bg-surface p-12 text-center max-w-xl mx-auto space-y-4 shadow-sm">
            <div className="size-12 rounded-full bg-primary/5 flex items-center justify-center mx-auto text-primary">
              <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 4a2 2 0 00-2-2v3m2-3V9m0 0a2 2 0 012 2v3m-2-3h2m-2 3h2m0 0v5a2 2 0 01-2 2h-3" />
              </svg>
            </div>
            <h3 className="font-heading text-sm font-bold text-heading">Aucun briefing disponible</h3>
            <p className="text-xs text-body leading-relaxed">
              {"Le premier digest hebdomadaire de veille automatisée n'a pas encore été généré. Dès qu'un run de veille aura eu lieu, vous retrouverez ici l'analyse structurée de vos signaux marché."}
            </p>
          </div>

          {/* Sector news and events fallback */}
          {(sectorNews.length > 0 || sectorEvents.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 max-w-5xl mx-auto">
              {sectorNews.length > 0 && (
                <div className="rounded-[var(--radius-medium)] border border-border bg-surface p-5 space-y-4 shadow-sm">
                  <h3 className="font-heading text-xs font-bold text-heading uppercase tracking-wider flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full bg-success" />
                    Actualités sectorielles récentes
                  </h3>
                  <div className="space-y-3.5 divide-y divide-border/40">
                    {sectorNews.map((news) => (
                      <div key={news.id} className="pt-3.5 first:pt-0">
                        <span className="text-[10px] text-muted">{formatDateFr(news.published_at)}</span>
                        <h4 className="font-heading text-xs font-bold text-heading mt-0.5">{news.title}</h4>
                        {news.summary && <p className="text-xxs text-body leading-relaxed mt-1">{news.summary}</p>}
                        {news.url && (
                          <a href={news.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline mt-2">
                            {"Lire l'article"}
                            <svg className="size-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {sectorEvents.length > 0 && (
                <div className="rounded-[var(--radius-medium)] border border-border bg-surface p-5 space-y-4 shadow-sm">
                  <h3 className="font-heading text-xs font-bold text-heading uppercase tracking-wider flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full bg-brand-brass" />
                    Événements déclencheurs commerciaux
                  </h3>
                  <div className="space-y-3.5 divide-y divide-border/40">
                    {sectorEvents.map((evt) => (
                      <div key={evt.id} className="pt-3.5 first:pt-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] text-muted">{formatDateFr(evt.event_date)}</span>
                          <span className="rounded bg-brand-brass/10 px-1.5 py-0.5 text-[9px] font-bold text-brand-brass uppercase tracking-wider">
                            {evt.event_type}
                          </span>
                        </div>
                        <h4 className="font-heading text-xs font-bold text-heading mt-0.5">{evt.title}</h4>
                        {evt.description && <p className="text-xxs text-body leading-relaxed mt-1">{evt.description}</p>}
                        {evt.commercial_opportunity && (
                          <div className="rounded bg-canvas/40 border border-border/50 p-2 text-xxs mt-2">
                            <span className="font-bold text-heading block">Opportunité commerciale :</span>
                            <span className="text-body leading-normal">{evt.commercial_opportunity}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Dialog modals */}
      {selectedArticle && (
        <>
          <QualifySignalDialog
            open={isQualifyOpen}
            onOpenChange={setIsQualifyOpen}
            article={selectedArticle}
            onSuccess={handleArticleQualifySuccess}
          />
          {matchedCompany && (
            <>
              <CreateAccountNoteDialog
                open={isNoteOpen}
                onOpenChange={setIsNoteOpen}
                companyId={matchedCompany.id}
                companyName={matchedCompany.name}
                signalTitle={selectedArticle.titre_fr}
                onSuccess={() => showToast(`Note ajoutée pour le compte ${matchedCompany.name}.`)}
              />
              <CreateOpportunityDialog
                open={isOpportunityOpen}
                onOpenChange={setIsOpportunityOpen}
                companyId={matchedCompany.id}
                companyName={matchedCompany.name}
                signalTitle={selectedArticle.titre_fr}
                onSuccess={() => showToast(`Opportunité créée pour ${matchedCompany.name}.`)}
              />
            </>
          )}
        </>
      )}
    </div>
  )
}

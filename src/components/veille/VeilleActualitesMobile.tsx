"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { formatDateFr } from "@/lib/formatters"
import { CompanyLogo } from "@/components/accounts-contacts/CompanyLogo"
import { openCommunicationComposer } from "@/lib/communication/communication-composer"
import { buildCommunicationEntryPreset } from "@/lib/communication/communication-entry-intents"
import {
  QualifySignalDialog,
  CreateAccountNoteDialog,
  CreateOpportunityDialog,
} from "./SignalDialogs"
import { ContextualCommunicationButton } from "@/components/communication/ContextualCommunicationButton"
import { AccountSignalDetailDrawer } from "@/components/accounts-contacts/intelligence/AccountSignalDetailDrawer"
import { cn } from "@/lib/utils"
import { getRelativeTimeFr, extractMatchedCompany } from "./veille-utils"
import type {
  VeilleDigest,
  VeilleArticle,
  SectorNews,
  SectorEvent,
  CompanyContextStats,
  WatchedAccountSignal
} from "@/app/(app)/veille/_data/veille-data"

interface VeilleActualitesMobileProps {
  digest: VeilleDigest | null
  articles: VeilleArticle[]
  pastDigests: VeilleDigest[]
  sectorNews: SectorNews[]
  sectorEvents: SectorEvent[]
  companies: CompanyContextStats[]
  watchedSignals: WatchedAccountSignal[]
}

export function VeilleActualitesMobile({
  digest,
  articles: initialArticles,
  pastDigests,
  sectorNews,
  sectorEvents,
  companies,
  watchedSignals,
}: VeilleActualitesMobileProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<"globale" | "comptes" | "historique">("globale")
  const [articles, setArticles] = useState<VeilleArticle[]>(initialArticles)
  const [selectedArticle, setSelectedArticle] = useState<VeilleArticle | null>(() => {
    return initialArticles.length > 0 ? initialArticles[0] : null
  })
  const [selectedCategory, setSelectedCategory] = useState("Tous")
  const [localWatchedSignals, setLocalWatchedSignals] = useState<WatchedAccountSignal[]>(watchedSignals)

  // Detail drawer for watched signals
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [detailSignal, setDetailSignal] = useState<WatchedAccountSignal | null>(null)

  const handleOpenDetail = (sig: WatchedAccountSignal) => {
    setDetailSignal(sig)
    setIsDetailOpen(true)
  }

  const handleDismissSignal = (signalId: string) => {
    setLocalWatchedSignals((prev) => prev.filter((s) => s.id !== signalId))
  }

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

    const preset = buildCommunicationEntryPreset("signal_outreach", {
      origin: "veille_signal",
      companyId: matchedCompany?.id || null,
      companyName: matchedCompany?.name || null,
      signalId: article.id,
      sectorName: article.secteur_principal ?? article.categorie ?? null,
      mustInclude,
    })
    if (preset.ok) {
      openCommunicationComposer(preset.request)
    }
  }

  // Filter articles based on category chip
  const filteredArticles = articles.filter((article) => {
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

  const handleArticleQualifySuccess = (updated: VeilleArticle) => {
    setArticles((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))
    setSelectedArticle(updated)
    showToast("Signal qualifié et mis à jour.")
  }

  const historyMobileView = (
    <div className="px-4 space-y-4 pb-24">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-xs font-bold uppercase tracking-wider text-heading">
          Historique des briefings ({pastDigests.length})
        </h2>
      </div>

      {pastDigests.length === 0 ? (
        <div className="rounded-xl border border-border/20 bg-surface/10 p-8 text-center text-xs text-muted italic">
          Aucun briefing passé disponible.
        </div>
      ) : (
        <div className="space-y-3">
          {pastDigests.map((d) => {
            const isCurrent = digest?.id === d.id
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => {
                  showToast(`Chargement du briefing du ${formatDateFr(d.digest_date)}...`)
                  router.push(`?digestId=${d.id}`)
                  setActiveTab("globale")
                }}
                className={cn(
                  "w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between gap-4 cursor-pointer",
                  isCurrent
                    ? "border-primary bg-primary/[0.03] shadow-sm"
                    : "border-border/40 bg-surface/30 hover:border-border/60"
                )}
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted">
                      {formatDateFr(d.digest_date)}
                    </span>
                    {isCurrent && (
                      <span className="rounded bg-primary/10 border border-primary/20 px-1.5 py-0.5 text-[10px] font-bold text-primary uppercase">
                        Actuel
                      </span>
                    )}
                  </div>
                  <span className="block font-heading text-xs font-bold text-heading truncate">
                    {d.titre_digest}
                  </span>
                </div>
                <svg className="size-4 text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )

  const watchedMobileView = (
    <div className="px-4 space-y-4 pb-24">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-xs font-bold uppercase tracking-wider text-heading">
          Signaux détectés ({localWatchedSignals.length})
        </h2>
      </div>

      {localWatchedSignals.length === 0 ? (
        <div className="rounded-xl border border-border/20 bg-surface/10 p-8 text-center text-xs text-muted italic">
          Aucun signal de compte surveillé pour le moment.
        </div>
      ) : (
        <div className="space-y-4">
          {localWatchedSignals.map((sig) => (
            <div
              key={sig.id}
              className="rounded-xl border border-border/30 bg-surface/30 p-4 space-y-3.5"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CompanyLogo
                    name={sig.company.name}
                    logoPath={sig.company.logoPath}
                    website={sig.company.website}
                    size="sm"
                  />
                  <span className="text-xs font-bold text-heading truncate max-w-[120px]">
                    {sig.company.name}
                  </span>
                </div>
                <span className="text-[10px] text-muted">
                  {formatDateFr(sig.detectedAt)}
                </span>
              </div>

              <div className="space-y-1">
                <h3 className="font-heading text-xs font-bold text-heading leading-snug">
                  {sig.title}
                </h3>
                <p className="text-xxs text-body line-clamp-2 leading-relaxed">
                  {sig.summary}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2.5 border-t border-border/20 text-xxs text-muted">
                <div className="flex gap-2">
                  <span>Score : <strong className="text-heading">{Math.round(sig.globalScore * 100)}%</strong></span>
                  <span>Urgence : <strong className="text-heading">{Math.round(sig.urgencyScore * 100)}%</strong></span>
                </div>
                <span className="rounded bg-surface/50 border border-border/40 px-1.5 py-0.5 text-[10px] font-bold text-muted uppercase tracking-wider">
                  {sig.category}
                </span>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => handleOpenDetail(sig)}
                  className="flex-1 min-h-[44px] inline-flex items-center justify-center rounded-lg border border-border/40 bg-surface/30 text-xxs font-bold text-body hover:bg-surface-hover/30 transition-colors cursor-pointer"
                >
                  Détails
                </button>
                <ContextualCommunicationButton
                  intent="signal_outreach"
                  origin="veille_signal"
                  companyId={sig.company.id}
                  companyName={sig.company.name}
                  signalId={sig.id}
                  refs={{ signalRef: sig.id }}
                  label="Rédiger"
                  variant="primary"
                  className="flex-1 min-h-[44px] inline-flex items-center justify-center rounded-lg bg-primary text-xxs font-bold text-primary-fg hover:bg-primary-deep shadow-sm transition-all cursor-pointer"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div className="flex-1 overflow-y-auto bg-canvas pb-24 text-body space-y-4">
      {/* Toast Alert overlay */}
      {toastMessage && (
        <div className="fixed bottom-20 left-4 right-4 z-[var(--z-modal)] flex items-center gap-2 bg-[#E2931D] text-[#0A0D1A] font-bold text-xs px-4 py-3 rounded-lg shadow-lg justify-center">
          <svg className="size-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Mobile Sticky / Regular Header */}
      <header className="sticky top-0 z-[var(--z-sticky)] bg-surface border-b border-border/60 px-4 py-3 flex items-center justify-between min-h-[56px]">
        <h1 className="font-heading text-lg font-bold text-heading flex items-center">
          Veille & actualités
        </h1>
        <button
          onClick={() => showToast("Mise à jour lancée...")}
          className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-muted hover:text-heading"
          aria-label="Mettre à jour"
        >
          <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89H18" />
          </svg>
        </button>
      </header>

      {/* Tab Switcher */}
      <div className="flex border-b border-border/40 px-4">
        <button
          onClick={() => setActiveTab("globale")}
          className={cn(
            "flex-1 text-center py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer",
            activeTab === "globale"
              ? "border-primary text-primary"
              : "border-transparent text-muted"
          )}
        >
          Veille globale
        </button>
        <button
          onClick={() => setActiveTab("comptes")}
          className={cn(
            "flex-1 text-center py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center justify-center gap-1.5",
            activeTab === "comptes"
              ? "border-primary text-primary"
              : "border-transparent text-muted"
          )}
        >
          <span>Veille ciblée</span>
        </button>
        <button
          onClick={() => setActiveTab("historique")}
          className={cn(
            "flex-1 text-center py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer",
            activeTab === "historique"
              ? "border-primary text-primary"
              : "border-transparent text-muted"
          )}
        >
          Historique
        </button>
      </div>

      {activeTab === "globale" ? (
        <>
          {/* Chips filtres horizontaux */}
      <div className="px-4 overflow-x-auto scrollbar-none flex gap-2 pb-2">
        {["Tous", "Réglementaire", "Nominations", "Marché"].map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`rounded-full px-4 py-1.5 text-[10px] font-bold border shrink-0 min-h-[44px] transition-all cursor-pointer ${selectedCategory === cat
                ? "bg-primary/10 border-primary text-primary"
                : "bg-surface/20 border-border/20 text-muted"
              }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="px-4 space-y-5">
        {digest && selectedArticle ? (
          <>
            {/* Main selected signal: editorial cream paper-sheet */}
            <div className="paper-sheet rounded-xl border border-[var(--color-border)] p-4 space-y-3 shadow-sm">
              <div className="flex items-start justify-between gap-3 border-b border-border/20 pb-2">
                <div className="min-w-0 flex-1 space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-primary block leading-none">
                    {selectedArticle.categorie || "Signal"}
                  </span>
                  {selectedArticle.source_name && (
                    <div className="flex items-center gap-1.5 text-[10px] text-muted leading-none">
                      <span>via {selectedArticle.source_name}</span>
                      {selectedArticle.url && (
                        <a
                          href={selectedArticle.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex size-3.5 items-center justify-center rounded bg-surface/50 border border-border/40 text-muted hover:text-primary transition-colors cursor-pointer"
                          aria-label={`Lire la source sur ${selectedArticle.source_name}`}
                          title="Ouvrir la source"
                        >
                          <svg className="size-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-[10px] text-muted text-right">
                    {getRelativeTimeFr(selectedArticle.published_at)}
                  </span>
                  {matchedCompany && (
                    <div className="flex items-center gap-1 bg-surface-hover/30 border border-border/25 rounded-md p-1 px-1.5 max-w-[120px]">
                      <CompanyLogo
                        name={matchedCompany.name}
                        logoPath={matchedCompany.logoPath}
                        website={matchedCompany.website}
                        size="xs"
                      />
                      <span className="text-[10px] font-bold text-heading truncate">
                        {matchedCompany.name}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <h2 className="font-heading text-base font-bold text-heading leading-tight pt-0.5">
                {selectedArticle.titre_fr}
              </h2>

              <p className="text-xxs text-body leading-relaxed">
                {selectedArticle.resume}
              </p>

              {/* Pourquoi c'est important */}
              {selectedArticle.analyse_kredo && (
                <div className="rounded-lg bg-primary/[0.04] p-3 space-y-2">
                  <h3 className="font-heading text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-0 h-0 border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent border-l-[6px] border-l-primary shrink-0" aria-hidden="true" />
                    Pourquoi c&apos;est important
                  </h3>
                  <div className="pl-3 border-l-2 border-primary/20">
                    <p className="text-xxs leading-relaxed text-heading font-medium">
                      {selectedArticle.analyse_kredo}
                    </p>
                  </div>
                </div>
              )}

              {/* Lecture commerciale */}
              {selectedArticle.action_commerciale && (
                <div className="rounded-lg bg-success/[0.05] p-3 space-y-2">
                  <h3 className="font-heading text-xs font-bold text-success uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-0 h-0 border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent border-l-[6px] border-l-success shrink-0" aria-hidden="true" />
                    Lecture commerciale
                  </h3>
                  <div className="pl-3 border-l-2 border-success/20">
                    <p className="text-xxs leading-relaxed text-body">
                      {selectedArticle.action_commerciale}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Recommended actions immediately accessible (large touch targets) */}
            <div className="bg-surface/30 border border-border/40 rounded-xl p-4 space-y-3">
              <h3 className="font-heading text-xs font-bold text-heading uppercase tracking-wider">
                Actions
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {/* 1. Pitch */}
                <button
                  onClick={() => handleGeneratePitch(selectedArticle, matchedCompany)}
                  className="min-h-[44px] flex items-center justify-center gap-1.5 rounded-lg bg-primary text-primary-fg text-xxs font-bold shadow hover:bg-primary-deep"
                >
                  <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                  </svg>
                  Pitch
                </button>

                {/* 2. Note */}
                <button
                  onClick={() => {
                    if (matchedCompany) {
                      setIsNoteOpen(true)
                    } else {
                      showToast("Veuillez d'abord qualifier et lier un compte.")
                    }
                  }}
                  className="min-h-[44px] flex items-center justify-center gap-1.5 rounded-lg border border-border/30 bg-surface/40 text-heading text-xxs font-bold"
                >
                  <svg className="size-3.5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Note
                </button>

                {/* 3. Opportunité */}
                <button
                  onClick={() => {
                    if (matchedCompany) {
                      setIsOpportunityOpen(true)
                    } else {
                      showToast("Veuillez d'abord qualifier et lier un compte.")
                    }
                  }}
                  className="min-h-[44px] flex items-center justify-center gap-1.5 rounded-lg border border-border/30 bg-surface/40 text-heading text-xxs font-bold"
                >
                  <svg className="size-3.5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Opportunité
                </button>

                {/* 4. Qualifier */}
                <button
                  onClick={() => setIsQualifyOpen(true)}
                  className="min-h-[44px] flex items-center justify-center gap-1.5 rounded-lg border border-border/30 bg-surface/40 text-heading text-xxs font-bold"
                >
                  <svg className="size-3.5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Qualifier
                </button>
              </div>

              {/* Matched account context counts */}
              {matchedCompany && (
                <div className="border-t border-border/20 pt-3 flex justify-between gap-4 text-[10px] text-muted">
                  <span>Contacts: <strong className="text-heading">{matchedCompany.contactsCount}</strong></span>
                  <span>Interactions: <strong className="text-heading">{matchedCompany.interactionsCount}</strong></span>
                  <span>Analyses: <strong className="text-heading">{matchedCompany.docsCount}</strong></span>
                </div>
              )}
            </div>

            {/* List of other signals */}
            <section className="space-y-3">
              <h3 className="font-heading text-xs font-bold text-heading uppercase tracking-wider flex items-center gap-1.5 pl-1">
                <span className="size-1.5 rounded-full bg-primary" />
                Signaux du briefing ({filteredArticles.length})
              </h3>
              <div className="space-y-3">
                {filteredArticles.map((article) => {
                  const matched = extractMatchedCompany(article.titre_fr, article.resume, companies)
                  const isSelected = selectedArticle.id === article.id

                  return (
                    <article
                      key={article.id}
                      onClick={() => {
                        setSelectedArticle(article)
                        window.scrollTo({ top: 0, behavior: "smooth" })
                      }}
                      className={`rounded-lg border p-4 space-y-2 active:scale-[0.99] transition-all duration-150 ${isSelected
                          ? "border-primary bg-[var(--color-surface-hover)]"
                          : "border-border/40 bg-surface/30"
                        }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <h4 className={`font-heading text-xxs font-bold leading-snug ${isSelected ? "text-primary" : "text-heading"
                          }`}>
                        {article.titre_fr}
                      </h4>
                      {isSelected && <span className="text-primary font-bold">★</span>}
                    </div>

                    <p className="text-[10px] text-body line-clamp-2 leading-relaxed">
                      {article.resume}
                    </p>

                    <div className="flex justify-between items-center text-[10px] text-muted pt-1 border-t border-border/10">
                      <span className="uppercase font-bold tracking-wider text-primary">
                        {article.categorie || "Signal"}
                      </span>
                      <span>{matched?.name || article.secteur_principal || "Transverse"}</span>
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
          </>
        ) : (
          /* Empty state */
          <div className="space-y-6">
            <div className="rounded-[var(--radius-medium)] border border-border bg-surface p-8 text-center space-y-3 shadow-sm">
              <div className="size-10 rounded-full bg-primary/5 flex items-center justify-center mx-auto text-primary">
                <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 4a2 2 0 00-2-2v3m2-3V9m0 0a2 2 0 012 2v3m-2-3h2m-2 3h2m0 0v5a2 2 0 01-2 2h-3" />
                </svg>
              </div>
              <h3 className="font-heading text-xs font-bold text-heading">Aucun briefing</h3>
              <p className="text-xxs text-body leading-relaxed">
                {"Le digest hebdomadaire de veille automatisée n'a pas encore été généré. Dès qu'un run de veille aura eu lieu, vous le retrouverez ici."}
              </p>
            </div>

            {/* Fallbacks */}
            {sectorNews.length > 0 && (
              <section className="rounded-xl border border-border/40 bg-surface/30 p-4 space-y-3 shadow-sm">
                <h3 className="font-heading text-xs font-bold text-heading flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-success" />
                  Actualités sectorielles
                </h3>
                <div className="space-y-3 divide-y divide-border/20">
                  {sectorNews.map((news) => (
                    <div key={news.id} className="pt-3 first:pt-0 space-y-1">
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-[10px] text-muted">{formatDateFr(news.published_at)}</span>
                        {news.source && <span className="text-[10px] text-heading font-semibold">{news.source}</span>}
                      </div>
                      <h4 className="font-heading text-xxs font-bold text-heading leading-tight">{news.title}</h4>
                      {news.summary && <p className="text-xxs text-body leading-relaxed">{news.summary}</p>}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {sectorEvents.length > 0 && (
              <section className="rounded-xl border border-border/40 bg-surface/30 p-4 space-y-3 shadow-sm">
                <h3 className="font-heading text-xs font-bold text-heading flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-brand-brass" />
                  Événements déclencheurs
                </h3>
                <div className="space-y-3 divide-y divide-border/20">
                  {sectorEvents.map((evt) => (
                    <div key={evt.id} className="pt-3 first:pt-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] text-muted">{formatDateFr(evt.event_date)}</span>
                        <span className="rounded bg-brand-brass/10 px-1.5 py-0.5 text-[10px] font-bold text-brand-brass uppercase">
                          {evt.event_type}
                        </span>
                      </div>
                      <h4 className="font-heading text-xxs font-bold text-heading leading-tight">{evt.title}</h4>
                      {evt.commercial_opportunity && (
                        <div className="rounded bg-canvas/40 border border-border/50 p-2 text-[10px] mt-1">
                          <span className="text-body leading-normal">{evt.commercial_opportunity}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </>
  ) : activeTab === "comptes" ? (
    watchedMobileView
  ) : (
    historyMobileView
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
                onSuccess={() => showToast(`Note ajoutée pour ${matchedCompany.name}.`)}
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

      {detailSignal && (
        <AccountSignalDetailDrawer
          open={isDetailOpen}
          onOpenChange={setIsDetailOpen}
          signal={{
            id: detailSignal.id,
            category: detailSignal.category,
            type: detailSignal.type,
            title: detailSignal.title,
            summary: detailSignal.summary,
            detectedAt: detailSignal.detectedAt,
            expiresAt: null,
            globalScore: detailSignal.globalScore,
            urgencyScore: detailSignal.urgencyScore,
            confidenceScore: detailSignal.confidenceScore,
            status: detailSignal.status,
            primarySourceId: detailSignal.primarySource?.id || null,
            recommendedAction: detailSignal.recommendedAction,
            recommendedPracticeId: detailSignal.recommendedPracticeId,
            primarySource: detailSignal.primarySource
          }}
          companyId={detailSignal.company.id}
          companyName={detailSignal.company.name}
          onDismiss={handleDismissSignal}
        />
      )}
    </div>
  )
}
